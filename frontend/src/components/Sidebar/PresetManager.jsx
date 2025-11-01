import { useState, useEffect } from 'react';
import CollapsibleSection from './CollapsibleSection';

const STORAGE_KEY = 'smithforge_presets';

export default function PresetManager({
  expanded,
  onToggle,
  params,
  setParams,
  setHueforgeFile,
  setBaseFile,
  setSelectedDefaultBase,
}) {
  const [presets, setPresets] = useState({});
  const [selectedPreset, setSelectedPreset] = useState('');
  const [presetName, setPresetName] = useState('');

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPresets(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to load presets:', err);
    }
  };

  const savePreset = () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name');
      return;
    }

    const newPresets = {
      ...presets,
      [presetName]: params,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPresets));
      setPresets(newPresets);
      setPresetName('');
      alert(`Preset "${presetName}" saved!`);
    } catch (err) {
      alert('Failed to save preset: ' + err.message);
    }
  };

  const loadPreset = () => {
    if (!selectedPreset || !presets[selectedPreset]) {
      return;
    }

    setParams(presets[selectedPreset]);
    alert(`Preset "${selectedPreset}" loaded!`);
  };

  const deletePreset = () => {
    if (!selectedPreset) {
      return;
    }

    if (!confirm(`Delete preset "${selectedPreset}"?`)) {
      return;
    }

    const newPresets = { ...presets };
    delete newPresets[selectedPreset];

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPresets));
      setPresets(newPresets);
      setSelectedPreset('');
    } catch (err) {
      alert('Failed to delete preset: ' + err.message);
    }
  };

  const presetNames = Object.keys(presets);

  return (
    <CollapsibleSection title="Presets" expanded={expanded} onToggle={onToggle}>
      <div className="space-y-1">
        {/* Load Preset */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
            Load Preset
          </label>
          <div className="flex space-x-1">
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded"
            >
              <option value="">-- Select Preset --</option>
              {presetNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <button
              onClick={loadPreset}
              disabled={!selectedPreset}
              className="px-2 py-1 text-xs bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600"
            >
              Load
            </button>
            <button
              onClick={deletePreset}
              disabled={!selectedPreset}
              className="px-2 py-1 text-xs bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 disabled:bg-gray-400 dark:disabled:bg-gray-600"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Save Preset */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
            Save Current Settings
          </label>
          <div className="flex space-x-1">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name"
              className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded placeholder-gray-400 dark:placeholder-gray-500"
            />
            <button
              onClick={savePreset}
              className="px-2 py-1 text-xs bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-600"
            >
              Save
            </button>
          </div>
        </div>

        {presetNames.length === 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">No presets saved yet</p>
        )}
      </div>
    </CollapsibleSection>
  );
}
