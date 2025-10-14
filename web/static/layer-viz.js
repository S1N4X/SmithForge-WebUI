/**
 * SmithForge Layer Visualization
 * Displays color layer information from Hueforge 3MF files
 */

let currentLayerData = null;

/**
 * Load and display layer information for a file
 * @param {File} file - The 3MF file to analyze
 * @param {string} modelType - 'overlay' (only overlay has layers)
 */
async function loadLayerInfo(file, modelType) {
    if (modelType !== 'overlay') {
        // Only overlay/Hueforge files have layer info
        return;
    }

    try {
        // Show loading state
        showLayerLoading(true);
        updateLayerInfo('Loading layer information...', 0);

        // Get Z-shift value if available
        const zShiftInput = document.getElementById('zshift');
        const zShift = zShiftInput ? parseFloat(zShiftInput.value) || 0 : 0;

        // Create FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('z_shift', zShift.toString());

        // Fetch layer data
        const response = await fetch('/get-layers', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Failed to load layers: ${response.statusText}`);
        }

        const layerData = await response.json();
        currentLayerData = layerData;

        // Display the layers
        displayLayers(layerData);

        // Hide loading state
        showLayerLoading(false);

    } catch (error) {
        console.error('Error loading layer info:', error);
        updateLayerInfo('Failed to load layer data', 0);
        showLayerLoading(false);
    }
}

/**
 * Display layer visualization
 * @param {Object} layerData - Layer data from server
 */
function displayLayers(layerData) {
    const container = document.getElementById('layer-bars-container');
    if (!container) return;

    // Clear existing content
    container.innerHTML = '';

    if (!layerData || layerData.layer_count === 0) {
        container.innerHTML = '<p class="text-muted"><i class="fas fa-info-circle"></i> No layer information available</p>';
        updateLayerInfo('No layers found', 0);
        return;
    }

    // Update summary info
    updateLayerInfo(
        `${layerData.layer_count} layers, ${layerData.total_height.toFixed(2)}mm total`,
        layerData.layer_count
    );

    // Display format info
    if (layerData.format) {
        const formatBadge = document.createElement('small');
        formatBadge.className = 'badge badge-secondary mb-2';
        formatBadge.textContent = `Format: ${layerData.format}`;
        container.appendChild(formatBadge);
    }

    // Create layer bars
    const layersDiv = document.createElement('div');
    layersDiv.className = 'layer-bars';
    layersDiv.style.cssText = 'max-height: 300px; overflow-y: auto; margin-top: 10px;';

    if (layerData.layers && layerData.layers.length > 0) {
        layerData.layers.forEach((layer, index) => {
            const layerBar = createLayerBar(layer, index);
            layersDiv.appendChild(layerBar);
        });
    }

    container.appendChild(layersDiv);
}

/**
 * Create a visual bar for a layer
 * @param {Object} layer - Layer information
 * @param {number} index - Layer index
 * @returns {HTMLElement} Layer bar element
 */
function createLayerBar(layer, index) {
    const bar = document.createElement('div');
    bar.className = 'layer-bar';
    bar.style.cssText = 'margin-bottom: 8px; padding: 6px; background: #f8f9fa; border-left: 4px solid; border-radius: 3px; cursor: pointer;';

    // Set border color based on layer color if available
    const color = layer.color || '#6c757d';
    bar.style.borderLeftColor = color.startsWith('#') ? color : `#${color}`;

    // Layer info text
    const infoText = document.createElement('div');
    infoText.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem;';

    const layerNum = document.createElement('span');
    layerNum.textContent = `Layer ${layer.layer_number || index + 1}`;
    layerNum.style.fontWeight = '500';

    const heightText = document.createElement('span');
    heightText.textContent = `${layer.z_height.toFixed(3)}mm`;
    heightText.style.color = '#6c757d';

    infoText.appendChild(layerNum);
    infoText.appendChild(heightText);
    bar.appendChild(infoText);

    // Show color indicator if available
    if (layer.color) {
        const colorDot = document.createElement('span');
        colorDot.style.cssText = `display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${color.startsWith('#') ? color : '#' + color}; margin-left: 8px; vertical-align: middle;`;
        layerNum.appendChild(colorDot);
    }

    // Hover effect
    bar.addEventListener('mouseenter', function() {
        this.style.background = '#e9ecef';
    });
    bar.addEventListener('mouseleave', function() {
        this.style.background = '#f8f9fa';
    });

    return bar;
}

/**
 * Update layer summary information
 * @param {string} text - Summary text
 * @param {number} count - Layer count
 */
function updateLayerInfo(text, count) {
    const infoElement = document.getElementById('layer-info-text');
    const countElement = document.getElementById('layer-count-badge');

    if (infoElement) {
        infoElement.textContent = text;
    }

    if (countElement) {
        countElement.textContent = count;
        countElement.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

/**
 * Show/hide layer loading indicator
 * @param {boolean} show - Whether to show loading indicator
 */
function showLayerLoading(show) {
    const indicator = document.getElementById('layer-loading');
    if (indicator) {
        indicator.style.display = show ? 'inline-block' : 'none';
    }
}

/**
 * Refresh layer visualization with updated Z-shift
 */
function refreshLayersWithZShift() {
    if (!currentLayerData) return;

    // Get the current file from the hueforge input
    const hueforgeInput = document.getElementById('hueforge_file');
    if (hueforgeInput && hueforgeInput.files.length > 0) {
        loadLayerInfo(hueforgeInput.files[0], 'overlay');
    }
}

/**
 * Initialize layer visualization when page loads
 */
document.addEventListener('DOMContentLoaded', function() {
    // Set up file input handler for Hueforge file
    const hueforgeInput = document.getElementById('hueforge_file');
    if (hueforgeInput) {
        hueforgeInput.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                loadLayerInfo(e.target.files[0], 'overlay');
            }
        });
    }

    // Set up Z-shift input handler to refresh layers
    const zShiftInput = document.getElementById('zshift');
    if (zShiftInput) {
        let refreshTimeout;
        zShiftInput.addEventListener('input', function() {
            // Debounce the refresh
            clearTimeout(refreshTimeout);
            refreshTimeout = setTimeout(() => {
                refreshLayersWithZShift();
            }, 500);
        });
    }
});
