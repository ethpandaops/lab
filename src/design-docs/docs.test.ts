import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Storybook does not fail a build on a <Story of={…} /> that names no story,
// so each page's references are checked against its stories file here.

const pages = readdirSync(import.meta.dirname).filter(file => file.endsWith('.mdx'));
const read = (file: string): string => readFileSync(join(import.meta.dirname, file), 'utf8');

describe.each(pages)('%s', page => {
  it('shows only stories its stories file exports', () => {
    const shown = [...read(page).matchAll(/<Story of=\{Stories\.(\w+)\}/g)].map(m => m[1]);
    const file = page.replace(/\.mdx$/, '.stories.tsx');
    const exported = existsSync(join(import.meta.dirname, file))
      ? new Set([...read(file).matchAll(/^export const (\w+)/gm)].map(m => m[1]))
      : new Set<string>();
    for (const name of shown) expect(exported, `${page}: Stories.${name}`).toContain(name);
  });
});
