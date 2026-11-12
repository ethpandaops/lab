import { setupServer } from 'msw/node';

/** Intercepts fetch in unit tests. Tests add handlers with `server.use(...)`. */
export const server = setupServer();
