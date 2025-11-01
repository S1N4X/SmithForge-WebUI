import { useState } from 'react';
import './App.css';
import SplitLayout from './components/SplitLayout';
import Sidebar from './components/Sidebar/Sidebar';
import ModelViewer from './components/ModelViewer/ModelViewer';
import DarkModeToggle from './components/DarkModeToggle';

function App() {
  // Global state
  const [hueforgeFile, setHueforgeFile] = useState(null);
  const [baseFile, setBaseFile] = useState(null);
  const [selectedDefaultBase, setSelectedDefaultBase] = useState(null);
  const [params, setParams] = useState({
    rotateBase: 0,
    forceScale: null,
    scaledown: false,
    xshift: null,
    yshift: null,
    zshift: null,
    colorMode: 'none',
    swapInstructionsText: '',
    swapInstructionsFile: null,
    autoRepair: false,
    fillGaps: false,
    outputFormat: 'standard',
    outputName: '',
  });
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      {/* Dark Mode Toggle - Fixed top-right */}
      <div className="absolute top-4 right-4 z-50">
        <DarkModeToggle />
      </div>

      <SplitLayout
        sidebar={
          <Sidebar
            hueforgeFile={hueforgeFile}
            setHueforgeFile={setHueforgeFile}
            baseFile={baseFile}
            setBaseFile={setBaseFile}
            selectedDefaultBase={selectedDefaultBase}
            setSelectedDefaultBase={setSelectedDefaultBase}
            params={params}
            setParams={setParams}
            processing={processing}
            setProcessing={setProcessing}
            setResult={setResult}
            setError={setError}
            setLogs={setLogs}
            result={result}
            error={error}
            logs={logs}
          />
        }
        main={
          <ModelViewer
            hueforgeFile={hueforgeFile}
            baseFile={baseFile}
            selectedDefaultBase={selectedDefaultBase}
            params={params}
            result={result}
          />
        }
      />
    </div>
  );
}

export default App;
