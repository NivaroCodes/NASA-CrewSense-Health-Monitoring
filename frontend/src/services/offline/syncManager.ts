import { submitScan } from '../api/endpoints';
import { db } from './db';

// Outbound queue (Spec, Section 10). Each failed item waits longer before its next attempt:
// 2 s, 4 s, 8 s and so on, capped at 60 s. Items are never discarded on failure.
const BASE_MS = 2000;
const CAP_MS = 60_000;

export function backoffMs(attempts: number): number {
  return Math.min(BASE_MS * 2 ** Math.max(0, attempts - 1), CAP_MS);
}

export async function pendingCount(): Promise<number> {
  return db.sync_queue.where('status').anyOf('PENDING', 'SENDING', 'FAILED').count();
}

// Sends every item that is due. Safe to call repeatedly; an item already SENDING is not picked up again.
export async function flushQueue(now: number = Date.now()): Promise<void> {
  const due = await db.sync_queue
    .where('status')
    .anyOf('PENDING', 'FAILED')
    .filter((item) => item.nextAttemptAt <= now)
    .toArray();

  for (const item of due) {
    if (item.id === undefined) continue;
    await db.sync_queue.update(item.id, { status: 'SENDING' });
    const stored = await db.scans.get(item.scanId);
    if (!stored) {
      await db.sync_queue.update(item.id, { status: 'FAILED', lastError: 'Scan record missing locally' });
      continue;
    }
    try {
      await submitScan(item.scanId, stored.payload);
      await db.sync_queue.update(item.id, { status: 'SENT', lastError: undefined });
      await db.scans.update(item.scanId, { status: 'synced' });
    } catch (err) {
      const attempts = item.attempts + 1;
      await db.sync_queue.update(item.id, {
        status: 'FAILED',
        attempts,
        nextAttemptAt: Date.now() + backoffMs(attempts),
        lastError: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
}
