import type { ComponentType, SVGProps } from 'react';

/** Data for a single policy cell */
export interface PolicyData {
  /** Percentage savings for bytes (null if no data) */
  bytesPercent: number | null;
  /** Percentage savings for slots (null if no data) */
  slotsPercent: number | null;
}

/** Configuration for a single expiry type (row) */
export interface TypeConfig {
  /** Display label */
  label: string;
  /** Icon component */
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Text color class */
  textColor: string;
  /** Background when selected */
  selectedBg: string;
  /** Ring color when selected */
  selectedRing: string;
  /** Background on hover */
  hoverBg: string;
  /** Row background on hover */
  rowHoverBg: string;
  /** Cell background color */
  cellBg: string;
  /** Battery fill color */
  fillColor: string;
}

/** Configuration for a single policy (column) */
export interface PolicyConfig {
  /** Short label (e.g., "1y") */
  shortLabel: string;
  /** Full label (e.g., "1 year") */
  fullLabel: string;
  /** Tooltip description */
  tooltip: string;
}

/** Tooltip info for a type */
export interface TypeTooltip {
  /** Tooltip title */
  title: string;
  /** Tooltip description */
  description: string;
}

/** Full configuration for the PolicySelector */
export interface PolicySelectorConfig<TType extends string, TPolicy extends string> {
  /** Available expiry types (rows) */
  types: readonly TType[];
  /** Available policies (columns) */
  policies: readonly TPolicy[];
  /** Type display config */
  typeConfig: Record<TType, TypeConfig>;
  /** Policy display config */
  policyConfig: Record<TPolicy, PolicyConfig>;
  /** Tooltip descriptions for types */
  typeTooltips: Record<TType, TypeTooltip>;
}

/** Props for the PolicySelector component */
export interface PolicySelectorProps<TType extends string, TPolicy extends string> {
  /** Currently selected expiry type */
  selectedType: TType;
  /** Currently selected policy period */
  selectedPolicy: TPolicy;
  /** Callback when selection changes */
  onSelect: (type: TType, policy: TPolicy) => void;
  /** Savings data for each combination */
  savingsData: Record<TType, Record<TPolicy, PolicyData>>;
  /** Configuration for the selector */
  config: PolicySelectorConfig<TType, TPolicy>;
  /** Optional className for customization */
  className?: string;
}
