import CollapsibleSection from './CollapsibleSection';

export default function TransformControls({ expanded, onToggle, params, setParams }) {
  const updateParam = (key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <CollapsibleSection title="Transform Controls" expanded={expanded} onToggle={onToggle}>
      <div className="space-y-1">
        {/* Rotate Base */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
            Rotate Base (degrees)
          </label>
          <input
            type="number"
            value={params.rotateBase || 0}
            onChange={(e) => updateParam('rotateBase', parseInt(e.target.value) || 0)}
            className="block w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded"
            title="Rotate the base model around the Z-axis before combining"
          />
        </div>

        {/* Force Scale */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
            Force Scale (optional)
          </label>
          <input
            type="number"
            step="0.1"
            value={params.forceScale || ''}
            onChange={(e) => updateParam('forceScale', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="Auto"
            className="block w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded placeholder-gray-400 dark:placeholder-gray-500"
            title="Override automatic scaling with a specific value (e.g., 1.2 = 120% size)"
          />
        </div>

        {/* Allow Scaledown */}
        <div className="flex items-center" title="Allow HueForge to be scaled smaller than original size if it's too large for the base">
          <input
            type="checkbox"
            checked={params.scaledown}
            onChange={(e) => updateParam('scaledown', e.target.checked)}
            className="h-3 w-3 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded"
          />
          <label className="ml-1.5 text-xs text-gray-700 dark:text-gray-300">Allow scaling below 1.0</label>
        </div>

        {/* Position Shifts */}
        <div className="grid grid-cols-3 gap-1">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">X (mm)</label>
            <input
              type="number"
              step="0.1"
              value={params.xshift || ''}
              onChange={(e) => updateParam('xshift', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="0"
              className="block w-full px-1 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded placeholder-gray-400 dark:placeholder-gray-500"
              title="Shift HueForge left (-) or right (+) in millimeters"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Y (mm)</label>
            <input
              type="number"
              step="0.1"
              value={params.yshift || ''}
              onChange={(e) => updateParam('yshift', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="0"
              className="block w-full px-1 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded placeholder-gray-400 dark:placeholder-gray-500"
              title="Shift HueForge forward (-) or backward (+) in millimeters"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">Z (mm)</label>
            <input
              type="number"
              step="0.1"
              value={params.zshift || ''}
              onChange={(e) => updateParam('zshift', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="0"
              className="block w-full px-1 py-1 text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded placeholder-gray-400 dark:placeholder-gray-500"
              title="Shift HueForge up (+) or down (-) in millimeters. Affects color layer heights."
            />
          </div>
        </div>

        {/* Auto Repair and Fill Gaps */}
        <div className="space-y-1">
          <div className="flex items-center" title="Automatically fix non-watertight meshes and geometry issues">
            <input
              type="checkbox"
              checked={params.autoRepair}
              onChange={(e) => updateParam('autoRepair', e.target.checked)}
              className="h-3 w-3 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded"
            />
            <label className="ml-1.5 text-xs text-gray-700 dark:text-gray-300">Auto-repair meshes</label>
          </div>
          <div className="flex items-center" title="Fill gaps between scaled overlay and base boundaries">
            <input
              type="checkbox"
              checked={params.fillGaps}
              onChange={(e) => updateParam('fillGaps', e.target.checked)}
              className="h-3 w-3 text-blue-600 dark:text-blue-400 border-gray-300 dark:border-gray-600 rounded"
            />
            <label className="ml-1.5 text-xs text-gray-700 dark:text-gray-300">Fill gaps</label>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}
