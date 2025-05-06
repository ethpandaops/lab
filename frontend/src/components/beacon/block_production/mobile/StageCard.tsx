import React from 'react';

interface StageCardProps {
  title: string;
  emoji: string;
  emojiLabel: string;
  isActive: boolean;
  isInPropagationPhase: boolean;
  subtitle: string;
  value?: string;
  className?: string;
}

const StageCard: React.FC<StageCardProps> = ({
  title,
  emoji,
  emojiLabel,
  isActive,
  isInPropagationPhase,
  subtitle,
  value,
  className,
}) => {
  return (
    <div
      className={`p-2 rounded-lg border ${isActive ? 'bg-surface border-subtle' : 'bg-surface/90 border-subtle/50 opacity-80'} transition-opacity duration-300 ${className}`}
    >
      <div className="flex items-center">
        <div
          className={`w-10 h-10 flex items-center justify-center rounded-full mr-3 shadow-md transition-colors duration-500 ${
            isActive
              ? !isInPropagationPhase
                ? 'bg-gradient-to-br from-orange-500/60 to-orange-500/30 border-2 border-orange-400/80' // Brighter during building phase
                : 'bg-gradient-to-br from-orange-500/30 to-orange-500/10 border-2 border-orange-400/50' // Normal when active
              : 'bg-surface/20 border border-subtle/50 opacity-50' // More dull when inactive
          }`}
        >
          <div
            className={`text-xl ${isActive ? 'opacity-70' : 'opacity-40'}`}
            role="img"
            aria-label={emojiLabel}
          >
            {emoji}
          </div>
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm">{title}</div>
          <div className="text-xs text-tertiary">{subtitle}</div>
        </div>
        {value && <div className="text-xs font-mono text-success">{value}</div>}
      </div>
    </div>
  );
};

export default StageCard;
