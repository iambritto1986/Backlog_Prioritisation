import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { clerkMiddleware, requireAuth, getAuth } from '@clerk/express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// --- CORS allowlist -----------------------------------------------------
// Every client in this codebase connects via `io(window.location.origin)`
// (see PresenceService.ts, SessionRoom.tsx, KnockToJoinModal.tsx) — the app
// is always served same-origin in production (server.js serves the built
// SPA *and* the API *and* the socket endpoint from one Render service), so
// this allowlist only needs to cover the real production domain plus local
// dev. It replaces the previous `origin: '*'`, which let any site on the
// internet open a socket connection and relay presence/knock traffic.
// CORS_EXTRA_ORIGINS lets an extra origin (e.g. a Render preview URL) be
// added via an env var without a code change/redeploy of this file.
const PRODUCTION_ORIGINS = ['https://talonsync.com', 'https://www.talonsync.com'];
const extraOrigins = (process.env.CORS_EXTRA_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...PRODUCTION_ORIGINS, ...extraOrigins]);

function isAllowedOrigin(origin) {
  if (!origin) return true; // same-origin requests, curl, health checks, etc. send no Origin header
  if (allowedOrigins.has(origin)) return true;
  // Local development only — never matches in production traffic.
  if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
    return true;
  }
  return false;
}

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
});

const PORT = process.env.PORT || 3000;

// Security headers on every response (HSTS, X-Frame-Options, nosniff, etc).
// Helmet's default Content-Security-Policy is deliberately turned OFF here:
// its default connect-src/script-src fall back to 'self', which would block
// the XHR calls Clerk's SDK makes to your Clerk frontend-API domain (e.g.
// clerk.talonsync.com) — shipping that as-is would silently break sign-in
// for every visitor. Writing a correct CSP needs your exact Clerk
// frontend-API hostname (visible in the Clerk dashboard, or in Network tab
// requests when signed in) plus a real-browser test against the live site,
// which isn't something to guess at from here. Flagged as a fast, low-risk
// follow-up once that hostname is confirmed.
app.use(helmet({ contentSecurityPolicy: false }));

// Trust Render's proxy so req.ip / rate-limiting key off the real client IP
// instead of Render's internal load balancer address.
app.set('trust proxy', 1);

// JSON and URL-encoded body parser. Previously 50mb — dropped to 5mb, which
// is still generous for a serialized project + session + full card list
// (the actual payload this endpoint ever carries) but no longer lets an
// unauthenticated caller push arbitrarily large bodies at the process.
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Clerk: verifies the session token on every request (when present) and
// makes req.auth available downstream. Reads CLERK_SECRET_KEY and
// CLERK_PUBLISHABLE_KEY from process.env — both must be set on this service
// in Render's Environment tab. This alone doesn't block anything; routes opt
// into requiring a signed-in user with requireAuth() (see /api/me below).
app.use(clerkMiddleware());

// General rate limit across the whole API surface — generous enough that a
// facilitator running a live session (lots of small polling/API calls)
// never trips it, but closes off brute-force / scraping abuse.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', generalLimiter);

// Health Check API endpoint for Render / monitoring — deliberately outside
// the general limiter so infra polling it every few seconds never counts
// against real traffic.
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'TalonSync - Collaborative Planning Workspace',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Returns the server-verified identity of the signed-in Clerk user.
// requireAuth() rejects the request (401) before this handler ever runs if
// the caller doesn't have a valid Clerk session — this is real server-side
// verification, not a client-side check that a caller could bypass.
app.get('/api/me', requireAuth(), (req, res) => {
  const { userId } = getAuth(req);
  res.json({ userId });
});

// Shared Workshop In-Memory Storage Cache (for cross-device sharing)
// NOTE: this is still the same in-memory Map flagged in the code review —
// it's wiped on every redeploy/restart. Replacing it with a Postgres-backed
// store (the PlanningSession.joinToken field already anticipates this in
// prisma/schema.prisma) is tracked separately as the next phase of work,
// not part of this change.
const shareStore = new Map();

// This endpoint is intentionally unauthenticated (a facilitator uses it
// before every guest has an account), which is exactly why it needs its own
// tighter rate limit and real body validation rather than the general
// limiter + bare `if (!project || !session)` check it had before — without
// them it was an open door for someone to script thousands of junk entries
// into shareStore, or throw arbitrary shapes at JSON.stringify downstream.
const shareLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many share links created — please wait a few minutes and try again.' },
});

// Loose on purpose: Project/PlanningSession (src/types.ts) are large,
// evolving shapes, and this validation exists to reject garbage/oversized
// payloads, not to become a second source of truth for the client's types.
// .passthrough() so legitimate extra fields never get silently 400'd just
// because this schema hasn't been kept in lockstep with types.ts.
const shareRequestSchema = z.object({
  project: z.object({ id: z.string().min(1), name: z.string().min(1) }).passthrough(),
  session: z.object({ id: z.string().min(1), name: z.string().min(1) }).passthrough(),
  cards: z.array(z.record(z.string(), z.unknown())).max(5000).optional(),
  role: z.string().max(64).optional(),
  invitedBy: z.string().max(200).optional(),
});

