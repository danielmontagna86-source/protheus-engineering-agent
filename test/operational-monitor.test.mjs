import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { probePublicRelease } from '../scripts/monitor-public-release.mjs';

const tag = 'v0.3.9';
const names = [
  `protheus-engineering-agent-${tag}-source.zip`,
  `protheus-engineering-agent-${tag}.vsix`,
  `protheus-engineering-agent-${tag}.cdx.json`,
];
const manifestName = `release-manifest-${tag}.json`;

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function releaseFixture({ corruptAsset, missingAsset, oversizedDownload } = {}) {
  const bodies = Object.fromEntries(names.map((name) => [name, Buffer.from(`verified:${name}`)]));
  bodies[manifestName] = Buffer.from(JSON.stringify({
    schemaVersion: 1,
    version: tag.slice(1),
    artifacts: names.map((name) => ({ path: `release-artifacts/${name}`, sha256: sha256(bodies[name]), bytes: bodies[name].length })),
  }));
  const sums = Buffer.from(names.map((name) => `${sha256(bodies[name])}  ${name}`).join('\n') + '\n');
  bodies.SHA256SUMS = sums;
  const assetNames = [...names, manifestName, 'SHA256SUMS'].filter((name) => name !== missingAsset);
  const release = {
    tag_name: tag,
    draft: false,
    prerelease: true,
    html_url: `https://example.test/releases/tag/${tag}`,
    assets: assetNames.map((name) => ({
      name,
      size: bodies[name].length,
      digest: `sha256:${sha256(bodies[name])}`,
      browser_download_url: `https://github.com/download/${encodeURIComponent(name)}`,
    })),
  };
  const fetchImpl = async (url) => {
    if (String(url).includes('/releases/tags/')) {
      return new Response(JSON.stringify(release), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    const name = decodeURIComponent(new URL(url).pathname.split('/').pop());
    const body = oversizedDownload === name
      ? Buffer.alloc(129, 1)
      : corruptAsset === name
      ? Buffer.from(bodies[name].map((byte, index) => index === 0 ? byte ^ 1 : byte))
      : bodies[name];
    return new Response(body, { status: body ? 200 : 404 });
  };
  return { fetchImpl };
}

test('public release monitor verifies every required asset against API and checksum set', async () => {
  const result = await probePublicRelease({
    owner: 'example',
    repo: 'pea',
    tag,
    fetchImpl: releaseFixture().fetchImpl,
    timeoutMs: 1_000,
  });

  assert.equal(result.status, 'healthy');
  assert.equal(result.tag, tag);
  assert.deepEqual(result.assets.map(({ name }) => name).sort(), [...names, manifestName, 'SHA256SUMS'].sort());
  assert.ok(result.assets.every(({ verified }) => verified));
});

test('public release monitor fails closed on missing or tampered artifacts', async () => {
  await assert.rejects(
    probePublicRelease({ owner: 'example', repo: 'pea', tag, fetchImpl: releaseFixture({ missingAsset: names[0] }).fetchImpl }),
    /missing required release asset/i,
  );
  await assert.rejects(
    probePublicRelease({ owner: 'example', repo: 'pea', tag, fetchImpl: releaseFixture({ corruptAsset: names[1] }).fetchImpl }),
    /digest mismatch/i,
  );
});

test('public release monitor enforces a bounded download budget', async () => {
  await assert.rejects(
    probePublicRelease({
      owner: 'example',
      repo: 'pea',
      tag,
      fetchImpl: releaseFixture().fetchImpl,
      maxAssetBytes: 10,
    }),
    /size limit/i,
  );
  await assert.rejects(
    probePublicRelease({
      owner: 'example',
      repo: 'pea',
      tag,
      fetchImpl: releaseFixture({ oversizedDownload: names[0] }).fetchImpl,
      maxAssetBytes: 128,
    }),
    /size limit/i,
  );
});
