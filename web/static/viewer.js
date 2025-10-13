/**
 * SmithForge 3D Model Viewer
 * Uses Three.js to display 3MF models converted to GLB format
 */

let scene, camera, renderer, controls;
let baseModel, overlayModel;
let currentViewMode = 'both'; // 'base', 'overlay', or 'both'

/**
 * Initialize the Three.js scene
 */
function initViewer() {
    const container = document.getElementById('model-viewer-container');

    if (!container) {
        console.error('Viewer container not found');
        return;
    }

    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);

    // Create camera
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 10000);
    camera.position.set(100, 100, 100);
    camera.lookAt(0, 0, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Add orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 1000;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(100, 100, 50);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-100, -100, -50);
    scene.add(directionalLight2);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(200, 20, 0xcccccc, 0xeeeeee);
    scene.add(gridHelper);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Start animation loop
    animate();
}

/**
 * Handle window resize
 */
function onWindowResize() {
    const container = document.getElementById('model-viewer-container');
    if (!container) return;

    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

/**
 * Animation loop
 */
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

/**
 * Load and display a model
 * @param {File} file - The 3MF file to load
 * @param {string} modelType - 'base' or 'overlay'
 */
async function loadModel(file, modelType) {
    if (!file) return;

    try {
        // Show loading indicator
        showLoadingIndicator(modelType, true);
        updateModelInfo(modelType, 'Loading...', '');

        // Create FormData and upload to preview endpoint
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/preview-model', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Failed to convert model: ${response.statusText}`);
        }

        // Get the GLB data
        const glbBlob = await response.blob();
        const glbUrl = URL.createObjectURL(glbBlob);

        // Load with GLTFLoader
        const loader = new THREE.GLTFLoader();
        loader.load(
            glbUrl,
            function (gltf) {
                // Remove existing model of this type
                if (modelType === 'base' && baseModel) {
                    scene.remove(baseModel);
                } else if (modelType === 'overlay' && overlayModel) {
                    scene.remove(overlayModel);
                }

                // Get the loaded model
                const model = gltf.scene;

                // Apply different materials for base and overlay
                if (modelType === 'base') {
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.material = new THREE.MeshStandardMaterial({
                                color: 0x888888,
                                metalness: 0.2,
                                roughness: 0.8
                            });
                        }
                    });
                    baseModel = model;
                } else if (modelType === 'overlay') {
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.material = new THREE.MeshStandardMaterial({
                                color: 0x4a90e2,
                                metalness: 0.3,
                                roughness: 0.6,
                                transparent: true,
                                opacity: 0.85
                            });
                        }
                    });
                    overlayModel = model;
                }

                // Add to scene
                scene.add(model);

                // Update view mode
                updateViewMode();

                // Center camera on all models
                centerCamera();

                // Calculate and display model info
                const box = new THREE.Box3().setFromObject(model);
                const size = box.getSize(new THREE.Vector3());
                const volume = calculateVolume(model);

                updateModelInfo(
                    modelType,
                    `${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} mm`,
                    volume ? `${volume.toFixed(2)} mm³` : 'N/A'
                );

                // Hide loading indicator
                showLoadingIndicator(modelType, false);

                // Cleanup blob URL
                URL.revokeObjectURL(glbUrl);
            },
            function (xhr) {
                // Progress callback
                const percent = (xhr.loaded / xhr.total * 100).toFixed(0);
                updateModelInfo(modelType, `Loading ${percent}%...`, '');
            },
            function (error) {
                console.error('Error loading model:', error);
                updateModelInfo(modelType, 'Failed to load', '');
                showLoadingIndicator(modelType, false);
            }
        );

    } catch (error) {
        console.error('Error converting model:', error);
        updateModelInfo(modelType, 'Error', error.message);
        showLoadingIndicator(modelType, false);
    }
}

/**
 * Calculate approximate volume of a model
 * @param {THREE.Object3D} model - The model to calculate volume for
 * @returns {number|null} - Volume in cubic mm, or null if cannot calculate
 */
function calculateVolume(model) {
    let totalVolume = 0;
    let hasMeshes = false;

    model.traverse((child) => {
        if (child.isMesh && child.geometry) {
            hasMeshes = true;
            // This is a rough approximation using bounding box
            const box = new THREE.Box3().setFromObject(child);
            const size = box.getSize(new THREE.Vector3());
            totalVolume += size.x * size.y * size.z;
        }
    });

    return hasMeshes ? totalVolume : null;
}