app.post('/api/share', shareLimiter, (req, res) => {
  const parsed = shareRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid share payload',
      details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    });
  }
  const { project, session, cards, role, invitedBy } = parsed.data;
  const code = 'WS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  shareStore.set(code, {
    project,
    session,
    cards: cards || [],
    role: role || 'contributor',
    invitedBy: invitedBy || 'Facilitator',
    createdAt: new Date().toISOString(),
  });
  res.json({ code, url: `/?share=${code}` });
});

app.get('/api/share/:code', (req, res) => {
  const code = (req.params.code || '').toUpperCase();
  const data = shareStore.get(code);
  if (!data) {
    return res.status(404).json({ error: 'Shared workshop link not found or expired' });
  }
  res.json(data);
});

// App Metadata API
app.get('/api/info', (req, res) => {
  res.status(200).json({
    name: 'TalonSync',
    description: 'Collaborative backlog and requirement prioritization working board',
    features: [
      'Live Priority Board (Must ship / High priority / Planned / Nice to have)',
      'Live Delphi & Planning Poker Voting',
      'Multi-Sheet Excel & CSV Import / Safe Re-import',
      'Comprehensive 8-Sheet Project & Session Exports',
      'Real-Time Presence, Follow Facilitator & Conflict Management',
    ],
  });
});

// Serve static assets from built Vite directory
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback all SPA routes to index.html
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>TalonSync - Starting Up</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #18191c; color: #f5f5f5; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #20222a; border: 1px solid #d4af37; padding: 40px; border-radius: 16px; text-align: center; max-width: 480px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h1 { color: #d4af37; margin: 0 0 12px 0; font-size: 24px; }
            p { color: #a8a29e; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; }
            .spinner { width: 36px; height: 36px; border: 3px solid rgba(212,175,55,0.2); border-top-color: #d4af37; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px auto; }
            @keyframes spin { to { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <h1>TalonSync</h1>
            <p>The application is compiling its static bundle. Please refresh this page in a few moments.</p>
          </div>
        </body>
      </html>
    `);
  }
});

// Socket.IO for Live Knock/Authorization
io.on('connection', (socket) => {
  // Facilitator joins their host room
  socket.on('host_session', ({ sessionId, facilitatorName }) => {
    socket.join(`host_${sessionId}`);
    console.log(`Facilitator ${facilitatorName} is hosting session ${sessionId}`);
  });

  // Guest knocks
  socket.on('knock', ({ sessionId, guestId, guestName }) => {
    socket.join(guestId); // Guest waits in their own room
    io.to(`host_${sessionId}`).emit('guest_knock', { guestId, guestName, sessionId });
    console.log(`Guest ${guestName} (${guestId}) knocking for session ${sessionId}`);
  });

  // Host approves
  socket.on('approve_guest', ({ sessionId, guestId }) => {
    io.to(guestId).emit('knock_approved', { sessionId });
    console.log(`Guest ${guestId} approved for session ${sessionId}`);
  });

  // Host rejects
  socket.on('reject_guest', ({ sessionId, guestId }) => {
    io.to(guestId).emit('knock_rejected', { sessionId });
    console.log(`Guest ${guestId} rejected for session ${sessionId}`);
  });

  // --- Real-Time Multiplayer Sync ---
  socket.on('join_session_room', ({ sessionId, userId }) => {
    socket.join(`session_${sessionId}`);
    console.log(`User ${userId} joined session room ${sessionId}`);
  });

  socket.on('leave_session_room', ({ sessionId, userId }) => {
    socket.leave(`session_${sessionId}`);
    socket.to(`session_${sessionId}`).emit('presence_message', { type: 'peer_leave', userId });
  });

  socket.on('presence_message', ({ sessionId, payload }) => {
    socket.to(`session_${sessionId}`).emit('presence_message', payload);
  });
});

// NOTE: Socket.IO connections are now origin-locked (see the CORS allowlist
// above) instead of accepting `*`, which closes off the room joins to
// random internet origins. Per-room *authorization* — verifying a given
// Clerk user actually has a role on the specific sessionId/projectId they're
// joining, vs. just knowing its ID — still requires a durable place to look
// that membership up, i.e. the Postgres/Prisma migration (schema already
// written in prisma/schema.prisma). That's the next phase of work, not part
// of this change; tracked as the top item in the roadmap handed back to
// Britto alongside this commit.

// Start Express + HTTP Server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 TalonSync Server running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Serving static assets from: ${distPath}`);
  console.log(`🩺 Health check available at: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});
