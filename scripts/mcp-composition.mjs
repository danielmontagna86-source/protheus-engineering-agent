import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packageExtension } from './package-extension.mjs';
import { assertNoLinkPath } from './path-safety.mjs';
import { readZipArchive } from './zip.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const provider = 'node_modules/@modelcontextprotocol/server/dist/ajvProvider-_BPY-P_q.mjs';
const providerMapSha = 'fdde01929c3c271b58fa5eb2f08e78b01b90cd9deebd9e0ea0fa134d81de5e90';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const normalized = (path) => path.replaceAll('\\', '/');
const npmName = (path) => path.split('node_modules/').at(-1);
const purl = (name, version) => `pkg:npm/${name.split('/').map(encodeURIComponent).join('/')}@${encodeURIComponent(version)}`;

export function embeddedFromMap(bytes) {
  if (hash(bytes) !== providerMapSha) throw new Error('Bundled Ajv sourcemap differs from the pinned SDK');
  const packages = new Map();
  for (const path of JSON.parse(bytes.toString('utf8')).sources) {
    const parts = /\/\.pnpm\/([^/]+)\/node_modules\/((?:@[^/]+\/)?[^/]+)\//.exec(normalized(path));
    if (!parts) continue;
    const [, packageDirectory, name] = parts;
    const prefix = name.replace('/', '+') + '@';
    if (!packageDirectory.startsWith(prefix)) throw new Error('Inconsistent package name in Ajv sourcemap');
    const version = packageDirectory.slice(prefix.length).split(/[_()]/)[0];
    if (!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(version)) throw new Error('Invalid package version in Ajv sourcemap');
    packages.set(purl(name, version), { name, version });
  }
  if (!packages.has(purl('fast-uri', '3.1.9')) || packages.has(purl('fast-uri', '3.1.8'))) {
    throw new Error('Unexpected fast-uri version in bundled MCP');
  }
  return packages;
}

async function run() {
  const result = await packageExtension({ collectMcpInputs: true });
  const inputs = result.mcpInputs.map(normalized);
  if (inputs.filter((name) => /\/ajvProvider-.*\.mjs$/.test(name)).join() !== provider) {
    throw new Error('MCP composition must identify the packaged Ajv provider');
  }
  const vsix = await readFile(result.path);
  const entries = await readZipArchive(vsix, { maxUncompressedBytes: 20 * 1024 * 1024 });
  const bundle = entries.find(({ name }) => name === 'extension/dist/mcp-stdio.mjs');
  const built = await readFile(join(root, 'apps/vscode-extension/dist/mcp-stdio.mjs'));
  if (!bundle || !bundle.data.equals(built)) throw new Error('MCP inventory does not match the VSIX entry');

  const mapFile = join(root, `${provider}.map`);
  const components = embeddedFromMap(await readFile(mapFile));
  const lock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8')).packages;
  const runtime = Object.entries(lock).filter(([path, item]) => path && !item.dev);
  for (const [path, { version }] of runtime) {
    const name = npmName(path);
    if (!version) throw new Error(`Missing runtime version for ${name}`);
    components.set(purl(name, version), { name, version });
  }
  for (const input of inputs.filter((path) => path.startsWith('node_modules/'))) {
    if (!runtime.some(([path]) => input.startsWith(`${path}/`))) {
      throw new Error(`Unexpected third-party input in packaged MCP: ${input}`);
    }
  }

  const output = join(root, 'release-artifacts', 'mcp-composition.cdx.json');
  await assertNoLinkPath(root, output);
  const sbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    version: 1,
    metadata: {
      properties: [
        { name: 'pea:scope', value: 'MCP runtime npm closure and Ajv provider sourcemap in the packaged MCP bundle' },
        { name: 'pea:vsix:sha256', value: hash(vsix) },
        { name: 'pea:mcp-bundle:sha256', value: hash(built) },
      ],
    },
    components: [...components].sort(([a], [b]) => a.localeCompare(b, 'en')).map(([id, component]) => ({
      type: 'library', 'bom-ref': id, purl: id, ...component,
    })),
  };
  await writeFile(output, `${JSON.stringify(sbom, null, 2)}\n`);
  console.log(JSON.stringify({ status: 'PASS', vsixSha256: hash(vsix), components: components.size }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await run();
