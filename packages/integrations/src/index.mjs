import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const KNOWN_INTEGRATIONS = Object.freeze(['dictionary', 'oracle', 'tdn']);
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_CACHE_MS = 5 * 60 * 1_000;
const MAX_RESULT_LIMIT = 50;
const DEFAULT_MAX_SNAPSHOT_BYTES = 10 * 1024 * 1024;
const DEFAULT_MAX_CELL_BYTES = 64 * 1024;
const DEFAULT_MAX_DATABASE_RESULT_BYTES = 1024 * 1024;

class IntegrationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new IntegrationError('INTEGRATION_ARGUMENT_INVALID', `${label} must be an object`);
  }
}

function requiredString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new IntegrationError('INTEGRATION_ARGUMENT_INVALID', `${label} is required`);
  }
  return value.trim();
}

function resultLimit(value) {
  if (value === undefined) return 10;
  if (!Number.isInteger(value) || value < 1 || value > MAX_RESULT_LIMIT) {
    throw new IntegrationError(
      'INTEGRATION_ARGUMENT_INVALID',
      `limit must be an integer between 1 and ${MAX_RESULT_LIMIT}`,
    );
  }
  return value;
}

function snapshotHash(snapshot) {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}

async function withTimeout(factory, timeoutMs, integration, parentSignal) {
  const controller = new AbortController();
  if (parentSignal?.aborted) throw new IntegrationError('INTEGRATION_CANCELLED', `${integration} operation was cancelled`);
  return new Promise((resolvePromise, rejectPromise) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      parentSignal?.removeEventListener?.('abort', onAbort);
      callback(value);
    };
    const onAbort = () => {
      controller.abort(parentSignal?.reason);
      finish(rejectPromise, new IntegrationError('INTEGRATION_CANCELLED', `${integration} operation was cancelled`));
    };
    const timer = setTimeout(() => {
      controller.abort(new Error('timeout'));
      finish(rejectPromise, new IntegrationError(
        'INTEGRATION_TIMEOUT',
        `${integration} operation exceeded ${timeoutMs} ms`,
      ));
    }, timeoutMs);
    parentSignal?.addEventListener?.('abort', onAbort, { once: true });
    if (parentSignal?.aborted) {
      onAbort();
      return;
    }
    Promise.resolve()
      .then(() => factory(controller.signal))
      .then((value) => finish(resolvePromise, value), (error) => finish(rejectPromise, error));
  });
}

async function readSnapshotBytes(snapshotPath, maxBytes = DEFAULT_MAX_SNAPSHOT_BYTES, signal) {
  if (signal?.aborted) throw new IntegrationError('INTEGRATION_CANCELLED', 'snapshot read was cancelled');
  const stat = await lstat(snapshotPath);
  if (stat.isSymbolicLink() || !stat.isFile()) throw new IntegrationError('INTEGRATION_FILE_UNSAFE', 'snapshot must be a regular file');
  if (stat.size > maxBytes) {
    throw new IntegrationError('INTEGRATION_FILE_TOO_LARGE', `snapshot exceeds ${maxBytes} bytes`);
  }
  const handle = await open(snapshotPath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    if (signal?.aborted) throw new IntegrationError('INTEGRATION_CANCELLED', 'snapshot read was cancelled');
    const bytes = await handle.readFile({ signal });
    if (bytes.length > maxBytes) {
      throw new IntegrationError('INTEGRATION_FILE_TOO_LARGE', `snapshot exceeds ${maxBytes} bytes`);
    }
    return bytes;
  } finally {
    await handle.close();
  }
}

