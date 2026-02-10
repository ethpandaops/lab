import { type RefObject, useEffect, useRef } from 'react';

/**
 * Observes a container and adds `data-revealed` to children as they scroll into view.
 * Each child gets a staggered delay via CSS custom property `--reveal-index`.
 */
export function useScrollReveal<T extends HTMLElement>(): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.revealed = 'true';
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -60px 0px', threshold: 0.1 }
    );

    const children = container.querySelectorAll('[data-reveal]');
    children.forEach((child, i) => {
      (child as HTMLElement).style.setProperty('--reveal-index', String(i));
      observer.observe(child);
    });

    return () => observer.disconnect();
  }, []);

  return ref;
}
