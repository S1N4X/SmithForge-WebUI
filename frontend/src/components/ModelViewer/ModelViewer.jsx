import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { smithForgeAPI } from '../../services/api';

const DEFAULT_EMBEDDING_OVERLAP_MM = 0.1;

export default function ModelViewer({ hueforgeFile, baseFile, selectedDefaultBase, params, result }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const baseModelRef = useRef(null);
  const overlayModelRef = useRef(null);
  const resultModelRef = useRef(null);

  const [viewMode, setViewMode] = useState('both'); // 'base', 'overlay', 'both', 'result'
  const [wireframe, setWireframe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modelInfo, setModelInfo] = useState({ base: null, overlay: null });

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0); // Light background for better contrast
    sceneRef.current = scene;

    // Create camera
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 10000);
    camera.position.set(100, 100, 100);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Create renderer with shadow support
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 1000;
    controlsRef.current = controls;

    // CONVENTIONAL BALANCED LIGHTING
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // 40% ambient
    scene.add(ambientLight);

    // PRIMARY DIRECTIONAL LIGHT - Upper right front
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight1.position.set(100, 100, 50);
    directionalLight1.castShadow = true;
    directionalLight1.shadow.mapSize.width = 2048;
    directionalLight1.shadow.mapSize.height = 2048;
    directionalLight1.shadow.camera.near = 0.5;
    directionalLight1.shadow.camera.far = 500;
    scene.add(directionalLight1);

    // FILL LIGHT - Lower left back (softer)
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight2.position.set(-100, -100, -50);
    scene.add(directionalLight2);

    // RIM LIGHT - Side lighting for depth
    const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.25);
    directionalLight3.position.set(-50, 50, 100);
    scene.add(directionalLight3);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(200, 20, 0x666666, 0x444444);
    scene.add(gridHelper);

    // Add ground plane to receive shadows
    const groundGeometry = new THREE.PlaneGeometry(400, 400);
    const groundMaterial = new THREE.ShadowMaterial({
      opacity: 0.3,
      color: 0x000000
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01; // Slightly below grid
    ground.receiveShadow = true;
    scene.add(ground);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  // Load base model
  useEffect(() => {
    if (!baseFile && !selectedDefaultBase) return;

    const loadBase = async () => {
      setLoading(true);
      try {
        let fileToLoad;

        if (baseFile) {
          // User uploaded a file
          fileToLoad = baseFile;
        } else if (selectedDefaultBase) {
          // Fetch the default base file from server
          const response = await fetch(`/bases/${selectedDefaultBase}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch base file: ${response.statusText}`);
          }
          const blob = await response.blob();
          fileToLoad = new File([blob], selectedDefaultBase, { type: 'application/octet-stream' });
        }

        const glbBlob = await smithForgeAPI.previewModel(fileToLoad);
        const url = URL.createObjectURL(glbBlob);

        const loader = new GLTFLoader();
        loader.load(url, (gltf) => {
          // Remove old base model
          if (baseModelRef.current) {
            sceneRef.current.remove(baseModelRef.current);
          }

          const model = gltf.scene;
          model.traverse((child) => {
            if (child.isMesh) {
              child.material = new THREE.MeshPhongMaterial({
                color: 0xa0a0a0,  // Lighter base for better contrast
                specular: 0xffffff,  // BRIGHT white specular for maximum contrast
                shininess: 150,  // VERY HIGH shininess for sharp relief highlights
                emissive: 0x000000,
                flatShading: false,  // Smooth shading shows relief better
                reflectivity: 1.0,
                transparent: true,  // Enable transparency
                opacity: 0.5,  // 50% transparent to reveal delicate Hueforge overlay
                side: THREE.DoubleSide,  // Render both sides for better transparency
              });
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Rotate to lay flat on XY plane
          model.rotation.x = -Math.PI / 2;

          baseModelRef.current = model;
          sceneRef.current.add(model);

          // Calculate bounds AFTER rotation and center the model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(center); // Center the model at origin

          // Recalculate bounds after centering
          const finalBox = new THREE.Box3().setFromObject(model);
          const size = finalBox.getSize(new THREE.Vector3());
          setModelInfo(prev => ({ ...prev, base: { size, volume: size.x * size.y * size.z }}));

          centerCamera();
          URL.revokeObjectURL(url);
          setLoading(false);
        });
      } catch (err) {
        console.error('Failed to load base model:', err);
        setLoading(false);
      }
    };

    loadBase();
  }, [baseFile, selectedDefaultBase]);

  // Load overlay model
  useEffect(() => {
    if (!hueforgeFile) return;

    const loadOverlay = async () => {
      setLoading(true);
      try {
        const glbBlob = await smithForgeAPI.previewModel(hueforgeFile);
        const url = URL.createObjectURL(glbBlob);

        const loader = new GLTFLoader();
        loader.load(url, (gltf) => {
          // Remove old overlay model
          if (overlayModelRef.current) {
            sceneRef.current.remove(overlayModelRef.current);
          }

          const model = gltf.scene;
          model.traverse((child) => {
            if (child.isMesh) {
              // Preserve original colors from Hueforge if they exist
              const hasVertexColors = child.geometry.attributes.color !== undefined;
              const originalMaterial = child.material;

              // Check if material has a color map or vertex colors
              if (hasVertexColors || (originalMaterial && originalMaterial.map)) {
                // Preserve original material - fully opaque for better color visibility
                if (originalMaterial) {
                  child.material = originalMaterial.clone();
                  child.material.transparent = false;
                  child.material.opacity = 1.0;
                  child.material.vertexColors = hasVertexColors;
                  // Adjust properties for better relief
                  if (child.material.metalness !== undefined) child.material.metalness = 0.1;
                  if (child.material.roughness !== undefined) child.material.roughness = 0.8;
                }
              } else {
                // Fallback to blue if no colors found - fully opaque
                child.material = new THREE.MeshPhongMaterial({
                  color: 0x4a90e2,
                  specular: 0xffffff,  // BRIGHT specular for relief visibility
                  shininess: 200,  // ULTRA HIGH for maximum edge definition
                  transparent: false,
                  opacity: 1.0,
                  emissive: 0x000000,
                  reflectivity: 1.0,
                });
              }
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Rotate to lay flat on XY plane
          model.rotation.x = -Math.PI / 2;

          overlayModelRef.current = model;
          sceneRef.current.add(model);

          // Calculate bounds AFTER rotation and center the model at origin
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(center); // Center the model at origin

          // Recalculate bounds after centering
          const finalBox = new THREE.Box3().setFromObject(model);
          const size = finalBox.getSize(new THREE.Vector3());
          setModelInfo(prev => ({ ...prev, overlay: { size, volume: size.x * size.y * size.z }}));

          // Apply SmithForge positioning
          applySmithForgePositioning();

          centerCamera();
          URL.revokeObjectURL(url);
          setLoading(false);
        });
      } catch (err) {
        console.error('Failed to load overlay model:', err);
        setLoading(false);
      }
    };

    loadOverlay();
  }, [hueforgeFile]);

  // Apply SmithForge positioning when params change
  useEffect(() => {
    if (overlayModelRef.current && baseModelRef.current) {
      applySmithForgePositioning();
    }
  }, [params.xshift, params.yshift, params.zshift, params.rotateBase]);

  // Update view mode visibility
  useEffect(() => {
    if (baseModelRef.current) {
      baseModelRef.current.visible = viewMode === 'both' || viewMode === 'base';
    }
    if (overlayModelRef.current) {
      overlayModelRef.current.visible = viewMode === 'both' || viewMode === 'overlay';
    }
    if (resultModelRef.current) {
      resultModelRef.current.visible = viewMode === 'result';
      if (baseModelRef.current) baseModelRef.current.visible = viewMode !== 'result';
      if (overlayModelRef.current) overlayModelRef.current.visible = viewMode !== 'result';
    }
  }, [viewMode]);

  // Update wireframe mode
  useEffect(() => {
    [baseModelRef.current, overlayModelRef.current, resultModelRef.current].forEach(model => {
      if (model) {
        model.traverse((child) => {
          if (child.isMesh) {
            child.material.wireframe = wireframe;
          }
        });
      }
    });
  }, [wireframe]);

  // Load result model
  useEffect(() => {
    if (!result) return;

    const loadResult = async () => {
      try {
        // Fetch the result file from the download URL
        const response = await fetch(result.download_url);
        const blob = await response.blob();
        const file = new File([blob], result.output_filename);

        const glbBlob = await smithForgeAPI.previewModel(file);
        const url = URL.createObjectURL(glbBlob);

        const loader = new GLTFLoader();
        loader.load(url, (gltf) => {
          if (resultModelRef.current) {
            sceneRef.current.remove(resultModelRef.current);
          }

          const model = gltf.scene;
          model.traverse((child) => {
            if (child.isMesh) {
              // Preserve original colors from merged 3MF if they exist
              const hasVertexColors = child.geometry.attributes.color !== undefined;
              const originalMaterial = child.material;

              // Check if material has a color map or vertex colors
              if (hasVertexColors || (originalMaterial && originalMaterial.map)) {
                // Preserve original material
                if (originalMaterial) {
                  child.material = originalMaterial.clone();
                  child.material.transparent = false;
                  child.material.opacity = 1.0;
                  child.material.vertexColors = hasVertexColors;
                  // Adjust properties for better relief visibility
                  if (child.material.metalness !== undefined) child.material.metalness = 0.1;
                  if (child.material.roughness !== undefined) child.material.roughness = 0.8;
                }
              } else {
                // Fallback to green if no colors found
                child.material = new THREE.MeshPhongMaterial({
                  color: 0x50c878,
                  specular: 0xffffff,  // BRIGHT specular for relief visibility
                  shininess: 150,  // HIGH shininess for sharp relief highlights
                  emissive: 0x000000,
                  reflectivity: 1.0,
                });
              }
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Rotate to lay flat on XY plane
          model.rotation.x = -Math.PI / 2;

          resultModelRef.current = model;
          sceneRef.current.add(model);

          // Calculate bounds AFTER rotation and center the model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(center); // Center the model at origin

          setViewMode('result');

          centerCamera();
          URL.revokeObjectURL(url);
        });
      } catch (err) {
        console.error('Failed to load result model:', err);
      }
    };

    loadResult();
  }, [result]);

  const applySmithForgePositioning = () => {
    if (!overlayModelRef.current || !baseModelRef.current) return;

    const overlay = overlayModelRef.current;
    const base = baseModelRef.current;

    // Get bounding boxes (after rotation)
    const baseBox = new THREE.Box3().setFromObject(base);
    const overlayBox = new THREE.Box3().setFromObject(overlay);

    const baseSize = baseBox.getSize(new THREE.Vector3());
    const overlaySize = overlayBox.getSize(new THREE.Vector3());
    const baseCenter = baseBox.getCenter(new THREE.Vector3());

    // Calculate scale (for models laying flat, we scale X/Z now)
    const scaleX = baseSize.x / overlaySize.x;
    const scaleZ = baseSize.z / overlaySize.z;
    const scale = Math.min(scaleX, scaleZ);

    // Apply scale (Y is now the height axis after rotation)
    overlay.scale.set(scale, 1, scale); // Y-axis (height) always 1.0

    // Center in X/Z plane (models laying flat)
    overlay.position.x = baseCenter.x;
    overlay.position.z = baseCenter.z;

    // Y position: base top - overlap (Y is now the vertical axis)
    overlay.position.y = baseBox.max.y - DEFAULT_EMBEDDING_OVERLAP_MM;

    // Apply user shifts (adjust for rotated coordinate system)
    if (params.xshift) overlay.position.x += parseFloat(params.xshift);
    if (params.yshift) overlay.position.z += parseFloat(params.yshift); // Y shift maps to Z
    if (params.zshift) overlay.position.y += parseFloat(params.zshift); // Z shift maps to Y
  };

  const centerCamera = () => {
    if (!cameraRef.current || !sceneRef.current) return;

    const box = new THREE.Box3();
    sceneRef.current.traverse((object) => {
      if (object.isMesh && object.visible) {
        box.expandByObject(object);
      }
    });

    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = cameraRef.current.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / Math.sin(fov / 2)) * 1.5;

    cameraRef.current.position.set(center.x + cameraZ * 0.5, center.y + cameraZ * 0.5, center.z + cameraZ);
    cameraRef.current.lookAt(center);

    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  };

  const setReliefView = () => {
    if (!cameraRef.current || !sceneRef.current) return;

    const box = new THREE.Box3();
    sceneRef.current.traverse((object) => {
      if (object.isMesh && object.visible) {
        box.expandByObject(object);
      }
    });

    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // ULTRA-LOW camera position matching our Y=2 lights
    // This extreme angle maximizes relief visibility
    cameraRef.current.position.set(
      center.x + maxDim * 2.0,  // Further offset for better view
      center.y + 3,             // ULTRA LOW Y=3 - almost parallel to surface!
      center.z + maxDim * 2.0   // Further offset
    );
    cameraRef.current.lookAt(center);

    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-900">
      {/* Toolbar */}
      <div className="bg-gray-800 p-2 flex items-center justify-between border-b border-gray-700">
        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('both')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'both' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Both
          </button>
          <button
            onClick={() => setViewMode('base')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'base' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            disabled={!baseModelRef.current}
          >
            Base
          </button>
          <button
            onClick={() => setViewMode('overlay')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'overlay' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            disabled={!overlayModelRef.current}
          >
            Overlay
          </button>
          {resultModelRef.current && (
            <button
              onClick={() => setViewMode('result')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'result' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Result
            </button>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={wireframe}
              onChange={(e) => setWireframe(e.target.checked)}
              className="rounded"
            />
            <span>Wireframe</span>
          </label>
          <button
            onClick={setReliefView}
            className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
          >
            Relief View
          </button>
          <button
            onClick={centerCamera}
            className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600"
          >
            Center View
          </button>
        </div>
      </div>

      {/* Viewer container */}
      <div ref={containerRef} className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
            <div className="text-white">Loading model...</div>
          </div>
        )}

        {/* Model info overlay */}
        {(modelInfo.base || modelInfo.overlay) && (
          <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-90 text-white p-3 rounded text-xs space-y-2">
            {modelInfo.base && (
              <div>
                <div className="font-semibold text-gray-400">Base</div>
                <div>Size: {modelInfo.base.size.x.toFixed(1)} × {modelInfo.base.size.y.toFixed(1)} × {modelInfo.base.size.z.toFixed(1)} mm</div>
                <div>Volume: ~{(modelInfo.base.volume / 1000).toFixed(1)} cm³</div>
              </div>
            )}
            {modelInfo.overlay && (
              <div>
                <div className="font-semibold text-blue-400">Overlay</div>
                <div>Size: {modelInfo.overlay.size.x.toFixed(1)} × {modelInfo.overlay.size.y.toFixed(1)} × {modelInfo.overlay.size.z.toFixed(1)} mm</div>
                <div>Volume: ~{(modelInfo.overlay.volume / 1000).toFixed(1)} cm³</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
