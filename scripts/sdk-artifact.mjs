import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertNoLinkPath } from './path-safety.mjs';

const relativeSdk = 'release-artifacts/mcp-sdk/modelcontextprotocol-server-2.4.0-verified.tgz';
const sdkSha256 = '478c607f4252af5eb6c1a84801f06239b1954fd2633932fa58c27833800b86de';

export async function stageVerifiedSdk({ sourceRoot, checkout }) {
  const manifest = JSON.parse(await readFile(join(checkout, 'package.json'), 'utf8'));
  const sdk = manifest.dependencies?.['@modelcontextprotocol/server'];
  if (!sdk?.startsWith('file:')) return;
  if (sdk !== `file:${relativeSdk}`) throw new Error('Unrecognized local MCP SDK in the source manifest');
  await installVerifiedSdk({ sourceRoot, input: join(sourceRoot, relativeSdk), checkout });
}

export async function installVerifiedSdk({ sourceRoot, input, checkout }) {
  if (basename(input) !== basename(relativeSdk)) throw new Error('Unexpected MCP SDK artifact name');
  await assertNoLinkPath(sourceRoot, input);
  let state;
  try {
    state = await lstat(input);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    throw new Error('Missing verified MCP SDK. Run scripts/bootstrap-mcp-sdk.py before rebuilding the source archive.');
  }
  if (!state.isFile() || state.nlink !== 1 || state.size > 3_000_000) throw new Error('Unsafe local MCP SDK file');
  const bytes = await readFile(input);
  if (createHash('sha256').update(bytes).digest('hex') !== sdkSha256) {
    throw new Error('MCP SDK archive failed SHA-256 verification');
  }
  const output = join(checkout, relativeSdk);
  await assertNoLinkPath(checkout, output);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, bytes, { flag: 'wx' });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/sdk-artifact.mjs <downloaded SDK tarball>');
  const input = resolve(process.argv[2]);
  await installVerifiedSdk({ sourceRoot: dirname(input), input, checkout: resolve('.') });
}
