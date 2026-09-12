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

async function assertResourceRootSafe(workspace, relativeRoot) {
  const segments = relativeRoot.split('/');
  for (let index = 1; index <= segments.length; index += 1) {
    const candidate = join(workspace, ...segments.slice(0, index));
    let state;
    try {
      state = await lstat(candidate);
    } catch (error) {
      if (error?.code === 'ENOENT') return false;
      throw error;
    }
    if (state.isSymbolicLink()) throw new Error('resource root must not be a symlink');
    if (!state.isDirectory()) throw new Error('resource root is not a directory');
  }
  return true;
}

async function readResource(workspace, path, name, source) {
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
      ...(source ? { source } : {}),
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
  const candidates = [];
  const roots = [
    { relative: '.agents/skills', source: 'agents-standard' },
    { relative: '.github/skills', source: 'github-standard' },
    { relative: '.pea/skills', source: 'pea-local' },
  ];
  const claimedNames = new Set();
  for (const rootDefinition of roots) {
    if (!await assertResourceRootSafe(workspace, rootDefinition.relative)) continue;
    const root = join(workspace, ...rootDefinition.relative.split('/'));
    const entries = (await listDirectory(root)).sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      const canonicalName = entry.name.toLowerCase();
      if (claimedNames.has(canonicalName)) continue;
      claimedNames.add(canonicalName);
      candidates.push({
        kind: 'skills',
        path: join(root, entry.name, 'SKILL.md'),
        name: entry.name,
        source: rootDefinition.source,
      });
    }
  }
  return candidates;
}

async function discoverRuleCandidates(workspace) {
  if (!await assertResourceRootSafe(workspace, '.pea/rules')) return [];
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

async function readSkillProviders(workspace) {
  const configDirectory = join(workspace, 'config');
  const catalogPath = join(configDirectory, 'skill-providers.json');
  let directoryState;
  try {
    directoryState = await lstat(configDirectory);
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  if (directoryState.isSymbolicLink() || !directoryState.isDirectory()) {
    throw new Error('skill provider config path must be a real directory');
  }
  let resource;
  try {
    resource = await readResource(workspace, catalogPath, 'skill-providers', 'provider-catalog');
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  if (!resource) {
    try {
      await lstat(catalogPath);
    } catch (error) {
      if (error?.code === 'ENOENT') return [];
      throw error;
    }
    throw new Error('skill provider catalog must be a bounded regular file');
  }
  let catalog;
  try {
    catalog = JSON.parse(resource.content);
  } catch {
    throw new Error('skill provider catalog must be valid JSON');
  }
  if (catalog?.schemaVersion !== 1 || !Array.isArray(catalog.providers)) {
    throw new Error('skill provider catalog schema is invalid');
  }
  if (catalog.providers.length > 16) throw new Error('skill provider catalog exceeds provider limit');
  const identities = new Set();
  const providers = catalog.providers.map((provider) => {
    if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(provider?.id ?? '')) {
      throw new Error('skill provider id is invalid');
    }
    if (identities.has(provider.id)) throw new Error('skill provider id must be unique');
    identities.add(provider.id);
    if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(provider.repository ?? '')) {
      throw new Error('skill provider repository must be a GitHub URL');
    }
    if (typeof provider.license !== 'string' || provider.license.length === 0 || provider.license.length > 64) {
      throw new Error('skill provider license is invalid');
    }
    if (!/^[0-9a-f]{40}$/i.test(provider.revision ?? '')) {
      throw new Error('skill provider revision must be pinned');
    }
    if (!['reference', 'import'].includes(provider.mode)) {
      throw new Error('skill provider mode is invalid');
    }
    if (!Array.isArray(provider.allowedSkills)
      || provider.allowedSkills.length > 64
      || provider.allowedSkills.some((name) => !/^[a-z0-9][a-z0-9-]{0,63}$/.test(name))) {
      throw new Error('skill provider allowedSkills is invalid');
    }
    return {
      id: provider.id,
      repository: provider.repository,
      license: provider.license,
      revision: provider.revision.toLowerCase(),
      mode: provider.mode,
      allowedSkills: [...new Set(provider.allowedSkills)],
      trust: 'untrusted-project-data',
    };
  });
  return providers.sort((left, right) => left.id.localeCompare(right.id));
}

export async function snapshotAgentResources({ workspace }) {
  await assertStateDirectorySafe(workspace);
  const providers = await readSkillProviders(workspace);
  const discovered = (await Promise.all([
    discoverSkillCandidates(workspace),
    discoverRuleCandidates(workspace),
  ])).flat();
  const candidates = discovered.slice(0, MAX_RESOURCE_COUNT);
  const accepted = { skills: [], rules: [] };
  const omitted = {
    discoveryLimit: Math.max(0, discovered.length - candidates.length),
    aggregateLimit: 0,
    invalidOrOversized: 0,
  };
  let totalBytes = 0;
  for (const candidate of candidates) {
    const resource = await readResource(workspace, candidate.path, candidate.name, candidate.source);
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
    providers,
    omitted,
    limits: {
      maxResourceBytes: MAX_RESOURCE_BYTES,
      maxResources: MAX_RESOURCE_COUNT,
      maxTotalBytes: MAX_TOTAL_BYTES,
    },
  };
}
