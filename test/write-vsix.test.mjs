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
    categories: ['Linters', 'Testing'], keywords: ['advpl'], extensionKind: ['workspace'],
    pricing: 'Free', qna: 'marketplace', galleryBanner: { color: '#232323', theme: 'dark' },
    repository: { url: 'https://example.invalid/fixture' },
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
  const vsixManifest = entries.get('extension.vsixmanifest');
  for (const element of [
    '<Tags>advpl,tools,language-model-tools</Tags>',
    '<Categories>Linters,Testing</Categories>',
    '<Property Id="Microsoft.VisualStudio.Code.Engine" Value="^1.95.0" />',
    '<Property Id="Microsoft.VisualStudio.Code.PreRelease" Value="true" />',
    '<Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="workspace" />',
    '<Property Id="Microsoft.VisualStudio.Services.Links.Source" Value="https://example.invalid/fixture" />',
    '<Property Id="Microsoft.VisualStudio.Services.Branding.Theme" Value="dark" />',
    '<Property Id="Microsoft.VisualStudio.Services.Content.Pricing" Value="Free" />',
    '<Property Id="Microsoft.VisualStudio.Services.EnableMarketplaceQnA" Value="true" />',
  ]) assert.ok(vsixManifest.includes(element), `missing VSIX metadata: ${element}`);
  await assert.rejects(writeVsix({ root, outputPath, inventory: [['../package.json', 'extension/package.json']] }),
    /Invalid VSIX inventory entry/);
  for (const [overrides, expected] of [
    [{ publisher: 'invalid/name' }, /identity/],
    [{ version: '01.2.3' }, /version/],
    [{ engines: { vscode: 'latest' } }, /engine range/],
    [{ engines: { vscode: '^1.62.9' } }, /pre-release requires VS Code/],
    [{ main: './unlisted.cjs' }, /entry point/],
    [{ icon: 'media/icon.svg' }, /packaged PNG/],
    [{ categories: 'Linters' }, /metadata: categories/],
    [{ description: '%unknown.key%' }, /Missing extension manifest localization/],
  ]) {
    await writeFile(join(root, 'package.json'), JSON.stringify({ ...manifest, ...overrides }));
    await assert.rejects(writeVsix({ root, outputPath, inventory }), expected);
  }
  assert.deepEqual(await readFile(outputPath), first);
  await writeFile(join(root, 'package.json'), JSON.stringify({ ...manifest, preview: false }));
  await writeVsix({ root, outputPath, inventory });
  const stableXml = (await readZipArchive(await readFile(outputPath)))
    .find(({ name }) => name === 'extension.vsixmanifest').data.toString();
  assert.ok(stableXml.includes('<GalleryFlags>Public</GalleryFlags>'));
  assert.ok(!stableXml.includes('Microsoft.VisualStudio.Code.PreRelease'));
});

test('VSIX packaging blocks synthetic multiline keys, tokens, dotenv and SVG secrets without logging values', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'pea-packager-secrets-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'sample', publisher: 'sample', version: '1.0.0',
    engines: { vscode: '1.95.0' }, main: './extension.cjs' }));
  await writeFile(join(root, 'extension.cjs'), 'exports.activate = () => {};');
  const keyLabel = ['PRIVATE', 'KEY'].join(' ');
  const keyLine = 'A'.repeat(64);
  const key = [`-----BEGIN ${keyLabel}-----`, keyLine, 'B'.repeat(64), `-----END ${keyLabel}-----`].join('\r\n');
  const token = ['npm_', 'A'.repeat(36)].join('');
  const outputPath = join(root, 'test.vsix');
  const entries = ['package.json', 'extension.cjs'];
  const packageWith = (name) => writeVsix({ root, outputPath, inventory: [...entries, name].map((entry) => [entry, `extension/${entry}`]) });
  for (const [name, content, rule] of [
    ['key.txt', key, 'privatekey'],
    ['token.txt', token, 'npm'],
    ['.env', 'FIXTURE=example', 'no-dotenv'],
    ['graphic.svg', `<svg><!-- ${token} --></svg>`, 'npm'],
  ]) {
    await writeFile(join(root, name), content);
    await assert.rejects(packageWith(name), (error) => {
      assert.ok(error.message.includes(`Potential secret in VSIX entry extension/${name}`));
      assert.ok(error.message.includes(`secretlint-rule-${rule}`));
      assert.ok(!error.message.includes(token) && !error.message.includes(keyLine));
      return true;
    });
  }
  await writeFile(join(root, 'fixture.txt'), 'https://fixture:placeholder@example.invalid/');
  await packageWith('fixture.txt');
});
