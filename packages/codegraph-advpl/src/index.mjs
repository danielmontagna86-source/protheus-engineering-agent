import { createHash } from 'node:crypto';
import { lstat, open, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

import { eligibleCallTargets, resolveCallTarget } from './resolve.mjs';

export const ADVPL_EXTENSIONS = Object.freeze(new Set([
  '.prw', '.prg', '.prx', '.tlpp', '.ppx', '.ppp', '.apw', '.aph',
]));

const SKIP_DIRECTORIES = new Set(['.git', '.pea', '.vscode', 'node_modules', 'dist', 'build']);
const DEFAULT_MAX_FILES = 10_000;
const DEFAULT_MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_SOURCE_BYTES = 256 * 1024 * 1024;

function positiveLimit(value, fallback, name) {
  const limit = value ?? fallback;
  if (!Number.isSafeInteger(limit) || limit < 1) throw new TypeError(`${name} must be a positive safe integer`);
  return limit;
}

async function readBoundedRegularFile(path, maxBytes) {
  const before = await lstat(path);
  if (!before.isFile() || before.isSymbolicLink()) throw new Error(`source is not a regular file: ${path}`);
  if (before.size > maxBytes) throw new Error(`per-file source byte limit exceeded: ${path}`);
  const handle = await open(path, 'r');
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) {
      throw new Error(`source changed during bounded read: ${path}`);
    }
    const buffer = Buffer.alloc(before.size + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > maxBytes) throw new Error(`per-file source byte limit exceeded: ${path}`);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

export function decodeSource(bytes) {
  if (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) {
    throw new TypeError('source bytes must be a Buffer or Uint8Array');
  }
  const view = Buffer.from(bytes);
  if (view.length >= 2 && view[0] === 0xff && view[1] === 0xfe) {
    return { encoding: 'utf-16le', text: new TextDecoder('utf-16le').decode(view) };
  }
  try {
    return {
      encoding: 'utf-8',
      text: new TextDecoder('utf-8', { fatal: true }).decode(view),
    };
  } catch {
    return {
      encoding: 'windows-1252',
      text: new TextDecoder('windows-1252').decode(view),
    };
  }
}

function maskCommentsAndStrings(source) {
  const chars = Array.from(source);
  let mode = 'code';
  for (let index = 0; index < chars.length; index += 1) {
    const current = chars[index];
    const next = chars[index + 1];
    if (mode === 'line-comment') {
      if (current === '\n') mode = 'code';
      else chars[index] = ' ';
      continue;
    }
    if (mode === 'block-comment') {
      if (current === '*' && next === '/') {
        chars[index] = ' ';
        chars[index + 1] = ' ';
        index += 1;
        mode = 'code';
      } else if (current !== '\n') chars[index] = ' ';
      continue;
    }
    if (mode === 'string-double' || mode === 'string-single') {
      const quote = mode === 'string-double' ? '"' : "'";
      if (current === quote) mode = 'code';
      if (current !== '\n') chars[index] = ' ';
      continue;
    }
    if (current === '/' && next === '/') {
      chars[index] = ' ';
      chars[index + 1] = ' ';
      index += 1;
      mode = 'line-comment';
    } else if (current === '/' && next === '*') {
      chars[index] = ' ';
      chars[index + 1] = ' ';
      index += 1;
      mode = 'block-comment';
    } else if (current === '"') {
      chars[index] = ' ';
      mode = 'string-double';
    } else if (current === "'") {
      chars[index] = ' ';
      mode = 'string-single';
    }
  }
  return chars.join('');
}

function createLineIndex(source) {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\n') starts.push(index + 1);
  }
  return starts;
}

function lineAt(starts, offset) {
  let low = 0;
  let high = starts.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (starts[middle] <= offset) low = middle + 1;
    else high = middle;
  }
  return low;
}

function declarationKind(prefix) {
  const normalized = prefix.trim().toLowerCase();
  if (normalized.startsWith('user')) return 'user-function';
  if (normalized.startsWith('static')) return 'static-function';
  if (normalized.startsWith('method')) return 'method';
  return 'function';
}

