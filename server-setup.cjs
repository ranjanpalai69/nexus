// Runs before any other module. Patches globals that Next.js App Router expects.
const { AsyncLocalStorage, AsyncResource } = require('async_hooks');
if (!globalThis.AsyncLocalStorage) globalThis.AsyncLocalStorage = AsyncLocalStorage;
if (!globalThis.AsyncResource) globalThis.AsyncResource = AsyncResource;