/**
 * Center camera on all visible models
 */
function centerCamera() {
    const box = new THREE.Box3();

    if (baseModel && baseModel.visible) {
        box.expandByObject(baseModel);
    }
    if (overlayModel && overlayModel.visible) {
        box.expandByObject(overlayModel);
    }

    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.5; // Add some margin

    camera.position.set(center.x + cameraZ, center.y + cameraZ, center.z + cameraZ);
    camera.lookAt(center);
    controls.target.copy(center);
    controls.update();
}

/**
 * Update view mode (show base, overlay, or both)
 * @param {string} mode - 'base', 'overlay', or 'both'
 */
function setViewMode(mode) {
    currentViewMode = mode;
    updateViewMode();
}

/**
 * Apply current view mode
 */
function updateViewMode() {
    if (baseModel) {
        baseModel.visible = (currentViewMode === 'base' || currentViewMode === 'both');
    }
    if (overlayModel) {
        overlayModel.visible = (currentViewMode === 'overlay' || currentViewMode === 'both');
    }

    // Update button states
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.view-mode-btn[data-mode="${currentViewMode}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

/**
 * Toggle wireframe mode
 */
function toggleWireframe() {
    const wireframeCheckbox = document.getElementById('wireframeToggle');
    const isWireframe = wireframeCheckbox ? wireframeCheckbox.checked : false;

    [baseModel, overlayModel].forEach(model => {
        if (model) {
            model.traverse((child) => {
                if (child.isMesh) {
                    child.material.wireframe = isWireframe;
                }
            });
        }
    });
}

/**
 * Show/hide loading indicator
 * @param {string} modelType - 'base' or 'overlay'
 * @param {boolean} show - true to show, false to hide
 */
function showLoadingIndicator(modelType, show) {
    const indicator = document.getElementById(`${modelType}-loading`);
    if (indicator) {
        indicator.style.display = show ? 'inline-block' : 'none';
    }
}

/**
 * Update model information display
 * @param {string} modelType - 'base' or 'overlay'
 * @param {string} dimensions - Dimensions string
 * @param {string} volume - Volume string
 */
function updateModelInfo(modelType, dimensions, volume) {
    const dimElement = document.getElementById(`${modelType}-dimensions`);
    const volElement = document.getElementById(`${modelType}-volume`);

    if (dimElement) {
        dimElement.textContent = dimensions;
    }
    if (volElement) {
        volElement.textContent = volume;
    }
}

/**
 * Initialize viewer when page loads
 */
document.addEventListener('DOMContentLoaded', function() {
    // Check if viewer container exists
    if (document.getElementById('model-viewer-container')) {
        initViewer();

        // Set up file input handlers
        const hueforgeInput = document.getElementById('hueforge_file');
        const baseInput = document.getElementById('base_file');

        if (hueforgeInput) {
            hueforgeInput.addEventListener('change', function(e) {
                if (e.target.files.length > 0) {
                    loadModel(e.target.files[0], 'overlay');
                }
            });
        }

        if (baseInput) {
            baseInput.addEventListener('change', function(e) {
                if (e.target.files.length > 0) {
                    loadModel(e.target.files[0], 'base');
                }
            });
        }

        // Set up default base selection handler
        const defaultBaseSelect = document.getElementById('default_base');
        if (defaultBaseSelect) {
            defaultBaseSelect.addEventListener('change', function() {
                if (this.value) {
                    // Load the default base model
                    fetch(`/bases/${this.value}`)
                        .then(response => response.blob())
                        .then(blob => {
                            const file = new File([blob], this.value, { type: 'model/3mf' });
                            loadModel(file, 'base');
                        })
                        .catch(error => {
                            console.error('Error loading default base:', error);
                        });
                }
            });
        }

        // Set up view mode buttons
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                setViewMode(this.dataset.mode);
            });
        });

        // Set up wireframe toggle
        const wireframeToggle = document.getElementById('wireframeToggle');
        if (wireframeToggle) {
            wireframeToggle.addEventListener('change', toggleWireframe);
        }
    }
});