export function parseAdvplSource(source, options = {}) {
  const file = options.file ?? '<memory>';
  const masked = maskCommentsAndStrings(source);
  const lineIndex = createLineIndex(source);
  const declarations = [];
  const declarationPattern = /^[ \t]*((?:User\s+|Static\s+)?Function|Method)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)(?:\s+Class\s+([A-Za-z_][A-Za-z0-9_]*))?/gim;
  function enclosingClass(offset) {
    let owner;
    const classPattern = /^[ \t]*(Class\s+([A-Za-z_][A-Za-z0-9_]*)|EndClass)\b/gim;
    for (const match of masked.slice(0, offset).matchAll(classPattern)) {
      owner = match[2] ?? undefined;
    }
    return owner;
  }
  for (const match of masked.matchAll(declarationPattern)) {
    const name = match[2];
    const kind = declarationKind(match[1]);
    const owner = kind === 'method' ? (match[4] ?? enclosingClass(match.index)) : undefined;
    if (kind === 'method' && owner && !match[4]) continue;
    const canonical = name.toLowerCase();
    const symbolId = owner
      ? `${file}#${owner.toLowerCase()}.${canonical}`
      : `${file}#${canonical}`;
    declarations.push({
      index: match.index,
      bodyStart: match.index + match[0].length,
      symbol: {
        id: symbolId,
        name,
        canonical,
        kind,
        file,
        line: lineAt(lineIndex, match.index),
        params: match[3].split(',').map((item) => item.trim()).filter(Boolean),
        confidence: 'high',
        ...(owner ? { owner } : {}),
      },
    });
  }

  const calls = [];
  const ignored = new Set([
    'if', 'elseif', 'while', 'for', 'return', 'local', 'private', 'public',
    'default', 'function', 'method', 'class', 'static', 'user',
  ]);
  for (let index = 0; index < declarations.length; index += 1) {
    const declaration = declarations[index];
    const end = declarations[index + 1]?.index ?? masked.length;
    const body = masked.slice(declaration.bodyStart, end);
    const callPattern = /\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
    for (const match of body.matchAll(callPattern)) {
      const callee = match[1];
      if (ignored.has(callee.toLowerCase())) continue;
      calls.push({
        caller: declaration.symbol.name,
        callerCanonical: declaration.symbol.canonical,
        callerId: declaration.symbol.id,
        callee,
        calleeCanonical: callee.toLowerCase(),
        file,
        line: lineAt(lineIndex, declaration.bodyStart + match.index),
        confidence: 'high',
      });
    }
  }

  const diagnostics = [];
  for (const match of masked.matchAll(/^[ \t]*#(?:define|if|ifdef|ifndef|else|endif)\b/gim)) {
    diagnostics.push({
      code: 'PREPROCESSOR_SEMANTICS_UNRESOLVED',
      severity: 'info',
      line: lineAt(lineIndex, match.index),
      message: 'Preprocessor behavior is preserved as unresolved semantic evidence.',
    });
  }
  for (const match of masked.matchAll(/&\s*\(/g)) {
    diagnostics.push({
      code: 'DYNAMIC_CALL_UNRESOLVED',
      severity: 'warning',
      line: lineAt(lineIndex, match.index),
      message: 'Macro or dynamic invocation cannot be resolved statically.',
    });
  }
  for (const match of masked.matchAll(/^[ \t]*(?:(?:User|Static)\s+)?Function\s+[A-Za-z_][A-Za-z0-9_]*\s*\([^\n)]*$/gim)) {
    diagnostics.push({
      code: 'INCOMPLETE_DECLARATION',
      severity: 'warning',
      line: lineAt(lineIndex, match.index),
      message: 'Function declaration is incomplete; parsing continued with partial evidence.',
    });
  }
  diagnostics.sort((left, right) => left.line - right.line || left.code.localeCompare(right.code));

  return {
    schemaVersion: 2,
    parser: 'tolerant-lexical-v2',
    complete: !diagnostics.some((item) => item.code === 'INCOMPLETE_DECLARATION'),
    symbols: declarations.map((item) => item.symbol),
    calls,
    diagnostics,
  };
}

export function createIncrementalParser(options = {}) {
  const parse = options.parse ?? parseAdvplSource;
  const maxEntries = options.maxEntries ?? 2_000;
  if (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > 100_000) {
    throw new TypeError('incremental parser maxEntries must be between 1 and 100000');
  }
  const cache = new Map();
  return {
    parse(file, source) {
      if (typeof file !== 'string' || file.length === 0) throw new TypeError('incremental parser file is required');
      if (typeof source !== 'string') throw new TypeError('incremental parser source must be a string');
      const hash = createHash('sha256').update(source).digest('hex');
      const existing = cache.get(file);
      if (existing?.hash === hash) {
        cache.delete(file);
        cache.set(file, existing);
        return { ...structuredClone(existing.ir), cache: { reused: true, hash } };
      }
      const ir = parse(source, { file });
      cache.set(file, { hash, ir: structuredClone(ir) });
      while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
      return { ...ir, cache: { reused: false, hash } };
    },
    invalidate(file) {
      return cache.delete(file);
    },
    clear() {
      cache.clear();
    },
    get size() {
      return cache.size;
    },
  };
}

function assertNotCancelled(signal) {
  if (signal?.aborted) {
    const error = new Error('workspace indexing cancelled');
    error.code = 'INDEX_CANCELLED';
    throw error;
  }
}

async function collectSources(directory, root, files, signal, maxFiles) {
  assertNotCancelled(signal);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assertNotCancelled(signal);
    if (entry.isSymbolicLink()) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry.name)) await collectSources(path, root, files, signal, maxFiles);
      continue;
    }
    if (ADVPL_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(path);
      if (files.length > maxFiles) throw new Error(`workspace source file limit exceeded: ${maxFiles}`);
    }
  }
}

