import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const PORT = process.env.PORT || 3000;

// JSON and URL-encoded body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check API endpoint for Render / monitoring
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'Product Planner - Collaborative Planning Workspace',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Shared Workshop In-Memory Storage Cache (for cross-device sharing)
const shareStore = new Map();

app.post('/api/share', (req, res) => {
  try {
    const { project, session, cards, role, invitedBy } = req.body;
    if (!project || !session) {
      return res.status(400).json({ error: 'Project and session required' });
    }
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
    name: 'Product Planner',
    description: 'Collaborative backlog and requirement prioritization working board',
    features: [
      'Multi-Mode Working Board (Priority, Disposition, Value/Effort Matrix, Stage)',
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
          <title>Product Planner - Starting Up</title>
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
            <h1>Product Planner</h1>
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

// Start Express + HTTP Server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 Product Planner Server running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Serving static assets from: ${distPath}`);
  console.log(`🩺 Health check available at: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});
