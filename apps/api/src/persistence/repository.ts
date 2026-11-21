import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { emptyStoredState, storedStateSchema, type StoredState } from '@mochi/domain';

export interface StateRepository {
  read(): Promise<StoredState>;
  transact(update: (state: StoredState) => StoredState): Promise<StoredState>;
}

export function createMemoryRepository(initial = emptyStoredState(), save: (next: StoredState) => Promise<void> = async () => {}): StateRepository {
  let current = structuredClone(initial);
  let queue = Promise.resolve();
  return {
    async read() { await queue; return structuredClone(current); },
    transact(update) {
      const result = queue.then(async () => {
        const next = update(structuredClone(current));
        await save(next);
        current = next;
        return structuredClone(current);
      });
      // Failed writes/actions do not publish state or poison the next transaction.
      queue = result.then(() => {}, () => {});
      return result;
    },
  };
}

export async function createFileRepository(file: string): Promise<StateRepository> {
  let initial: StoredState;
  try {
    initial = storedStateSchema.parse(JSON.parse(await readFile(file, 'utf8')));
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    initial = emptyStoredState();
  }
  return createMemoryRepository(initial, async (next) => {
    await mkdir(dirname(file), { recursive: true });
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify(next, null, 2) + '\n', { encoding: 'utf8', mode: 0o600, flag: 'wx', flush: true });
      await rename(temporary, file);
    } finally {
      await unlink(temporary).catch(() => {});
    }
  });
}
