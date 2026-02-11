import { type JSX, useState, useCallback, useMemo, useRef, useEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { XMarkIcon, MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import type { GasSchedule, GasScheduleDefaults } from '../../SimulatePage.types';
import { getOpcodeCategory, CATEGORY_COLORS } from '../../utils/opcodeUtils';

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
  'Precompiles (Fixed)',
  'Precompiles (Variable)',
  'Other',
];

/** Multiplier options for category-wide scaling */
const MULTIPLIER_OPTIONS = [0.5, 1.5, 2, 3, 5];

/**
 * Props for the GasScheduleDrawer component
 */
export interface GasScheduleDrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Callback to close the drawer */
  onClose: () => void;
  /** Current gas schedule overrides */
  schedule: GasSchedule;
  /** Default gas schedule values with descriptions (from API) */
  defaults: GasScheduleDefaults;
  /** Callback when schedule changes */
  onChange: (schedule: GasSchedule) => void;
}

/** Grouped category structure */
interface CategoryGroup {
  name: string;
  color: string;
  keys: string[];
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
 * Info tooltip component with portal-based positioning
 */
function InfoTooltip({ title, description }: { title: string; description: string }): JSX.Element {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

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
      className="fixed z-[9999] w-64 -translate-x-1/2 -translate-y-full rounded-xs border border-border bg-background p-3 shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      <div className="mb-1.5 text-sm font-medium text-foreground">{title}</div>
      <div className="text-xs/5 text-muted">{description}</div>
      <div className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-r border-b border-border bg-background" />
    </div>
  );

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="text-muted/60 transition-colors hover:text-muted focus:outline-hidden"
        aria-label={`Info about ${title}`}
      >
        <QuestionMarkCircleIcon className="size-3.5" />
      </button>
      {tooltipContent && createPortal(tooltipContent, document.body)}
    </span>
  );
}

/**
 * GasScheduleDrawer - Slide-out panel for editing gas schedule parameters
 *
 * Features:
 * - Search bar for filtering parameters
 * - Category filter chips
 * - Per-category multiplier dropdown
 * - Compact parameter rows with inline slider and number input
 * - Active changes pills at top
 * - Modified parameters sorted first within each category
 */
