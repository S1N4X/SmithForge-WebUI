export default function CollapsibleSection({ title, expanded, onToggle, children }) {
  return (
    <div className="border border-gray-200 rounded overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-2 py-1 bg-gray-50 hover:bg-gray-100 flex justify-between items-center transition-colors"
      >
        <span className="font-semibold text-xs text-gray-700">{title}</span>
        <svg
          className={`w-3 h-3 transform transition-transform ${
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
      {expanded && <div className="p-2 bg-white">{children}</div>}
    </div>
  );
}
