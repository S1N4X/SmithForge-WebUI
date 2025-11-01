export default function CollapsibleSection({ title, expanded, onToggle, children }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-2 py-1 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 flex justify-between items-center transition-colors"
      >
        <span className="font-semibold text-xs text-gray-700 dark:text-gray-200">{title}</span>
        <svg
          className={`w-3 h-3 transform transition-transform text-gray-700 dark:text-gray-200 ${
            expanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {expanded && <div className="p-2 bg-white dark:bg-gray-700">{children}</div>}
    </div>
  );
}
