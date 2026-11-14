import { ApiError } from '../api/client';
import { db, type CacheKey, type CachePayload } from './db';

// Live-first reads. A successful response is cached. When the server cannot be reached, the last cached copy is returned and labelled as such.
export interface Loaded<T> {
  data: T;
  fromCache: boolean;
  cachedAt: string | null;
}

export async function withCache<T extends CachePayload>(key: CacheKey, fetcher: () => Promise<T>): Promise<Loaded<T>> {
  try {
    const data = await fetcher();
    const cachedAt = new Date().toISOString();
    await db.cache.put({ key, payload: data, cachedAt });
    return { data, fromCache: false, cachedAt: null };
  } catch (err) {
    if (!(err instanceof ApiError) || !err.isNetworkFailure) throw err;
    const row = await db.cache.get(key);
    if (!row) throw err;
    return { data: row.payload as T, fromCache: true, cachedAt: row.cachedAt };
  }
}
