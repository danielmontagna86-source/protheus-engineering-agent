import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const DEFAULT_MANIFEST = Object.freeze({ schemaVersion: 1, connections: Object.freeze([]), routes: Object.freeze([]) });

function clone(value) { return JSON.parse(JSON.stringify(value)); }

export function createConnectionManifestStore(options = {}) {
  const workspace = options.workspace;
  const validator = options.validate ?? ((value) => value);
  const io = options.io ?? { mkdir, readFile, rename, writeFile };
  if (typeof workspace !== 'string' || workspace.length === 0) throw new TypeError('workspace is required');
  if (typeof validator !== 'function') throw new TypeError('validate is required');
  const path = join(workspace, '.pea', 'ai-connections.json');
  const temporaryPath = path + '.tmp';
  async function read() {
    try {
      const manifest = JSON.parse(await io.readFile(path, 'utf8'));
      return clone(validator(manifest));
    } catch (error) {
      if (error?.code === 'ENOENT') return clone(DEFAULT_MANIFEST);
      throw error;
    }
  }
  async function write(manifest) {
    const safe = clone(validator(manifest));
    await io.mkdir(dirname(path), { recursive: true });
    await io.writeFile(temporaryPath, JSON.stringify(safe, null, 2) + '\n', 'utf8');
    await io.rename(temporaryPath, path);
    return safe;
  }
  return Object.freeze({ path, read, write });
}
