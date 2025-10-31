import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 300000, // 5 minutes for large file processing
});

// API endpoints
export const smithForgeAPI = {
  /**
   * Health check
   */
  health: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  /**
   * Get list of available base models
   */
  getBases: async () => {
    const response = await api.get('/bases');
    return response.data;
  },

  /**
   * Preview a 3MF model (convert to GLB)
   * @param {File} file - 3MF file to preview
   */
  previewModel: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/preview-model', formData, {
      responseType: 'blob', // Expecting binary GLB file
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Get layer information from Hueforge 3MF
   * @param {File} file - Hueforge 3MF file
   * @param {number} zShift - Z-shift parameter (optional)
   */
  getLayers: async (file, zShift = 0.0) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('z_shift', zShift.toString());

    const response = await api.post('/get-layers', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Run SmithForge processing
   * @param {Object} params - SmithForge parameters
   * @param {File} params.hueforgeFile - Hueforge 3MF file (required)
   * @param {File} params.baseFile - Base 3MF file (optional)
   * @param {string} params.defaultBase - Default base model filename (optional)
   * @param {string} params.outputName - Output filename (optional)
   * @param {number} params.rotateBase - Rotation in degrees (default 0)
   * @param {number} params.forceScale - Force specific scale (optional)
   * @param {boolean} params.scaledown - Allow scaling below 1.0 (default false)
   * @param {number} params.xshift - X-axis shift in mm (optional)
   * @param {number} params.yshift - Y-axis shift in mm (optional)
   * @param {number} params.zshift - Z-axis shift in mm (optional)
   * @param {string} params.colorMode - Color mode: 'none', 'preserve', 'inject' (default 'none')
   * @param {string} params.swapInstructionsText - Swap instructions text (optional)
   * @param {File} params.swapInstructionsFile - Swap instructions file (optional)
   * @param {boolean} params.autoRepair - Enable auto-repair (default false)
   * @param {boolean} params.fillGaps - Fill gaps (default false)
   * @param {string} params.outputFormat - Output format: 'standard', 'bambu' (default 'standard')
   */
  runSmithForge: async (params) => {
    const formData = new FormData();

    // Required files
    if (params.hueforgeFile) {
      formData.append('hueforge_file', params.hueforgeFile);
    }

    // Optional files
    if (params.baseFile) {
      formData.append('base_file', params.baseFile);
    }
    if (params.swapInstructionsFile) {
      formData.append('swap_instructions_file', params.swapInstructionsFile);
    }

    // Form parameters
    if (params.defaultBase) {
      formData.append('default_base', params.defaultBase);
    }
    if (params.outputName) {
      formData.append('output_name', params.outputName);
    }
    if (params.rotateBase !== undefined && params.rotateBase !== 0) {
      formData.append('rotate_base', params.rotateBase.toString());
    }
    if (params.forceScale) {
      formData.append('force_scale', params.forceScale.toString());
    }
    if (params.scaledown) {
      formData.append('scaledown', 'true');
    }
    if (params.xshift) {
      formData.append('xshift', params.xshift.toString());
    }
    if (params.yshift) {
      formData.append('yshift', params.yshift.toString());
    }
    if (params.zshift) {
      formData.append('zshift', params.zshift.toString());
    }
    if (params.colorMode) {
      formData.append('color_mode', params.colorMode);
    }
    if (params.swapInstructionsText) {
      formData.append('swap_instructions_text', params.swapInstructionsText);
    }
    if (params.autoRepair) {
      formData.append('auto_repair', 'true');
    }
    if (params.fillGaps) {
      formData.append('fill_gaps', 'true');
    }
    if (params.outputFormat) {
      formData.append('output_format', params.outputFormat);
    }

    const response = await api.post('/run-smithforge', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },
};

export default api;
