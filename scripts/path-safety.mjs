import { lstat } from 'node:fs/promises';
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
