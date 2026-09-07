import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';
import { assertNoLinkPath } from './path-safety.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const extensionRoot = join(root, 'apps', 'vscode-extension');
const extensionDist = join(extensionRoot, 'dist');
const stageRoot = join(root, 'dist', 'vscode-extension');

function assertBuildPath(path, expected) {
  if (resolve(path) !== resolve(expected)) throw new Error(`refusing unexpected build path: ${path}`);
}

export async function buildExtension() {
  assertBuildPath(extensionDist, join(root, 'apps', 'vscode-extension', 'dist'));
  assertBuildPath(stageRoot, join(root, 'dist', 'vscode-extension'));
  await assertNoLinkPath(root, extensionDist);
  await assertNoLinkPath(root, stageRoot);
  await rm(extensionDist, { recursive: true, force: true });
  await rm(stageRoot, { recursive: true, force: true });
  await mkdir(extensionDist, { recursive: true });

  const common = {
    absWorkingDir: root,
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
    entryPoints: [join(root, 'packages', 'runtime', 'src', 'cli.mjs')],
    outfile: join(extensionDist, 'runtime-cli.mjs'),
  });
  await build({
    ...common,
    entryPoints: [join(root, 'packages', 'mcp', 'src', 'stdio.mjs')],
    outfile: join(extensionDist, 'mcp-stdio.mjs'),
  });

  await mkdir(join(stageRoot, 'dist'), { recursive: true });
  for (const file of ['extension.cjs', 'README.md', '.vscodeignore']) {
    await cp(join(extensionRoot, file), join(stageRoot, file));
  }
  await cp(extensionDist, join(stageRoot, 'dist'), { recursive: true });
  await cp(join(extensionRoot, 'media'), join(stageRoot, 'media'), { recursive: true });
  await cp(join(root, 'LICENSE.md'), join(stageRoot, 'LICENSE.md'));
  await cp(join(root, 'CHANGELOG.md'), join(stageRoot, 'CHANGELOG.md'));

  const manifest = JSON.parse(await readFile(join(extensionRoot, 'package.json'), 'utf8'));
  delete manifest.private;
  manifest.main = './extension.cjs';
  await writeFile(join(stageRoot, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return { extensionRoot, extensionDist, stageRoot, version: manifest.version };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildExtension();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
