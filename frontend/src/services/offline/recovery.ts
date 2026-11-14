import { db } from './db';
import { draftFromBody } from './draftFromBody';
import { saveDraft } from './scanRepo';

// Starts a corrected copy of a scan that the server rejected for invalid values, as a new draft with a new scan ID.
// Allowed only for validation rejections: the server stored nothing for them, so a new ID cannot duplicate a saved scan.
// The rejected record stays until the user deletes it. Returns the new scan ID.
export async function recoverAsDraft(id: number): Promise<string> {
  const item = await db.sync_queue.get(id);
  if (!item || item.status !== 'REJECTED' || item.rejection?.kind !== 'validation') {
    throw new Error('Only scans rejected for invalid values can be edited and resubmitted.');
  }
  const stored = await db.scans.get(item.scanId);
  if (!stored?.body) throw new Error('The local copy of this scan is missing.');

  const drafts = await db.scans.where('status').equals('draft').count();
  if (drafts > 0) throw new Error('Finish or discard the scan in progress before editing a rejected scan.');

  const scanId = crypto.randomUUID();
  await saveDraft(scanId, draftFromBody(stored.body, new Date().toISOString()));
  return scanId;
}
