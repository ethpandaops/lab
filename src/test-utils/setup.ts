import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { client } from '@/api/client.gen';
import { client as labClient } from '@/lab-api/client.gen';
import { server } from './server';

// A request no test mocked is a defect, not a silent network call: MSW fails the
// request, and the test that made it fails too.
const unmocked: string[] = [];
server.events.on('request:unhandled', ({ request }) => {
  unmocked.push(`${request.method} ${request.url}`);
});

// Taken before any test fakes timers.
const realSetTimeout = globalThis.setTimeout;

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
  // The generated clients build relative URLs, which Node's fetch rejects.
  client.setConfig({ baseUrl: window.location.origin });
  labClient.setConfig({ baseUrl: window.location.origin });
});
afterAll(() => server.close());

afterEach(async () => {
  cleanup();
  // Requests a test sent just before it ended reach MSW on later ticks; let them
  // meet this test's handlers, and its verdict, before the handlers reset.
  await new Promise(resolve => realSetTimeout(resolve, 0));
  server.resetHandlers();
  if (unmocked.length > 0) {
    throw new Error(`Unmocked requests; add a handler with server.use():\n${unmocked.splice(0).join('\n')}`);
  }
});

// jsdom does no layout: ECharts reads these sizes and observes them.
Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 800 });
Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 600 });
globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};
