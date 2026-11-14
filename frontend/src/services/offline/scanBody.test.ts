import { describe, expect, it } from 'vitest';
import type { ScanCreate } from '../../types/api';
import { ensureClientScanId } from './scanBody';

const base: ScanCreate = {
  astronaut_id: 1,
  as_of: '2026-11-13T07:30:00Z',
  wellbeing: { mood_score: 3, stress_score: 6, sleep_hours: 5.2, symptoms: [] },
  new_measurements: [],
};

describe('ensureClientScanId', () => {
  it('gives a legacy body (no client_scan_id) the scan ID', () => {
    const scanId = '3f2c1a9e-6b1d-4f0e-9a33-2d7c5e8b1a10';
    const body = ensureClientScanId(base, scanId);
    expect(body.client_scan_id).toBe(scanId);
    expect(body).not.toBe(base);
  });

  it('keeps an existing client_scan_id and returns the same object', () => {
    const withId: ScanCreate = { ...base, client_scan_id: 'existing-id-0001' };
    expect(ensureClientScanId(withId, 'other-scan-id-0002')).toBe(withId);
  });

  it('does not change the rest of the body', () => {
    const body = ensureClientScanId(base, 'scan-id-0003');
    expect(body.wellbeing).toEqual(base.wellbeing);
    expect(body.as_of).toBe(base.as_of);
  });
});
