import type { ScanCreate } from '../../types/api';
import type { ScanDraft } from '../../types/scanDraft';
import { db, type SyncItem } from './db';

// Scan persistence. Drafts are saved on every change; a finished scan is stored and queued in one transaction.

export async function saveDraft(scanId: string, draft: ScanDraft): Promise<void> {
  await db.scans.put({ scanId, status: 'draft', draft, updatedAt: new Date().toISOString() });
}

export async function loadDraft() {
  return db.scans.where('status').equals('draft').first();
}

export async function deleteDraft(scanId: string): Promise<void> {
  await db.scans.delete(scanId);
}

export async function queueScan(scanId: string, body: ScanCreate): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction('rw', db.scans, db.sync_queue, async () => {
    await db.scans.put({ scanId, status: 'pending', body, updatedAt: now });
    const item: SyncItem = { scanId, status: 'PENDING', attempts: 0, nextAttemptAt: 0, createdAt: now };
    await db.sync_queue.add(item);
  });
}
