import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { executePython } from '../utils/subprocess.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * POST /api/preview-model
 * Convert uploaded 3MF file to GLB format for Three.js preview
 */
router.post('/', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file;

    // Create properly named temp files with extensions
    const timestamp = Date.now();
    const tempInputPath = path.join('/tmp', `preview_input_${timestamp}.3mf`);
    const tempOutputPath = path.join('/tmp', `preview_output_${timestamp}.glb`);

    // Copy uploaded file to temp file with .3mf extension
    await fs.copyFile(file.tempFilePath, tempInputPath);

    // Clean up original temp file
    await fs.unlink(file.tempFilePath).catch(() => {});

    // Create a small Python script to convert 3MF to GLB using trimesh
    const converterScript = `
import trimesh
import sys

try:
    # Load 3MF file
    mesh = trimesh.load('${tempInputPath}')

    # Handle Scene vs single Mesh
    if isinstance(mesh, trimesh.Scene):
        # Combine all geometries in the scene
        mesh = mesh.dump(concatenate=True)

    # Export to GLB
    mesh.export('${tempOutputPath}', file_type='glb')
    print('SUCCESS')
except Exception as e:
    print(f'ERROR: {e}', file=sys.stderr)
    sys.exit(1)
`;

    const scriptPath = path.join('/tmp', `converter_${Date.now()}.py`);
    await fs.writeFile(scriptPath, converterScript);

    // Execute conversion
    const result = await executePython(scriptPath, []);

    if (result.exitCode !== 0) {
      await fs.unlink(scriptPath).catch(() => {});
      await fs.unlink(tempInputPath).catch(() => {});
      return res.status(500).json({ error: result.stderr || 'Conversion failed' });
    }

    // Read the GLB file
    const glbData = await fs.readFile(tempOutputPath);

    // Clean up temp files
    await fs.unlink(scriptPath).catch(() => {});
    await fs.unlink(tempInputPath).catch(() => {});
    await fs.unlink(tempOutputPath).catch(() => {});

    // Send GLB file
    res.set({
      'Content-Type': 'model/gltf-binary',
      'Content-Disposition': `attachment; filename="${file.name.replace('.3mf', '.glb')}"`
    });
    res.send(glbData);

  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
