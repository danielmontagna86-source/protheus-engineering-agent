import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { lstat, open, readdir, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const MAX_GIT_OUTPUT = 1024 * 1024;
const MAX_CHANGED_FILES = 2_000;
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const VALID_SCOPES = new Set(['staged', 'unstaged', 'working-tree', 'branch']);
const MAX_DISCOVERY_DIRECTORIES = 10_000;
const MAX_REPOSITORIES = 64;
const IGNORED_DISCOVERY_DIRECTORIES = new Set(['.git', '.pea', '.vscode-test', 'coverage', 'dist', 'node_modules', 'release-artifacts']);
const STATUS_NAMES = Object.freeze({
  A: 'added',
  C: 'copied',
  D: 'deleted',
  M: 'modified',
  R: 'renamed',
  T: 'type-changed',
  U: 'unmerged',
  X: 'unknown',
  B: 'broken-pair',
});

function assertInside(root, candidate) {
  const rel = relative(root, candidate);
  if (rel === '..' || rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(rel)) {
    throw new Error(`path is outside workspace: ${candidate}`);
  }
}

function normalizePath(value) {
  const path = String(value ?? '').replaceAll('\\', '/');
  if (!path || path.startsWith('/') || /^[a-z]:/i.test(path) || path.split('/').includes('..')) {
    throw new TypeError('SCM path must be workspace-relative');
  }
  return path;
}

export function parseNameStatus(value) {
  const tokens = String(value ?? '').split('\0');
  if (tokens.at(-1) === '') tokens.pop();
  const files = [];
  for (let index = 0; index < tokens.length;) {
    const statusToken = tokens[index++];
    const code = statusToken?.[0]?.toUpperCase();
    if (!STATUS_NAMES[code]) throw new TypeError('malformed Git name-status output');
    if (code === 'R' || code === 'C') {
      if (index + 1 >= tokens.length) throw new TypeError('malformed Git name-status output');
      const previousPath = normalizePath(tokens[index++]);
      const path = normalizePath(tokens[index++]);
      files.push({ path, previousPath, status: STATUS_NAMES[code] });
    } else {
      if (index >= tokens.length) throw new TypeError('malformed Git name-status output');
      files.push({ path: normalizePath(tokens[index++]), status: STATUS_NAMES[code] });
    }
  }
  if (files.length > MAX_CHANGED_FILES) throw new Error(`SCM change set exceeds ${MAX_CHANGED_FILES} files`);
  return files;
}

export function selectRepository(repositories, requestedRoot) {
  const roots = [...new Set((repositories ?? []).map((item) => resolve(item)))];
  if (roots.length === 0) throw new Error('no Git repository is available');
  if (requestedRoot !== undefined) {
    const requested = resolve(requestedRoot);
    if (!roots.includes(requested)) throw new Error('requested Git repository is not one of the available repositories');
    return requested;
  }
  if (roots.length > 1) throw new Error('ambiguous Git repository selection');
  return roots[0];
}

async function executeGit(cwd, args, options = {}) {
  try {
    const result = await execFileAsync('git', args, {
      cwd,
      encoding: options.encoding === 'buffer' ? null : 'utf8',
      maxBuffer: options.encoding === 'buffer' ? MAX_SOURCE_BYTES + 1 : MAX_GIT_OUTPUT,
      timeout: 15_000,
      windowsHide: true,
      signal: options.signal,
    });
    return { stdout: result.stdout, stderr: result.stderr, status: 0 };
  } catch (error) {
    throw new Error(`Git command failed: ${String(error?.stderr || error?.message || error).trim()}`);
  }
}

async function discoverGitRepositories(workspace, signal) {
  const repositories = [];
  const queue = [workspace];
  let inspected = 0;
  while (queue.length > 0) {
    if (signal?.aborted) throw new Error('SCM operation cancelled');
    const directory = queue.shift();
    inspected += 1;
    if (inspected > MAX_DISCOVERY_DIRECTORIES) throw new Error('Git repository discovery exceeds directory limit');
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      throw new Error(`Git repository discovery failed: ${String(error?.message ?? error)}`);
    }
    const marker = entries.find((entry) => entry.name === '.git');
    if (marker) {
      if (marker.isSymbolicLink() || (!marker.isDirectory() && !marker.isFile())) {
        throw new Error(`Git repository marker is unsafe: ${relative(workspace, join(directory, '.git')) || '.git'}`);
      }
      repositories.push(directory);
      if (repositories.length > MAX_REPOSITORIES) throw new Error('Git repository discovery exceeds repository limit');
    }
    for (const entry of entries) {
      if (signal?.aborted) throw new Error('SCM operation cancelled');
      if (!entry.isDirectory() || entry.isSymbolicLink() || IGNORED_DISCOVERY_DIRECTORIES.has(entry.name)) continue;
      queue.push(join(directory, entry.name));
    }
  }
  return repositories;
}

