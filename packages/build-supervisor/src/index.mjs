import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { lstat, mkdir, open, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

const MAX_TIMEOUT_MS = 30 * 60 * 1_000;
const DEFAULT_TIMEOUT_MS = 2 * 60 * 1_000;
const DEFAULT_MAX_LOG_BYTES = 256 * 1_024;
const MAX_STORE_BYTES = 2 * 1_024 * 1_024;
const DEFAULT_MAX_ARTIFACT_BYTES = 512 * 1_024 * 1_024;

class BuildContractError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function validatePlan(plan) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    throw new TypeError('build plan must be an object');
  }
  const mode = plan.mode ?? 'simulation';
  if (!['compiler', 'simulation'].includes(mode)) throw new TypeError('build mode must be compiler or simulation');
  if (!Array.isArray(plan.steps) || plan.steps.length === 0) throw new TypeError('build plan requires steps');
  const ids = new Set();
  for (const step of plan.steps) {
    if (typeof step?.id !== 'string' || step.id.length === 0) throw new TypeError('build step id is required');
    if (ids.has(step.id)) throw new TypeError(`duplicate build step id: ${step.id}`);
    ids.add(step.id);
    if (step.timeoutMs !== undefined
      && (!Number.isInteger(step.timeoutMs) || step.timeoutMs < 1 || step.timeoutMs > MAX_TIMEOUT_MS)) {
      throw new TypeError(`invalid timeout for build step: ${step.id}`);
    }
  }
  return mode;
}

