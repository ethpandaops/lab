import { type JSX, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, ChevronRightIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { Button } from '@/components/Elements/Button';
import type { GasSchedule, GasScheduleDefaults } from '../../SimulatePage.types';
import { getOpcodeCategory, isGasParameter, CATEGORY_COLORS } from '../../utils/opcodeUtils';

/**
 * Info tooltip component with portal-based positioning
 * Shows a styled tooltip on hover with title and description
 */
interface InfoTooltipProps {
  title: string;
  description: string;
}

function InfoTooltip({ title, description }: InfoTooltipProps): JSX.Element {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = useCallback(() => setIsVisible(true), []);
  const handleMouseLeave = useCallback(() => setIsVisible(false), []);
  const handleFocus = useCallback(() => setIsVisible(true), []);
  const handleBlur = useCallback(() => setIsVisible(false), []);

  // Calculate position when tooltip becomes visible
  useEffect(() => {
    if (isVisible && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
  }, [isVisible]);

  const tooltipContent = isVisible && (
    <div
      role="tooltip"
      className="fixed z-[9999] w-72 -translate-x-1/2 -translate-y-full rounded-xs border border-border bg-background p-3 shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      <div className="mb-1.5 text-sm font-medium text-foreground">{title}</div>
      <div className="text-xs/5 text-muted">{description}</div>
      {/* Tooltip arrow */}
      <div className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-r border-b border-border bg-background" />
    </div>
  );

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="text-muted/60 transition-colors hover:text-muted focus:outline-none"
        aria-label={`Info about ${title}`}
      >
        <QuestionMarkCircleIcon className="size-3.5" />
      </button>
      {tooltipContent && createPortal(tooltipContent, document.body)}
    </span>
  );
}

/**
 * Props for the GasScheduleEditor component
 */
export interface GasScheduleEditorProps {
  /** Current gas schedule values (user overrides) */
  schedule: GasSchedule;
  /** Default gas schedule values with descriptions (from API) */
  defaults: GasScheduleDefaults;
  /** Callback when any value changes */
  onChange: (schedule: GasSchedule) => void;
  /** Optional className for the container */
  className?: string;
}

/**
 * Derive slider constraints from default value
 */
function getSliderConstraints(defaultValue: number): { min: number; max: number; step: number } {
  if (defaultValue === 0) {
    return { min: 0, max: 100, step: 1 };
  }
  if (defaultValue <= 10) {
    return { min: 0, max: Math.max(50, defaultValue * 5), step: 1 };
  }
  if (defaultValue <= 100) {
    return { min: 0, max: Math.max(500, defaultValue * 5), step: 10 };
  }
  if (defaultValue <= 1000) {
    return { min: 0, max: Math.max(5000, defaultValue * 5), step: 50 };
  }
  if (defaultValue <= 10000) {
    return { min: 0, max: Math.max(50000, defaultValue * 5), step: 100 };
  }
  return { min: 0, max: defaultValue * 5, step: 1000 };
}

/**
 * Props for individual gas parameter slider
 */
interface GasParameterSliderProps {
  name: string;
  value: number | undefined;
  defaultValue: number;
  description?: string;
  onChange: (value: number | undefined) => void;
}

/**
 * Individual gas parameter slider with label, description tooltip, and reset
 */
function GasParameterSlider({
  name,
  value,
  defaultValue,
  description,
  onChange,
}: GasParameterSliderProps): JSX.Element {
  const currentValue = value ?? defaultValue;
  const isModified = value !== undefined && value !== defaultValue;
  const deltaPercent = defaultValue > 0 ? ((currentValue - defaultValue) / defaultValue) * 100 : 0;
  const { min, max, step } = getSliderConstraints(defaultValue);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value);
      if (newValue === defaultValue) {
        onChange(undefined);
      } else {
        onChange(newValue);
      }
    },
    [defaultValue, onChange]
  );

  const handleReset = useCallback(() => {
    onChange(undefined);
  }, [onChange]);

  return (
    <div className="group flex flex-col gap-1.5 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-sm font-medium text-foreground">{name}</label>
          {description && <InfoTooltip title={name} description={description} />}
        </div>
        <div className="flex items-center gap-2">
          {isModified && (
            <span
              className={clsx(
                'rounded-xs px-1.5 py-0.5 text-xs font-medium',
                deltaPercent < 0 ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
              )}
            >
              {deltaPercent > 0 ? '+' : ''}
              {deltaPercent.toFixed(0)}%
            </span>
          )}
          <span className={clsx('font-mono text-sm', isModified ? 'font-semibold text-primary' : 'text-muted')}>
            {currentValue.toLocaleString()}
          </span>
          {isModified && (
            <button
              onClick={handleReset}
              className="text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
              title="Reset to default"
            >
              <ArrowPathIcon className="size-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={handleInputChange}
          className={clsx(
            'w-full cursor-pointer appearance-none rounded-xs bg-transparent',
            '[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-xs [&::-webkit-slider-runnable-track]:bg-border',
            '[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-xs [&::-moz-range-track]:bg-border',
            '[&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-colors',
            isModified
              ? '[&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:hover:bg-primary/80'
              : '[&::-webkit-slider-thumb]:bg-muted [&::-webkit-slider-thumb]:hover:bg-muted/80',
            '[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:transition-colors',
            isModified
              ? '[&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:hover:bg-primary/80'
              : '[&::-moz-range-thumb]:bg-muted [&::-moz-range-thumb]:hover:bg-muted/80',
            'focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
          )}
        />
        <span className="w-16 text-right text-xs text-muted">({defaultValue.toLocaleString()})</span>
      </div>
    </div>
  );
}

/**
 * Collapsible section for a group of gas parameters
 */
interface GasParameterSectionProps {
  name: string;
  color: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  modifiedCount: number;
}

function GasParameterSection({
  name,
  color,
  children,
  defaultExpanded = false,
  modifiedCount,
}: GasParameterSectionProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-surface/50"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDownIcon className="size-4 text-muted" />
          ) : (
            <ChevronRightIcon className="size-4 text-muted" />
          )}
          <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium text-foreground">{name}</span>
        </div>
        {modifiedCount > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {modifiedCount} modified
          </span>
        )}
      </button>
      {isExpanded && <div className="divide-y divide-border/50 px-4 pb-3">{children}</div>}
    </div>
  );
}

