import type { ScanCreate } from '../../types/api';

// Makes sure a queued scan body carries a client_scan_id before it is sent.
// Scans queued by earlier builds have no ID; they receive their scan's ID, so a retry is recognised by the server.
// Returns the same object when the body already has an ID, so the caller can tell whether a write is needed.
export function ensureClientScanId(body: ScanCreate, scanId: string): ScanCreate {
  if (body.client_scan_id) return body;
  return { ...body, client_scan_id: scanId };
}