export function GasScheduleDrawer({
  open,
  onClose,
  schedule,
  defaults,
  onChange,
}: GasScheduleDrawerProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Committed schedule - only updates when user finishes an interaction (mouseup/blur),
  // not during drag or typing, to avoid layout shifts in Active Changes section
  const [committedSchedule, setCommittedSchedule] = useState<GasSchedule>(schedule);
  const scheduleRef = useRef(schedule);
  scheduleRef.current = schedule;

  // Build category groups from defaults
  const groups = useMemo((): CategoryGroup[] => {
    const categoryMap = new Map<string, string[]>();

    for (const key of Object.keys(defaults.parameters)) {
      const category = getOpcodeCategory(key);
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(key);
    }

    // Sort keys within each category
    for (const keys of categoryMap.values()) {
      keys.sort();
    }

    // Sort categories by predefined order
    return Array.from(categoryMap.entries())
      .map(([name, keys]) => ({
        name,
        color: CATEGORY_COLORS[name] || CATEGORY_COLORS.Other,
        keys,
      }))
      .sort((a, b) => {
        const aIndex = CATEGORY_ORDER.indexOf(a.name);
        const bIndex = CATEGORY_ORDER.indexOf(b.name);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });
  }, [defaults]);

  // Get all modified entries (uses committed schedule to avoid layout shifts during drag/type)
  const modifiedEntries = useMemo(() => {
    return Object.entries(committedSchedule).filter(([key, value]) => {
      const defaultParam = defaults.parameters[key];
      return value !== undefined && defaultParam && value !== defaultParam.value;
    });
  }, [committedSchedule, defaults]);

  // Handle individual parameter change
  const handleParamChange = useCallback(
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

  // Handle category multiplier
  const handleCategoryMultiplier = useCallback(
    (categoryKeys: string[], multiplier: number) => {
      const newSchedule = { ...schedule };
      for (const key of categoryKeys) {
        const defaultParam = defaults.parameters[key];
        if (defaultParam) {
          const newValue = Math.round(defaultParam.value * multiplier);
          if (newValue === defaultParam.value) {
            delete newSchedule[key];
          } else {
            newSchedule[key] = newValue;
          }
        }
      }
      onChange(newSchedule);
      setCommittedSchedule(newSchedule);
    },
    [schedule, defaults, onChange]
  );

  // Reset all
  const handleResetAll = useCallback(() => {
    onChange({});
    setCommittedSchedule({});
  }, [onChange]);

  // Remove single override
  const handleRemoveOverride = useCallback(
    (key: string) => {
      const newSchedule = { ...schedule };
      delete newSchedule[key];
      onChange(newSchedule);
      setCommittedSchedule(newSchedule);
    },
    [schedule, onChange]
  );

  // Commit the current schedule (called on slider release / input blur)
  const commitSchedule = useCallback(() => {
    setCommittedSchedule(scheduleRef.current);
  }, []);

  // Filter groups by search and active category
  const filteredGroups = useMemo(() => {
    return groups
      .filter(group => !activeCategory || group.name === activeCategory)
      .map(group => {
        if (!searchQuery) return group;
        const filtered = group.keys.filter(key => key.toLowerCase().includes(searchQuery.toLowerCase()));
        return { ...group, keys: filtered };
      })
      .filter(group => group.keys.length > 0);
  }, [groups, searchQuery, activeCategory]);

  // Sort keys within each group alphabetically (stable order to avoid jumps during editing)
  const getSortedKeys = useCallback((keys: string[]): string[] => {
    return [...keys].sort((a, b) => a.localeCompare(b));
  }, []);

  // Count modified in a category
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

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="transition-opacity duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <DialogBackdrop className="fixed inset-0 bg-black/40" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <TransitionChild
                as={Fragment}
                enter="transition-transform duration-300 ease-out"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transition-transform duration-200 ease-in"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <DialogPanel className="pointer-events-auto w-screen max-w-lg">
                  <div className="flex h-full flex-col overflow-y-auto bg-background shadow-xl">
                    {/* Header */}
                    <div className="border-b border-border px-4 py-4">
                      <div className="flex items-center justify-between">
                        <DialogTitle className="text-base font-semibold text-foreground">Gas Schedule</DialogTitle>
                        <button
                          type="button"
                          onClick={onClose}
                          className="rounded-xs p-1 text-muted transition-colors hover:text-foreground"
                        >
                          <XMarkIcon className="size-5" />
                        </button>
                      </div>

                      {/* Search */}
                      <div className="mt-3 flex items-center gap-2 rounded-xs border border-border bg-surface px-3 py-2">
                        <MagnifyingGlassIcon className="size-4 text-muted" />
                        <input
                          type="text"
                          placeholder="Search opcodes..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full border-0 bg-transparent text-sm text-foreground placeholder:text-muted focus:ring-0 focus:outline-hidden"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="text-muted hover:text-foreground"
                          >
                            <XMarkIcon className="size-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Category Chips */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveCategory(null)}
                          className={clsx(
                            'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                            activeCategory === null
                              ? 'bg-primary text-white'
                              : 'bg-surface text-muted hover:text-foreground'
                          )}
                        >
                          All
                        </button>
                        {groups.map(group => (
                          <button
                            key={group.name}
                            type="button"
                            onClick={() => setActiveCategory(prev => (prev === group.name ? null : group.name))}
                            className={clsx(
                              'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                              activeCategory === group.name
                                ? 'text-white'
                                : 'bg-surface text-muted hover:text-foreground'
                            )}
                            style={activeCategory === group.name ? { backgroundColor: group.color } : undefined}
                          >
                            {group.name}
                            {getModifiedCount(group.keys) > 0 && (
                              <span className="ml-1 opacity-70">({getModifiedCount(group.keys)})</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Active Changes */}
                    {modifiedEntries.length > 0 && (
                      <div className="border-b border-border px-4 py-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">
                            Active Changes ({modifiedEntries.length})
                          </span>
                          <button
                            type="button"
                            onClick={handleResetAll}
                            className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground"
                          >
                            <ArrowPathIcon className="size-3" />
                            Reset All
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {modifiedEntries.map(([key, value]) => {
                            const defaultVal = defaults.parameters[key]?.value ?? 0;
                            return (
                              <span
                                key={key}
                                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs"
                              >
                                <span className="font-medium text-foreground">{key}</span>
                                <span className="text-muted">
                                  {defaultVal}→{value}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOverride(key)}
                                  className="ml-0.5 text-muted hover:text-foreground"
                                >
                                  <XMarkIcon className="size-3" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Parameter Categories */}
                    <div className="flex-1 overflow-y-auto">
                      {filteredGroups.map(group => {
                        const modCount = getModifiedCount(group.keys);
                        const sortedKeys = getSortedKeys(group.keys);

                        return (
                          <div key={group.name} className="border-b border-border">
                            {/* Category Header */}
                            <div className="flex items-center justify-between px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="size-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                                <span className="text-sm font-medium text-foreground">{group.name}</span>
                                {modCount > 0 && (
                                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                    {modCount}
                                  </span>
                                )}
                              </div>

                              {/* Multiplier Dropdown */}
                              <div className="flex items-center gap-1">
                                {MULTIPLIER_OPTIONS.map(mult => (
                                  <button
                                    key={mult}
                                    type="button"
                                    onClick={() => handleCategoryMultiplier(group.keys, mult)}
                                    className="rounded-xs px-1.5 py-0.5 text-[10px] font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
                                  >
                                    ×{mult}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Parameter Rows */}
                            <div className="px-4 pb-3">
                              {sortedKeys.map(key => {
                                const param = defaults.parameters[key];
                                if (!param) return null;
                                const currentValue = schedule[key] ?? param.value;
                                const isModified = schedule[key] !== undefined && schedule[key] !== param.value;
                                const { min, max, step } = getSliderConstraints(param.value);

                                return (
                                  <div
                                    key={key}
                                    className={clsx(
                                      'flex items-center gap-2 rounded-xs py-1.5',
                                      isModified && 'bg-primary/5 px-2'
                                    )}
                                  >
                                    {/* Name */}
                                    <div className="flex w-28 shrink-0 items-center gap-1">
                                      <span
                                        className={clsx(
                                          'truncate font-mono text-xs',
                                          isModified ? 'font-semibold text-primary' : 'text-foreground'
                                        )}
                                        title={key}
                                      >
                                        {key.startsWith('PC_') ? key.slice(3) : key}
                                      </span>
                                      {param.description && (
                                        <InfoTooltip
                                          title={key.startsWith('PC_') ? key.slice(3) : key}
                                          description={param.description}
                                        />
                                      )}
                                    </div>

                                    {/* Number Input */}
                                    <input
                                      type="number"
                                      value={currentValue}
                                      min={min}
                                      max={max}
                                      step={step}
                                      onChange={e => {
                                        const val = Number(e.target.value);
                                        handleParamChange(key, val === param.value ? undefined : val);
                                      }}
                                      onBlur={commitSchedule}
                                      className={clsx(
                                        'w-20 shrink-0 rounded-xs border bg-surface px-2 py-1 text-right font-mono text-xs focus:ring-1 focus:ring-primary focus:outline-hidden',
                                        isModified ? 'border-primary/30 text-primary' : 'border-border text-foreground'
                                      )}
                                    />

                                    {/* Slider */}
                                    <input
                                      type="range"
                                      min={min}
                                      max={max}
                                      step={step}
                                      value={currentValue}
                                      onChange={e => {
                                        const val = Number(e.target.value);
                                        handleParamChange(key, val === param.value ? undefined : val);
                                      }}
                                      onPointerUp={commitSchedule}
                                      className={clsx(
                                        'min-w-0 flex-1 cursor-pointer appearance-none bg-transparent',
                                        '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-xs [&::-webkit-slider-runnable-track]:bg-border',
                                        '[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-xs [&::-moz-range-track]:bg-border',
                                        '[&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
                                        isModified
                                          ? '[&::-webkit-slider-thumb]:bg-primary'
                                          : '[&::-webkit-slider-thumb]:bg-muted',
                                        '[&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0',
                                        isModified
                                          ? '[&::-moz-range-thumb]:bg-primary'
                                          : '[&::-moz-range-thumb]:bg-muted'
                                      )}
                                    />

                                    {/* Default value label */}
                                    <span className="w-12 shrink-0 text-right text-[10px] text-muted">
                                      ({param.value.toLocaleString()})
                                    </span>

                                    {/* Reset button */}
                                    {isModified && (
                                      <button
                                        type="button"
                                        onClick={() => handleParamChange(key, undefined)}
                                        className="shrink-0 text-muted transition-colors hover:text-foreground"
                                        title="Reset to default"
                                      >
                                        <ArrowPathIcon className="size-3" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {filteredGroups.length === 0 && (
                        <div className="px-4 py-8 text-center text-sm text-muted">No parameters match your search.</div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-border px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted">
                          {modifiedEntries.length > 0
                            ? `${modifiedEntries.length} parameter${modifiedEntries.length !== 1 ? 's' : ''} modified`
                            : 'No changes'}
                        </span>
                        <button
                          type="button"
                          onClick={onClose}
                          className="rounded-xs bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