async function lstatIfPresent(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

export function createJsonFileLoader(snapshotPath, options = {}) {
  const path = requiredString(snapshotPath, 'snapshotPath');
  return async ({ signal } = {}) => JSON.parse((await readSnapshotBytes(path, options.maxBytes, signal)).toString('utf8'));
}

function createSnapshotAdapter(options) {
  const {
    integration,
    kind,
    operations,
    validateSnapshot,
    execute,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    cacheMs = DEFAULT_CACHE_MS,
    clock = Date.now,
  } = options;
  const load = options.load ?? (options.snapshotPath ? createJsonFileLoader(options.snapshotPath) : null);
  if (typeof load !== 'function') throw new TypeError(`${integration} load or snapshotPath is required`);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) throw new TypeError('timeoutMs must be positive');
  if (!Number.isFinite(cacheMs) || cacheMs < 0) throw new TypeError('cacheMs must be non-negative');

  let cache = null;

  async function getSnapshot(signal) {
    if (signal?.aborted) {
      throw new IntegrationError('INTEGRATION_CANCELLED', `${integration} operation was cancelled`);
    }
    const now = clock();
    if (cache && now - cache.loadedAt <= cacheMs) return { ...cache, cached: true };
    const snapshot = await withTimeout((operationSignal) => load({ signal: operationSignal }), timeoutMs, integration, signal);
    if (!validateSnapshot(snapshot)) {
      throw new IntegrationError(
        'INTEGRATION_SCHEMA_INVALID',
        `${integration} snapshot must conform to ${kind}/v1`,
      );
    }
    cache = { snapshot, loadedAt: now, sha256: snapshotHash(snapshot) };
    return { ...cache, cached: false };
  }

  return Object.freeze({
    integration,
    mode: 'read-only-snapshot',
    schemaVersion: 1,
    async invoke(operation, args = {}, context = {}) {
      if (!operations.includes(operation)) {
        throw new IntegrationError(
          'INTEGRATION_OPERATION_DENIED',
          `${integration} operation is not read-only or supported: ${String(operation)}`,
        );
      }
      assertPlainObject(args, 'integration arguments');
      const loaded = await getSnapshot(context.signal);
      return {
        ok: true,
        schemaVersion: 1,
        integration,
        operation,
        data: execute(operation, args, loaded.snapshot),
        evidence: {
          integration,
          mode: 'read-only-snapshot',
          source: loaded.snapshot.source,
          capturedAt: loaded.snapshot.capturedAt,
          snapshotSchemaVersion: loaded.snapshot.schemaVersion,
          sha256: loaded.sha256,
          cached: loaded.cached,
          loadedAt: new Date(loaded.loadedAt).toISOString(),
        },
      };
    },
  });
}

function validProvenance(snapshot, kind) {
  return snapshot?.kind === kind
    && snapshot.schemaVersion === 1
    && typeof snapshot.source === 'string'
    && snapshot.source.trim().length > 0
    && typeof snapshot.capturedAt === 'string'
    && !Number.isNaN(Date.parse(snapshot.capturedAt));
}

function validateTdnSnapshot(snapshot) {
  return validProvenance(snapshot, 'pea.tdn.snapshot')
    && Array.isArray(snapshot.pages)
    && snapshot.pages.every((page) => page
      && typeof page.id === 'string'
      && typeof page.title === 'string'
      && typeof page.url === 'string'
      && typeof page.body === 'string');
}

function runTdnOperation(operation, args, snapshot) {
  if (operation === 'get') {
    const id = requiredString(args.id, 'id');
    return { item: snapshot.pages.find((page) => page.id === id) ?? null };
  }
  const query = requiredString(args.query, 'query').toLocaleLowerCase('pt-BR');
  const limit = resultLimit(args.limit);
  const items = snapshot.pages
    .filter((page) => `${page.title}\n${page.body}`.toLocaleLowerCase('pt-BR').includes(query))
    .sort((left, right) => left.id.localeCompare(right.id))
    .slice(0, limit)
    .map((page) => ({ id: page.id, title: page.title, url: page.url, excerpt: page.body.slice(0, 500) }));
  return { query: args.query.trim(), limit, items };
}

export function createTdnSnapshotAdapter(options = {}) {
  return createSnapshotAdapter({
    ...options,
    integration: 'tdn',
    kind: 'pea.tdn.snapshot',
    operations: ['get', 'search'],
    validateSnapshot: validateTdnSnapshot,
    execute: runTdnOperation,
  });
}

function validateDictionarySnapshot(snapshot) {
  return validProvenance(snapshot, 'pea.protheus.dictionary')
    && Array.isArray(snapshot.tables)
    && snapshot.tables.every((table) => table
      && typeof table.name === 'string'
      && typeof table.description === 'string'
      && Array.isArray(table.fields)
      && table.fields.every((field) => field
        && typeof field.name === 'string'
        && typeof field.type === 'string'));
}

