import Dexie, { type Table } from 'dexie';
import type { ManualKey, ScanStep } from '../../store/useScanStore';
import type { AlertItem, Reading } from '../../types/telemetry';

// Local tables from Spec, Section 10: telemetry_cache, scans, alerts, sync_queue.
// This is the only module that opens IndexedDB (Spec, Section 12).

export interface CachedReading {
  id: string; // indicator id
  reading: Reading;
  cachedAt: string;
}

export interface StoredScan {
  scanId: string;
  // draft: in progress and restorable. pending: finished, awaiting sync. synced: accepted by the server.
  status: 'draft' | 'pending' | 'synced';
  payload: ScanDraftPayload;
  updatedAt: string;
}

export interface ScanDraftPayload {
  step: ScanStep;
  manual: Partial<Record<ManualKey, string>>;
  mood: number | null;
  stress: number | null;
  symptoms: string[];
}

export interface StoredAlert {
  id: string;
  alert: AlertItem;
  cachedAt: string;
}

export type SyncStatus = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED';

export interface SyncItem {
  id?: number;
  scanId: string;
  status: SyncStatus;
  attempts: number;
  nextAttemptAt: number; // epoch ms; 0 means immediately
  lastError?: string;
  createdAt: string;
}

class CrewSenseDB extends Dexie {
  telemetry_cache!: Table<CachedReading, string>;
  scans!: Table<StoredScan, string>;
  alerts!: Table<StoredAlert, string>;
  sync_queue!: Table<SyncItem, number>;

  constructor() {
    super('crewsense');
    this.version(1).stores({
      telemetry_cache: 'id',
      scans: 'scanId, status',
      alerts: 'id',
      sync_queue: '++id, status, scanId',
    });
  }
}

export const db = new CrewSenseDB();
