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
    return { valid: true, color: 'indigo' };
  }
  // Invalid
  return { valid: false, color: 'red' };
}

/**
 * Build helper text ReactNode showing tag counts and a clear button
 */
function buildHelperText(tags: string[], onTagsChange: (tags: string[]) => void): ReactNode {
  const { valid, pubkeys, invalid } = parseValidatorIndices(tags);

  if (tags.length === 0) return undefined;

  return (
    <span className="flex items-center justify-between">
      <span className="flex items-center gap-3">
        {(valid.length > 0 || pubkeys.length > 0) && (
          <span className="text-success">
            {valid.length > 0 && pubkeys.length > 0
              ? `${valid.length} ${valid.length === 1 ? 'index' : 'indices'} + ${pubkeys.length} ${pubkeys.length === 1 ? 'pubkey' : 'pubkeys'} entered`
              : pubkeys.length > 0
                ? `${pubkeys.length} ${pubkeys.length === 1 ? 'pubkey' : 'pubkeys'} entered`
                : `${valid.length} ${valid.length === 1 ? 'validator' : 'validators'} entered`}
          </span>
        )}
        {invalid.length > 0 && (
          <span className="text-warning">
            {invalid.length} invalid: {invalid.slice(0, 3).join(', ')}
            {invalid.length > 3 && '...'}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={() => onTagsChange([])}
        className="text-xs text-muted transition-colors hover:text-foreground"
      >
        Clear all
      </button>
    </span>
  );
}

/**
 * Validator-specific tag input component
 *
 * Wraps the core TagInput with validator index/pubkey validation and status display.
 * Tags are colored green for valid indices, indigo for valid pubkeys, and red for invalid entries.
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
      label="Validators"
      placeholder="Enter validator indices or pubkeys (e.g., 123, 0xab12...)"
      helperText={buildHelperText(tags, onTagsChange)}
      disabled={disabled}
      className={className}
    />
  );
}