export async function inspectSnapshotFile(options = {}) {
  const integration = requiredString(options.integration, 'integration');
  if (!['tdn', 'dictionary'].includes(integration)) throw new TypeError(`unsupported snapshot integration: ${integration}`);
  const snapshotPath = requiredString(options.snapshotPath, 'snapshotPath');
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_SNAPSHOT_BYTES;
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 100 * 1024 * 1024) {
    throw new TypeError('snapshot maxBytes is invalid');
  }
  const bytes = await readSnapshotBytes(snapshotPath, maxBytes);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (options.expectedSha256 !== undefined) {
    if (!/^[a-f0-9]{64}$/i.test(options.expectedSha256)) throw new TypeError('expectedSha256 must be a SHA-256 digest');
    if (sha256 !== options.expectedSha256.toLowerCase()) {
      throw new IntegrationError('INTEGRATION_DIGEST_MISMATCH', 'snapshot digest mismatch');
    }
  }
  let snapshot;
  try {
    snapshot = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new IntegrationError('INTEGRATION_SCHEMA_INVALID', `${integration} snapshot is not valid JSON`);
  }
  const valid = integration === 'tdn' ? validateTdnSnapshot(snapshot) : validateDictionarySnapshot(snapshot);
  if (!valid) throw new IntegrationError('INTEGRATION_SCHEMA_INVALID', `${integration} snapshot must conform to its v1 schema`);
  const capturedAt = Date.parse(snapshot.capturedAt);
  const nowValue = options.now instanceof Date ? options.now.valueOf() : new Date(options.now ?? Date.now()).valueOf();
  if (Number.isNaN(nowValue)) throw new TypeError('snapshot inspection now value is invalid');
  const maxAgeMs = options.maxAgeMs ?? 30 * 24 * 60 * 60 * 1000;
  if (!Number.isFinite(maxAgeMs) || maxAgeMs < 0) throw new TypeError('snapshot maxAgeMs is invalid');
  const declaredLicense = typeof snapshot.license === 'string' && snapshot.license.trim()
    ? snapshot.license.trim()
    : null;
  return {
    schemaVersion: 1,
    status: 'ready',
    integration,
    kind: snapshot.kind,
    source: snapshot.source,
    capturedAt: snapshot.capturedAt,
    sha256,
    sizeBytes: bytes.length,
    records: integration === 'tdn' ? snapshot.pages.length : snapshot.tables.length,
    freshness: Math.max(0, nowValue - capturedAt) <= maxAgeMs ? 'fresh' : 'stale',
    license: declaredLicense
      ? { status: 'declared', value: declaredLicense }
      : { status: 'missing', value: null },
    trust: 'untrusted-snapshot-data',
  };
}

export async function installSnapshotFile(options = {}) {
  const sourcePath = requiredString(options.sourcePath, 'sourcePath');
  const destinationPath = resolve(requiredString(options.destinationPath, 'destinationPath'));
  const inspection = await inspectSnapshotFile({
    integration: options.integration,
    snapshotPath: sourcePath,
    expectedSha256: options.expectedSha256,
    maxBytes: options.maxBytes,
    maxAgeMs: options.maxAgeMs,
    now: options.now,
  });
  if (inspection.license.status !== 'declared') {
    throw new IntegrationError('INTEGRATION_LICENSE_MISSING', 'snapshot requires explicit license or owner authorization metadata');
  }
  const bytes = await readSnapshotBytes(sourcePath, options.maxBytes ?? DEFAULT_MAX_SNAPSHOT_BYTES);
  if (createHash('sha256').update(bytes).digest('hex') !== inspection.sha256) {
    throw new IntegrationError('INTEGRATION_DIGEST_MISMATCH', 'snapshot changed during validation');
  }
  const directory = dirname(destinationPath);
  await mkdir(directory, { recursive: true });
  const directoryStat = await lstat(directory);
  if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
    throw new IntegrationError('INTEGRATION_FILE_UNSAFE', 'snapshot destination must be a real directory');
  }
  const existing = await lstatIfPresent(destinationPath);
  if (existing && (existing.isSymbolicLink() || !existing.isFile())) {
    throw new IntegrationError('INTEGRATION_FILE_UNSAFE', 'snapshot destination must be a regular file');
  }
  const temp = `${destinationPath}.${process.pid}.${randomUUID()}.tmp`;
  const backup = `${destinationPath}.${process.pid}.${randomUUID()}.bak`;
  let movedExisting = false;
  await writeFile(temp, bytes, { flag: 'wx', mode: 0o600 });
  try {
    if (existing) {
      await rename(destinationPath, backup);
      movedExisting = true;
    }
    await rename(temp, destinationPath);
    if (movedExisting) await rm(backup);
  } catch (error) {
    await rm(temp, { force: true });
    if (movedExisting && !(await lstatIfPresent(destinationPath))) await rename(backup, destinationPath);
    throw error;
  }
  const installed = await inspectSnapshotFile({
    integration: options.integration,
    snapshotPath: destinationPath,
    expectedSha256: inspection.sha256,
    maxBytes: options.maxBytes,
    maxAgeMs: options.maxAgeMs,
    now: options.now,
  });
  return { ...installed, operation: existing ? 'updated' : 'installed' };
}

