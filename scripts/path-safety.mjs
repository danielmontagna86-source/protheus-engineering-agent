import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

export async function assertNoLinkPath(root, candidate) {
  const absoluteRoot = resolve(root);
  const absoluteCandidate = resolve(candidate);
  const rel = relative(absoluteRoot, absoluteCandidate);
  const separator = process.platform === 'win32' ? '\\' : '/';
  if (!rel || rel === '..' || rel.startsWith(`..${separator}`) || isAbsolute(rel)) {
    throw new Error(`path is outside the allowed root: ${candidate}`);
  }

  const parts = rel.split(/[\\/]/).filter(Boolean);
  let current = absoluteRoot;
  for (let index = 0; index < parts.length; index += 1) {
    current = join(current, parts[index]);
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink()) throw new Error(`build path contains a symbolic link or junction: ${current}`);
      if (index < parts.length - 1 && !info.isDirectory()) {
        throw new Error(`build path contains a non-directory component: ${current}`);
      }
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }
  }
}

export async function readBoundedRegularFile(root, path, maxBytes, errorMessage) {
  await assertNoLinkPath(root, path);
  const flags = constants.O_RDONLY | (process.platform === 'win32'
    ? 0
    : (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
  const file = await open(path, flags);
  try {
    const info = await file.stat();
    if (!info.isFile() || info.nlink !== 1 || info.size > maxBytes) throw new Error(errorMessage);
    const current = await lstat(path);
    if (!current.isFile() || current.nlink !== 1 || current.dev !== info.dev || current.ino !== info.ino) {
      throw new Error(errorMessage);
    }
    const data = Buffer.alloc(info.size + 1);
    let offset = 0;
    while (offset < data.length) {
      const { bytesRead } = await file.read(data, offset, data.length - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    if (offset !== info.size) throw new Error(errorMessage);
    return data.subarray(0, offset);
  } finally {
    await file.close();
  }
}
