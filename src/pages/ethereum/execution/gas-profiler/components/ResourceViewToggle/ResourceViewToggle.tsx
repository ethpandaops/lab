import { type JSX } from 'react';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';

export type ResourceViewMode = 'opcode' | 'resource';

export interface ResourceViewToggleProps {
  value: ResourceViewMode;
  onChange: (mode: ResourceViewMode) => void;
}

const OPTIONS = [
  { value: 'opcode', label: <span title="Which EVM instructions used gas?">By Opcode</span> },
  { value: 'resource', label: <span title="What system resources did gas pay for?">By Resource</span> },
] as const;

/**
 * Segmented toggle to switch between "By Opcode" and "By Resource" views.
 * Includes tooltip descriptions explaining what each view answers.
 */
export function ResourceViewToggle({ value, onChange }: ResourceViewToggleProps): JSX.Element {
  return <SegmentedControl ariaLabel="Resource view" options={OPTIONS} value={value} onChange={onChange} />;
}
