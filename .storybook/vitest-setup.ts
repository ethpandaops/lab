import { configure } from 'storybook/test';
import { afterEach, beforeEach, vi } from 'vitest';

// findBy/waitFor default to 1s; MSW-backed queries can take longer under load.
configure({ asyncUtilTimeout: 5000 });

// A story that logs a React or console error fails, even if it rendered.
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error');
});

afterEach(() => {
  const errors = (consoleError.mock.calls as unknown[][]).map(args => args.map(String).join(' '));
  consoleError.mockRestore();
  if (errors.length > 0) throw new Error(errors.join('\n'));
});
