import CollapsibleSection from './CollapsibleSection';

export default function ColorSettings({ expanded, onToggle, params, setParams }) {
  const updateParam = (key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <CollapsibleSection title="Color Settings" expanded={expanded} onToggle={onToggle}>
      <div className="space-y-1">
        {/* Color Mode */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">Color Mode</label>
          <select
            value={params.colorMode}
            onChange={(e) => updateParam('colorMode', e.target.value)}
            className="block w-full px-2 py-1 text-xs border border-gray-300 rounded"
          >
            <option value="none">None - No color layers</option>
            <option value="preserve">Preserve - From Hueforge file</option>
            <option value="inject">Inject - From swap instructions</option>
          </select>
        </div>

        {/* Swap Instructions (only show if inject mode) */}
        {params.colorMode === 'inject' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Swap Instructions Text
              </label>
              <textarea
                value={params.swapInstructionsText}
                onChange={(e) => updateParam('swapInstructionsText', e.target.value)}
                placeholder="Paste HueForge swap instructions here..."
                rows={4}
                className="block w-full px-2 py-1 text-xs border border-gray-300 rounded font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Or Upload Swap Instructions File
              </label>
              <input
                type="file"
                accept=".txt"
                onChange={(e) => updateParam('swapInstructionsFile', e.target.files[0])}
                className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
            </div>
          </>
        )}
      </div>
    </CollapsibleSection>
  );
}
