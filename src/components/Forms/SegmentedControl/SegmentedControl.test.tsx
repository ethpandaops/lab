import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SegmentedControl } from './SegmentedControl';

const options = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
] as const;

describe('SegmentedControl', () => {
  it('marks only the selected option as pressed', () => {
    render(<SegmentedControl options={options} value="7d" onChange={() => {}} ariaLabel="Time window" />);
    expect(screen.getByRole('button', { name: '7d' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '24h' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('group', { name: 'Time window' })).toBeInTheDocument();
  });

  it('reports the clicked option, not the selected one', () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={options} value="7d" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '30d' }));
    expect(onChange).toHaveBeenCalledWith('30d');
  });
});
