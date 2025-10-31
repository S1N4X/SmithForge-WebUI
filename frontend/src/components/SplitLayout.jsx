import { useState } from 'react';

/**
 * Split-pane layout with resizable sidebar
 */
export default function SplitLayout({ sidebar, main, statusBar }) {
  const [sidebarWidth, setSidebarWidth] = useState(400); // px
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newWidth = e.clientX;
      if (newWidth >= 300 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    }
  };

  return (
    <div
      className="flex flex-col h-full"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className="bg-white shadow-lg overflow-y-auto"
          style={{ width: `${sidebarWidth}px`, minWidth: '300px', maxWidth: '600px' }}
        >
          {sidebar}
        </div>

        {/* Resizer */}
        <div
          className="w-1 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-colors"
          onMouseDown={handleMouseDown}
        />

        {/* Main content area */}
        <div className="flex-1 overflow-hidden bg-gray-900">
          {main}
        </div>
      </div>

      {/* Status bar */}
      <div className="h-auto bg-gray-800 text-white">
        {statusBar}
      </div>
    </div>
  );
}
