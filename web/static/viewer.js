/**
 * SmithForge 3D Model Viewer
 * Uses Three.js to display 3MF models converted to GLB format
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// SmithForge constants
const DEFAULT_EMBEDDING_OVERLAP_MM = 0.1;

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
    controls = new OrbitControls(camera, renderer.domElement);
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
 * Get current SmithForge parameters from the form
 */
function getSmithForgeParameters() {
    return {
        rotateBase: parseFloat(document.getElementById('rotate_base')?.value || 0),
        forceScale: parseFloat(document.getElementById('force_scale')?.value) || null,
        scaledown: document.getElementById('scaledown')?.checked || false,
        xshift: parseFloat(document.getElementById('xshift')?.value || 0),
        yshift: parseFloat(document.getElementById('yshift')?.value || 0),
        zshift: parseFloat(document.getElementById('zshift')?.value || 0)
    };
}

/**
 * Apply SmithForge positioning logic to models
 * Replicates the exact positioning from smithforge.py
 */
function applySmithForgePositioning() {
    if (!baseModel || !overlayModel) return;

    const params = getSmithForgeParameters();

    // Reset position and scale (but keep rotation from initial load)
    baseModel.position.set(0, 0, 0);
    overlayModel.position.set(0, 0, 0);
    baseModel.scale.set(1, 1, 1);
    overlayModel.scale.set(1, 1, 1);

    // Reset base rotation to initial flat orientation, then apply user rotation
    baseModel.rotation.set(-Math.PI / 2, 0, 0);

    // Reset overlay rotation to initial flat orientation too
    overlayModel.rotation.set(-Math.PI / 2, 0, 0);

    // STEP 1: Rotate base around Z-axis (user parameter)
    if (params.rotateBase !== 0) {
        const angleRadians = params.rotateBase * Math.PI / 180;
        baseModel.rotateZ(angleRadians);
    }

    // Update matrices before calculating bounding boxes
    baseModel.updateMatrixWorld(true);
    overlayModel.updateMatrixWorld(true);

    // Calculate bounding boxes after rotation
    const baseBB = new THREE.Box3().setFromObject(baseModel);
    const overlayBB = new THREE.Box3().setFromObject(overlayModel);

    const baseSize = baseBB.getSize(new THREE.Vector3());
    const overlaySize = overlayBB.getSize(new THREE.Vector3());

    // STEP 2: Auto-scale overlay (X/Y only, Z unchanged!)
    let uniformScale;
    if (params.forceScale !== null) {
        uniformScale = params.forceScale;
    } else {
        const scaleX = baseSize.x / overlaySize.x;
        const scaleY = baseSize.y / overlaySize.y;
        uniformScale = Math.max(scaleX, scaleY);

        if (uniformScale < 1.0 && !params.scaledown) {
            uniformScale = 1.0; // Clamp to 1.0 if not allowing scale down
        }
    }

    overlayModel.scale.set(uniformScale, uniformScale, 1.0);

    // Update matrix and recalculate overlay bounding box after scaling
    overlayModel.updateMatrixWorld(true);
    overlayBB.setFromObject(overlayModel);
    const overlayCenter = overlayBB.getCenter(new THREE.Vector3());
    const overlayMin = overlayBB.min;

    // STEP 3: Center overlay on base in X/Y
    const baseCenter = baseBB.getCenter(new THREE.Vector3());
    const shiftX = baseCenter.x - overlayCenter.x;
    const shiftY = baseCenter.y - overlayCenter.y;

    overlayModel.position.x += shiftX;
    overlayModel.position.y += shiftY;

    // STEP 4: Position overlay in Z (embed into base)
    // Update matrix and recalculate after X/Y centering
    overlayModel.updateMatrixWorld(true);
    overlayBB.setFromObject(overlayModel);

    const baseTopZ = baseBB.max.z;
    const overlayBottomZ = overlayBB.min.z;

    // Move overlay bottom to base top, then embed by overlap amount
    const zAlign = baseTopZ - overlayBottomZ;
    overlayModel.position.z = zAlign - DEFAULT_EMBEDDING_OVERLAP_MM;

    // STEP 5: Apply user shifts
    overlayModel.position.x += params.xshift;
    overlayModel.position.y += params.yshift;
    overlayModel.position.z += params.zshift;

    // STEP 6: Center entire assembly on XY plane at origin
    // Update matrices to get accurate combined bounding box
    baseModel.updateMatrixWorld(true);
    overlayModel.updateMatrixWorld(true);

    // Calculate combined bounding box
    const combinedBB = new THREE.Box3();
    combinedBB.expandByObject(baseModel);
    combinedBB.expandByObject(overlayModel);

    // Find center of combined assembly in XY
    const combinedCenter = combinedBB.getCenter(new THREE.Vector3());

    // Shift both models to center the assembly at origin in XY (keep Z as-is)
    const centerOffsetX = -combinedCenter.x;
    const centerOffsetY = -combinedCenter.y;

    baseModel.position.x += centerOffsetX;
    baseModel.position.y += centerOffsetY;
    overlayModel.position.x += centerOffsetX;
    overlayModel.position.y += centerOffsetY;

    // Recenter camera to view both models
    centerCamera();

    console.log('SmithForge positioning applied:', {
        rotateBase: params.rotateBase,
        uniformScale,
        baseSize: { x: baseSize.x.toFixed(2), y: baseSize.y.toFixed(2), z: baseSize.z.toFixed(2) },
        overlaySize: { x: overlaySize.x.toFixed(2), y: overlaySize.y.toFixed(2), z: overlaySize.z.toFixed(2) },
        basePos: { x: baseModel.position.x.toFixed(2), y: baseModel.position.y.toFixed(2), z: baseModel.position.z.toFixed(2) },
        overlayPos: { x: overlayModel.position.x.toFixed(2), y: overlayModel.position.y.toFixed(2), z: overlayModel.position.z.toFixed(2) },
        centerOffset: { x: centerOffsetX.toFixed(2), y: centerOffsetY.toFixed(2) },
        shifts: { x: params.xshift, y: params.yshift, z: params.zshift },
        embedding: DEFAULT_EMBEDDING_OVERLAP_MM
    });
}

