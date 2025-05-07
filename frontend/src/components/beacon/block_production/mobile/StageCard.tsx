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
  progress?: number; // New prop for showing progress bars (0-100)
  iconColor?: string; // Customize the icon color based on the phase
  details?: React.ReactNode; // To show additional content
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
  progress,
  iconColor,
  details,
}) => {
  // Determine icon color scheme based on title or custom iconColor
  const getIconColorScheme = () => {
    if (iconColor) return iconColor;
    
    // Default color schemes for known stages
    switch (title) {
      case 'Builders':
        return isActive && !isInPropagationPhase
          ? 'from-orange-500/60 to-orange-500/30 border-orange-400/80' // Building active
          : 'from-orange-500/30 to-orange-500/10 border-orange-400/50';  // Building inactive
      case 'MEV Relays':
        return isActive
          ? 'from-green-500/60 to-green-600/30 border-green-400/80' // Relays active
          : 'from-green-500/30 to-green-600/10 border-green-400/50'; // Relays inactive
      case 'Proposer':
        return isActive
          ? 'from-amber-500/60 to-amber-600/30 border-amber-400/80' // Proposer active
          : 'from-amber-500/30 to-amber-600/10 border-amber-400/50'; // Proposer inactive  
      case 'Attesters':
        return isActive
          ? 'from-blue-500/60 to-blue-600/30 border-blue-400/80' // Attesters active
          : 'from-blue-500/30 to-blue-600/10 border-blue-400/50'; // Attesters inactive
      default:
        return isActive && !isInPropagationPhase
          ? 'from-orange-500/60 to-orange-500/30 border-orange-400/80' // Default active
          : 'from-orange-500/30 to-orange-500/10 border-orange-400/50'; // Default inactive
    }
  };

  // Get progress color based on title
  const getProgressColor = () => {
    switch (title) {
      case 'Builders': return 'bg-orange-500';
      case 'MEV Relays': return 'bg-green-500';
      case 'Proposer': return 'bg-amber-500';
      case 'Attesters': return 'bg-blue-500';
      default: return 'bg-purple-500';
    }
  };

  return (
    <div
      className={`p-2 rounded-lg border ${isActive ? 'bg-surface border-subtle' : 'bg-surface/90 border-subtle/50 opacity-80'} transition-opacity duration-300 ${className}`}
    >
      <div className="flex items-center">
        {/* Icon section */}
        <div
          className={`w-10 h-10 flex items-center justify-center rounded-full mr-3 shadow-md transition-colors duration-500 ${
            isActive
              ? `bg-gradient-to-br ${getIconColorScheme()} border-2` // Active state
              : 'bg-surface/20 border border-subtle/50 opacity-50' // Inactive state
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
        
        {/* Content section */}
        <div className="flex-1">
          <div className="font-medium text-sm">{title}</div>
          <div className="text-xs text-tertiary">{subtitle}</div>
          
          {/* Progress bar (if progress is provided) */}
          {progress !== undefined && progress > 0 && (
            <div className="mt-1.5 h-1.5 w-full bg-surface/30 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ease-out ${getProgressColor()}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
        
        {/* Value indicator on the right */}
        {value && (
          <div className="text-xs font-mono text-success font-medium px-1.5 py-0.5 bg-success/10 rounded-md">
            {value}
          </div>
        )}
      </div>
      
      {/* Optional detailed content */}
      {details && (
        <div className="mt-2 pt-2 border-t border-subtle/10 text-xs">
          {details}
        </div>
      )}
    </div>
  );
};

export default StageCard;
