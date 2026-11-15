import { ApiError } from '../api/client';
import { submitScan } from '../api/endpoints';
import { db, type Rejection } from './db';
import { ensureClientScanId } from './scanBody';
import { backoffMs, isPermanentStatus, shouldPauseAutoRetry } from './retryPolicy';

export { backoffMs };

// Outbound queue. Temporary failures (no network, timeout, 5xx, 408, 429) are retried with growing delays,
// and paused after MAX_AUTO_ATTEMPTS. Permanent failures (other 4xx) are kept as REJECTED and never resent unchanged.
// Nothing is deleted here: records leave the queue only when the server accepts them or the user deletes them.

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

function rejectionKind(status: number): Rejection['kind'] {
  if (status === 422) return 'validation';
  if (status === 409) return 'conflict';
  return 'rejected';
}

async function reject(id: number, rejection: Rejection): Promise<void> {
  const summary = rejection.details.map((d) => `${d.field}: ${d.message}`).join('; ');
  await db.sync_queue.update(id, {
    status: 'REJECTED',
    autoRetryPaused: false,
    rejection,
    lastError: summary || undefined,
  });
}

async function runFlush(now: number): Promise<number> {
  let sent = 0;
  // An item left as SENDING by an interrupted flush is retried, not stuck forever.
  await db.sync_queue.where('status').equals('SENDING').modify({ status: 'FAILED', nextAttemptAt: 0 });

  // Paused items carry a far-future nextAttemptAt, so they are not due until the user retries them.
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
      await reject(id, {
        kind: 'local',
        statusCode: 0,
        details: [{ field: 'scan', message: 'The local copy of this scan is missing.' }],
      });
      continue;
    }

    // Give legacy queue entries their idempotency key and save it before the first send, so every retry carries the same key.
    const body = ensureClientScanId(stored.body, item.scanId);
    if (body !== stored.body) await db.scans.update(item.scanId, { body });

    await db.sync_queue.update(id, { status: 'SENDING' });
    try {
      await submitScan(body);
      await db.transaction('rw', db.sync_queue, db.scans, async () => {
        await db.sync_queue.update(id, { status: 'SENT', lastError: undefined, autoRetryPaused: false });
        await db.scans.update(item.scanId, { status: 'synced' });
      });
      sent += 1;
    } catch (err) {
      if (err instanceof ApiError && isPermanentStatus(err.status)) {
        await reject(id, {
          kind: rejectionKind(err.status),
          statusCode: err.status,
          details: err.details.map((d) => ({ field: d.field, message: d.message })),
        });
      } else {
        const attempts = item.attempts + 1;
        const paused = shouldPauseAutoRetry(attempts);
        await db.sync_queue.update(id, {
          status: 'FAILED',
          attempts,
          nextAttemptAt: paused ? Number.MAX_SAFE_INTEGER : Date.now() + backoffMs(attempts),
          autoRetryPaused: paused,
          lastError: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  }
  return sent;
}

// Manual retry of a queued or paused record. Rejected records are never resent unchanged, so this does nothing for them.
// Resolves with how many scans were accepted, so the caller knows whether to refresh the screens.
export async function retryItem(id: number): Promise<number> {
  const item = await db.sync_queue.get(id);
  if (!item || (item.status !== 'FAILED' && item.status !== 'PENDING')) return 0;
  await db.sync_queue.update(id, { status: 'FAILED', attempts: 0, nextAttemptAt: 0, autoRetryPaused: false });
  return flushQueue();
}

// Removes a rejected record and its local copy. Only ever called after the user confirms.
export async function deleteRejected(id: number): Promise<boolean> {
  const item = await db.sync_queue.get(id);
  if (!item || item.status !== 'REJECTED') return false;
  await db.transaction('rw', db.sync_queue, db.scans, async () => {
    await db.sync_queue.delete(id);
    await db.scans.delete(item.scanId);
  });
  return true;
}
