import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ProvenanceBadge } from './ProvenanceBadge';

// Globals are off in this project, so RTL's automatic cleanup is not registered: clean up explicitly.
afterEach(() => cleanup());

describe('ProvenanceBadge', () => {
  it('labels a synthetic value so it cannot pass as a live reading', () => {
    const { container, getByText } = render(<ProvenanceBadge source="SYNTHETIC" />);
    expect(getByText('Synthetic demo')).toBeTruthy();
    expect(container.querySelector('[data-provenance="SYNTHETIC"]')?.className).toContain('border-dashed');
  });

  it('labels a sensor reading with its source', () => {
    const { getByText } = render(<ProvenanceBadge source="SENSOR" />);
    expect(getByText('Sensor')).toBeTruthy();
  });

  it('never shows an unknown source as if it were measured', () => {
    const { getByText, container } = render(<ProvenanceBadge source={undefined} />);
    expect(getByText('Source unknown')).toBeTruthy();
    expect(container.querySelector('[data-provenance]')).toBeNull();
  });
});