function runDictionaryOperation(operation, args, snapshot) {
  const tableName = operation === 'search' ? null : requiredString(args.table ?? args.name, 'table');
  const table = tableName
    ? snapshot.tables.find((item) => item.name.toLowerCase() === tableName.toLowerCase()) ?? null
    : null;
  if (operation === 'table') return { table };
  if (operation === 'field') {
    const name = requiredString(args.name, 'name');
    const field = table?.fields.find((item) => item.name.toLowerCase() === name.toLowerCase()) ?? null;
    return { table: table?.name ?? null, field };
  }
  const query = requiredString(args.query, 'query').toLocaleLowerCase('pt-BR');
  const limit = resultLimit(args.limit);
  const items = [];
  for (const candidate of snapshot.tables) {
    if (`${candidate.name} ${candidate.description}`.toLocaleLowerCase('pt-BR').includes(query)) {
      items.push({ kind: 'table', table: candidate.name, description: candidate.description });
    }
    for (const field of candidate.fields) {
      if (`${field.name} ${field.title ?? ''} ${field.description ?? ''}`.toLocaleLowerCase('pt-BR').includes(query)) {
        items.push({ kind: 'field', table: candidate.name, field });
      }
    }
  }
  return { query: args.query.trim(), limit, items: items.slice(0, limit) };
}

export function createDictionarySnapshotAdapter(options = {}) {
  return createSnapshotAdapter({
    ...options,
    integration: 'dictionary',
    kind: 'pea.protheus.dictionary',
    operations: ['field', 'search', 'table'],
    validateSnapshot: validateDictionarySnapshot,
    execute: runDictionaryOperation,
  });
}

const ORACLE_FORBIDDEN = /\b(?:insert|update|delete|merge|alter|drop|truncate|grant|revoke|execute|begin|declare|commit|rollback|call)\b/i;
const SENSITIVE_FIELD = /(?:password|passwd|secret|token|api[_-]?key|authorization|credential)/i;

function validateReadOnlyQuery(name, query) {
  assertPlainObject(query, `Oracle query ${name}`);
  const sql = requiredString(query.sql, `Oracle query ${name} SQL`);
  if (!/^\s*(?:select|with)\b/i.test(sql) || ORACLE_FORBIDDEN.test(sql)
    || /;|--|\/\*|\bfor\s+update\b/i.test(sql)) {
    throw new TypeError(`Oracle query ${name} must be one read-only SELECT`);
  }
  const bindNames = query.bindNames ?? [];
  if (!Array.isArray(bindNames) || bindNames.some((item) => !/^[A-Za-z][A-Za-z0-9_]*$/.test(item))) {
    throw new TypeError(`Oracle query ${name} bindNames are invalid`);
  }
  const uniqueBinds = [...new Set(bindNames)];
  const placeholders = [...sql.matchAll(/:([A-Za-z][A-Za-z0-9_]*)/g)].map((match) => match[1]);
  if (uniqueBinds.length !== bindNames.length
    || [...new Set(placeholders)].some((item) => !uniqueBinds.includes(item))
    || uniqueBinds.some((item) => !placeholders.includes(item))) {
    throw new TypeError(`Oracle query ${name} placeholders must match bindNames`);
  }
  const redactFields = query.redactFields ?? [];
  if (!Array.isArray(redactFields) || redactFields.some((item) => typeof item !== 'string' || item.length === 0)) {
    throw new TypeError(`Oracle query ${name} redactFields are invalid`);
  }
  return Object.freeze({ sql, bindNames: Object.freeze(uniqueBinds), redactFields: Object.freeze([...redactFields]) });
}

