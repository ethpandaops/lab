import React from 'react';

interface ConnectionLineProps {
  isActive: boolean;
  isWinning?: boolean;
}

const ConnectionLine: React.FC<ConnectionLineProps> = ({ isActive, isWinning = false }) => {
  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Horizontal connection line - with responsive width */}
      <div className="h-4 w-full max-w-[8rem] lg:max-w-[12rem] xl:max-w-[18rem] relative">
        <div
          className={`absolute top-1/2 -translate-y-1/2 h-[1px] w-full transition-colors duration-300 ${
            !isActive
              ? 'bg-tertiary/20 opacity-50'
              : isWinning
                ? 'bg-accent/70'
                : 'bg-border-subtle'
          }`}
        />

        {/* Clean simple flow indicator - just two dots */}
        {isActive && (
          <>
            <div
              className={`absolute w-1.5 h-1.5 rounded-full top-1/2 -translate-y-1/2 ${
                isWinning ? 'bg-accent' : 'bg-text-tertiary'
              }`}
              style={{
                left: '30%',
                animationName: 'pulseOpacity',
                animationDuration: '2s',
                animationIterationCount: 'infinite',
                animationTimingFunction: 'ease-in-out',
              }}
            />
            <div
              className={`absolute w-1.5 h-1.5 rounded-full top-1/2 -translate-y-1/2 ${
                isWinning ? 'bg-accent' : 'bg-text-tertiary'
              }`}
              style={{
                left: '70%',
                animationName: 'pulseOpacity',
                animationDuration: '2s',
                animationIterationCount: 'infinite',
                animationTimingFunction: 'ease-in-out',
                animationDelay: '1s',
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ConnectionLine;
