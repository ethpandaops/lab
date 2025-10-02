import { useDebugSection } from '@/hooks/useDebugSection';
import useApiMode from '@/contexts/apiMode';

export function ApiModeDebugSection() {
  const { useRestApi, toggleApiMode } = useApiMode();

  useDebugSection(
    'api-mode',
    'API Configuration',
    () => (
      <div className="font-mono text-xs space-y-3">
        {/* Current API Mode */}
        <div>
          <div className="text-teal-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">
            Data Source Details
          </div>
          <div className="pl-2 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-tertiary">Active Mode:</span>{' '}
                <span
                  className={`font-semibold ${useRestApi ? 'text-green-500' : 'text-blue-500'}`}
                >
                  {useRestApi ? 'REST API' : 'gRPC API'}
                </span>
              </div>
              <button
                onClick={toggleApiMode}
                className="px-2 py-0.5 text-[10px] font-medium rounded bg-surface hover:bg-hover transition-colors border border-subtle"
                title={`Quick switch to ${useRestApi ? 'gRPC' : 'REST'}`}
              >
                → {useRestApi ? 'gRPC' : 'REST'}
              </button>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2 text-[10px]">
              <span
                className={`inline-block w-2 h-2 rounded-full animate-pulse ${
                  useRestApi ? 'bg-green-500' : 'bg-blue-500'
                }`}
              />
              <span className="text-gray-400">
                {useRestApi ? 'Using RESTful endpoints' : 'Using gRPC streaming'}
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    [useRestApi],
    20, // Priority - show after main debug sections
  );

  return null;
}
