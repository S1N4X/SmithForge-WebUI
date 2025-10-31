import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { executePython } from '../utils/subprocess.js';
import fs from 'fs/promises';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

/**
 * POST /api/get-layers
 * Extract layer information from Hueforge 3MF file
 */
router.post('/', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file;
    const zShift = parseFloat(req.body.z_shift || 0.0);
    const tempPath = file.tempFilePath;

    // Create Python script to extract layers
    const extractorScript = `
import sys
import json
sys.path.insert(0, '${projectRoot}')
from smithforge.layer_parser import extract_layers, adjust_layers_for_zshift

try:
    # Extract layers from 3MF
    layer_data = extract_layers('${tempPath}')

    # Adjust for Z-shift if provided
    if ${zShift} != 0.0:
        layer_data = adjust_layers_for_zshift(layer_data, ${zShift})

    print(json.dumps(layer_data))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    const scriptPath = path.join('/tmp', `layer_extractor_${Date.now()}.py`);
    await fs.writeFile(scriptPath, extractorScript);

    const result = await executePython(scriptPath.replace(path.dirname(scriptPath) + '/', ''), []);

    // Clean up
    await fs.unlink(scriptPath).catch(() => {});
    await fs.unlink(tempPath).catch(() => {});

    if (result.exitCode !== 0) {
      const errorData = result.stderr || result.stdout;
      try {
        const parsed = JSON.parse(errorData);
        return res.status(500).json(parsed);
      } catch {
        return res.status(500).json({ error: errorData });
      }
    }

    const layerData = JSON.parse(result.stdout);
    res.json(layerData);

  } catch (err) {
    console.error('Layer extraction error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
