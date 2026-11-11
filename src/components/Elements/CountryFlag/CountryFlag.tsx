import { type JSX, useEffect, useState } from 'react';
import clsx from 'clsx';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import type { CountryFlagProps } from './CountryFlag.types';

/**
 * Each flag's SVG markup, loaded on first use. Every flag is its own small chunk, so the main bundle carries only
 * this map of loaders.
 */
const FLAGS = import.meta.glob<string>(
  ['/node_modules/country-flag-icons/string/3x2/*.js', '!/node_modules/country-flag-icons/string/3x2/index.js'],
  { import: 'default' }
);

const PREFIX = '/node_modules/country-flag-icons/string/3x2/';

/** Flags already loaded, as data URLs, so a flag drawn again shows at once */
const loaded = new Map<string, string>();

/** Loader for an ISO 3166-1 alpha-2 code, undefined when no flag exists for it */
function loaderFor(code: string | null | undefined): (() => Promise<string>) | undefined {
  if (!code || !/^[a-z]{2}$/i.test(code)) return undefined;
  return FLAGS[`${PREFIX}${code.toUpperCase()}.js`];
}

/**
 * A country's flag, drawn from SVG so it looks the same on every platform (Windows has no flag emoji). It is
 * decorative unless given a `title`. Codes without a flag render nothing, or a globe with `showUnknown`.
 */
export function CountryFlag({ code, title, showUnknown = false, className }: CountryFlagProps): JSX.Element | null {
  const key = code?.toUpperCase() ?? '';
  const load = loaderFor(code);
  const [src, setSrc] = useState<string | undefined>(() => loaded.get(key));

  useEffect(() => {
    if (!load) return;
    const cached = loaded.get(key);
    if (cached) {
      setSrc(cached);
      return;
    }
    let current = true;
    setSrc(undefined);
    load().then(svg => {
      const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      loaded.set(key, url);
      if (current) setSrc(url);
    });
    return () => {
      current = false;
    };
  }, [key, load]);

  const label = title ? { role: 'img', 'aria-label': title, title } : { 'aria-hidden': true };
  // A className replaces the default 18 × 12 px, slightly rounded box rather than competing with it
  const box = clsx('inline-block shrink-0 align-middle', className ?? 'h-3 w-4.5 rounded-2xs');

  if (!load) {
    return showUnknown ? <GlobeAltIcon className={clsx(box, 'text-muted')} {...label} /> : null;
  }
  return (
    <span className={clsx(box, 'overflow-hidden bg-border-60')} data-country={key} {...label}>
      {src && (
        <img
          src={src}
          alt=""
          className="block size-full object-cover outline -outline-offset-1 outline-foreground-15"
        />
      )}
    </span>
  );
}
