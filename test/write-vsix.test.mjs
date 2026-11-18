import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { writeVsix } from '../scripts/write-vsix.mjs';
import { readZipArchive } from '../scripts/zip.mjs';

test('VSIX archives use the explicit inventory and preserve installable localized identity', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pea-packager-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const manifest = {
    name: 'sample-extension', publisher: 'sample-publisher', version: '0.3.9',
    engines: { vscode: '^1.95.0' }, main: './extension.cjs', private: true,
    displayName: 'A & B', description: '%extension.description%', preview: true,
    contributes: { languageModelTools: [{ name: 'sample-tool' }] },
  };
  await Promise.all([
    writeFile(join(root, 'package.json'), JSON.stringify(manifest)),
    writeFile(join(root, 'package.nls.json'), JSON.stringify({ 'extension.description': 'A < B & C' })),
    writeFile(join(root, 'extension.cjs'), 'exports.activate = () => {};'),
    writeFile(join(root, 'unlisted.txt'), 'Unlisted synthetic file'),
  ]);
  const inventory = ['package.json', 'package.nls.json', 'extension.cjs'].map((name) => [name, `extension/${name}`]);
  const outputPath = join(root, 'package.vsix');
  await writeVsix({ root, outputPath, inventory });
  const first = await readFile(outputPath);
  await writeVsix({ root, outputPath, inventory });
  assert.deepEqual(await readFile(outputPath), first);
  const entries = new Map((await readZipArchive(first)).map(({ name, data }) => [name, data.toString()]));
  assert.equal(entries.size, 5);
  assert.equal(JSON.parse(entries.get('extension/package.json')).private, undefined);
  assert.ok(entries.get('extension.vsixmanifest').includes('Version="0.3.9" Publisher="sample-publisher"'));
  assert.ok(entries.get('extension.vsixmanifest').includes('A &lt; B &amp; C'));
  assert.ok(entries.get('extension.vsixmanifest').includes('<GalleryFlags>Public Preview</GalleryFlags>'));
  assert.ok(entries.get('extension.vsixmanifest').includes('<Tags>tools,language-model-tools</Tags>'));
  await assert.rejects(writeVsix({ root, outputPath, inventory: [['../package.json', 'extension/package.json']] }),
    /Invalid VSIX inventory entry/);
  const fakeKey = Buffer.alloc(64, 65).toString();
  const keyLabel = ['PRIVATE', 'KEY'].join(' ');
  await writeFile(join(root, 'extension.cjs'), [`-----BEGIN ${keyLabel}-----`, fakeKey, `-----END ${keyLabel}-----`].join('\n'));
  await assert.rejects(writeVsix({ root, outputPath, inventory }), (error) => {
    assert.match(error.message, /Potential secret in VSIX entry extension\/extension.cjs/);
    assert.ok(!error.message.includes(fakeKey));
    return true;
  });
  assert.deepEqual(await readFile(outputPath), first);
});