function validateBinds(args, query) {
  const allowed = new Set(['name', 'binds']);
  const unexpectedArgs = Object.keys(args).filter((key) => !allowed.has(key));
  if (unexpectedArgs.length > 0) throw new IntegrationError('INTEGRATION_ARGUMENT_INVALID', `unexpected Oracle argument: ${unexpectedArgs[0]}`);
  assertPlainObject(args.binds, 'Oracle binds');
  const keys = Object.keys(args.binds);
  const unexpected = keys.filter((key) => !query.bindNames.includes(key));
  const missing = query.bindNames.filter((key) => !Object.hasOwn(args.binds, key));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new IntegrationError('INTEGRATION_ARGUMENT_INVALID', `Oracle binds do not match named query ${args.name}`);
  }
  for (const value of Object.values(args.binds)) {
    if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) {
      throw new IntegrationError('INTEGRATION_ARGUMENT_INVALID', 'Oracle bind values must be JSON scalars');
    }
    if (typeof value === 'string' && Buffer.byteLength(value) > 4_096) {
      throw new IntegrationError('INTEGRATION_ARGUMENT_INVALID', 'Oracle bind value exceeds 4096 bytes');
    }
  }
  return { ...args.binds };
}

function normalizeDatabaseRows(rows, fields, limits) {
  const explicit = new Set(fields.map((field) => field.toLowerCase()));
  const normalized = rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => {
    if (explicit.has(key.toLowerCase()) || SENSITIVE_FIELD.test(key)) return [key, '[REDACTED]'];
    const type = typeof value;
    if (value !== null && !['string', 'number', 'boolean'].includes(type)) {
      throw new IntegrationError('INTEGRATION_SCHEMA_INVALID', 'database result cells must be JSON scalars');
    }
    if (type === 'number' && !Number.isFinite(value)) {
      throw new IntegrationError('INTEGRATION_SCHEMA_INVALID', 'database result numbers must be finite');
    }
    if (type === 'string' && Buffer.byteLength(value) > limits.maxCellBytes) {
      throw new IntegrationError('INTEGRATION_SCHEMA_INVALID', 'database result cell exceeds byte limit');
    }
    return [key, value];
  })));
  if (Buffer.byteLength(JSON.stringify(normalized)) > limits.maxResultBytes) {
    throw new IntegrationError('INTEGRATION_SCHEMA_INVALID', 'database result exceeds byte limit');
  }
  return normalized;
}

function databaseResultLimits(options, label) {
  const maxCellBytes = options.maxCellBytes ?? DEFAULT_MAX_CELL_BYTES;
  const maxResultBytes = options.maxResultBytes ?? DEFAULT_MAX_DATABASE_RESULT_BYTES;
  const maxFields = options.maxFields ?? 100;
  if (!Number.isInteger(maxCellBytes) || maxCellBytes < 1 || maxCellBytes > 1024 * 1024) {
    throw new TypeError(`${label} maxCellBytes is invalid`);
  }
  if (!Number.isInteger(maxResultBytes) || maxResultBytes < 1 || maxResultBytes > 10 * 1024 * 1024) {
    throw new TypeError(`${label} maxResultBytes is invalid`);
  }
  if (!Number.isInteger(maxFields) || maxFields < 1 || maxFields > 1_000) {
    throw new TypeError(`${label} maxFields is invalid`);
  }
  return { maxCellBytes, maxResultBytes, maxFields };
}

