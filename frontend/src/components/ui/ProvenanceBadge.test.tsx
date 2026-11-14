import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ProvenanceBadge } from './ProvenanceBadge';

// Globals are off in this project, so RTL's automatic cleanup is not registered: clean up explicitly.
afterEach(() => cleanup());

describe('ProvenanceBadge', () => {
  it('names the source the backend reported', () => {
    const { getByText } = render(<ProvenanceBadge sourceType="imported_examination" />);
    expect(getByText('Imported examination')).toBeTruthy();
  });

  it('marks synthetic demo values so they cannot pass as live readings', () => {
    const { container, getByText } = render(<ProvenanceBadge sourceType="sensor_reading" isSynthetic />);
    expect(getByText('Synthetic demo')).toBeTruthy();
    expect(container.querySelector('[data-synthetic="true"]')).not.toBeNull();
  });

  it('shows an absent source as absent, never as a measurement', () => {
    const { getByText, container } = render(<ProvenanceBadge sourceType={undefined} />);
    expect(getByText('No source')).toBeTruthy();
    expect(container.querySelector('[data-synthetic]')).toBeNull();
  });
});
