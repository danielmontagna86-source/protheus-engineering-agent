#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createRuntime } from './index.mjs';

export async function runCli(argv, io = {}) {
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const [command, first, second, ...rest] = argv;
  try {
    let result;
    if (command === 'doctor') {
      const workspace = resolve(first && !first.startsWith('--') ? first : process.cwd());
      const flags = [first, second, ...rest].filter(Boolean);
      result = await createRuntime({ workspace }).doctor({
        probeHermes: flags.includes('--probe-hermes'),
      });
    } else if (command === 'index') {
      result = await createRuntime({ workspace: resolve(first ?? process.cwd()) }).index();
    } else if (command === 'review') {
      if (!first) throw new Error('review requires a source file path');
      const file = resolve(first);
      const workspace = resolve(second ?? dirname(file));
      result = await createRuntime({ workspace }).reviewFile(file);
    } else if (command === 'context') {
      result = await createRuntime({ workspace: resolve(first ?? process.cwd()) }).readContext();
    } else if (command === 'session') {
      result = await createRuntime({ workspace: resolve(first ?? process.cwd()) }).getSessionContext();
    } else if (command === 'memory-write') {
      if (!first || second === undefined) throw new Error('memory-write requires workspace and content');
      const runtime = createRuntime({ workspace: resolve(first) });
      await runtime.writeMemory([second, ...rest].join(' '));
      result = { ok: true };
    } else {
      stderr.write(`${JSON.stringify({ ok: false, error: 'usage', commands: ['doctor', 'index', 'review', 'context', 'session', 'memory-write'] })}\n`);
      return 2;
    }
    stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  } catch (error) {
    stderr.write(`${JSON.stringify({ ok: false, error: String(error?.message ?? error) })}\n`);
    return 1;
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  const code = await runCli(process.argv.slice(2));
  process.exitCode = code;
}