export async function indexWorkspace(workspacePath, options = {}) {
  const root = resolve(workspacePath);
  const maxFiles = positiveLimit(options.maxFiles, DEFAULT_MAX_FILES, 'maxFiles');
  const maxSourceBytes = positiveLimit(options.maxSourceBytes, DEFAULT_MAX_SOURCE_BYTES, 'maxSourceBytes');
  const maxTotalSourceBytes = positiveLimit(
    options.maxTotalSourceBytes, DEFAULT_MAX_TOTAL_SOURCE_BYTES, 'maxTotalSourceBytes',
  );
  const files = [];
  assertNotCancelled(options.signal);
  await collectSources(root, root, files, options.signal, maxFiles);
  files.sort((left, right) => left.localeCompare(right));

  const nodes = [];
  const rawCalls = [];
  const encodings = {};
  let cacheHits = 0;
  let cacheMisses = 0;
  let totalSourceBytes = 0;
  for (const path of files) {
    assertNotCancelled(options.signal);
    const rel = relative(root, path).replaceAll('\\', '/');
    const bytes = await readBoundedRegularFile(path, maxSourceBytes);
    totalSourceBytes += bytes.length;
    if (totalSourceBytes > maxTotalSourceBytes) {
      throw new Error(`workspace aggregate source byte limit exceeded: ${maxTotalSourceBytes}`);
    }
    const decoded = decodeSource(bytes);
    encodings[rel] = decoded.encoding;
    const parsed = options.incrementalParser
      ? options.incrementalParser.parse(rel, decoded.text)
      : parseAdvplSource(decoded.text, { file: rel });
    if (parsed.cache?.reused) cacheHits += 1;
    else cacheMisses += 1;
    nodes.push(...parsed.symbols);
    rawCalls.push(...parsed.calls);
  }

  const byCanonical = new Map();
  const byId = new Map();
  for (const node of nodes) {
    const candidates = byCanonical.get(node.canonical) ?? [];
    candidates.push(node);
    byCanonical.set(node.canonical, candidates);
    byId.set(node.id, node);
  }
  const edges = rawCalls.map((call) => {
    const candidates = byCanonical.get(call.calleeCanonical) ?? [];
    const { target, resolution, candidateCount } = resolveCallTarget(call, candidates);
    const callerId = call.callerId ?? `${call.file}#${call.callerCanonical}`;
    return {
      from: call.caller,
      fromId: callerId,
      to: target?.name ?? call.callee,
      toId: target?.id ?? null,
      file: call.file,
      line: call.line,
      resolved: Boolean(target),
      targetFile: target?.file ?? null,
      resolution,
      candidateCount,
      candidateTargets: eligibleCallTargets(call, candidates)
        .map((candidate) => ({
          symbolId: candidate.id,
          name: candidate.name,
          file: candidate.file,
          line: candidate.line,
        }))
        .sort((left, right) => left.symbolId.localeCompare(right.symbolId)),
    };
  });

  const orderedNodes = [...nodes].sort((left, right) => left.id.localeCompare(right.id));
  const dependencies = orderedNodes.map((node) => ({
    symbolId: node.id,
    name: node.name,
    file: node.file,
    targets: edges
      .filter((edge) => edge.resolved && edge.fromId === node.id)
      .map((edge) => ({
        symbolId: edge.toId,
        name: edge.to,
        file: edge.targetFile,
        line: edge.line,
      }))
      .sort((left, right) => left.symbolId.localeCompare(right.symbolId) || left.line - right.line),
  }));
  const callers = orderedNodes.map((node) => ({
    symbolId: node.id,
    name: node.name,
    file: node.file,
    sources: edges
      .filter((edge) => edge.resolved && edge.toId === node.id)
      .map((edge) => {
        const caller = byId.get(edge.fromId);
        return {
          symbolId: edge.fromId,
          name: caller?.name ?? edge.from,
          file: edge.file,
          line: edge.line,
        };
      })
      .sort((left, right) => left.symbolId.localeCompare(right.symbolId) || left.line - right.line),
  }));
  const unresolvedTargets = edges
    .filter((edge) => edge.resolution === 'unresolved')
    .map((edge) => ({
      callerId: edge.fromId,
      caller: edge.from,
      callee: edge.to,
      file: edge.file,
      line: edge.line,
    }));
  const ambiguousTargets = edges
    .filter((edge) => edge.resolution === 'ambiguous')
    .map((edge) => ({
      callerId: edge.fromId,
      caller: edge.from,
      callee: edge.to,
      file: edge.file,
      line: edge.line,
      candidates: edge.candidateTargets,
    }));

  return {
    schemaVersion: 1,
    workspace: root,
    files: files.map((path) => relative(root, path).replaceAll('\\', '/')),
    encodings,
    nodes,
    edges,
    analysis: {
      parser: 'tolerant-lexical-v2',
      cache: { enabled: Boolean(options.incrementalParser), hits: cacheHits, misses: cacheMisses },
      limitations: [
        'Dynamic, macro, object-message and preprocessor-generated calls are not resolved.',
        'Method overloads, inheritance and framework symbols require external semantic evidence.',
      ],
      callers,
      dependencies,
      unresolvedTargets,
      ambiguousTargets,
    },
  };
}
