import React from 'react';
import { ChevronDown, ChevronRight, X, Bug } from 'lucide-react';
import { useDebug } from '@/contexts/debug';

export function GlobalDebugPanel() {
  const { sections, collapsedSections, isVisible, toggleSection, toggleVisibility } = useDebug();

  // Check if we're in development mode
  const isDevelopment = import.meta.env.DEV;

  if (!isVisible) {
    // Only show the floating indicator in development mode
    if (isDevelopment) {
      return (
        <div
          className="fixed top-4 right-4 bg-black/80 text-yellow-500 p-2 rounded-lg cursor-pointer z-50 hover:bg-black/90 transition-colors border border-yellow-500/50"
          onClick={toggleVisibility}
          title="Press 'd' to toggle debug panel"
        >
          <Bug className="w-4 h-4" />
        </div>
      );
    }
    // In production, return null (no visual indicator, but 'd' key still works)
    return null;
  }

  // Sort sections by priority
  const sortedSections = Array.from(sections.values()).sort(
    (a, b) => (a.priority || 0) - (b.priority || 0),
  );

  return (
    <div className="fixed top-0 right-0 h-screen flex flex-col bg-black/90 text-white text-xs font-mono z-50 border-l border-yellow-500 w-[400px] shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between bg-black p-3 border-b border-yellow-500">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-yellow-500" />
          <div className="text-yellow-500 font-bold text-sm">Global Debug Panel</div>
        </div>
        <button
          onClick={toggleVisibility}
          className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded"
          title="Press 'd' to toggle"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {sortedSections.length === 0 ? (
          <div className="text-gray-500 italic text-center py-8">No debug sections registered</div>
        ) : (
          sortedSections.map(section => {
            const isCollapsed = collapsedSections.has(section.id);

            return (
              <div
                key={section.id}
                className="border border-gray-700 rounded-md overflow-hidden bg-gray-900/50"
              >
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-2 bg-gray-800/50 hover:bg-gray-800/70 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="w-3 h-3 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    )}
                    <span className="text-blue-400 font-semibold text-xs">{section.title}</span>
                  </div>
                </button>

                {/* Section content */}
                {!isCollapsed && (
                  <div className="p-3 border-t border-gray-700 bg-black/30">
                    {section.component}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-700 bg-black text-gray-500 text-[10px] text-center">
        Press 'd' to toggle • {sortedSections.length} section
        {sortedSections.length !== 1 ? 's' : ''} active
      </div>
    </div>
  );
}
