import { beforeEach, describe, expect, it } from 'vitest';
import { EMPTY_WELLBEING, type ScanDraft } from '../types/scanDraft';
import { useScanStore } from './useScanStore';

describe('scan store and reloads', () => {
  beforeEach(() => {
    useScanStore.getState().begin();
  });

  it('keeps the creation time of a restored draft unchanged', () => {
    const draft: ScanDraft = { step: 2, entries: {}, wellbeing: { ...EMPTY_WELLBEING }, startedAt: '2026-11-13T07:30:00.000Z' };
    useScanStore.getState().restore('scan-1', draft);
    expect(useScanStore.getState().scanId).toBe('scan-1');
    expect(useScanStore.getState().startedAt).toBe('2026-11-13T07:30:00.000Z');
  });

  it('gives a draft saved by an earlier build a creation time when it is restored', () => {
    const legacy = { step: 1, entries: {}, wellbeing: { ...EMPTY_WELLBEING } } as unknown as ScanDraft;
    useScanStore.getState().restore('scan-2', legacy);
    expect(Number.isNaN(Date.parse(useScanStore.getState().startedAt))).toBe(false);
  });

  it('gives each new scan its own ID and creation time', () => {
    const first = useScanStore.getState().scanId;
    useScanStore.getState().begin();
    expect(useScanStore.getState().scanId).not.toBe(first);
    expect(Number.isNaN(Date.parse(useScanStore.getState().startedAt))).toBe(false);
  });
});
