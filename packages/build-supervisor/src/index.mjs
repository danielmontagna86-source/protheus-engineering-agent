import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

const MAX_TIMEOUT_MS = 30 * 60 * 1_000;
const DEFAULT_TIMEOUT_MS = 2 * 60 * 1_000;
const DEFAULT_MAX_LOG_BYTES = 256 * 1_024;

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

function commandIdentity(command) {
  if (command === undefined) return null;
  if (!command || typeof command.executable !== 'string' || command.executable.length === 0
    || !Array.isArray(command.args) || command.args.some((item) => typeof item !== 'string')) {
    throw new TypeError('build command requires executable and string args');
  }
  return {
    executable: command.executable,
    args: [...command.args],
    ...(command.identity ? { identity: String(command.identity) } : {}),
  };
}

function boundedLog(value, maxBytes, label) {
  if (value === undefined || value === null) return { text: '', truncated: false };
  if (typeof value !== 'string') throw new BuildContractError('BUILD_RESULT_INVALID', `${label} must be a string`);
  const bytes = Buffer.from(value);
  if (bytes.length <= maxBytes) return { text: value, truncated: false };
  return { text: bytes.subarray(0, maxBytes).toString('utf8'), truncated: true };
}

function normalizeResult(result, maxLogBytes) {
  if (!result || typeof result !== 'object' || !Number.isInteger(result.exitCode)) {
    throw new BuildContractError('BUILD_RESULT_INVALID', 'runner result requires an integer exitCode');
  }
  const stdout = boundedLog(result.stdout ?? result.output, maxLogBytes, 'stdout');
  const stderr = boundedLog(result.stderr, maxLogBytes, 'stderr');
  const artifacts = result.artifacts ?? [];
  if (!Array.isArray(artifacts) || artifacts.some((artifact) => (
    typeof artifact?.path !== 'string' || artifact.path.length === 0
    || !/^[a-f0-9]{64}$/i.test(artifact.sha256 ?? '')
  ))) {
    throw new BuildContractError('BUILD_RESULT_INVALID', 'artifacts require path and SHA-256');
  }
  return {
    exitCode: result.exitCode,
    compiler: result.compiler ?? null,
    artifacts: artifacts.map((artifact) => ({ path: artifact.path, sha256: artifact.sha256.toLowerCase() })),
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

export function createProcessBuildRunner(options = {}) {
  const execFileImpl = options.execFileImpl ?? execFile;
  const readFileImpl = options.readFileImpl ?? readFile;
  const maxBuffer = options.maxBuffer ?? (4 * 1_024 * 1_024);

  return async function runProcess(step, context = {}) {
    const command = commandIdentity(step.command);
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
              const contained = assertWorkspaceRelative(workspace, artifactPath);
              const bytes = await readFileImpl(contained.absolute);
              artifacts.push({
                path: contained.relative,
                sha256: createHash('sha256').update(bytes).digest('hex'),
              });
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

  return {
    async runPlan(plan, context = {}) {
      const mode = validatePlan(plan);
      const environment = context.environment ?? 'development';
      const grants = context.grants ?? [];
      const startedAt = clock();
      const run = {
        schemaVersion: 1,
        id: idFactory(),
        mode,
        status: 'running',
        evidenceLevel: 'none',
        environment,
        approval: context.approval ?? null,
        startedAt: new Date(startedAt).toISOString(),
        durationMs: 0,
        steps: [],
      };

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
        const decision = options.decideCapability(
          environment,
          step.capability ?? 'build:execute',
          { grants },
        );
        if (!decision.allowed) {
          run.steps.push({ id: step.id, status: 'blocked', decision, command: commandIdentity(step.command) });
          run.status = 'blocked';
          break;
        }
        if (decision.requiresApproval && !approvalEvidenceIsValid(context.approval)) {
          run.steps.push({
            id: step.id,
            status: 'blocked',
            command: commandIdentity(step.command),
            decision: { ...decision, allowed: false, reason: 'approval-evidence-required' },
          });
          run.status = 'blocked';
          break;
        }

        const stepStartedAt = clock();
        const record = {
          id: step.id,
          status: 'running',
          decision,
          command: commandIdentity(step.command),
          timeoutMs: step.timeoutMs ?? DEFAULT_TIMEOUT_MS,
          startedAt: new Date(stepStartedAt).toISOString(),
          durationMs: 0,
        };
        run.steps.push(record);
        try {
          const raw = await executeBounded(
            (stepSignal) => options.runner(step, { ...context, signal: stepSignal }),
            record.timeoutMs,
            context.signal,
          );
          const result = normalizeResult(raw, maxLogBytes);
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
            break;
          }
        } catch (error) {
          const code = error?.code ?? 'BUILD_RUNNER_FAILED';
          record.status = code === 'BUILD_TIMEOUT'
            ? 'timed-out'
            : (code === 'BUILD_CANCELLED' ? 'cancelled' : 'failed');
          record.error = { code, message: String(error?.message ?? error) };
          run.status = record.status;
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
      return run;
    },
  };
}