async function readWorkspaceSource(candidate, repository, signal) {
  if (signal?.aborted) throw new Error('SCM operation cancelled');
  assertInside(repository, candidate);
  const stat = await lstat(candidate);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`SCM source must be a regular file: ${relative(repository, candidate)}`);
  }
  if (stat.size > MAX_SOURCE_BYTES) throw new Error(`SCM source exceeds ${MAX_SOURCE_BYTES} bytes`);
  const [resolvedRepository, resolvedCandidate] = await Promise.all([realpath(repository), realpath(candidate)]);
  assertInside(resolvedRepository, resolvedCandidate);
  const handle = await open(resolvedCandidate, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const bytes = await handle.readFile({ signal });
    if (bytes.length > MAX_SOURCE_BYTES) throw new Error(`SCM source exceeds ${MAX_SOURCE_BYTES} bytes`);
    return bytes;
  } finally {
    await handle.close();
  }
}

async function inspectWorkspaceFile(candidate, repository, signal) {
  if (signal?.aborted) throw new Error('SCM operation cancelled');
  assertInside(repository, candidate);
  let stat;
  try {
    stat = await lstat(candidate);
  } catch (error) {
    if (error?.code === 'ENOENT') return { binary: false };
    throw error;
  }
  if (stat.isSymbolicLink()) throw new Error(`SCM source must not be a symbolic link: ${relative(repository, candidate)}`);
  if (!stat.isFile()) return { binary: false };
  const [resolvedRepository, resolvedCandidate] = await Promise.all([realpath(repository), realpath(candidate)]);
  assertInside(resolvedRepository, resolvedCandidate);
  const handle = await open(resolvedCandidate, 'r');
  try {
    const buffer = Buffer.alloc(Math.min(8_192, stat.size));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (signal?.aborted) throw new Error('SCM operation cancelled');
    return { binary: buffer.subarray(0, bytesRead).includes(0) };
  } finally {
    await handle.close();
  }
}

function validateBaseRef(baseRef) {
  if (typeof baseRef !== 'string' || baseRef.length === 0) throw new TypeError('baseRef is required for branch scope');
  if (!/^[a-z0-9][a-z0-9._/@{}+\-]{0,127}$/i.test(baseRef) || baseRef.includes('..')) {
    throw new TypeError('invalid baseRef');
  }
  return baseRef;
}

