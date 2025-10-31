export default function StatusBar({ processing, result, error, logs }) {
  if (!processing && !result && !error) {
    return null;
  }

  return (
    <div className="p-4 max-h-48 overflow-y-auto">
      {processing && (
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <span>Processing...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-600 text-white p-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="bg-green-600 text-white p-3 rounded mb-2">
          <strong>Success!</strong> File generated: {result.output_filename}
          <a
            href={result.download_url}
            download
            className="ml-4 underline hover:text-green-200"
          >
            Download
          </a>
        </div>
      )}

      {logs.length > 0 && (
        <div className="mt-2 text-sm text-gray-300 font-mono">
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}
