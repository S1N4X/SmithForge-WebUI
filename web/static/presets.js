/**
 * SmithForge Parameter Presets
 * Manages saving, loading, and deleting user parameter presets using localStorage
 */

const PRESETS_STORAGE_KEY = 'smithforge_presets';

/**
 * Get all presets from localStorage
 * @returns {Object} Object containing all saved presets
 */
function getAllPresets() {
    const presetsJson = localStorage.getItem(PRESETS_STORAGE_KEY);
    return presetsJson ? JSON.parse(presetsJson) : {};
}

/**
 * Save all presets to localStorage
 * @param {Object} presets - Object containing all presets
 */
function saveAllPresets(presets) {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
}

/**
 * Get current form parameters
 * @returns {Object} Object containing all current form values
 */
function getCurrentParameters() {
    const params = {
        rotate_base: document.getElementById('rotate_base').value,
        force_scale: document.getElementById('force_scale').value,
        scaledown: document.getElementById('scaledown').checked,
        xshift: document.getElementById('xshift').value,
        yshift: document.getElementById('yshift').value,
        zshift: document.getElementById('zshift').value,
        preserve_colors: document.getElementById('preserve_colors').checked,
        auto_repair: document.getElementById('auto_repair').checked,
        fill_gaps: document.getElementById('fill_gaps').checked,
        output_name: document.getElementById('output_name').value,
        base_template: document.querySelector('input[name="base_template"]:checked').value
    };

    // Include default_base selection if using default template
    if (params.base_template === 'default') {
        const defaultBase = document.getElementById('default_base');
        if (defaultBase && defaultBase.value) {
            params.default_base = defaultBase.value;
        }
    }

    return params;
}

/**
 * Apply parameters to form fields
 * @param {Object} params - Object containing parameter values
 */
function applyParameters(params) {
    // Apply numeric and text fields
    if (params.rotate_base !== undefined) {
        document.getElementById('rotate_base').value = params.rotate_base;
    }
    if (params.force_scale !== undefined) {
        document.getElementById('force_scale').value = params.force_scale;
    }
    if (params.xshift !== undefined) {
        document.getElementById('xshift').value = params.xshift;
    }
    if (params.yshift !== undefined) {
        document.getElementById('yshift').value = params.yshift;
    }
    if (params.zshift !== undefined) {
        document.getElementById('zshift').value = params.zshift;
    }
    if (params.output_name !== undefined) {
        document.getElementById('output_name').value = params.output_name;
    }

    // Apply checkbox fields
    if (params.scaledown !== undefined) {
        document.getElementById('scaledown').checked = params.scaledown;
    }
    if (params.preserve_colors !== undefined) {
        document.getElementById('preserve_colors').checked = params.preserve_colors;
    }
    if (params.auto_repair !== undefined) {
        document.getElementById('auto_repair').checked = params.auto_repair;
    }
    if (params.fill_gaps !== undefined) {
        document.getElementById('fill_gaps').checked = params.fill_gaps;
    }

    // Apply base template selection
    if (params.base_template !== undefined) {
        const templateRadio = document.getElementById(
            params.base_template === 'default' ? 'base_template_default' : 'base_template_upload'
        );
        if (templateRadio) {
            templateRadio.checked = true;
            templateRadio.dispatchEvent(new Event('change'));
        }
    }

    // Apply default base selection if available
    if (params.default_base !== undefined && params.base_template === 'default') {
        const defaultBaseSelect = document.getElementById('default_base');
        if (defaultBaseSelect) {
            defaultBaseSelect.value = params.default_base;
        }
    }
}

/**
 * Populate the presets dropdown with saved presets
 */
function populatePresetDropdown() {
    const presets = getAllPresets();
    const select = document.getElementById('presetSelect');

    // Clear existing options except the first one
    select.innerHTML = '<option value="">-- Select a preset --</option>';

    // Add all saved presets
    Object.keys(presets).sort().forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
}

/**
 * Save current parameters as a preset
 */
function savePreset() {
    const nameInput = document.getElementById('presetName');
    const name = nameInput.value.trim();

    if (!name) {
        alert('Please enter a preset name');
        return;
    }

    // Validate preset name (alphanumeric, spaces, dashes, underscores)
    if (!/^[a-zA-Z0-9\s_-]+$/.test(name)) {
        alert('Preset name can only contain letters, numbers, spaces, dashes, and underscores');
        return;
    }

    const presets = getAllPresets();

    // Check if preset already exists
    if (presets[name]) {
        if (!confirm(`Preset "${name}" already exists. Do you want to overwrite it?`)) {
            return;
        }
    }

    // Save the preset
    presets[name] = getCurrentParameters();
    saveAllPresets(presets);

    // Update dropdown
    populatePresetDropdown();

    // Select the newly saved preset in dropdown
    document.getElementById('presetSelect').value = name;

    // Clear the name input
    nameInput.value = '';

    // Show success message
    showMessage(`Preset "${name}" saved successfully!`, 'success');
}

/**
 * Load the selected preset
 */
function loadPreset() {
    const select = document.getElementById('presetSelect');
    const name = select.value;

    if (!name) {
        alert('Please select a preset to load');
        return;
    }

    const presets = getAllPresets();
    const preset = presets[name];

    if (!preset) {
        alert('Preset not found');
        return;
    }

    // Apply the preset parameters
    applyParameters(preset);

    // Show success message
    showMessage(`Preset "${name}" loaded successfully!`, 'success');
}

/**
 * Delete the selected preset
 */
function deletePreset() {
    const select = document.getElementById('presetSelect');
    const name = select.value;

    if (!name) {
        alert('Please select a preset to delete');
        return;
    }

    if (!confirm(`Are you sure you want to delete preset "${name}"?`)) {
        return;
    }

    const presets = getAllPresets();
    delete presets[name];
    saveAllPresets(presets);

    // Update dropdown
    populatePresetDropdown();

    // Show success message
    showMessage(`Preset "${name}" deleted successfully!`, 'warning');
}

/**
 * Show a temporary message to the user
 * @param {string} message - The message to display
 * @param {string} type - Message type (success, warning, error)
 */
function showMessage(message, type = 'success') {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    messageDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    messageDiv.innerHTML = `
        ${message}
        <button type="button" class="close" data-dismiss="alert">
            <span>&times;</span>
        </button>
    `;

    // Add to page
    document.body.appendChild(messageDiv);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

/**
 * Initialize presets functionality when page loads
 */
document.addEventListener('DOMContentLoaded', function() {
    populatePresetDropdown();

    // Enable/disable buttons based on selection
    const presetSelect = document.getElementById('presetSelect');
    const loadBtn = document.getElementById('loadPresetBtn');
    const deleteBtn = document.getElementById('deletePresetBtn');

    presetSelect.addEventListener('change', function() {
        const hasSelection = this.value !== '';
        loadBtn.disabled = !hasSelection;
        deleteBtn.disabled = !hasSelection;
    });

    // Initial state
    loadBtn.disabled = true;
    deleteBtn.disabled = true;
});
