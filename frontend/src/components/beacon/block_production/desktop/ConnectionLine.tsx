import React from 'react';

interface ConnectionLineProps {
  isActive: boolean;
  isWinning?: boolean;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ isActive, isWinning = false }) => {
  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Horizontal connection line */}
      <div className="h-4 w-20 relative">
        <div 
          className={`absolute top-1/2 -translate-y-1/2 h-[1px] w-full transition-colors duration-300 ${
            !isActive 
              ? 'bg-tertiary/20 opacity-50' 
              : isWinning 
                ? 'bg-gold/70' 
                : 'bg-tertiary/30'
          }`}
        />
        
        {/* Clean simple flow indicator - just two dots */}
        {isActive && (
          <>
            <div 
              className={`absolute w-1.5 h-1.5 rounded-full top-1/2 -translate-y-1/2 ${
                isWinning ? 'bg-gold/90' : 'bg-tertiary/70'
              }`}
              style={{
                left: '30%',
                animationName: 'pulseOpacity',
                animationDuration: '2s',
                animationIterationCount: 'infinite',
                animationTimingFunction: 'ease-in-out'
              }}
            />
            <div 
              className={`absolute w-1.5 h-1.5 rounded-full top-1/2 -translate-y-1/2 ${
                isWinning ? 'bg-gold/90' : 'bg-tertiary/70'
              }`}
              style={{
                left: '70%',
                animationName: 'pulseOpacity',
                animationDuration: '2s',
                animationIterationCount: 'infinite',
                animationTimingFunction: 'ease-in-out',
                animationDelay: '1s'
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ConnectionLine;