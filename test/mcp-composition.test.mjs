import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { embeddedFromMap } from '../scripts/mcp-composition.mjs';

test('MCP composition recognizes embedded versions and rejects a changed source map', async () => {
  const sourceMap = await readFile(new URL(
    '../node_modules/@modelcontextprotocol/server/dist/ajvProvider-_BPY-P_q.mjs.map', import.meta.url,
  ));
  const versions = Object.fromEntries([...embeddedFromMap(sourceMap).values()].map(({ name, version }) => [name, version]));
  assert.deepEqual(versions, {
    ajv: '8.18.0', 'ajv-formats': '3.0.1', 'fast-deep-equal': '3.1.3',
    'fast-uri': '3.1.9', 'json-schema-traverse': '1.0.0',
  });
  assert.throws(() => embeddedFromMap(Buffer.concat([sourceMap, Buffer.from('\n')])), /sourcemap differs/);
});
