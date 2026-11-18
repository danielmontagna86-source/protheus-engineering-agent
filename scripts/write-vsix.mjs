import { extname, join } from 'node:path';
import { lintSource } from '@secretlint/core';
import { creator as noDotenv } from '@secretlint/secretlint-rule-no-dotenv';
import { creator as recommended } from '@secretlint/secretlint-rule-preset-recommend';
import { readBoundedRegularFile } from './path-safety.mjs';
import { writeZipArchive } from './zip.mjs';

const types = {
  '.cjs': 'application/octet-stream',
  '.json': 'application/json',
  '.js': 'application/javascript',
  '.md': 'text/markdown',
  '.mjs': 'application/javascript',
  '.png': 'image/png',
  '.prw': 'application/octet-stream',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.vsixmanifest': 'text/xml',
};
const declaration = '<?xml version="1.0" encoding="utf-8"?>';
const stableVersion = '(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)';
const extensionVersion = new RegExp(`^${stableVersion}$`);
const editorEngine = new RegExp(`^\\^?${stableVersion}$`);
const assetTypes = [
  ['Microsoft.VisualStudio.Code.Manifest', 'extension/package.json'],
  ['Microsoft.VisualStudio.Services.Content.Details', 'extension/readme.md'],
  ['Microsoft.VisualStudio.Services.Content.Changelog', 'extension/changelog.md'],
  ['Microsoft.VisualStudio.Services.Content.License', 'extension/LICENSE.md'],
];
const secretConfig = { rules: [
  { id: '@secretlint/secretlint-rule-preset-recommend', rule: recommended, rules: [
    { id: '@secretlint/secretlint-rule-basicauth', allowMessageIds: ['BasicAuth'] },
    { id: '@secretlint/secretlint-rule-privatekey', options: {
      allows: ['/^(?![\\s\\S]*-----BEGIN .*PRIVATE KEY-----[A-Za-z0-9+/=\\r\\n]{50,}-----END .*PRIVATE KEY-----)[\\s\\S]*$/'],
    } },
    { id: '@secretlint/secretlint-rule-npm', options: { allows: ['/^(?!(?:npm_[0-9A-Za-z]{36})$).+$/'] } },
  ] },
  { id: '@secretlint/secretlint-rule-no-dotenv', rule: noDotenv },
] };

async function scanPackagedText({ name, data }) {
  if (/\.(jpe?g|png|gif)$/i.test(name)) return;
  const { messages } = await lintSource({
    source: { content: data.toString('utf8'), filePath: name, ext: extname(name), contentType: 'text' },
    options: { config: secretConfig, maskSecrets: true },
  });
  const rules = new Set(messages.filter(({ severity }) => severity === 'error').map(({ ruleId }) => ruleId));
  if (rules.size) throw new Error(`Potential secret in VSIX entry ${name} (${[...rules].join(', ')})`);
}

function xml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[char]);
}

function validateManifest(manifest, names) {
  const { publisher, name, version, engines, main, icon } = manifest;
  if (![publisher, name].every((value) => typeof value === 'string' && /^[a-z0-9][a-z0-9-]*$/i.test(value))
    || typeof version !== 'string' || !extensionVersion.test(version)) {
    throw new Error('Invalid VS Code extension identity or version');
  }
  if (typeof engines?.vscode !== 'string' || !editorEngine.test(engines.vscode)) {
    throw new Error('Unsupported VS Code engine range: expected an exact or caret stable version');
  }
  if (typeof main !== 'string' || !/\.(?:cjs|js|mjs)$/.test(main)
    || !names.has(`extension/${main.replace(/^\.\//, '')}`)) {
    throw new Error('Invalid or missing VS Code extension entry point');
  }
  if (icon !== undefined && (typeof icon !== 'string' || !/\.png$/i.test(icon)
    || !names.has(`extension/${icon}`))) {
    throw new Error('Extension icon must be a packaged PNG');
  }
  for (const key of ['categories', 'keywords', 'extensionKind', 'extensionDependencies', 'extensionPack', 'enabledApiProposals']) {
    const value = manifest[key];
    if (value !== undefined && (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim()))) {
      throw new Error(`Invalid VS Code extension metadata: ${key}`);
    }
  }
  for (const key of ['displayName', 'description']) {
    if (manifest[key] !== undefined && typeof manifest[key] !== 'string') {
      throw new Error(`Invalid VS Code extension metadata: ${key}`);
    }
  }
  if (manifest.preview !== undefined && typeof manifest.preview !== 'boolean') {
    throw new Error('Invalid VS Code extension metadata: preview');
  }
}

