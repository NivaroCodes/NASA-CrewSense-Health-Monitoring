import { ApiError } from '../api/client';
import { submitScan } from '../api/endpoints';
import { db } from './db';
import { ensureClientScanId } from './scanBody';

// Outbound queue. A failed send waits longer each time: 2 s, 4 s, 8 s, capped at 60 s.
// A server rejection (4xx) is not retried, because resending the same body would fail again. It is kept and marked REJECTED.
const BASE_MS = 2000;
const CAP_MS = 60_000;

export function backoffMs(attempts: number): number {
  return Math.min(BASE_MS * 2 ** Math.max(0, attempts - 1), CAP_MS);
}

export async function queueCounts(): Promise<{ pending: number; rejected: number }> {
  const pending = await db.sync_queue.where('status').anyOf('PENDING', 'SENDING', 'FAILED').count();
  const rejected = await db.sync_queue.where('status').equals('REJECTED').count();
  return { pending, rejected };
}

let inFlight: Promise<number> | null = null;

// Sends every due item and resolves with how many were accepted by the server.
// Calls made while a flush is running share that flush.
export function flushQueue(now: number = Date.now()): Promise<number> {
  if (!inFlight) {
    inFlight = runFlush(now).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function runFlush(now: number): Promise<number> {
  let sent = 0;
  // An item left as SENDING by an interrupted flush is retried, not stuck forever.
  await db.sync_queue.where('status').equals('SENDING').modify({ status: 'FAILED', nextAttemptAt: 0 });

  const due = await db.sync_queue
    .where('status')
    .anyOf('PENDING', 'FAILED')
    .filter((item) => item.nextAttemptAt <= now)
    .toArray();

  for (const item of due) {
    const id = item.id;
    if (id === undefined) continue;

    const stored = await db.scans.get(item.scanId);
    if (!stored?.body) {
      await db.sync_queue.update(id, { status: 'REJECTED', lastError: 'The local scan record is missing.' });
      continue;
    }

    // Give legacy queue entries their idempotency key and save it before the first send, so every retry carries the same key.
    const body = ensureClientScanId(stored.body, item.scanId);
    if (body !== stored.body) await db.scans.update(item.scanId, { body });

    await db.sync_queue.update(id, { status: 'SENDING' });
    try {
      await submitScan(body);
      await db.transaction('rw', db.sync_queue, db.scans, async () => {
        await db.sync_queue.update(id, { status: 'SENT', lastError: undefined });
        await db.scans.update(item.scanId, { status: 'synced' });
      });
      sent += 1;
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        const reasons = err.details.map((d) => `${d.field}: ${d.message}`).join('; ');
        await db.sync_queue.update(id, {
          status: 'REJECTED',
          lastError: reasons || err.message,
        });
      } else {
        const attempts = item.attempts + 1;
        await db.sync_queue.update(id, {
          status: 'FAILED',
          attempts,
          nextAttemptAt: Date.now() + backoffMs(attempts),
          lastError: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  }
  return sent;
}