export function createReadOnlyNamedQueryAdapter(options = {}) {
  const dialect = requiredString(options.dialect, 'database dialect').toLowerCase();
  if (!['oracle', 'postgres'].includes(dialect)) throw new TypeError(`unsupported database dialect: ${dialect}`);
  if (typeof options.execute !== 'function') throw new TypeError(`${dialect} execute adapter is required`);
  if (typeof options.authorize !== 'function') throw new TypeError(`${dialect} capability authorizer is required`);
  const capability = requiredString(options.capability, 'database capability');
  assertPlainObject(options.queries, `${dialect} named queries`);
  const queries = new Map();
  for (const [nameValue, query] of Object.entries(options.queries)) {
    const name = requiredString(nameValue, 'database query name');
    assertPlainObject(query, `${dialect} query ${name}`);
    const sql = requiredString(query.sql, `${dialect} query ${name} SQL`);
    if (!/^\s*(?:select|with)\b/i.test(sql) || ORACLE_FORBIDDEN.test(sql)
      || /;|--|\/\*|\bfor\s+update\b/i.test(sql)) {
      throw new TypeError(`${dialect} query ${name} must be one read-only SELECT`);
    }
    const bindNames = query.bindNames ?? [];
    if (!Array.isArray(bindNames) || bindNames.some((item) => !/^[A-Za-z][A-Za-z0-9_]*$/.test(item))
      || new Set(bindNames).size !== bindNames.length) {
      throw new TypeError(`${dialect} query ${name} bindNames are invalid`);
    }
    if (dialect === 'postgres') {
      const positions = [...sql.matchAll(/\$(\d+)/g)].map((match) => Number(match[1]));
      const expected = bindNames.map((_, index) => index + 1);
      if (JSON.stringify([...new Set(positions)].sort((a, b) => a - b)) !== JSON.stringify(expected)) {
        throw new TypeError(`${dialect} query ${name} placeholders must match bindNames`);
      }
    } else {
      const placeholders = [...sql.matchAll(/:([A-Za-z][A-Za-z0-9_]*)/g)].map((match) => match[1]);
      if (JSON.stringify([...new Set(placeholders)].sort()) !== JSON.stringify([...bindNames].sort())) {
        throw new TypeError(`${dialect} query ${name} placeholders must match bindNames`);
      }
    }
    const redactFields = query.redactFields ?? [];
    if (!Array.isArray(redactFields) || redactFields.some((item) => typeof item !== 'string' || !item)) {
      throw new TypeError(`${dialect} query ${name} redactFields are invalid`);
    }
    queries.set(name, { sql, bindNames: [...bindNames], redactFields: [...redactFields] });
  }
  if (queries.size === 0) throw new TypeError(`at least one ${dialect} named query is required`);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRows = options.maxRows ?? 100;
  const resultLimits = databaseResultLimits(options, 'database');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) throw new TypeError('database timeout is invalid');
  if (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > 1_000) throw new TypeError('database maxRows is invalid');

  return Object.freeze({
    integration: dialect,
    mode: 'read-only-named-query',
    schemaVersion: 1,
    async invoke(operation, args = {}, context = {}) {
      if (operation !== 'query') throw new IntegrationError('INTEGRATION_OPERATION_DENIED', `${dialect} supports only named query`);
      assertPlainObject(args, `${dialect} arguments`);
      const name = requiredString(args.name, `${dialect} query name`);
      const query = queries.get(name);
      if (!query) throw new IntegrationError('INTEGRATION_OPERATION_DENIED', `${dialect} named query is not allowlisted: ${name}`);
      const bindObject = validateBinds(args, query);
      const decision = await options.authorize(capability, { dialect, queryName: name, signal: context.signal });
      if (!decision?.allowed) throw new IntegrationError('INTEGRATION_PERMISSION_DENIED', decision?.reason ?? `${dialect} read denied`);
      const values = dialect === 'postgres' ? query.bindNames.map((bind) => bindObject[bind]) : bindObject;
      const startedAt = Date.now();
      let raw;
      try {
        raw = await withTimeout(
          (operationSignal) => options.execute(query.sql, values, {
             dialect, queryName: name, timeoutMs, maxRows: maxRows + 1, readOnly: true,
             maxCellBytes: resultLimits.maxCellBytes, maxResultBytes: resultLimits.maxResultBytes,
             signal: operationSignal,
          }),
          timeoutMs,
          dialect,
          context.signal,
        );
      } catch (error) {
        if (['INTEGRATION_TIMEOUT', 'INTEGRATION_CANCELLED'].includes(error?.code)) throw error;
        throw new IntegrationError('INTEGRATION_FAILED', `${dialect} named query failed`);
      }
      if (!raw || !Array.isArray(raw.rows) || raw.rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
        throw new IntegrationError('INTEGRATION_SCHEMA_INVALID', `${dialect} result requires object rows`);
      }
      if (raw.rows.some((row) => Object.keys(row).length > resultLimits.maxFields)) {
        throw new IntegrationError('INTEGRATION_SCHEMA_INVALID', `${dialect} result exceeds field limit`);
      }
      const truncated = raw.rows.length > maxRows;
      const rows = normalizeDatabaseRows(raw.rows.slice(0, maxRows), query.redactFields, resultLimits);
      return {
        ok: true,
        schemaVersion: 1,
        integration: dialect,
        operation: 'query',
        data: { rows },
        evidence: {
          integration: dialect,
          dialect,
          mode: 'read-only-named-query',
          queryName: name,
          querySha256: createHash('sha256').update(query.sql).digest('hex'),
          rowCount: rows.length,
          truncated,
          durationMs: Math.max(0, Date.now() - startedAt),
        },
      };
    },
  });
}

