import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

/**
 * Execute a Python script via subprocess
 * @param {string} scriptPath - Path to Python script relative to project root
 * @param {string[]} args - Command line arguments
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 */
export function executePython(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const fullScriptPath = path.join(projectRoot, scriptPath);
    const pythonProcess = spawn('python3', [fullScriptPath, ...args], {
      cwd: projectRoot
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code
      });
    });

    pythonProcess.on('error', (err) => {
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });
  });
}

/**
 * Clean log output by removing ANSI codes and normalizing whitespace
 * @param {string} output - Raw output from subprocess
 * @returns {string[]} - Array of cleaned log lines
 */
export function cleanLogOutput(output) {
  if (!output) return [];

  return output
    .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI color codes
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

/**
 * Execute smithforge.py with given parameters
 * @param {object} params - SmithForge parameters
 * @returns {Promise<{success: boolean, output?: string, error?: string, logs: string[]}>}
 */
export async function executeSmithForge(params) {
  const args = [
    '--hueforge', params.hueforge,
    '--base', params.base,
    '--output', params.output
  ];

  // Optional parameters
  if (params.rotateBase !== undefined && params.rotateBase !== 0) {
    args.push('--rotatebase', params.rotateBase.toString());
  }

  if (params.forceScale) {
    args.push('--scale', params.forceScale.toString());
  }

  if (params.scaleDown) {
    args.push('--scaledown');
  }

  if (params.xShift) {
    args.push('--xshift', params.xShift.toString());
  }

  if (params.yShift) {
    args.push('--yshift', params.yShift.toString());
  }

  if (params.zShift) {
    args.push('--zshift', params.zShift.toString());
  }

  if (params.colorMode === 'preserve') {
    args.push('--preserve-colors');
  } else if (params.colorMode === 'inject' && params.swapInstructionsFile) {
    args.push('--inject-colors-text', params.swapInstructionsFile);
  }

  if (params.autoRepair) {
    args.push('--auto-repair');
  }

  if (params.fillGaps) {
    args.push('--fill-gaps');
  }

  if (params.outputFormat) {
    args.push('--output-format', params.outputFormat);
  }

  try {
    const result = await executePython('smithforge/smithforge.py', args);
    const logs = cleanLogOutput(result.stdout);

    if (result.exitCode === 0) {
      return {
        success: true,
        output: result.stdout,
        logs
      };
    } else {
      // Check for specific error patterns
      const errorMsg = result.stderr || result.stdout;
      let enhancedError = errorMsg;

      if (errorMsg.includes('Not all meshes are volumes')) {
        enhancedError += '\n\nTip: Enable auto-repair to automatically fix non-watertight meshes.';
      }

      return {
        success: false,
        error: enhancedError,
        logs: cleanLogOutput(errorMsg)
      };
    }
  } catch (err) {
    return {
      success: false,
      error: err.message,
      logs: [err.message]
    };
  }
}
