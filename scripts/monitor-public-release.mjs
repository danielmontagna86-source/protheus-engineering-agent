import { createHash } from 'node:crypto';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_ASSET_BYTES = 50 * 1024 * 1024;
const DEFAULT_MAX_TOTAL_BYTES = 100 * 1024 * 1024;

function releaseAssetNames(tag) {
  return [
    `protheus-engineering-agent-${tag}-source.zip`,
    `protheus-engineering-agent-${tag}.vsix`,
    `protheus-engineering-agent-${tag}.cdx.json`,
    `release-manifest-${tag}.json`,
    'SHA256SUMS',
  ];
}

function payloadAssetNames(tag) {
  return releaseAssetNames(tag).slice(0, 3);
}

function parseChecksums(buffer) {
  const entries = new Map();
  for (const line of buffer.toString('utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const match = line.match(/^([0-9a-f]{64})\s+\*?(.+)$/i);
    if (!match) throw new Error('SHA256SUMS contains a malformed entry.');
    entries.set(match[2], match[1].toLowerCase());
  }
  return entries;
}

async function boundedRead(url, { fetchImpl, timeoutMs, headers, maxBytes }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { headers, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new Error(`Response size limit violated for ${url}`);
    const chunks = [];
    let bytes = 0;
    if (response.body?.getReader) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxBytes) {
          controller.abort();
          throw new Error(`Response size limit violated for ${url}`);
        }
        chunks.push(Buffer.from(value));
      }
      return Buffer.concat(chunks, bytes);
    }
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length > maxBytes) throw new Error(`Response size limit violated for ${url}`);
    return body;
  } finally {
    controller.abort();
    clearTimeout(timer);
  }
}

export async function probePublicRelease({
  owner = 'danielmontagna86-source',
  repo = 'protheus-engineering-agent',
  tag = 'v0.3.8',
  fetchImpl = globalThis.fetch,
  token,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxAssetBytes = DEFAULT_MAX_ASSET_BYTES,
  maxTotalBytes = DEFAULT_MAX_TOTAL_BYTES,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.');
  if (!/^v\d+\.\d+\.\d+$/.test(tag)) throw new Error(`Invalid release tag: ${tag}`);
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'protheus-engineering-agent-release-monitor',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/tags/${encodeURIComponent(tag)}`;
  const releaseBody = await boundedRead(apiUrl, { fetchImpl, timeoutMs, headers, maxBytes: 2 * 1024 * 1024 });
  let release;
  try {
    release = JSON.parse(releaseBody.toString('utf8'));
  } catch {
    throw new Error('GitHub release response is not valid JSON.');
  }
  if (release.tag_name !== tag || release.draft) throw new Error(`Release ${tag} is unavailable or still a draft.`);

  const requiredNames = releaseAssetNames(tag);
  const byName = new Map((release.assets ?? []).map((asset) => [asset.name, asset]));
  for (const name of requiredNames) {
    if (!byName.has(name)) throw new Error(`Missing required release asset: ${name}`);
  }

  let totalBytes = 0;
  const downloaded = new Map();
  for (const name of requiredNames) {
    const asset = byName.get(name);
    if (!Number.isSafeInteger(asset.size) || asset.size <= 0 || asset.size > maxAssetBytes) {
      throw new Error(`Asset size limit violated: ${name}`);
    }
    totalBytes += asset.size;
    if (totalBytes > maxTotalBytes) throw new Error('Total release asset size limit violated.');
    if (!/^sha256:[0-9a-f]{64}$/i.test(asset.digest ?? '')) throw new Error(`Missing trusted API digest: ${name}`);
    const downloadUrl = new URL(asset.browser_download_url);
    if (!['github.com', 'objects.githubusercontent.com'].includes(downloadUrl.hostname)) {
      throw new Error(`Untrusted release asset host: ${downloadUrl.hostname}`);
    }
    const body = await boundedRead(downloadUrl, {
      fetchImpl,
      timeoutMs,
      headers: { 'User-Agent': headers['User-Agent'] },
      maxBytes: maxAssetBytes,
    });
    if (body.length !== asset.size) throw new Error(`Downloaded size mismatch: ${name}`);
    const digest = createHash('sha256').update(body).digest('hex');
    if (`sha256:${digest}`.toLowerCase() !== asset.digest.toLowerCase()) {
      throw new Error(`API digest mismatch: ${name}`);
    }
    downloaded.set(name, { body, digest });
  }

  const checksums = parseChecksums(downloaded.get('SHA256SUMS').body);
  const payloadNames = payloadAssetNames(tag);
  for (const name of payloadNames) {
    if (checksums.get(name) !== downloaded.get(name).digest) throw new Error(`SHA256SUMS digest mismatch: ${name}`);
  }
  if ([...checksums.keys()].some((name) => !payloadNames.includes(name))) {
    throw new Error('SHA256SUMS contains an undeclared release payload.');
  }

  const manifestName = `release-manifest-${tag}.json`;
  let manifest;
  try {
    manifest = JSON.parse(downloaded.get(manifestName).body.toString('utf8'));
  } catch {
    throw new Error('Release manifest is not valid JSON.');
  }
  if (manifest.schemaVersion !== 1 || manifest.version !== tag.slice(1) || !Array.isArray(manifest.artifacts)) {
    throw new Error('Release manifest contract mismatch.');
  }
  const manifestArtifacts = new Map(manifest.artifacts.map((artifact) => [artifact.path?.split('/').pop(), artifact]));
  for (const name of payloadNames) {
    const entry = manifestArtifacts.get(name);
    if (entry?.sha256 !== downloaded.get(name).digest || entry?.bytes !== downloaded.get(name).body.length) {
      throw new Error(`Release manifest digest mismatch: ${name}`);
    }
  }

  return {
    status: 'healthy',
    repository: `${owner}/${repo}`,
    tag,
    releaseUrl: release.html_url,
    checkedAt: new Date().toISOString(),
    totalBytes,
    assets: requiredNames.map((name) => ({
      name,
      bytes: downloaded.get(name).body.length,
      sha256: downloaded.get(name).digest,
      verified: true,
    })),
  };
}

async function main() {
  try {
    const result = await probePublicRelease({
      owner: process.env.PEA_MONITOR_OWNER,
      repo: process.env.PEA_MONITOR_REPOSITORY,
      tag: process.env.PEA_MONITOR_RELEASE_TAG,
      token: process.env.GITHUB_TOKEN,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ status: 'unhealthy', error: error.message })}\n`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
