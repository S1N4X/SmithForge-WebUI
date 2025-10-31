import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import fileUpload from 'express-fileupload';

// Route imports
import previewRouter from './routes/preview.js';
import layersRouter from './routes/layers.js';
import smithforgeRouter from './routes/smithforge.js';
import basesRouter from './routes/bases.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max file size
  abortOnLimit: true
}));

// Static file serving
const projectRoot = path.resolve(__dirname, '..');
app.use('/outputs', express.static(path.join(projectRoot, 'outputs')));
app.use('/bases', express.static(path.join(projectRoot, 'inputs', 'bases')));
app.use('/inputs', express.static(path.join(projectRoot, 'inputs')));

// API Routes
app.use('/api/preview-model', previewRouter);
app.use('/api/get-layers', layersRouter);
app.use('/api/run-smithforge', smithforgeRouter);
app.use('/api/bases', basesRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React frontend build (only in production)
const frontendDistPath = path.join(projectRoot, 'frontend', 'dist');
if (existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  // Serve React app for all other routes (SPA fallback)
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
} else {
  // Development mode - frontend runs on Vite dev server
  app.get('*', (req, res) => {
    res.json({
      message: 'API server running. Frontend is on Vite dev server at http://localhost:5173',
      api_docs: {
        health: 'GET /api/health',
        bases: 'GET /api/bases',
        preview: 'POST /api/preview-model',
        layers: 'POST /api/get-layers',
        smithforge: 'POST /api/run-smithforge'
      }
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Create required directories
async function ensureDirectories() {
  const dirs = [
    path.join(projectRoot, 'inputs'),
    path.join(projectRoot, 'inputs', 'bases'),
    path.join(projectRoot, 'outputs')
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (err) {
      console.error(`Failed to create directory ${dir}:`, err);
    }
  }
}

// Start server
async function startServer() {
  await ensureDirectories();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmithForge backend server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

startServer();
