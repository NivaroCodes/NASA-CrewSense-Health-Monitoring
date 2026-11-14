import { db, type ScanDraftPayload, type SyncItem, type StoredScan } from './db';

// Scan persistence. Writes are small and infrequent, so each store change saves the whole draft.

export async function saveDraft(scanId: string, payload: ScanDraftPayload): Promise<void> {
  await db.scans.put({ scanId, status: 'draft', payload, updatedAt: new Date().toISOString() });
}

export async function loadDraft(): Promise<StoredScan | undefined> {
  return db.scans.where('status').equals('draft').first();
}

// Step 9: the finished scan is written and a sync item is queued in one transaction (Spec, Section 6).
export async function finalizeScan(scanId: string, payload: ScanDraftPayload): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction('rw', db.scans, db.sync_queue, async () => {
    await db.scans.put({ scanId, status: 'pending', payload, updatedAt: now });
    const item: SyncItem = { scanId, status: 'PENDING', attempts: 0, nextAttemptAt: 0, createdAt: now };
    await db.sync_queue.add(item);
  });
}
