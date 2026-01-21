import { type JSX, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import type { GasTooltipProps } from './GasTooltip.types';
import { getGasExplanations } from './GasTooltip.types';

const SIZE_CLASSES = {
  sm: 'size-3',
  md: 'size-4',
  lg: 'size-5',
};

/**
 * GasTooltip - Informational tooltip explaining gas concepts
 *
 * Displays an info icon that shows a tooltip with an explanation
 * of the specified gas type when hovered or focused.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <span>Intrinsic Gas: 21,000 <GasTooltip type="intrinsic" /></span>
 *
 * // Custom content
 * <GasTooltip type="evm" customContent={<div>Custom explanation</div>} />
 * ```
 */
export function GasTooltip({ type, context, customContent, size = 'sm', className }: GasTooltipProps): JSX.Element {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const explanations = getGasExplanations(context);
  const explanation = explanations[type];

  const handleMouseEnter = useCallback(() => setIsVisible(true), []);
  const handleMouseLeave = useCallback(() => setIsVisible(false), []);
  const handleFocus = useCallback(() => setIsVisible(true), []);
  const handleBlur = useCallback(() => setIsVisible(false), []);

  // Calculate position when tooltip becomes visible
  useEffect(() => {
    if (isVisible && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 8, // 8px gap above the button
        left: rect.left + rect.width / 2,
      });
    }
  }, [isVisible]);

  const tooltipContent = isVisible && (
    <div
      id={`gas-tooltip-${type}`}
      role="tooltip"
      className="fixed z-[9999] w-72 -translate-x-1/2 -translate-y-full rounded-xs border border-border bg-background p-3 shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      {customContent ?? (
        <>
          <div className="mb-1.5 text-sm font-medium text-foreground">{explanation.title}</div>
          <div className="text-xs/5 text-muted">{explanation.description}</div>
        </>
      )}
      {/* Tooltip arrow */}
      <div className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-r border-b border-border bg-background" />
    </div>
  );

  return (
    <span className={clsx('relative inline-flex items-center', className)}>
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="text-muted/60 transition-colors hover:text-muted focus:outline-none"
        aria-label={`Info about ${explanation.title}`}
        aria-describedby={isVisible ? `gas-tooltip-${type}` : undefined}
      >
        <QuestionMarkCircleIcon className={SIZE_CLASSES[size]} />
      </button>

      {tooltipContent && createPortal(tooltipContent, document.body)}
    </span>
  );
}
