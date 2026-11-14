import Dexie, { type Table } from 'dexie';
import type { Dashboard, MetricOut, Page, ScanCreate } from '../../types/api';
import type { ScanDraft } from '../../types/scanDraft';

// Local IndexedDB store. This is the only module that opens the database.
// The name is new (v2) because the schema changed and Dexie cannot change a primary key in place.

export type CacheKey = 'dashboard' | 'metrics';
export type CachePayload = Dashboard | Page<MetricOut>;

export interface CacheRow {
  key: CacheKey;
  payload: CachePayload;
  cachedAt: string;
}

export interface StoredScan {
  scanId: string;
  // draft: in progress and restorable. pending: queued for sending. synced: accepted by the server.
  status: 'draft' | 'pending' | 'synced';
  draft?: ScanDraft;
  // Exact body that will be POSTed, built once when the scan is finished.
  body?: ScanCreate;
  updatedAt: string;
}

export type SyncStatus = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'REJECTED';

export interface RejectionDetail {
  field: string;
  message: string;
}

// Why a record was rejected. Kept on the record so the user can see it and decide what to do.
// validation: 422, the values need correction. conflict: 409, the scan ID was used with other data.
// rejected: any other 4xx. local: the device's copy is incomplete.
export interface Rejection {
  kind: 'validation' | 'conflict' | 'rejected' | 'local';
  statusCode: number;
  details: RejectionDetail[];
}

export interface SyncItem {
  id?: number;
  scanId: string;
  status: SyncStatus;
  attempts: number;
  nextAttemptAt: number; // epoch ms; 0 means due immediately
  lastError?: string;
  createdAt: string;
  rejection?: Rejection; // set when status is REJECTED
  autoRetryPaused?: boolean; // automatic retries stopped after the limit; the record waits for a manual retry
}

class CrewSenseDB extends Dexie {
  cache!: Table<CacheRow, CacheKey>;
  scans!: Table<StoredScan, string>;
  sync_queue!: Table<SyncItem, number>;

  constructor() {
    super('crewsense_v2');
    this.version(1).stores({
      cache: 'key',
      scans: 'scanId, status',
      sync_queue: '++id, status, scanId',
    });
  }
}

export const db = new CrewSenseDB();
