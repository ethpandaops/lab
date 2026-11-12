/** The one frozen instant every fixture and story is built against. */
const NOW = '2026-09-26T12:00:00.000Z';

/** `NOW` in milliseconds, for `now` props and `Date.now()` stand-ins. */
export const NOW_MS = Date.parse(NOW);

/**
 * Holds `Date.now()` at `NOW_MS` until the returned function runs. Stories of
 * components that show times relative to now use it as their `beforeEach`.
 */
export function freezeNow(): () => void {
  const realNow = Date.now;
  Date.now = () => NOW_MS;
  return () => {
    Date.now = realNow;
  };
}
