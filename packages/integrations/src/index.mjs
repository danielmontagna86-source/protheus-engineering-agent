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