function defaultRedact(value) {
  return String(value)
    .replace(/\b(Bearer\s+)[^\s"']+/gi, '$1[REDACTED]')
    .replace(/\b((?:proxy-)?authorization\s*:\s*basic\s+)[^\s"']+/gi, '$1[REDACTED]')
    .replace(/\b((?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|rediss|amqp|amqps|oracle):\/\/)[^@\s/]+@/gi, '$1[REDACTED]@')
    .replace(/(["'](?:api[_-]?key|token|password|secret|connection[_-]?string|database[_-]?url|private[_-]?key|client[_-]?secret|access[_-]?key)["']\s*:\s*["'])[^"']*(["'])/gi, '$1[REDACTED]$2')
    .replace(/((?:api[_-]?key|token|password|secret|connection[_-]?string|database[_-]?url|private[_-]?key|client[_-]?secret|access[_-]?key)\s*[=:]\s*)[^\s,"']+/gi, '$1[REDACTED]')
    .replace(/([?&](?:api[_-]?key|token|password|secret|connection[_-]?string|database[_-]?url|private[_-]?key|client[_-]?secret|access[_-]?key)=)[^&#\s]+/gi, '$1[REDACTED]')
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16})\b/g, '[REDACTED]');
}

function commandIdentity(command, redact = defaultRedact) {
  if (command === undefined) return null;
  if (!command || typeof command.executable !== 'string' || command.executable.length === 0
    || !Array.isArray(command.args) || command.args.some((item) => typeof item !== 'string')) {
    throw new TypeError('build command requires executable and string args');
  }
  const args = command.args.map((argument, index) => {
    const previous = command.args[index - 1] ?? '';
    if (/^(?:--?|\/)(?:api[_-]?key|token|password|secret)$/i.test(previous)) return '[REDACTED]';
    return redact(argument);
  });
  return {
    executable: redact(command.executable),
    args,
    ...(command.identity ? { identity: redact(command.identity) } : {}),
  };
}

function boundedLog(value, maxBytes, label) {
  if (value === undefined || value === null) return { text: '', truncated: false };
  if (typeof value !== 'string') throw new BuildContractError('BUILD_RESULT_INVALID', `${label} must be a string`);
  const bytes = Buffer.from(value);
  if (bytes.length <= maxBytes) return { text: value, truncated: false };
  return { text: bytes.subarray(0, maxBytes).toString('utf8'), truncated: true };
}

function normalizeResult(result, maxLogBytes, redact) {
  if (!result || typeof result !== 'object' || !Number.isInteger(result.exitCode)) {
    throw new BuildContractError('BUILD_RESULT_INVALID', 'runner result requires an integer exitCode');
  }
  const stdout = boundedLog(redact(result.stdout ?? result.output ?? ''), maxLogBytes, 'stdout');
  const stderr = boundedLog(redact(result.stderr ?? ''), maxLogBytes, 'stderr');
  const artifacts = result.artifacts ?? [];
  if (!Array.isArray(artifacts) || artifacts.some((artifact) => (
    typeof artifact?.path !== 'string' || artifact.path.length === 0
    || !/^[a-f0-9]{64}$/i.test(artifact.sha256 ?? '')
  ))) {
    throw new BuildContractError('BUILD_RESULT_INVALID', 'artifacts require path and SHA-256');
  }
  let compiler = null;
  if (result.compiler !== undefined && result.compiler !== null) {
    if (!result.compiler || typeof result.compiler !== 'object' || Array.isArray(result.compiler)) {
      throw new BuildContractError('BUILD_RESULT_INVALID', 'compiler evidence must be an object');
    }
    compiler = {
      ...(typeof result.compiler.identity === 'string' ? { identity: redact(result.compiler.identity) } : {}),
      ...(typeof result.compiler.version === 'string' ? { version: redact(result.compiler.version) } : {}),
    };
  }
  return {
    exitCode: result.exitCode,
    compiler,
    artifacts: artifacts.map((artifact) => ({ path: redact(artifact.path), sha256: artifact.sha256.toLowerCase() })),
    logs: {
      stdout: stdout.text,
      stderr: stderr.text,
      truncated: stdout.truncated || stderr.truncated,
    },
  };
}

function compilerEvidenceIsValid(result) {
  return result.exitCode === 0
    && typeof result.compiler?.identity === 'string'
    && result.compiler.identity.length > 0
    && result.artifacts.length > 0;
}

function approvalEvidenceIsValid(approval) {
  return typeof approval?.approvedBy === 'string'
    && approval.approvedBy.length > 0
    && typeof approval?.approvedAt === 'string'
    && !Number.isNaN(Date.parse(approval.approvedAt));
}

async function executeBounded(factory, timeoutMs, signal) {
  let timer;
  let abortListener;
  const controller = new AbortController();
  try {
    const races = [
      Promise.resolve().then(() => factory(controller.signal)),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new BuildContractError('BUILD_TIMEOUT', `build step exceeded ${timeoutMs} ms`));
        }, timeoutMs);
      }),
    ];
    if (signal) races.push(new Promise((_, reject) => {
      abortListener = () => {
        controller.abort();
        reject(new BuildContractError('BUILD_CANCELLED', 'build was cancelled'));
      };
      if (signal.aborted) abortListener();
      else signal.addEventListener('abort', abortListener, { once: true });
    }));
    return await Promise.race(races);
  } finally {
    clearTimeout(timer);
    if (signal && abortListener) signal.removeEventListener('abort', abortListener);
  }
}

function assertWorkspaceRelative(workspace, candidate) {
  const absolute = resolve(workspace, candidate);
  const rel = relative(workspace, absolute);
  if (!candidate || isAbsolute(candidate) || rel === '..' || rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)) {
    throw new BuildContractError('BUILD_ARTIFACT_OUTSIDE_WORKSPACE', `artifact is outside workspace: ${candidate}`);
  }
  return { absolute, relative: rel.replaceAll('\\', '/') };
}

export function createJsonBuildStore(options = {}) {
  if (typeof options.directory !== 'string' || options.directory.length === 0) {
    throw new TypeError('build store directory is required');
  }
  const directory = resolve(options.directory);
  const maxBytes = options.maxBytes ?? MAX_STORE_BYTES;
  if (!Number.isInteger(maxBytes) || maxBytes < 1) throw new TypeError('build store maxBytes is invalid');

  async function ensureDirectory() {
    try {
      const stat = await lstat(directory);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw new BuildContractError('BUILD_STORE_UNSAFE', 'build store must be a real directory');
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      await mkdir(directory, { recursive: true });
      const stat = await lstat(directory);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw new BuildContractError('BUILD_STORE_UNSAFE', 'build store must be a real directory');
      }
    }
  }

  function fileFor(key) {
    if (typeof key !== 'string' || key.length < 1 || key.length > 200) throw new TypeError('build store key is invalid');
    return resolve(directory, `${createHash('sha256').update(key).digest('hex')}.json`);
  }

  return {
    async load(key) {
      await ensureDirectory();
      const path = fileFor(key);
      try {
        const stat = await lstat(path);
        if (stat.isSymbolicLink() || !stat.isFile() || stat.size > maxBytes) {
          throw new BuildContractError('BUILD_STORE_UNSAFE', 'build checkpoint is unsafe or oversized');
        }
        return JSON.parse(await readFile(path, 'utf8'));
      } catch (error) {
        if (error?.code === 'ENOENT') return null;
        if (error instanceof SyntaxError) throw new BuildContractError('BUILD_STORE_INVALID', 'build checkpoint is invalid JSON');
        throw error;
      }
    },
    async save(key, value) {
      await ensureDirectory();
      const path = fileFor(key);
      const content = JSON.stringify(value);
      if (Buffer.byteLength(content) > maxBytes) {
        throw new BuildContractError('BUILD_STORE_TOO_LARGE', 'build checkpoint exceeds store limit');
      }
      const temp = `${path}.${process.pid}.${randomUUID()}.tmp`;
      await writeFile(temp, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
      try {
        await rename(temp, path);
      } catch (error) {
        await rm(temp, { force: true });
        throw error;
      }
    },
  };
}

export function createProcessBuildRunner(options = {}) {
  const execFileImpl = options.execFileImpl ?? execFile;
  const maxBuffer = options.maxBuffer ?? (4 * 1_024 * 1_024);
  const maxArtifactBytes = options.maxArtifactBytes ?? DEFAULT_MAX_ARTIFACT_BYTES;
  if (!Number.isSafeInteger(maxArtifactBytes) || maxArtifactBytes < 1) {
    throw new TypeError('maxArtifactBytes must be a positive safe integer');
  }

  async function hashArtifact(workspace, artifactPath) {
    const contained = assertWorkspaceRelative(workspace, artifactPath);
    const before = await lstat(contained.absolute);
    if (!before.isFile() || before.isSymbolicLink()) {
      throw new BuildContractError('BUILD_ARTIFACT_UNSAFE', `artifact is not a regular file: ${artifactPath}`);
    }
    if (before.size > maxArtifactBytes) {
      throw new BuildContractError('BUILD_ARTIFACT_TOO_LARGE', `artifact exceeds ${maxArtifactBytes} bytes: ${artifactPath}`);
    }
    const [resolvedWorkspace, resolvedArtifact] = await Promise.all([realpath(workspace), realpath(contained.absolute)]);
    const resolved = assertWorkspaceRelative(resolvedWorkspace, relative(resolvedWorkspace, resolvedArtifact));
    const handle = await open(resolved.absolute, 'r');
    try {
      const opened = await handle.stat();
      if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) {
        throw new BuildContractError('BUILD_ARTIFACT_UNSAFE', `artifact changed during verification: ${artifactPath}`);
      }
      const hash = createHash('sha256');
      const chunk = Buffer.alloc(64 * 1024);
      let position = 0;
      while (position < opened.size) {
        const { bytesRead } = await handle.read(chunk, 0, Math.min(chunk.length, opened.size - position), position);
        if (bytesRead === 0) break;
        position += bytesRead;
        if (position > maxArtifactBytes) {
          throw new BuildContractError('BUILD_ARTIFACT_TOO_LARGE', `artifact exceeds ${maxArtifactBytes} bytes: ${artifactPath}`);
        }
        hash.update(chunk.subarray(0, bytesRead));
      }
      return { path: contained.relative, sha256: hash.digest('hex') };
    } finally {
      await handle.close();
    }
  }

  return async function runProcess(step, context = {}) {
    const command = commandIdentity(step.command, (value) => String(value));
    if (!command) throw new BuildContractError('BUILD_COMMAND_INVALID', 'process build requires a command');
    const workspace = resolve(context.workspace ?? process.cwd());
    return new Promise((resolveRun, rejectRun) => {
      execFileImpl(command.executable, command.args, {
        cwd: workspace,
        encoding: 'utf8',
        windowsHide: true,
        shell: false,
        signal: context.signal,
        maxBuffer,
      }, (error, stdout = '', stderr = '') => {
        void (async () => {
          if (error?.name === 'AbortError') throw new BuildContractError('BUILD_CANCELLED', 'compiler process was cancelled');
          const exitCode = error ? (Number.isInteger(error.code) ? error.code : 1) : 0;
          const artifacts = [];
          if (exitCode === 0) {
            for (const artifactPath of step.artifacts ?? []) {
              artifacts.push(await hashArtifact(workspace, artifactPath));
            }
          }
          return {
            exitCode,
            stdout: String(stdout),
            stderr: String(stderr),
            compiler: {
              identity: command.identity ?? command.executable,
              ...(step.compilerVersion ? { version: String(step.compilerVersion) } : {}),
            },
            artifacts,
          };
        })().then(resolveRun, rejectRun);
      });
    });
  };
}

