import { rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

import yauzl from 'yauzl';
import yazl from 'yazl';
import crc32 from 'buffer-crc32';

const DEFAULT_MAX_ENTRIES = 20_000;
const DEFAULT_MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;
const DEFAULT_MAX_ENTRY_BYTES = 20 * 1024 * 1024;

export function readZipArchive(bytes, options = {}) {
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const maxUncompressedBytes = options.maxUncompressedBytes ?? DEFAULT_MAX_UNCOMPRESSED_BYTES;
  const maxEntryBytes = options.maxEntryBytes ?? DEFAULT_MAX_ENTRY_BYTES;
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(bytes, {
      lazyEntries: true,
      strictFileNames: true,
      validateEntrySizes: true,
    }, (openError, zip) => {
      if (openError) return reject(openError);
      const entries = [];
      let declaredBytes = 0;
      let settled = false;
      const fail = (error) => {
        if (settled) return;
        settled = true;
        zip.close();
        reject(error);
      };
      zip.on('error', fail);
      zip.on('end', () => {
        if (settled) return;
        settled = true;
        resolve(entries);
      });
      zip.on('entry', (entry) => {
        if (entries.length >= maxEntries) return fail(new Error(`ZIP exceeds ${maxEntries} entries`));
        declaredBytes += entry.uncompressedSize;
        if (entry.uncompressedSize > maxEntryBytes) return fail(new Error(`ZIP entry exceeds ${maxEntryBytes} bytes: ${entry.fileName}`));
        if (declaredBytes > maxUncompressedBytes) return fail(new Error(`ZIP exceeds ${maxUncompressedBytes} uncompressed bytes`));
        const isDirectory = entry.fileName.endsWith('/');
        const metadata = {
          name: entry.fileName,
          isDirectory,
          uncompressedSize: entry.uncompressedSize,
          mode: (entry.externalFileAttributes >>> 16) & 0xffff,
        };
        if (isDirectory) {
          entries.push({ ...metadata, data: Buffer.alloc(0) });
          zip.readEntry();
          return;
        }
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError) return fail(streamError);
          const chunks = [];
          let actualBytes = 0;
          stream.on('error', fail);
          stream.on('data', (chunk) => {
            actualBytes += chunk.length;
            if (actualBytes > maxEntryBytes || actualBytes > entry.uncompressedSize) {
              stream.destroy(new Error(`ZIP entry expanded beyond its declared limit: ${entry.fileName}`));
              return;
            }
            chunks.push(chunk);
          });
          stream.on('end', () => {
            if (settled) return;
            const data = Buffer.concat(chunks);
            if (crc32.unsigned(data) !== entry.crc32) {
              fail(new Error(`ZIP entry CRC mismatch: ${entry.fileName}`));
              return;
            }
            entries.push({ ...metadata, data });
            zip.readEntry();
          });
        });
      });
      zip.readEntry();
      return undefined;
    });
  });
}

export function createZipBuffer(entries, options = {}) {
  const zip = new yazl.ZipFile();
  const chunks = [];
  const compress = options.compress ?? true;
  const result = new Promise((resolve, reject) => {
    zip.outputStream.on('data', (chunk) => chunks.push(chunk));
    zip.outputStream.on('error', reject);
    zip.outputStream.on('end', () => resolve(Buffer.concat(chunks)));
  });
  for (const entry of entries) {
    const name = String(entry.name).replaceAll('\\', '/');
    const mtime = entry.mtime ?? options.mtime ?? new Date('2000-01-01T00:00:00.000Z');
    if (entry.isDirectory || name.endsWith('/')) {
      zip.addEmptyDirectory(name, { mtime, mode: entry.mode ?? 0o40755 });
    } else {
      zip.addBuffer(Buffer.from(entry.data), name, {
        mtime,
        mode: entry.mode ?? 0o100644,
        compress,
      });
    }
  }
  zip.end({ forceZip64Format: false });
  return result;
}

export async function writeZipArchive(path, entries, options = {}) {
  const temp = `${path}.${process.pid}.${randomUUID()}.tmp`;
  const bytes = await createZipBuffer(entries, options);
  await writeFile(temp, bytes, { flag: 'wx' });
  try {
    await rename(temp, path);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}
