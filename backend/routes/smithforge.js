import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeSmithForge } from '../utils/subprocess.js';
import fs from 'fs/promises';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

/**
 * POST /api/run-smithforge
 * Main SmithForge processing endpoint
 */
router.post('/', async (req, res) => {
  try {
    // Validate required files
    if (!req.files || !req.files.hueforge_file) {
      return res.status(400).json({ error: 'Hueforge file is required' });
    }

    const hueforgeFile = req.files.hueforge_file;
    const baseFile = req.files.base_file;
    const swapInstructionsFile = req.files.swap_instructions_file;

    // Parse form data
    const {
      default_base,
      output_name,
      rotate_base = '0',
      force_scale,
      scaledown = false,
      xshift,
      yshift,
      zshift,
      color_mode = 'none',
      swap_instructions_text,
      auto_repair = false,
      fill_gaps = false,
      output_format = 'standard'
    } = req.body;

    // Save hueforge file
    const hueforgeInputPath = path.join(projectRoot, 'inputs', hueforgeFile.name);
    await hueforgeFile.mv(hueforgeInputPath);

    // Determine base file path
    let basePath;
    if (baseFile) {
      basePath = path.join(projectRoot, 'inputs', 'bases', baseFile.name);
      await baseFile.mv(basePath);
    } else if (default_base) {
      basePath = path.join(projectRoot, 'inputs', 'bases', default_base);
    } else {
      return res.status(400).json({ error: 'Either base_file or default_base must be provided' });
    }

    // Generate output filename
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
    const baseName = path.basename(basePath, '.3mf');
    const hueforgeName = path.basename(hueforgeFile.name, '.3mf');
    const finalOutputName = output_name || `combined_${baseName}_${hueforgeName}_${timestamp}`;
    const outputPath = path.join(projectRoot, 'outputs', `${finalOutputName}.3mf`);

    // Handle swap instructions file
    let swapInstructionsPath = null;
    if (color_mode === 'inject') {
      if (swapInstructionsFile) {
        swapInstructionsPath = path.join(projectRoot, 'inputs', `swap_${Date.now()}.txt`);
        await swapInstructionsFile.mv(swapInstructionsPath);
      } else if (swap_instructions_text) {
        swapInstructionsPath = path.join(projectRoot, 'inputs', `swap_${Date.now()}.txt`);
        await fs.writeFile(swapInstructionsPath, swap_instructions_text);
      }
    }

    // Build SmithForge parameters
    const smithforgeParams = {
      hueforge: hueforgeInputPath,
      base: basePath,
      output: outputPath,
      rotateBase: parseInt(rotate_base) || 0,
      forceScale: force_scale ? parseFloat(force_scale) : null,
      scaleDown: scaledown === 'true' || scaledown === true,
      xShift: xshift ? parseFloat(xshift) : null,
      yShift: yshift ? parseFloat(yshift) : null,
      zShift: zshift ? parseFloat(zshift) : null,
      colorMode: color_mode,
      swapInstructionsFile: swapInstructionsPath,
      autoRepair: auto_repair === 'true' || auto_repair === true,
      fillGaps: fill_gaps === 'true' || fill_gaps === true,
      outputFormat: output_format
    };

    // Execute SmithForge
    const result = await executeSmithForge(smithforgeParams);

    // Clean up swap instructions temp file
    if (swapInstructionsPath) {
      await fs.unlink(swapInstructionsPath).catch(() => {});
    }

    if (result.success) {
      res.json({
        success: true,
        output_filename: path.basename(outputPath),
        download_url: `/outputs/${path.basename(outputPath)}`,
        log_lines: result.logs,
        parameters: smithforgeParams
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        log: result.logs.join('\n')
      });
    }

  } catch (err) {
    console.error('SmithForge execution error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

export default router;