export function createBuildSupervisor(options) {
  if (typeof options?.runner !== 'function') throw new TypeError('runner is required');
  if (typeof options?.decideCapability !== 'function') throw new TypeError('decideCapability is required');
  const clock = options.clock ?? Date.now;
  const idFactory = options.idFactory ?? randomUUID;
  const maxLogBytes = options.maxLogBytes ?? DEFAULT_MAX_LOG_BYTES;
  const redact = options.redact ?? defaultRedact;
  if (typeof redact !== 'function') throw new TypeError('build redactor must be a function');
  const store = options.store;
  if (store && (typeof store.load !== 'function' || typeof store.save !== 'function')) {
    throw new TypeError('build store requires load and save functions');
  }

  return {
    redact,
    async runPlan(plan, context = {}) {
      const mode = validatePlan(plan);
      const environment = context.environment ?? 'development';
      const grants = context.grants ?? [];
      const startedAt = clock();
      const idempotencyKey = context.idempotencyKey;
      if (idempotencyKey !== undefined && (typeof idempotencyKey !== 'string' || idempotencyKey.length < 1 || idempotencyKey.length > 200)) {
        throw new TypeError('idempotencyKey must be a non-empty string up to 200 characters');
      }
      if (idempotencyKey && !store) throw new TypeError('durable build requires a store');
      if (idempotencyKey && plan.steps.some((step) => typeof step.idempotencyKey !== 'string' || step.idempotencyKey.length < 1)) {
        throw new TypeError('every durable build step requires an idempotencyKey');
      }
      const planHash = createHash('sha256').update(JSON.stringify(plan)).digest('hex');
      const loaded = idempotencyKey ? await store.load(idempotencyKey) : null;
      if (loaded && loaded.planHash !== planHash) {
        return { ...loaded, status: 'blocked', error: { code: 'BUILD_PLAN_CHANGED', message: 'stored plan hash differs from requested plan' } };
      }
      if (loaded?.status === 'completed') return { ...loaded, replayed: true };
      const unknownStep = loaded?.steps?.find((step) => step.status === 'running');
      if (unknownStep) {
        return {
          ...loaded,
          status: 'blocked',
          error: { code: 'BUILD_STEP_OUTCOME_UNKNOWN', message: `step outcome requires human reconciliation: ${unknownStep.id}` },
        };
      }
      const previousSteps = loaded?.steps ?? [];
      const run = {
        schemaVersion: 1,
        id: loaded?.id ?? idFactory(),
        mode,
        status: 'running',
        evidenceLevel: 'none',
        environment,
        approval: context.approval ?? null,
        startedAt: loaded?.startedAt ?? new Date(startedAt).toISOString(),
        durationMs: 0,
        steps: [],
        ...(idempotencyKey ? { idempotencyKey, planHash } : {}),
      };

      async function saveRun() {
        if (!idempotencyKey) return;
        try {
          await store.save(idempotencyKey, run);
        } catch {
          throw new BuildContractError('BUILD_CHECKPOINT_FAILED', 'durable build checkpoint could not be saved');
        }
      }

      if (context.signal?.aborted) {
        run.status = 'cancelled';
        run.durationMs = Math.max(0, clock() - startedAt);
        return run;
      }

      for (const step of plan.steps) {
        if (context.signal?.aborted) {
          run.status = 'cancelled';
          break;
        }
        const previous = previousSteps.find((item) => item.id === step.id && item.status === 'completed');
        if (previous) {
          run.steps.push({ ...previous, replayed: true });
          continue;
        }
        const decision = options.decideCapability(
          environment,
          step.capability ?? 'build:execute',
          { grants },
        );
        if (!decision.allowed) {
          run.steps.push({ id: step.id, status: 'blocked', decision, command: commandIdentity(step.command, redact) });
          run.status = 'blocked';
          break;
        }
        if (decision.requiresApproval && !approvalEvidenceIsValid(context.approval)) {
          run.steps.push({
            id: step.id,
            status: 'blocked',
            command: commandIdentity(step.command, redact),
            decision: { ...decision, allowed: false, reason: 'approval-evidence-required' },
          });
          run.status = 'blocked';
          break;
        }

        const stepStartedAt = clock();
        const record = {
          id: step.id,
          ...(idempotencyKey ? { idempotencyKey: step.idempotencyKey } : {}),
          status: 'running',
          decision,
          command: commandIdentity(step.command, redact),
          timeoutMs: step.timeoutMs ?? DEFAULT_TIMEOUT_MS,
          startedAt: new Date(stepStartedAt).toISOString(),
          durationMs: 0,
        };
        run.steps.push(record);
        try {
          await saveRun();
          const raw = await executeBounded(
            (stepSignal) => options.runner(step, { ...context, signal: stepSignal }),
            record.timeoutMs,
            context.signal,
          );
          const result = normalizeResult(raw, maxLogBytes, redact);
          record.result = {
            exitCode: result.exitCode,
            compiler: result.compiler,
            artifacts: result.artifacts,
          };
          record.logs = result.logs;
          if (result.exitCode !== 0) record.status = 'failed';
          else if (mode === 'compiler' && !compilerEvidenceIsValid(result)) record.status = 'unverified';
          else record.status = 'completed';
          if (record.status !== 'completed') {
            run.status = record.status;
            await saveRun();
            break;
          }
          await saveRun();
          if (context.pauseAfterStep === step.id) {
            run.status = 'paused';
            await saveRun();
            break;
          }
        } catch (error) {
          const code = error?.code ?? 'BUILD_RUNNER_FAILED';
          record.status = code === 'BUILD_TIMEOUT'
            ? 'timed-out'
            : (code === 'BUILD_CANCELLED' ? 'cancelled' : 'failed');
          record.error = { code, message: redact(error?.message ?? error).slice(0, 500) };
          run.status = record.status;
          try { await saveRun(); } catch { /* The checkpoint error is already represented below. */ }
          break;
        } finally {
          record.durationMs = Math.max(0, clock() - stepStartedAt);
        }
      }

      if (run.status === 'running') {
        run.status = 'completed';
        run.evidenceLevel = mode === 'compiler' ? 'compiler-verified' : 'simulation';
      }
      run.durationMs = Math.max(0, clock() - startedAt);
      await saveRun();
      return run;
    },
  };
}