export function createGitScm(options) {
  const workspace = resolve(options.workspace);
  const execute = options.execute ?? executeGit;
  const realpathImpl = options.realpathImpl ?? realpath;
  const inspectFile = options.inspectFile ?? inspectWorkspaceFile;
  const discoverRepositories = options.discoverRepositories
    ?? (options.execute ? async () => [workspace] : discoverGitRepositories);

  async function resolveRepository(repository, signal) {
    const repositories = options.repositories ?? await discoverRepositories(workspace, signal);
    const candidate = selectRepository(repositories, repository);
    assertInside(workspace, candidate);
    const response = await execute(candidate, ['rev-parse', '--show-toplevel'], { signal });
    if (response?.status && response.status !== 0) throw new Error(`no Git repository is available: ${response.stderr ?? ''}`.trim());
    const reported = String(response?.stdout ?? '').trim();
    if (!reported) throw new Error('no Git repository is available');
    const [resolvedWorkspace, resolvedRepository] = await Promise.all([
      realpathImpl(workspace),
      realpathImpl(resolve(reported)),
    ]);
    assertInside(resolvedWorkspace, resolvedRepository);
    return resolvedRepository;
  }

  async function run(repository, args, signal) {
    const response = await execute(repository, ['-c', 'core.quotepath=false', ...args], { signal });
    if (response?.status && response.status !== 0) {
      throw new Error(`Git command failed: ${String(response.stderr ?? '').trim()}`);
    }
    const stdout = String(response?.stdout ?? '');
    if (Buffer.byteLength(stdout, 'utf8') > MAX_GIT_OUTPUT) throw new Error('Git output exceeds 1 MiB');
    return stdout;
  }

  async function runBytes(repository, args, signal) {
    const response = await execute(repository, ['-c', 'core.quotepath=false', ...args], { encoding: 'buffer', signal });
    if (response?.status && response.status !== 0) {
      throw new Error(`Git command failed: ${String(response.stderr ?? '').trim()}`);
    }
    const stdout = Buffer.isBuffer(response?.stdout)
      ? response.stdout
      : Buffer.from(String(response?.stdout ?? ''), 'utf8');
    if (stdout.length > MAX_SOURCE_BYTES) throw new Error(`SCM source exceeds ${MAX_SOURCE_BYTES} bytes`);
    return stdout;
  }

  async function readSourceFromRepository(repositoryRoot, path, scope, baseRef, signal) {
    const normalizedPath = normalizePath(path);
    if (scope === 'staged') return runBytes(repositoryRoot, ['show', `:${normalizedPath}`], signal);
    if (scope === 'branch') {
      validateBaseRef(baseRef);
      return runBytes(repositoryRoot, ['show', `HEAD:${normalizedPath}`], signal);
    }
    return readWorkspaceSource(resolve(repositoryRoot, normalizedPath), repositoryRoot, signal);
  }

  return {
    async repositories({ signal } = {}) {
      if (signal?.aborted) throw new Error('SCM operation cancelled');
      const repositories = options.repositories ?? await discoverRepositories(workspace, signal);
      const resolvedWorkspace = await realpathImpl(workspace);
      const values = [];
      for (const repository of repositories) {
        const resolvedRepository = await realpathImpl(resolve(repository));
        assertInside(resolvedWorkspace, resolvedRepository);
        values.push(relative(resolvedWorkspace, resolvedRepository).replaceAll('\\', '/') || '.');
      }
      return [...new Set(values)].sort();
    },
    async changes({ scope = 'working-tree', baseRef, repository, signal } = {}) {
      if (!VALID_SCOPES.has(scope)) throw new TypeError(`unsupported SCM scope: ${scope}`);
      const repositoryRoot = await resolveRepository(repository, signal);
      const resolvedWorkspace = await realpathImpl(workspace);
      let output;
      if (scope === 'staged') {
        output = await run(repositoryRoot, ['diff', '--cached', '--name-status', '-z', '--'], signal);
      } else if (scope === 'unstaged') {
        output = await run(repositoryRoot, ['diff', '--name-status', '-z', '--'], signal);
      } else if (scope === 'branch') {
        output = await run(repositoryRoot, ['diff', '--name-status', '-z', `${validateBaseRef(baseRef)}...HEAD`, '--'], signal);
      } else {
        output = await run(repositoryRoot, ['diff', 'HEAD', '--name-status', '-z', '--'], signal);
      }

      const files = parseNameStatus(output);
      if (scope === 'unstaged' || scope === 'working-tree') {
        const untracked = (await run(repositoryRoot, ['ls-files', '--others', '--exclude-standard', '-z'], signal))
          .split('\0')
          .filter(Boolean)
          .map((path) => ({ path: normalizePath(path), status: 'untracked' }));
        files.push(...untracked);
      }
      if (files.length > MAX_CHANGED_FILES) throw new Error(`SCM change set exceeds ${MAX_CHANGED_FILES} files`);

      const deduplicated = new Map();
      for (const file of files) deduplicated.set(file.path, file);
      const normalized = [];
      for (const file of deduplicated.values()) {
        let binary = false;
        if (file.status !== 'deleted') {
          binary = scope === 'staged' || scope === 'branch'
            ? (await readSourceFromRepository(repositoryRoot, file.path, scope, baseRef, signal)).subarray(0, 8_192).includes(0)
            : Boolean((await inspectFile(resolve(repositoryRoot, file.path), repositoryRoot, signal)).binary);
        }
        normalized.push({ ...file, binary });
      }
      normalized.sort((left, right) => left.path.localeCompare(right.path));
      return {
        schemaVersion: 1,
        status: normalized.length === 0 ? 'clean' : 'changed',
        repository: relative(resolvedWorkspace, repositoryRoot).replaceAll('\\', '/') || '.',
        scope: { kind: scope, baseRef: scope === 'branch' ? baseRef : null },
        files: normalized,
      };
    },
    async readSource({ path, scope = 'working-tree', baseRef, repository, signal } = {}) {
      if (!VALID_SCOPES.has(scope)) throw new TypeError(`unsupported SCM scope: ${scope}`);
      const repositoryRoot = await resolveRepository(repository, signal);
      return readSourceFromRepository(repositoryRoot, path, scope, baseRef, signal);
    },
  };
}
