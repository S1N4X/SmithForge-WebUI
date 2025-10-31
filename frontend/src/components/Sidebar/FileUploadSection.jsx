import { useEffect, useState } from 'react';
import { smithForgeAPI } from '../../services/api';
import CollapsibleSection from './CollapsibleSection';

export default function FileUploadSection({
  expanded,
  onToggle,
  hueforgeFile,
  setHueforgeFile,
  baseFile,
  setBaseFile,
  selectedDefaultBase,
  setSelectedDefaultBase,
}) {
  const [availableBases, setAvailableBases] = useState([]);
  const [loadingBases, setLoadingBases] = useState(false);

  useEffect(() => {
    loadBases();
  }, []);

  const loadBases = async () => {
    setLoadingBases(true);
    try {
      const data = await smithForgeAPI.getBases();
      setAvailableBases(data.bases || []);
      if (data.bases && data.bases.length > 0) {
        setSelectedDefaultBase(data.bases[0]);
      }
    } catch (err) {
      console.error('Failed to load base models:', err);
    } finally {
      setLoadingBases(false);
    }
  };

  return (
    <CollapsibleSection title="File Upload" expanded={expanded} onToggle={onToggle}>
      <div className="space-y-1">
        {/* Hueforge File */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Hueforge File *
          </label>
          <input
            type="file"
            accept=".3mf"
            onChange={(e) => setHueforgeFile(e.target.files[0])}
            className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {hueforgeFile && (
            <p className="mt-0.5 text-xs text-green-600">Selected: {hueforgeFile.name}</p>
          )}
        </div>

        {/* Base File */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Base File (Optional)
          </label>
          <input
            type="file"
            accept=".3mf"
            onChange={(e) => {
              setBaseFile(e.target.files[0]);
              setSelectedDefaultBase(null);
            }}
            className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
          />
          {baseFile && (
            <p className="mt-0.5 text-xs text-green-600">Selected: {baseFile.name}</p>
          )}
        </div>

        {/* Default Base Selector */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Or Select Default Base
          </label>
          {loadingBases ? (
            <p className="text-xs text-gray-500">Loading bases...</p>
          ) : (
            <select
              value={selectedDefaultBase || ''}
              onChange={(e) => {
                setSelectedDefaultBase(e.target.value);
                setBaseFile(null);
              }}
              disabled={!!baseFile}
              className="block w-full px-2 py-1 text-xs border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              <option value="">-- Select Base --</option>
              {availableBases.map((base) => (
                <option key={base} value={base}>
                  {base}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
}
