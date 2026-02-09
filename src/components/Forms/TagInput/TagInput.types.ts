import type { ReactNode } from 'react';
import type { BadgeColor } from '@/components/Elements/Badge';

export interface TagValidationResult {
  /** Whether the tag value is valid */
  valid: boolean;
  /** Badge color to use for this tag */
  color?: BadgeColor;
}

export interface TagInputProps {
  /** Current list of tags */
  tags: string[];
  /** Callback when tags change */
  onTagsChange: (tags: string[]) => void;
  /** Validate a tag value and return styling info */
  validate?: (value: string) => TagValidationResult;
  /** Called on Enter when input is empty and tags exist */
  onSubmit?: () => void;
  /** Label text above the input */
  label?: string;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Helper text or status content below the input */
  helperText?: ReactNode;
  /** Whether the input is in an error state */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}
