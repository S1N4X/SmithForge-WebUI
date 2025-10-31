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
    scene.background = new THREE.Color(0x1a1a1a);
    sceneRef.current = scene;

    // Create camera
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 10000);
    camera.position.set(100, 100, 100);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
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
    const gridHelper = new THREE.GridHelper(200, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

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
        const fileToLoad = baseFile || new File([], selectedDefaultBase);
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
              child.material = new THREE.MeshStandardMaterial({
                color: 0x808080,
                metalness: 0.3,
                roughness: 0.7,
              });
            }
          });

          baseModelRef.current = model;
          sceneRef.current.add(model);

          // Calculate bounds
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
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
              child.material = new THREE.MeshStandardMaterial({
                color: 0x4a90e2,
                metalness: 0.3,
                roughness: 0.7,
                transparent: true,
                opacity: 0.85,
              });
            }
          });

          overlayModelRef.current = model;
          sceneRef.current.add(model);

          // Calculate bounds
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
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
              child.material = new THREE.MeshStandardMaterial({
                color: 0x50c878,
                metalness: 0.3,
                roughness: 0.7,
              });
            }
          });

          resultModelRef.current = model;
          sceneRef.current.add(model);
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

    // Get bounding boxes
    const baseBox = new THREE.Box3().setFromObject(base);
    const overlayBox = new THREE.Box3().setFromObject(overlay);

    const baseSize = baseBox.getSize(new THREE.Vector3());
    const overlaySize = overlayBox.getSize(new THREE.Vector3());
    const baseCenter = baseBox.getCenter(new THREE.Vector3());

    // Calculate scale (matches smithforge.py logic)
    const scaleX = baseSize.x / overlaySize.x;
    const scaleY = baseSize.y / overlaySize.y;
    const scale = Math.min(scaleX, scaleY);

    // Apply scale
    overlay.scale.set(scale, scale, 1); // Z-axis always 1.0

    // Center in X/Y
    overlay.position.x = baseCenter.x;
    overlay.position.y = baseCenter.y;

    // Z position: base top - overlap
    overlay.position.z = baseBox.max.z - DEFAULT_EMBEDDING_OVERLAP_MM;

    // Apply user shifts
    if (params.xshift) overlay.position.x += parseFloat(params.xshift);
    if (params.yshift) overlay.position.y += parseFloat(params.yshift);
    if (params.zshift) overlay.position.z += parseFloat(params.zshift);
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