export function createBuildService(options) {
  if (!options?.supervisor || typeof options.supervisor.runPlan !== 'function') {
    throw new TypeError('build supervisor is required');
  }
  if (!options.plans || typeof options.plans !== 'object' || Array.isArray(options.plans)) {
    throw new TypeError('build plans catalog is required');
  }
  const idFactory = options.idFactory ?? randomUUID;
  const redact = options.redact ?? options.supervisor.redact ?? defaultRedact;
  if (typeof redact !== 'function') throw new TypeError('build service redactor must be a function');
  const plans = new Map();
  for (const [planId, plan] of Object.entries(options.plans)) {
    if (!/^[a-z][a-z0-9.-]{0,79}$/.test(planId)) throw new TypeError(`invalid build plan id: ${planId}`);
    validatePlan(plan);
    plans.set(planId, structuredClone(plan));
  }
  const requests = new Map();

  function requestFor(requestId) {
    if (typeof requestId !== 'string' || !requests.has(requestId)) {
      throw new BuildContractError('BUILD_REQUEST_NOT_FOUND', `unknown build request: ${String(requestId)}`);
    }
    return requests.get(requestId);
  }

  function publicState(record) {
    if (record.result) return structuredClone(record.result);
    return {
      schemaVersion: 1,
      requestId: record.requestId,
      planId: record.planId,
      status: record.status,
      ...(record.error ? { error: structuredClone(record.error) } : {}),
    };
  }

  return {
    prepare({ planId } = {}) {
      if (typeof planId !== 'string' || !plans.has(planId)) {
        throw new BuildContractError('BUILD_PLAN_NOT_FOUND', `unknown build plan: ${String(planId)}`);
      }
      const requestId = idFactory();
      if (typeof requestId !== 'string' || requestId.length === 0 || requests.has(requestId)) {
        throw new BuildContractError('BUILD_REQUEST_INVALID', 'build request id must be unique and non-empty');
      }
      const plan = structuredClone(plans.get(planId));
      const prepared = {
        schemaVersion: 1,
        requestId,
        planId,
        status: 'prepared',
        mode: plan.mode ?? 'simulation',
        steps: plan.steps.map((step) => ({
          id: step.id,
          capability: step.capability ?? 'build:execute',
          command: commandIdentity(step.command, redact),
          timeoutMs: step.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        })),
      };
      requests.set(requestId, { requestId, planId, plan, status: 'prepared', prepared });
      return structuredClone(prepared);
    },
    async run({ requestId } = {}, context = {}) {
      const record = requestFor(requestId);
      if (record.promise) return record.promise;
      if (record.status !== 'prepared') return publicState(record);
      const controller = new AbortController();
      record.controller = controller;
      record.status = 'running';
      const signals = [controller.signal, context.signal].filter(Boolean);
      const signal = signals.length > 1 ? AbortSignal.any(signals) : signals[0];
      record.promise = options.supervisor.runPlan(record.plan, { ...context, signal })
        .then((result) => {
          record.status = result.status;
          record.result = {
            ...result,
            requestId: record.requestId,
            planId: record.planId,
          };
          return structuredClone(record.result);
        })
        .catch((error) => {
          record.status = 'failed';
          const code = typeof error?.code === 'string' && /^[A-Z0-9_]{1,80}$/.test(error.code)
            ? error.code
            : 'BUILD_SUPERVISOR_FAILED';
          const message = redact(error?.message ?? error).slice(0, 500);
          record.error = {
            code,
            message,
          };
          throw new BuildContractError(code, message);
        })
        .finally(() => { record.controller = undefined; });
      return record.promise;
    },
    status(requestId) {
      return publicState(requestFor(requestId));
    },
    cancel(requestId) {
      const record = requestFor(requestId);
      if (record.status === 'running') {
        record.status = 'cancelling';
        record.controller.abort();
      }
      return publicState(record);
    },
    evidence(requestId) {
      return publicState(requestFor(requestId));
    },
  };
}
