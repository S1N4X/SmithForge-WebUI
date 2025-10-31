import CollapsibleSection from './CollapsibleSection';

export default function OutputSettings({ expanded, onToggle, params, setParams }) {
  const updateParam = (key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <CollapsibleSection title="Output Settings" expanded={expanded} onToggle={onToggle}>
      <div className="space-y-1">
        {/* Output Name */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">
            Output Filename (optional)
          </label>
          <input
            type="text"
            value={params.outputName}
            onChange={(e) => updateParam('outputName', e.target.value)}
            placeholder="Auto-generated"
            className="block w-full px-2 py-1 text-xs border border-gray-300 rounded"
          />
          <p className="mt-0.5 text-xs text-gray-500">
            Leave empty for auto-generated timestamp name
          </p>
        </div>

        {/* Output Format */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">
            Output Format
          </label>
          <select
            value={params.outputFormat}
            onChange={(e) => updateParam('outputFormat', e.target.value)}
            className="block w-full px-2 py-1 text-xs border border-gray-300 rounded"
          >
            <option value="standard">Standard 3MF (Universal)</option>
            <option value="bambu">Bambu Studio 3MF (Optimized)</option>
          </select>
          <p className="mt-0.5 text-xs text-gray-500">
            {params.outputFormat === 'bambu'
              ? 'Optimized for Bambu Studio with Production Extension'
              : 'Works with all slicers (PrusaSlicer, Cura, etc.)'}
          </p>
        </div>
      </div>
    </CollapsibleSection>
  );
}
