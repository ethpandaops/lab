import type { Meta, StoryObj } from '@storybook/react-vite';
import { namespaceNames } from '@/styles/tokenSource';
import {
  BORDER_COLORS,
  BRAND_COLORS,
  CATEGORY_COLOR_PREFIXES,
  CONTRAST_EXEMPT,
  CONTRAST_RULES,
  DATA_COLOR_PREFIXES,
  DERIVED_COLORS,
  STATUS_COLORS,
  SURFACE_COLORS,
  TEXT_COLORS,
} from '@/styles/tokens';
import { ColorSwatches } from './blocks/ColorSwatches';
import { ContrastTable } from './blocks/ContrastTable';
import { Table } from './blocks/Table';
import { TintScale } from './blocks/TintScale';
import { TokenSwatches } from './blocks/TokenSwatches';

const meta = {
  title: 'Foundations/Colours',
  tags: ['!autodocs', '!dev'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const colorNames = namespaceNames('color');
const isTint = (name: string): boolean => {
  const base = /^(.+)-\d+$/.exec(name)?.[1];
  return base !== undefined && colorNames.includes(base);
};
/** Every colour with tints, in tokens.css order. */
const TINT_BASES = colorNames.filter(name => colorNames.some(tint => tint.startsWith(`${name}-`) && isTint(tint)));
const derived: readonly string[] = Object.values(DERIVED_COLORS).flat();
/** The colours under a prefix, without their tints and the derived colours listed above. */
const withPrefix = (prefix: string): string[] =>
  colorNames.filter(name => name.startsWith(`${prefix}-`) && !isTint(name) && !derived.includes(name));

export const Surfaces: Story = {
  render: () => (
    <ColorSwatches
      tokens={SURFACE_COLORS}
      notes={{ background: 'bg-background: the page', surface: 'bg-surface: cards, panels, the header' }}
    />
  ),
};

export const Lines: Story = {
  render: () => (
    <ColorSwatches tokens={BORDER_COLORS} notes={{ border: 'border-border: separators, card edges, outlines' }} />
  ),
};

export const Text: Story = {
  render: () => (
    <ColorSwatches
      tokens={TEXT_COLORS}
      notes={{ foreground: 'text-foreground: content', muted: 'text-muted: labels, hints, secondary text' }}
    />
  ),
};

export const Brand: Story = {
  render: () => (
    <ColorSwatches
      tokens={BRAND_COLORS}
      notes={{
        primary: 'bg-primary, text-primary: actions, links, the focus ring',
        secondary: 'bg-secondary: a secondary fill',
        accent: 'text-accent: highlights beside primary',
        hyper: "the hyper button's pulse",
      }}
    />
  ),
};

export const Status: Story = {
  render: () => (
    <ColorSwatches
      tokens={STATUS_COLORS}
      notes={{
        success: 'text-success: healthy, done',
        warning: 'text-warning: degraded, needs attention',
        danger: 'text-danger: failed',
      }}
    />
  ),
};

export const Tints: Story = {
  render: () => <TintScale bases={TINT_BASES} />,
};

export const Derived: Story = {
  render: () => (
    <>
      {Object.entries(DERIVED_COLORS).map(([group, tokens]) => (
        <TokenSwatches key={group} caption={group} tokens={tokens} />
      ))}
    </>
  ),
};

export const Categories: Story = {
  render: () => (
    <>
      {CATEGORY_COLOR_PREFIXES.map(prefix => (
        <TokenSwatches key={prefix} caption={`${prefix}-*`} tokens={withPrefix(prefix)} />
      ))}
    </>
  ),
};

export const Data: Story = {
  render: () => (
    <>
      {DATA_COLOR_PREFIXES.map(prefix => (
        <TokenSwatches key={prefix} caption={`${prefix}-*`} tokens={withPrefix(prefix)} />
      ))}
    </>
  ),
};

export const Contrast: Story = {
  render: () => (
    <>
      {CONTRAST_RULES.map(rule => (
        <ContrastTable key={rule.name} rule={rule} />
      ))}
    </>
  ),
};

export const Exempt: Story = {
  render: () => (
    <Table
      head={['token', 'needs no contrast rule because it']}
      rows={Object.entries(CONTRAST_EXEMPT).map(([token, reason]) => ({ key: token, cells: [token, reason] }))}
    />
  ),
};