/** Category ordering for display */
const CATEGORY_ORDER = [
  'Storage',
  'Transient Storage',
  'Contract',
  'Ethereum State',
  'Hashing',
  'Log',
  'Math',
  'Comparisons',
  'Logic',
  'Bit Ops',
  'Jump',
  'Pop',
  'Push',
  'Dup',
  'Swap',
  'Memory',
  'Misc',
  'Other',
];

/**
 * Gas Schedule Editor component
 *
 * Dynamically generates UI from API response - no hardcoded parameter list.
 * Uses getOpcodeCategory() to group parameters by opcode category.
 * Shows descriptions from API as tooltips on hover.
 */
export function GasScheduleEditor({ schedule, defaults, onChange, className }: GasScheduleEditorProps): JSX.Element {
  // Build groups dynamically from defaults (API response)
  // Each group has opcodes (actual EVM instructions) and parameters (cost modifiers)
  const groups = useMemo(() => {
    const categoryMap = new Map<string, { name: string; color: string; opcodes: string[]; parameters: string[] }>();

    // Group all items by category, separating opcodes from parameters
    for (const key of Object.keys(defaults.parameters)) {
      const category = getOpcodeCategory(key);
      const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;

      if (!categoryMap.has(category)) {
        categoryMap.set(category, { name: category, color, opcodes: [], parameters: [] });
      }

      const group = categoryMap.get(category)!;
      if (isGasParameter(key)) {
        group.parameters.push(key);
      } else {
        group.opcodes.push(key);
      }
    }

    // Sort items within each category
    for (const group of categoryMap.values()) {
      group.opcodes.sort();
      group.parameters.sort();
    }

    // Sort categories by predefined order
    const sortedGroups = Array.from(categoryMap.values()).sort((a, b) => {
      const aIndex = CATEGORY_ORDER.indexOf(a.name);
      const bIndex = CATEGORY_ORDER.indexOf(b.name);
      const aOrder = aIndex === -1 ? 999 : aIndex;
      const bOrder = bIndex === -1 ? 999 : bIndex;
      return aOrder - bOrder;
    });

    return sortedGroups;
  }, [defaults]);

  // Count total modified parameters
  const modifiedCount = useMemo(() => {
    return Object.keys(schedule).filter(key => {
      const defaultParam = defaults.parameters[key];
      return schedule[key] !== undefined && defaultParam && schedule[key] !== defaultParam.value;
    }).length;
  }, [schedule, defaults]);

  // Handle individual parameter change
  const handleParameterChange = useCallback(
    (key: string, value: number | undefined) => {
      const newSchedule = { ...schedule };
      if (value === undefined) {
        delete newSchedule[key];
      } else {
        newSchedule[key] = value;
      }
      onChange(newSchedule);
    },
    [schedule, onChange]
  );

  // Reset all parameters to defaults
  const handleResetAll = useCallback(() => {
    onChange({});
  }, [onChange]);

  // Get modified count for a list of keys
  const getModifiedCount = useCallback(
    (keys: string[]): number => {
      return keys.filter(key => {
        const value = schedule[key];
        const defaultParam = defaults.parameters[key];
        return value !== undefined && defaultParam && value !== defaultParam.value;
      }).length;
    },
    [schedule, defaults]
  );

  // Get modified count for a group (opcodes + parameters)
  const getGroupModifiedCount = useCallback(
    (group: { opcodes: string[]; parameters: string[] }): number => {
      return getModifiedCount([...group.opcodes, ...group.parameters]);
    },
    [getModifiedCount]
  );

  return (
    <Card className={clsx('overflow-hidden', className)}>
      {/* Header */}
      <div className="border-b border-border bg-surface/30 px-4 py-3">
        <h3 className="text-sm font-medium text-foreground">Gas Schedule</h3>
        <p className="mt-0.5 text-xs text-muted">Adjust gas costs to simulate repricing</p>
        {modifiedCount > 0 && (
          <Button variant="soft" size="sm" onClick={handleResetAll} className="mt-3 w-full">
            <ArrowPathIcon className="mr-1.5 size-3.5" />
            Reset ({modifiedCount})
          </Button>
        )}
      </div>

      {/* Parameter Groups - dynamically generated from API response */}
      <div className="divide-y divide-border">
        {groups.map(group => (
          <GasParameterSection
            key={group.name}
            name={group.name}
            color={group.color}
            defaultExpanded={false}
            modifiedCount={getGroupModifiedCount(group)}
          >
            {/* Opcodes sub-section - more prominent */}
            {group.opcodes.length > 0 && (
              <div className="mb-3 rounded-xs border border-primary/20 bg-primary/5 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-wider text-primary uppercase">Opcodes</span>
                  <div className="h-px flex-1 bg-primary/20" />
                </div>
                <div className="space-y-1">
                  {group.opcodes.map(key => {
                    const param = defaults.parameters[key];
                    return (
                      <GasParameterSlider
                        key={key}
                        name={key}
                        value={schedule[key]}
                        defaultValue={param?.value ?? 0}
                        description={param?.description}
                        onChange={value => handleParameterChange(key, value)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
            {/* Parameters sub-section - subtle */}
            {group.parameters.length > 0 && (
              <div className="rounded-xs border border-border/50 bg-surface/30 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[10px] font-semibold tracking-wider text-muted uppercase">Parameters</span>
                  <div className="h-px flex-1 bg-border/50" />
                </div>
                <div className="space-y-1">
                  {group.parameters.map(key => {
                    const param = defaults.parameters[key];
                    return (
                      <GasParameterSlider
                        key={key}
                        name={key}
                        value={schedule[key]}
                        defaultValue={param?.value ?? 0}
                        description={param?.description}
                        onChange={value => handleParameterChange(key, value)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </GasParameterSection>
        ))}
      </div>
    </Card>
  );
}
