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

    // Create properly named temp file with .3mf extension
    const timestamp = Date.now();
    const tempPath = path.join('/tmp', `layers_input_${timestamp}.3mf`);

    // Copy uploaded file to temp file with .3mf extension
    await fs.copyFile(file.tempFilePath, tempPath);

    // Clean up original temp file
    await fs.unlink(file.tempFilePath).catch(() => {});

    // Create Python script to extract layers
    const extractorScript = `
import sys
import json
sys.path.insert(0, '${projectRoot}')
from smithforge.layer_parser import parse_3mf_layers, adjust_layers_for_zshift, serialize_layers

try:
    # Parse layers from 3MF
    layer_data = parse_3mf_layers('${tempPath}')

    # Adjust for Z-shift if provided
    if ${zShift} != 0.0:
        # Adjust layers and update the layer_data dict
        layer_data['layers'] = adjust_layers_for_zshift(layer_data.get('layers', []), ${zShift})

    # Serialize to JSON-compatible format
    result = serialize_layers(layer_data)
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;

    const scriptPath = path.join('/tmp', `layer_extractor_${Date.now()}.py`);
    await fs.writeFile(scriptPath, extractorScript);

    const result = await executePython(scriptPath, []);

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
