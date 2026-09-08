import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

import { eligibleCallTargets, resolveCallTarget } from './resolve.mjs';

export const ADVPL_EXTENSIONS = Object.freeze(new Set([
  '.prw', '.prg', '.prx', '.tlpp', '.ppx', '.ppp', '.apw', '.aph',
]));

const SKIP_DIRECTORIES = new Set(['.git', '.pea', '.vscode', 'node_modules', 'dist', 'build']);

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
  const declarationPattern = /^[ \t]*((?:User\s+|Static\s+)?Function|Method)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)/gim;
  for (const match of masked.matchAll(declarationPattern)) {
    const name = match[2];
    declarations.push({
      index: match.index,
      bodyStart: match.index + match[0].length,
      symbol: {
        id: `${file}#${name.toLowerCase()}`,
        name,
        canonical: name.toLowerCase(),
        kind: declarationKind(match[1]),
        file,
        line: lineAt(lineIndex, match.index),
        params: match[3].split(',').map((item) => item.trim()).filter(Boolean),
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
        callee,
        calleeCanonical: callee.toLowerCase(),
        file,
        line: lineAt(lineIndex, declaration.bodyStart + match.index),
      });
    }
  }

  return { symbols: declarations.map((item) => item.symbol), calls };
}

async function collectSources(directory, root, files) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRECTORIES.has(entry.name)) await collectSources(path, root, files);
      continue;
    }
    if (ADVPL_EXTENSIONS.has(extname(entry.name).toLowerCase())) files.push(path);
  }
}

export async function indexWorkspace(workspacePath) {
  const root = resolve(workspacePath);
  const files = [];
  await collectSources(root, root, files);
  files.sort((left, right) => left.localeCompare(right));

  const nodes = [];
  const rawCalls = [];
  const encodings = {};
  for (const path of files) {
    const rel = relative(root, path).replaceAll('\\', '/');
    const decoded = decodeSource(await readFile(path));
    encodings[rel] = decoded.encoding;
    const parsed = parseAdvplSource(decoded.text, { file: rel });
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
    const callerId = `${call.file}#${call.callerCanonical}`;
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
      parser: 'lexical',
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
