import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start Express Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 Product Planner Server running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Serving static assets from: ${distPath}`);
  console.log(`🩺 Health check available at: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});
