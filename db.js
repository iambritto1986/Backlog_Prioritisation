// TalonSync — Prisma client singleton.
//
// This file is imported ONLY by server.js (the backend). It must never be
// imported from anything under src/ — that's the browser bundle, and the
// Prisma client (plus your DATABASE_URL) has no business shipping there.
//
// In dev, Vite/tsx can hot-reload server.js, which would normally create a
// new PrismaClient (and a new DB connection pool) on every reload. Caching
// the instance on `global` avoids exhausting your Postgres connection limit.

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__talonSyncPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__talonSyncPrisma__ = prisma;
}
