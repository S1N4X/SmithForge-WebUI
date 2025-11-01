export default function LogsDisplay({ processing, result, error, logs }) {
  // Don't display anything if there's nothing to show
  if (!processing && !result && !error && logs.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">
      {/* Processing indicator */}
      {processing && (
        <div className="flex items-center space-x-2 mb-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Processing...</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-2 p-2 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-200 rounded text-xs">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Success message */}
      {result && (
        <div className="mb-2 p-2 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 text-green-800 dark:text-green-200 rounded text-xs">
          <strong>Success!</strong>
          <div className="mt-1">
            <span className="block">{result.output_filename}</span>
            <a
              href={result.download_url}
              download
              className="inline-block mt-1 px-2 py-1 bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-600 font-semibold"
            >
              Download
            </a>
          </div>
        </div>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <div className="max-h-48 overflow-y-auto">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Process Log:</div>
          <div className="text-xs text-gray-600 dark:text-gray-300 font-mono space-y-0.5 bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-600">
            {logs.map((log, index) => (
              <div key={index} className="whitespace-pre-wrap break-words">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
