#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import productPackage from '../../../package.json' with { type: 'json' };

import { toSarif } from '../../evidence/src/index.mjs';
import { createRuntime } from './index.mjs';

const { version: productVersion } = productPackage;

export async function runCli(argv, io = {}) {
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const baseRuntimeFactory = io.createRuntime ?? createRuntime;
  const runtimeFactory = (options) => {
    const merged = { ...options, ...io.runtimeOptions };
    if (!io.runtimeCache) return baseRuntimeFactory(merged);
    const key = resolve(merged.workspace);
    if (!io.runtimeCache.has(key)) io.runtimeCache.set(key, baseRuntimeFactory(merged));
    return io.runtimeCache.get(key);
  };
  const [command, first, second, ...rest] = argv;
  try {
    let result;
    if (command === 'doctor') {
      const workspace = resolve(first && !first.startsWith('--') ? first : process.cwd());
      const flags = [first, second, ...rest].filter(Boolean);
      result = await runtimeFactory({ workspace }).doctor({
        probeHermes: flags.includes('--probe-hermes'),
      });
    } else if (command === 'index') {
      result = await runtimeFactory({ workspace: resolve(first ?? process.cwd()) }).index({ signal: io.signal });
    } else if (command === 'review') {
      if (!first) throw new Error('review requires a source file path');
      const file = resolve(first);
      const workspace = resolve(second ?? dirname(file));
      result = await runtimeFactory({ workspace }).reviewFile(file, { signal: io.signal });
    } else if (command === 'review-changes') {
      const workspace = resolve(first ?? process.cwd());
      const formatOption = rest.find((item) => item.startsWith('--format='));
      const repositoryOption = rest.find((item) => item.startsWith('--repository='));
      const unexpectedOption = rest.find((item) => item.startsWith('--')
        && !item.startsWith('--format=') && !item.startsWith('--repository='));
      if (unexpectedOption) throw new Error(`unsupported review-changes option: ${unexpectedOption}`);
      const positional = rest.filter((item) => !item.startsWith('--'));
      const baseRef = second === 'branch' ? positional.shift() : undefined;
      if (positional.length > 0) throw new Error('unexpected review-changes positional argument');
      const format = formatOption?.slice('--format='.length) ?? 'json';
      if (!['json', 'sarif'].includes(format)) throw new Error(`unsupported review format: ${format}`);
      const report = await runtimeFactory({ workspace }).reviewChanges({
        scope: second ?? 'working-tree',
        baseRef,
        repository: repositoryOption ? resolve(repositoryOption.slice('--repository='.length)) : undefined,
        signal: io.signal,
      });
      result = format === 'sarif' ? toSarif(report, { toolVersion: productVersion }) : report;
    } else if (command === 'repositories') {
      if (second !== undefined || rest.length > 0) throw new Error('repositories requires only a workspace');
      result = await runtimeFactory({ workspace: resolve(first ?? process.cwd()) }).listRepositories({ signal: io.signal });
    } else if (command === 'context') {
      result = await runtimeFactory({ workspace: resolve(first ?? process.cwd()) }).readContext();
    } else if (command === 'session') {
      result = await runtimeFactory({ workspace: resolve(first ?? process.cwd()) }).getSessionContext();
    } else if (command === 'memory-write') {
      if (!first || second === undefined) throw new Error('memory-write requires workspace and content');
      const runtime = runtimeFactory({ workspace: resolve(first) });
      await runtime.writeMemory([second, ...rest].join(' '));
      result = { ok: true };
    } else if (command === 'memory-append') {
      if (!first || !second || rest.length === 0) throw new Error('memory-append requires workspace, actor and summary');
      result = await runtimeFactory({ workspace: resolve(first) }).appendMemory({
        summary: rest.join(' '),
        attribution: { actor: second, source: 'cli' },
      });
    } else if (command === 'journal-add') {
      const [actor, ...summary] = rest;
      if (!first || !second || !actor || summary.length === 0) {
        throw new Error('journal-add requires workspace, kind, actor and summary');
      }
      result = await runtimeFactory({ workspace: resolve(first) }).recordJournal({
        kind: second,
        summary: summary.join(' '),
        attribution: { actor, source: 'cli' },
      });
    } else if (['journal-preview', 'journal-promote'].includes(command)) {
      const [actor, ...unexpected] = rest;
      if (!first || !second || !actor || unexpected.length > 0) {
        throw new Error(`${command} requires workspace, journal id and actor`);
      }
      const runtime = runtimeFactory({ workspace: resolve(first) });
      result = command === 'journal-preview'
        ? await runtime.previewJournalPromotion(second, { actor, source: 'cli' })
        : await runtime.promoteJournal(second, { actor, source: 'cli' });
    } else if (command === 'memory-expire') {
      if (!first || !second || rest.length > 0) throw new Error('memory-expire requires workspace and ISO cutoff');
      result = await runtimeFactory({ workspace: resolve(first) }).expireMemory(second);
    } else if (['snapshot-inspect', 'snapshot-import'].includes(command)) {
      const [snapshotPath, expectedSha256, ...unexpected] = rest;
      if (!first || !second || !snapshotPath || unexpected.length > 0) {
        throw new Error(`${command} requires workspace, integration, snapshot path and optional SHA-256`);
      }
      const runtime = runtimeFactory({ workspace: resolve(first) });
      const request = { integration: second, path: resolve(snapshotPath), ...(expectedSha256 ? { expectedSha256 } : {}) };
      result = command === 'snapshot-inspect'
        ? await runtime.inspectSnapshot(request)
        : await runtime.importSnapshot(request);
    } else if (['tdn-search', 'dictionary-search'].includes(command)) {
      const [limitValue, ...unexpected] = rest;
      if (!first || !second || unexpected.length > 0) {
        throw new Error(`${command} requires workspace, query and optional limit`);
      }
      let limit;
      if (limitValue !== undefined) {
        limit = Number(limitValue);
        if (!Number.isSafeInteger(limit) || limit < 1 || limit > 20) {
          throw new Error(`${command} limit must be an integer from 1 to 20`);
        }
      }
      result = await runtimeFactory({ workspace: resolve(first) }).invokeIntegration(
        command === 'tdn-search' ? 'tdn' : 'dictionary',
        'search',
        { query: second, ...(limit ? { limit } : {}) },
        { signal: io.signal },
      );
    } else if (command === 'build-prepare') {
      if (!first || !second) throw new Error('build-prepare requires workspace and plan id');
      result = await runtimeFactory({ workspace: resolve(first) }).prepareBuild({ planId: second });
    } else if (command === 'build-run') {
      const [approvalToken, ...unexpected] = rest;
      if (!first || !second || !approvalToken || unexpected.length > 0) {
        throw new Error('build-run requires workspace, request id and host approval token');
      }
      if (typeof io.resolveBuildApproval !== 'function') throw new Error('host approval resolver is unavailable');
      const approval = await io.resolveBuildApproval({ requestId: second, approvalToken });
      if (!approval || typeof approval.approvedBy !== 'string' || Number.isNaN(Date.parse(approval.approvedAt))) {
        throw new Error('host approval resolver returned invalid approval evidence');
      }
      result = await runtimeFactory({ workspace: resolve(first) }).runBuild(
        { requestId: second },
        { approval, signal: io.signal },
      );
    } else if (['build-status', 'build-cancel', 'build-evidence'].includes(command)) {
      if (!first || !second || rest.length > 0) throw new Error(`${command} requires workspace and request id`);
      const runtime = runtimeFactory({ workspace: resolve(first) });
      if (command === 'build-status') result = await runtime.buildStatus(second);
      else if (command === 'build-cancel') result = await runtime.cancelBuild(second);
      else result = await runtime.buildEvidence(second);
    } else {
      stderr.write(`${JSON.stringify({
        ok: false,
        error: 'usage',
        commands: [
          'doctor', 'index', 'review', 'review-changes', 'repositories', 'context', 'session', 'memory-write',
          'memory-append', 'journal-add', 'journal-preview', 'journal-promote', 'memory-expire',
          'snapshot-inspect', 'snapshot-import',
          'tdn-search', 'dictionary-search',
          'build-prepare', 'build-run', 'build-status', 'build-cancel', 'build-evidence',
        ],
      })}\n`);
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
  void runCli(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}
