import { useDebugSection } from '@/hooks/useDebugSection';
import { useSlotDataTracker } from '@/contexts/slotDataTracker';
import { Copy, CheckCircle, AlertCircle, Clock, Loader } from 'lucide-react';
import { useState, useEffect } from 'react';

export function SlotDataDebugSection() {
  const { requests, clearRequests } = useSlotDataTracker();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Force re-render every second to update "time ago" displays
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const copyPayload = (request: any) => {
    navigator.clipboard.writeText(JSON.stringify(request.payload, null, 2));
    setCopiedId(request.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '-';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  useDebugSection(
    'slot-data-requests',
    'Slot Data Requests',
    () => (
      <div className="font-mono text-xs space-y-3">
        {/* Header with clear button */}
        <div className="flex items-center justify-between">
          <div className="text-teal-400 text-[10px] font-semibold uppercase tracking-wider">
            Recent Requests ({requests.length}/{10})
          </div>
          {requests.length > 0 && (
            <button
              onClick={clearRequests}
              className="px-2 py-0.5 text-[10px] font-medium rounded bg-surface hover:bg-hover transition-colors border border-subtle"
            >
              Clear
            </button>
          )}
        </div>

        {/* Request list */}
        {requests.length === 0 ? (
          <div className="text-gray-500 italic text-center py-4">No requests yet</div>
        ) : (
          <div className="space-y-2">
            {requests.map(request => (
              <div
                key={request.id}
                className="border border-gray-700 rounded-md p-2 bg-gray-900/50 space-y-1"
              >
                {/* Request header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-semibold">Slot {request.slot}</span>
                    <span
                      className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded ${
                        request.apiMode === 'REST'
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-blue-500/20 text-blue-500'
                      }`}
                    >
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full ${
                          request.apiMode === 'REST' ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                      />
                      {request.apiMode}
                    </span>
                    {!request.endTime && (
                      <Loader className="w-3 h-3 text-yellow-500 animate-spin" />
                    )}
                    {request.error && <AlertCircle className="w-3 h-3 text-red-500" />}
                  </div>
                  <button
                    onClick={() => copyPayload(request)}
                    disabled={!request.payload}
                    className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                      !request.payload
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        : 'bg-surface hover:bg-hover border border-subtle'
                    }`}
                    title="Copy payload to clipboard"
                  >
                    {copiedId === request.id ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Request details */}
                <div className="flex items-center gap-4 text-[10px] text-tertiary">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDuration(request.duration)}</span>
                  </div>
                  <div>{formatTimeAgo(request.startTime)}</div>
                  <div className="text-gray-600">{request.network}</div>
                </div>

                {/* REST endpoints if available */}
                {request.apiMode === 'REST' && request.endpoints && (
                  <div className="text-[9px] text-gray-600 pl-2 pt-1">
                    {request.endpoints.length} endpoints called
                  </div>
                )}

                {/* Error message if present */}
                {request.error && (
                  <div className="text-[10px] text-red-400 pl-2 pt-1">{request.error}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    [requests, tick], // Include tick to force re-renders every second
    30, // Priority - show after other debug sections
  );

  return null;
}
