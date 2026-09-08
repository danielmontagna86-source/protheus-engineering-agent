import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const KNOWN_INTEGRATIONS = Object.freeze(['dictionary', 'oracle', 'tdn']);
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_CACHE_MS = 5 * 60 * 1_000;
const MAX_RESULT_LIMIT = 50;

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

async function withTimeout(factory, timeoutMs, integration) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(factory),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new IntegrationError(
          'INTEGRATION_TIMEOUT',
          `${integration} snapshot load exceeded ${timeoutMs} ms`,
        )), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function createJsonFileLoader(snapshotPath) {
  const path = requiredString(snapshotPath, 'snapshotPath');
  return async () => JSON.parse(await readFile(path, 'utf8'));
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

  async function getSnapshot() {
    const now = clock();
    if (cache && now - cache.loadedAt <= cacheMs) return { ...cache, cached: true };
    const snapshot = await withTimeout(load, timeoutMs, integration);
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
    async invoke(operation, args = {}) {
      if (!operations.includes(operation)) {
        throw new IntegrationError(
          'INTEGRATION_OPERATION_DENIED',
          `${integration} operation is not read-only or supported: ${String(operation)}`,
        );
      }
      assertPlainObject(args, 'integration arguments');
      const loaded = await getSnapshot();
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

function redactRows(rows, fields) {
  const explicit = new Set(fields.map((field) => field.toLowerCase()));
  return rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key,
    explicit.has(key.toLowerCase()) || SENSITIVE_FIELD.test(key) ? '[REDACTED]' : value,
  ])));
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
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) throw new TypeError('Oracle timeout is invalid');
  if (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > 1_000) throw new TypeError('Oracle maxRows is invalid');

  return Object.freeze({
    integration: 'oracle',
    mode: 'read-only-named-query',
    schemaVersion: 1,
    async invoke(operation, args = {}) {
      if (operation !== 'query') throw new IntegrationError('INTEGRATION_OPERATION_DENIED', 'Oracle supports only named query');
      assertPlainObject(args, 'Oracle arguments');
      const name = requiredString(args.name, 'Oracle query name');
      const query = queries.get(name);
      if (!query) throw new IntegrationError('INTEGRATION_OPERATION_DENIED', `Oracle named query is not allowlisted: ${name}`);
      const binds = validateBinds(args, query);
      const decision = await options.authorize('oracle:read', { queryName: name });
      if (!decision?.allowed) throw new IntegrationError('INTEGRATION_PERMISSION_DENIED', decision?.reason ?? 'Oracle read denied');
      const startedAt = Date.now();
      let raw;
      try {
        raw = await withTimeout(
          () => options.execute(query.sql, binds, { timeoutMs, maxRows: maxRows + 1 }),
          timeoutMs,
          'oracle',
        );
      } catch (error) {
        if (error?.code === 'INTEGRATION_TIMEOUT') throw error;
        throw new IntegrationError('INTEGRATION_FAILED', 'Oracle named query failed');
      }
      if (!raw || !Array.isArray(raw.rows) || raw.rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
        throw new IntegrationError('INTEGRATION_SCHEMA_INVALID', 'Oracle result requires object rows');
      }
      const truncated = raw.rows.length > maxRows;
      const rows = redactRows(raw.rows.slice(0, maxRows), query.redactFields);
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
    async invoke(name, operation, args) {
      const adapter = configured.get(name);
      if (!adapter) {
        return {
          ok: false,
          error: { code: 'INTEGRATION_UNAVAILABLE', integration: name },
        };
      }
      try {
        return await adapter.invoke(operation, args);
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
