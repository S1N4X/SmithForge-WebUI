import { useState, useEffect } from 'react';
import { smithForgeAPI } from '../../services/api';

export default function LayerVisualization({ hueforgeFile, zShift = 0 }) {
  const [layerData, setLayerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load layer info when hueforgeFile or zShift changes
  useEffect(() => {
    if (!hueforgeFile) {
      setLayerData(null);
      return;
    }

    // Debounce Z-shift changes
    const timeoutId = setTimeout(() => {
      loadLayerInfo();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [hueforgeFile, zShift]);

  const loadLayerInfo = async () => {
    if (!hueforgeFile) return;

    setLoading(true);
    setError(null);

    try {
      const data = await smithForgeAPI.getLayers(hueforgeFile, zShift);
      setLayerData(data);
    } catch (err) {
      console.error('Error loading layer info:', err);
      setError(err.message || 'Failed to load layer data');
    } finally {
      setLoading(false);
    }
  };

  if (!hueforgeFile) {
    return (
      <div className="p-3 bg-gray-50 rounded border border-gray-200">
        <p className="text-sm text-gray-500 italic">
          Upload a Hueforge file to see layer information
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-3 bg-gray-50 rounded border border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Loading layer information...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 rounded border border-red-200">
        <p className="text-sm text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (!layerData || layerData.layer_count === 0) {
    return (
      <div className="p-3 bg-gray-50 rounded border border-gray-200">
        <p className="text-sm text-gray-500 italic">No layer information available</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded overflow-hidden">
      {/* Header with summary */}
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Layer Information</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              {layerData.layer_count}
            </span>
          </div>
          {layerData.format && (
            <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
              {layerData.format}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {layerData.layer_count} layers, {layerData.total_height.toFixed(2)}mm total
        </p>
      </div>

      {/* Layer bars */}
      <div className="p-3 bg-white max-h-64 overflow-y-auto">
        <div className="space-y-2">
          {layerData.layers && layerData.layers.map((layer, index) => (
            <LayerBar key={index} layer={layer} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LayerBar({ layer, index }) {
  const [isHovered, setIsHovered] = useState(false);

  const color = layer.color || '#6c757d';
  const borderColor = color.startsWith('#') ? color : `#${color}`;
  const backgroundColor = isHovered ? '#e9ecef' : '#f8f9fa';

  return (
    <div
      className="rounded transition-colors cursor-pointer"
      style={{
        padding: '6px 8px',
        backgroundColor,
        borderLeft: `4px solid ${borderColor}`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-900">
            Layer {layer.layer_number || index + 1}
          </span>
          {layer.color && (
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{
                backgroundColor: color.startsWith('#') ? color : `#${color}`,
              }}
            />
          )}
        </div>
        <span className="text-gray-600 text-xs">
          {layer.z_height.toFixed(3)}mm
        </span>
      </div>
    </div>
  );
}
