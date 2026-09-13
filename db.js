// TalonSync — Prisma client singleton.
//
// This file is imported ONLY by server.js (the backend, via api.js). It
// must never be imported from anything under src/ — that's the browser
// bundle, and the Prisma client (plus your DATABASE_URL) has no business
// shipping there.
//
// In dev, Vite/tsx can hot-reload server.js, which would normally create a
// new PrismaClient (and a new DB connection pool) on every reload. Caching
// the instance on `global` avoids exhausting your Postgres connection limit.
//
// `new PrismaClient()` throws SYNCHRONOUSLY, at import time, if the client
// was never generated (e.g. `prisma generate` didn't run, or ran against a
// broken network — this is exactly what happens when developing this file
// outside Render, since the generator needs to download a native engine
// binary) — and because this module is imported at the top of api.js, which
// server.js imports unconditionally, an uncaught throw here used to take
// the ENTIRE app down at boot: static assets, Socket.IO, the health check,
// the old in-memory /api/share endpoints — everything, not just the new
// database-backed routes. Catching it here means a Prisma problem degrades
// gracefully instead: api.js checks `prisma` before every query and returns
// a 503 on just those routes (see api.js's attachUser), while the rest of
// the app — including guests joining a session that's already running —
// keeps working.
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

function createPrismaClient() {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
    });
  } catch (err) {
    console.error(
      'Prisma client failed to initialize — the /api/db routes will return 503 until this is fixed. ' +
        'Usually means `prisma generate` did not run (check the build command) or DATABASE_URL is missing. ' +
        'Everything else in this app (health check, static assets, Socket.IO, /api/share) is unaffected.',
      err
    );
    return null;
  }
}

export const prisma = globalForPrisma.__talonSyncPrisma__ ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__talonSyncPrisma__ = prisma;
}