export function createOracleReadOnlyAdapter(options = {}) {
  if (typeof options.execute !== 'function') throw new TypeError('Oracle execute adapter is required');
  if (typeof options.authorize !== 'function') throw new TypeError('Oracle capability authorizer is required');
  assertPlainObject(options.queries, 'Oracle named queries');
  const queries = new Map(Object.entries(options.queries).map(([name, query]) => [
    requiredString(name, 'Oracle query name'), validateReadOnlyQuery(name, query),
  ]));
  if (queries.size === 0) throw new TypeError('at least one Oracle named query is required');
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRows = options.maxRows ?? 100;
  const resultLimits = databaseResultLimits(options, 'Oracle');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) throw new TypeError('Oracle timeout is invalid');
  if (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > 1_000) throw new TypeError('Oracle maxRows is invalid');

  return Object.freeze({
    integration: 'oracle',
    mode: 'read-only-named-query',
    schemaVersion: 1,
    async invoke(operation, args = {}, context = {}) {
      if (operation !== 'query') throw new IntegrationError('INTEGRATION_OPERATION_DENIED', 'Oracle supports only named query');
      assertPlainObject(args, 'Oracle arguments');
      const name = requiredString(args.name, 'Oracle query name');
      const query = queries.get(name);
      if (!query) throw new IntegrationError('INTEGRATION_OPERATION_DENIED', `Oracle named query is not allowlisted: ${name}`);
      const binds = validateBinds(args, query);
      const decision = await options.authorize('oracle:read', { queryName: name, signal: context.signal });
      if (!decision?.allowed) throw new IntegrationError('INTEGRATION_PERMISSION_DENIED', decision?.reason ?? 'Oracle read denied');
      const startedAt = Date.now();
      let raw;
      try {
        raw = await withTimeout(
           (operationSignal) => options.execute(query.sql, binds, {
             timeoutMs, maxRows: maxRows + 1,
             maxCellBytes: resultLimits.maxCellBytes, maxResultBytes: resultLimits.maxResultBytes,
             signal: operationSignal,
           }),
          timeoutMs,
          'oracle',
          context.signal,
        );
      } catch (error) {
        if (['INTEGRATION_TIMEOUT', 'INTEGRATION_CANCELLED'].includes(error?.code)) throw error;
        throw new IntegrationError('INTEGRATION_FAILED', 'Oracle named query failed');
      }
      if (!raw || !Array.isArray(raw.rows) || raw.rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
        throw new IntegrationError('INTEGRATION_SCHEMA_INVALID', 'Oracle result requires object rows');
      }
      if (raw.rows.some((row) => Object.keys(row).length > resultLimits.maxFields)) {
        throw new IntegrationError('INTEGRATION_SCHEMA_INVALID', 'Oracle result exceeds field limit');
      }
      const truncated = raw.rows.length > maxRows;
      const rows = normalizeDatabaseRows(raw.rows.slice(0, maxRows), query.redactFields, resultLimits);
      return {
        ok: true,
        schemaVersion: 1,
        integration: 'oracle',
        operation: 'query',
        data: { rows },
        evidence: {
          integration: 'oracle',
          mode: 'read-only-named-query',
          queryName: name,
          querySha256: createHash('sha256').update(query.sql).digest('hex'),
          rowCount: rows.length,
          truncated,
          durationMs: Math.max(0, Date.now() - startedAt),
        },
      };
    },
  });
}

export function createIntegrationRegistry(adapters = {}) {
  const configured = new Map(
    Object.entries(adapters).filter(([name, adapter]) =>
      KNOWN_INTEGRATIONS.includes(name) && typeof adapter?.invoke === 'function'),
  );

  return {
    status() {
      return KNOWN_INTEGRATIONS.map((name) => ({ name, available: configured.has(name) }));
    },
    async invoke(name, operation, args, context = {}) {
      const adapter = configured.get(name);
      if (!adapter) {
        return {
          ok: false,
          error: { code: 'INTEGRATION_UNAVAILABLE', integration: name },
        };
      }
      try {
        return await adapter.invoke(operation, args, context);
      } catch (error) {
        return {
          ok: false,
          error: {
            code: error?.code ?? 'INTEGRATION_FAILED',
            integration: name,
            message: String(error?.message ?? error),
          },
        };
      }
    },
  };
}