/**
 * Load and display a model
 * @param {File} file - The 3MF file to load
 * @param {string} modelType - 'base' or 'overlay'
 */
async function loadModel(file, modelType) {
    if (!file) {
        console.log(`loadModel called with no file for ${modelType}`);
        return;
    }

    console.log(`Loading ${modelType} model:`, file.name);

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
        const loader = new GLTFLoader();
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

                // Rotate model to lay flat on XY plane ONCE when loaded
                // 3MF models are typically oriented with Y as thin dimension (lying on XZ)
                // We want Z as thin dimension (lying on XY)
                model.rotation.x = -Math.PI / 2;

                // Apply material only to base (overlay keeps original colors from 3MF)
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
                    // Keep original materials from GLB to preserve Hueforge colors
                    overlayModel = model;
                }

                // Add to scene
                scene.add(model);

                // Update view mode
                updateViewMode();

                // Apply SmithForge positioning if both models are loaded
                if (baseModel && overlayModel) {
                    // Hide placeholder now that both models are loaded
                    const placeholder = document.getElementById('viewer-placeholder');
                    if (placeholder) {
                        placeholder.style.display = 'none';
                    }
                    applySmithForgePositioning();
                } else {
                    // Just center camera on the single model if only one loaded
                    centerCamera();
                }

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

            // Auto-load the default base if one is already selected on page load
            if (defaultBaseSelect.value) {
                fetch(`/bases/${defaultBaseSelect.value}`)
                    .then(response => response.blob())
                    .then(blob => {
                        const file = new File([blob], defaultBaseSelect.value, { type: 'model/3mf' });
                        loadModel(file, 'base');
                    })
                    .catch(error => {
                        console.error('Error loading initial default base:', error);
                    });
            }
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

        // Set up real-time parameter update listeners
        // Debounce function to avoid excessive updates while typing
        let updateTimeout;
        function debouncedPositionUpdate() {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => {
                if (baseModel && overlayModel) {
                    applySmithForgePositioning();
                }
            }, 300); // 300ms delay
        }

        // Add listeners to all SmithForge parameters
        const parameterInputs = [
            'rotate_base',
            'force_scale',
            'scaledown',
            'xshift',
            'yshift',
            'zshift'
        ];

        parameterInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                const eventType = input.type === 'checkbox' ? 'change' : 'input';
                input.addEventListener(eventType, debouncedPositionUpdate);
            }
        });
    }
});
