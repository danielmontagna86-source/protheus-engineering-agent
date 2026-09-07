import { createHash } from 'node:crypto';
import { lstat, open, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const MAX_RESOURCE_BYTES = 64 * 1024;
const MAX_RESOURCE_COUNT = 64;
const MAX_TOTAL_BYTES = 256 * 1024;

async function listDirectory(path) {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

async function assertStateDirectorySafe(workspace) {
  const stateDirectory = join(workspace, '.pea');
  let state;
  try {
    state = await lstat(stateDirectory);
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  if (state.isSymbolicLink()) throw new Error('state path must not be a symlink');
  if (!state.isDirectory()) throw new Error('state path is not a directory');
}

async function readResource(workspace, path, name) {
  let before;
  try {
    before = await lstat(path);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
  if (!before.isFile() || before.isSymbolicLink()) return null;
  if (before.size > MAX_RESOURCE_BYTES) return null;
  let handle;
  try {
    handle = await open(path, 'r');
    const opened = await handle.stat();
    if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) return null;
    const buffer = Buffer.alloc(MAX_RESOURCE_BYTES + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > MAX_RESOURCE_BYTES) return null;
    const content = buffer.subarray(0, bytesRead).toString('utf8');
    return {
      name,
      path: relative(workspace, path).replaceAll('\\', '/'),
      sha256: createHash('sha256').update(content, 'utf8').digest('hex'),
      content,
      trust: 'untrusted-project-data',
    };
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  } finally {
    await handle?.close();
  }
}

async function discoverSkillCandidates(workspace) {
  const root = join(workspace, '.pea', 'skills');
  const candidates = [];
  for (const entry of await listDirectory(root)) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    candidates.push({ kind: 'skills', path: join(root, entry.name, 'SKILL.md'), name: entry.name });
  }
  return candidates;
}

async function discoverRuleCandidates(workspace) {
  const root = join(workspace, '.pea', 'rules');
  const candidates = [];
  for (const entry of await listDirectory(root)) {
    if (!entry.isFile() || entry.isSymbolicLink() || !entry.name.toLowerCase().endsWith('.md')) continue;
    candidates.push({
      kind: 'rules',
      path: join(root, entry.name),
      name: entry.name.slice(0, -3),
    });
  }
  return candidates;
}

export async function snapshotAgentResources({ workspace }) {
  await assertStateDirectorySafe(workspace);
  const discovered = (await Promise.all([
    discoverSkillCandidates(workspace),
    discoverRuleCandidates(workspace),
  ])).flat().sort((left, right) => left.path.localeCompare(right.path));
  const candidates = discovered.slice(0, MAX_RESOURCE_COUNT);
  const accepted = { skills: [], rules: [] };
  const omitted = {
    discoveryLimit: Math.max(0, discovered.length - candidates.length),
    aggregateLimit: 0,
    invalidOrOversized: 0,
  };
  let totalBytes = 0;
  for (const candidate of candidates) {
    const resource = await readResource(workspace, candidate.path, candidate.name);
    if (!resource) {
      omitted.invalidOrOversized += 1;
      continue;
    }
    const bytes = Buffer.byteLength(resource.content, 'utf8');
    if (totalBytes + bytes > MAX_TOTAL_BYTES) {
      omitted.aggregateLimit += 1;
      continue;
    }
    accepted[candidate.kind].push(resource);
    totalBytes += bytes;
  }
  return {
    schemaVersion: 1,
    skills: accepted.skills,
    rules: accepted.rules,
    omitted,
    limits: {
      maxResourceBytes: MAX_RESOURCE_BYTES,
      maxResources: MAX_RESOURCE_COUNT,
      maxTotalBytes: MAX_TOTAL_BYTES,
    },
  };
}
