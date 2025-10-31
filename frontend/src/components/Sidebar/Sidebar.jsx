import { useState } from 'react';
import FileUploadSection from './FileUploadSection';
import TransformControls from './TransformControls';
import ColorSettings from './ColorSettings';
import OutputSettings from './OutputSettings';
import PresetManager from './PresetManager';
import LayerVisualization from '../LayerVisualization/LayerVisualization';
import { smithForgeAPI } from '../../services/api';

export default function Sidebar({
  hueforgeFile,
  setHueforgeFile,
  baseFile,
  setBaseFile,
  selectedDefaultBase,
  setSelectedDefaultBase,
  params,
  setParams,
  processing,
  setProcessing,
  setResult,
  setError,
  setLogs,
}) {
  const [expandedSections, setExpandedSections] = useState({
    files: true,
    transform: true,
    colors: true,
    output: true,
    presets: true,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleProcess = async () => {
    if (!hueforgeFile) {
      setError('Hueforge file is required');
      return;
    }

    if (!baseFile && !selectedDefaultBase) {
      setError('Please select a base model');
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);
    setLogs([]);

    try {
      const result = await smithForgeAPI.runSmithForge({
        hueforgeFile,
        baseFile,
        defaultBase: selectedDefaultBase,
        outputName: params.outputName,
        rotateBase: params.rotateBase,
        forceScale: params.forceScale,
        scaledown: params.scaledown,
        xshift: params.xshift,
        yshift: params.yshift,
        zshift: params.zshift,
        colorMode: params.colorMode,
        swapInstructionsText: params.swapInstructionsText,
        swapInstructionsFile: params.swapInstructionsFile,
        autoRepair: params.autoRepair,
        fillGaps: params.fillGaps,
        outputFormat: params.outputFormat,
      });

      if (result.success) {
        setResult(result);
        setLogs(result.log_lines || []);
      } else {
        setError(result.error);
        setLogs(result.log ? result.log.split('\n') : []);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-2 space-y-1">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-lg font-bold text-gray-800">SmithForge</h1>
        <button
          onClick={handleProcess}
          disabled={processing || !hueforgeFile || (!baseFile && !selectedDefaultBase)}
          className="px-4 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
        >
          {processing ? 'Processing...' : 'Generate'}
        </button>
      </div>

      <PresetManager
        expanded={expandedSections.presets}
        onToggle={() => toggleSection('presets')}
        params={params}
        setParams={setParams}
        setHueforgeFile={setHueforgeFile}
        setBaseFile={setBaseFile}
        setSelectedDefaultBase={setSelectedDefaultBase}
      />

      <FileUploadSection
        expanded={expandedSections.files}
        onToggle={() => toggleSection('files')}
        hueforgeFile={hueforgeFile}
        setHueforgeFile={setHueforgeFile}
        baseFile={baseFile}
        setBaseFile={setBaseFile}
        selectedDefaultBase={selectedDefaultBase}
        setSelectedDefaultBase={setSelectedDefaultBase}
      />

      {hueforgeFile && (
        <LayerVisualization
          hueforgeFile={hueforgeFile}
          zShift={parseFloat(params.zshift) || 0}
        />
      )}

      <TransformControls
        expanded={expandedSections.transform}
        onToggle={() => toggleSection('transform')}
        params={params}
        setParams={setParams}
      />

      <ColorSettings
        expanded={expandedSections.colors}
        onToggle={() => toggleSection('colors')}
        params={params}
        setParams={setParams}
      />

      <OutputSettings
        expanded={expandedSections.output}
        onToggle={() => toggleSection('output')}
        params={params}
        setParams={setParams}
      />
    </div>
  );
}
