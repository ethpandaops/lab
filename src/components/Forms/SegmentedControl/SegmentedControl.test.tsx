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

  it('narrows an overflowing control to whole segments that include the selected one', () => {
    // A 100px control holding three 40px segments after a 2px inset
    const lefts: Record<string, number> = { '24h': 2, '7d': 42, '30d': 82 };
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      const left = this.getAttribute('role') === 'group' ? 0 : lefts[this.textContent ?? ''];
      return { left, right: this.getAttribute('role') === 'group' ? 100 : left + 40 } as DOMRect;
    });
    const scrollWidth = vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(124);
    const clientWidth = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100);
    render(<SegmentedControl options={options} value="30d" onChange={() => {}} ariaLabel="Time window" />);
    const group = screen.getByRole('group');
    expect(group.style.width).toBe('84px');
    expect(group.scrollLeft).toBe(40);
    rect.mockRestore();
    scrollWidth.mockRestore();
    clientWidth.mockRestore();
  });
});
