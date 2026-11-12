import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import { CountryFlag } from './CountryFlag';

describe('CountryFlag', () => {
  it('draws the flag of a lowercase code as an SVG image', async () => {
    const { container } = render(<CountryFlag code="de" />);
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull());
    const src = decodeURIComponent(container.querySelector('img')!.getAttribute('src')!);
    expect(src).toMatch(/^data:image\/svg\+xml;charset=utf-8,<svg/);
    // Germany's gold band, which no other 3:2 flag in the set draws with this path
    expect(src).toContain('M0 228h513v114H0z');
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('names the flag when given a title', () => {
    render(<CountryFlag code="FR" title="France" />);
    expect(screen.getByRole('img', { name: 'France' })).toBeInTheDocument();
  });

  it('draws nothing for codes without a flag, or a globe when asked', () => {
    expect(render(<CountryFlag code="other" />).container).toBeEmptyDOMElement();
    expect(render(<CountryFlag code={null} />).container).toBeEmptyDOMElement();
    expect(render(<CountryFlag code="ZZ" showUnknown />).container.querySelector('svg')).not.toBeNull();
  });
});
