import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

/**
 * GET /api/bases
 * List available base model files
 */
router.get('/', async (req, res) => {
  try {
    const basesDir = path.join(projectRoot, 'inputs', 'bases');

    // Read directory contents
    const files = await fs.readdir(basesDir);

    // Filter for .3mf files
    const baseModels = files.filter(file => file.toLowerCase().endsWith('.3mf'));

    res.json({
      bases: baseModels,
      count: baseModels.length
    });

  } catch (err) {
    console.error('Error listing base models:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
