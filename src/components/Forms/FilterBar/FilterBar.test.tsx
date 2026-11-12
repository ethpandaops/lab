import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@/test-utils';
import { FilterBar, FilterRange } from './FilterBar';
import { formatRange } from './FilterBar.utils';

interface Filters {
  min?: number;
  max?: number;
}

function renderBar(filters: Filters, onChange: (filters: Filters) => void): void {
  render(
    <FilterBar
      filters={filters}
      onChange={onChange}
      title="Filter rows"
      chips={
        filters.min !== undefined
          ? [{ id: 'min', label: 'Min', value: String(filters.min), onRemove: () => onChange({}) }]
          : []
      }
    >
      {(draft, setDraft) => (
        <FilterRange label="Gas" min={draft.min} max={draft.max} onChange={(min, max) => setDraft({ min, max })} />
      )}
    </FilterBar>
  );
}

describe('FilterBar', () => {
  it('applies the edited draft only on submit', () => {
    const onChange = vi.fn();
    renderBar({ min: 1 }, onChange);
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    fireEvent.change(screen.getByLabelText('Gas max'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Gas min'), { target: { value: '' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onChange).toHaveBeenCalledWith({ min: undefined, max: 30 });
  });

  it('discards the draft on cancel', () => {
    const onChange = vi.fn();
    renderBar({}, onChange);
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    fireEvent.change(screen.getByLabelText('Gas min'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clears every filter from the chip bar', () => {
    const onChange = vi.fn();
    renderBar({ min: 1 }, onChange);
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(onChange).toHaveBeenCalledWith({});
  });
});

describe('formatRange', () => {
  it('shows the bounds that are set, keeping zero as a bound', () => {
    expect(formatRange(0, 5, 's')).toBe('0–5s');
    expect(formatRange(0, undefined)).toBe('≥ 0');
    expect(formatRange(undefined, 3)).toBe('≤ 3');
    expect(formatRange(2, 2)).toBe('2');
    expect(formatRange(undefined, undefined)).toBeUndefined();
  });
});
