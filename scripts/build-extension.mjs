import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';
import { assertNoLinkPath } from './path-safety.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

function assertBuildPath(path, expected) {
  if (resolve(path) !== resolve(expected)) throw new Error(`refusing unexpected build path: ${path}`);
}

export async function buildExtension({ releaseCommit, productRoot = root } = {}) {
  const buildRoot = resolve(productRoot);
  const extensionRoot = join(buildRoot, 'apps', 'vscode-extension');
  const extensionDist = join(extensionRoot, 'dist');
  const stageRoot = join(buildRoot, 'dist', 'vscode-extension');
  assertBuildPath(extensionDist, join(buildRoot, 'apps', 'vscode-extension', 'dist'));
  assertBuildPath(stageRoot, join(buildRoot, 'dist', 'vscode-extension'));
  await assertNoLinkPath(buildRoot, extensionDist);
  await assertNoLinkPath(buildRoot, stageRoot);
  await rm(extensionDist, { recursive: true, force: true });
  await rm(stageRoot, { recursive: true, force: true });
  await mkdir(extensionDist, { recursive: true });

  const common = {
    absWorkingDir: buildRoot,
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    legalComments: 'none',
    sourcemap: false,
    logLevel: 'silent',
  };
  await build({
    ...common,
    entryPoints: [join(buildRoot, 'packages', 'runtime', 'src', 'cli.mjs')],
    outfile: join(extensionDist, 'runtime-cli.mjs'),
  });
  await build({
    ...common,
    entryPoints: [join(buildRoot, 'packages', 'runtime', 'src', 'cli.mjs')],
    outfile: join(extensionDist, 'runtime-cli.cjs'),
    format: 'cjs',
    banner: {
      js: "const __pea_import_meta_url = require('node:url').pathToFileURL(__filename).href;",
    },
    define: { 'import.meta.url': '__pea_import_meta_url' },
  });
  await build({
    ...common,
    entryPoints: [join(buildRoot, 'packages', 'mcp', 'src', 'stdio.mjs')],
    outfile: join(extensionDist, 'mcp-stdio.mjs'),
  });

  await mkdir(join(stageRoot, 'dist'), { recursive: true });
  for (const file of ['extension.cjs', 'README.md', '.vscodeignore', 'package.nls.json', 'package.nls.pt-br.json']) {
    await cp(join(extensionRoot, file), join(stageRoot, file));
  }
  await cp(extensionDist, join(stageRoot, 'dist'), { recursive: true });
  await cp(join(extensionRoot, 'media'), join(stageRoot, 'media'), { recursive: true });
  await cp(join(extensionRoot, 'l10n'), join(stageRoot, 'l10n'), { recursive: true });
  await cp(join(extensionRoot, 'sample-workspace'), join(stageRoot, 'sample-workspace'), { recursive: true });
  await mkdir(join(stageRoot, 'skills', 'protheus-evidence-review'), { recursive: true });
  await cp(
    join(buildRoot, '.agents', 'skills', 'protheus-evidence-review', 'SKILL.md'),
    join(stageRoot, 'skills', 'protheus-evidence-review', 'SKILL.md'),
  );
  await cp(join(buildRoot, 'LICENSE.md'), join(stageRoot, 'LICENSE.md'));
  await cp(join(buildRoot, 'NOTICE'), join(stageRoot, 'NOTICE'));
  await cp(join(buildRoot, 'CHANGELOG.md'), join(stageRoot, 'CHANGELOG.md'));
  await cp(join(buildRoot, 'THIRD_PARTY_NOTICES.md'), join(stageRoot, 'THIRD_PARTY_NOTICES.md'));
  await mkdir(join(stageRoot, 'third-party-licenses'), { recursive: true });
  await cp(
    join(buildRoot, 'node_modules', '@modelcontextprotocol', 'server', 'LICENSE'),
    join(stageRoot, 'third-party-licenses', 'model-context-protocol.txt'),
  );
  await cp(join(buildRoot, 'node_modules', 'zod', 'LICENSE'), join(stageRoot, 'third-party-licenses', 'zod.txt'));

  const manifest = JSON.parse(await readFile(join(extensionRoot, 'package.json'), 'utf8'));
  delete manifest.private;
  manifest.main = './extension.cjs';
  if (releaseCommit !== undefined) {
    if (!/^[0-9a-f]{40}$/.test(releaseCommit)) throw new Error('release commit must be an exact lowercase Git SHA');
    manifest.peaRelease = { commit: releaseCommit };
  }
  await writeFile(join(stageRoot, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return { extensionRoot, extensionDist, stageRoot, version: manifest.version };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildExtension();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