function manifestXml(manifest, localized, names) {
  const { publisher, name, version, engines, displayName, description, icon } = manifest;
  validateManifest(manifest, names);
  const localizedText = (value) => {
    const key = /^%(.+)%$/.exec(value ?? '')?.[1];
    if (!key) return xml(value);
    if (typeof localized[key] !== 'string') throw new Error(`Missing extension manifest localization: ${key}`);
    return xml(localized[key]);
  };
  const assets = [...assetTypes];
  const tags = new Set(manifest.keywords ?? []);
  if (manifest.contributes?.languageModelTools?.length) {
    tags.add('tools');
    tags.add('language-model-tools');
  }
  if (icon) {
    assets.push(['Microsoft.VisualStudio.Services.Icons.Default', `extension/${icon}`]);
  }
  const properties = {
    'Microsoft.VisualStudio.Code.Engine': engines.vscode,
    'Microsoft.VisualStudio.Code.ExtensionDependencies': (manifest.extensionDependencies ?? []).join(','),
    'Microsoft.VisualStudio.Code.ExtensionPack': (manifest.extensionPack ?? []).join(','),
    'Microsoft.VisualStudio.Code.ExtensionKind': (manifest.extensionKind ?? []).join(','),
    'Microsoft.VisualStudio.Code.LocalizedLanguages': (manifest.contributes?.localizations ?? []).map(({ languageId }) => languageId).join(','),
    'Microsoft.VisualStudio.Code.EnabledApiProposals': (manifest.enabledApiProposals ?? []).join(','),
    'Microsoft.VisualStudio.Code.ExecutesCode': 'true',
    'Microsoft.VisualStudio.Services.Links.Source': manifest.repository?.url,
    'Microsoft.VisualStudio.Services.Links.Getstarted': manifest.repository?.url,
    'Microsoft.VisualStudio.Services.Links.GitHub': manifest.repository?.url,
    'Microsoft.VisualStudio.Services.Links.Support': manifest.bugs?.url,
    'Microsoft.VisualStudio.Services.Links.Learn': manifest.homepage,
    'Microsoft.VisualStudio.Services.Branding.Color': manifest.galleryBanner?.color,
    'Microsoft.VisualStudio.Services.Branding.Theme': manifest.galleryBanner?.theme,
    'Microsoft.VisualStudio.Services.GitHubFlavoredMarkdown': 'true',
    'Microsoft.VisualStudio.Services.Content.Pricing': manifest.pricing,
    'Microsoft.VisualStudio.Services.EnableMarketplaceQnA': manifest.qna === 'marketplace' ? 'true' : undefined,
  };
  return [
    declaration,
    '<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011">',
    '<Metadata>',
    `<Identity Language="en-US" Id="${xml(name)}" Version="${xml(version)}" Publisher="${xml(publisher)}" />`,
    `<DisplayName>${localizedText(displayName ?? name)}</DisplayName>`,
    `<Description xml:space="preserve">${localizedText(description)}</Description>`,
    `<Tags>${xml([...tags].join(','))}</Tags>`,
    `<Categories>${xml((manifest.categories ?? []).join(','))}</Categories>`,
    `<GalleryFlags>Public${manifest.preview ? ' Preview' : ''}</GalleryFlags>`,
    '<Properties>',
    ...Object.entries(properties).filter(([, value]) => value !== undefined)
      .map(([id, value]) => `<Property Id="${id}" Value="${xml(value)}" />`),
    '</Properties>',
    ...(names.has('extension/LICENSE.md') ? ['<License>extension/LICENSE.md</License>'] : []),
    ...(icon ? [`<Icon>extension/${xml(icon)}</Icon>`] : []),
    '</Metadata>',
    '<Installation><InstallationTarget Id="Microsoft.VisualStudio.Code" /></Installation>',
    '<Dependencies />',
    '<Assets>',
    ...assets.filter(([, path]) => names.has(path))
      .map(([type, path]) => `<Asset Type="${type}" Path="${xml(path)}" Addressable="true" />`),
    '</Assets>',
    '</PackageManifest>',
    '',
  ].join('\n');
}

export async function writeVsix({ root, outputPath, inventory }) {
  const entries = [];
  let bytes = 0;
  for (const [source, name] of inventory) {
    if (!/^extension\/[a-zA-Z0-9_./-]+$/.test(name)
      || !/^[a-zA-Z0-9_./-]+$/.test(source)
      || [source, name].some((path) => path.split('/').some((part) => !part || part === '.' || part === '..'))) {
      throw new Error(`Invalid VSIX inventory entry: ${name}`);
    }
    const path = join(root, source);
    const data = await readBoundedRegularFile(root, path, 20 * 1024 * 1024 - bytes,
      `Unsafe or oversized VSIX input: ${source}`);
    bytes += data.length;
    entries.push({ name, data });
  }
  const names = new Set(entries.map(({ name }) => name));
  if (new Set(entries.map(({ name }) => name.toLowerCase())).size !== entries.length) {
    throw new Error('Duplicate VSIX inventory entry');
  }
  const readJson = (name, fallback) => {
    const entry = entries.find((item) => item.name === name);
    if (entry) {
      const value = JSON.parse(entry.data.toString('utf8'));
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid JSON object: ${name}`);
      return value;
    }
    if (fallback) return fallback;
    throw new Error(`Missing manifest: ${name}`);
  };
  const manifest = readJson('extension/package.json');
  delete manifest.private;
  entries.find(({ name }) => name === 'extension/package.json').data = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  const localized = readJson('extension/package.nls.json', {});
  const extensions = new Set(entries.map(({ name }) => extname(name)).filter(Boolean));
  extensions.add('.vsixmanifest');
  const defaults = [...extensions].sort().map((extension) => (
    `<Default Extension="${extension}" ContentType="${types[extension] ?? 'application/octet-stream'}" />`
  ));
  entries.push(
    { name: '[Content_Types].xml', data: `${declaration}\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${defaults.join('')}</Types>\n` },
    { name: 'extension.vsixmanifest', data: manifestXml(manifest, localized, names) },
  );
  for (const entry of entries) await scanPackagedText(entry);
  entries.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase(), 'en'));
  await writeZipArchive(outputPath, entries, { mtime: new Date(2000, 0, 1), compress: false, forceDosTimestamp: true });
}
