import type { JSX, ReactNode } from 'react';
import { TagInput } from '@/components/Forms/TagInput';
import type { TagValidationResult } from '@/components/Forms/TagInput';
import { parseValidatorIndices } from './ValidatorInput.utils';

interface ValidatorInputProps {
  /** Current list of validator tags (indices and pubkeys) */
  tags: string[];
  /** Callback when tags change */
  onTagsChange: (tags: string[]) => void;
  /** Called on Enter when input is empty (for "Analyze" trigger) */
  onSubmit?: () => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

/** Regex for a valid BLS pubkey: 0x followed by exactly 96 hex characters */
const PUBKEY_REGEX = /^0x[0-9a-fA-F]{96}$/;

/**
 * Validate a single tag as a validator index, pubkey, or invalid
 */
function validateTag(value: string): TagValidationResult {
  // Valid non-negative integer
  const num = parseInt(value, 10);
  if (Number.isInteger(num) && num >= 0 && String(num) === value) {
    return { valid: true, color: 'green' };
  }
  // Valid BLS pubkey
  if (PUBKEY_REGEX.test(value)) {
    return { valid: true, color: 'green' };
  }
  // Invalid
  return { valid: false, color: 'red' };
}

/** Lists entries that are neither an index nor a pubkey */
function invalidHelperText(tags: string[]): ReactNode {
  const { invalid } = parseValidatorIndices(tags);
  if (invalid.length === 0) return undefined;
  return (
    <span className="text-warning">
      Not a validator index or pubkey: {invalid.slice(0, 3).join(', ')}
      {invalid.length > 3 && ` and ${invalid.length - 3} more`}
    </span>
  );
}

/**
 * Validator-specific tag input component
 *
 * Wraps the core TagInput with validator index/pubkey validation and status display.
 * Valid indices and pubkeys render green; anything else is red.
 */
export function ValidatorInput({
  tags,
  onTagsChange,
  onSubmit,
  disabled = false,
  className,
}: ValidatorInputProps): JSX.Element {
  return (
    <TagInput
      tags={tags}
      onTagsChange={onTagsChange}
      validate={validateTag}
      onSubmit={onSubmit}
      placeholder="Validator indices or pubkeys, e.g. 1257, 0xab12…"
      helperText={invalidHelperText(tags)}
      disabled={disabled}
      className={className}
    />
  );
}
