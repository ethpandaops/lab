import { type JSX, useRef, useCallback, useId } from 'react';
import clsx from 'clsx';
import { Badge } from '@/components/Elements/Badge';
import type { TagInputProps } from './TagInput.types';

/**
 * A chip/tag input component that renders entered values as removable Badge chips.
 *
 * Supports tokenizing on Enter, comma, Tab, paste, and blur. Tags are displayed
 * as Badge pills with optional validation-based coloring.
 */
export function TagInput({
  tags,
  onTagsChange,
  validate,
  onSubmit,
  label,
  placeholder,
  helperText,
  error = false,
  errorMessage,
  disabled = false,
  className,
}: TagInputProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const inputId = `tag-input-${generatedId}`;

  const addTags = useCallback(
    (values: string[]) => {
      const newTags = [...tags];
      for (const raw of values) {
        // Split each value by commas, spaces, or newlines so
        // "123 456, 789" becomes three separate tags
        const parts = raw.split(/[\s,]+/);
        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed) continue;
          // Skip duplicates (case-insensitive)
          if (newTags.some(t => t.toLowerCase() === trimmed.toLowerCase())) continue;
          newTags.push(trimmed);
        }
      }
      if (newTags.length !== tags.length) {
        onTagsChange(newTags);
      }
    },
    [tags, onTagsChange]
  );

  const removeTag = useCallback(
    (index: number) => {
      onTagsChange(tags.filter((_, i) => i !== index));
      inputRef.current?.focus();
    },
    [tags, onTagsChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const value = e.currentTarget.value;

      if (e.key === 'Enter') {
        e.preventDefault();
        if (value.trim()) {
          addTags([value]);
          e.currentTarget.value = '';
        } else if (tags.length > 0 && onSubmit) {
          onSubmit();
        }
        return;
      }

      if (e.key === 'Tab' || e.key === ',') {
        if (value.trim()) {
          e.preventDefault();
          addTags([value]);
          e.currentTarget.value = '';
        }
        return;
      }

      if (e.key === 'Backspace' && !value && tags.length > 0) {
        removeTag(tags.length - 1);
      }
    },
    [tags, addTags, removeTag, onSubmit]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text');
      if (pasted.trim()) {
        addTags([pasted]);
        e.currentTarget.value = '';
      }
    },
    [addTags]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const value = e.currentTarget.value.trim();
      if (value) {
        addTags([value]);
        e.currentTarget.value = '';
      }
    },
    [addTags]
  );

  const handleContainerClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const showError = error && errorMessage;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-2 block text-sm/6 font-medium text-foreground">
          {label}
        </label>
      )}

      <div
        onClick={handleContainerClick}
        className={clsx(
          'flex max-h-40 cursor-text flex-wrap items-center gap-1.5 overflow-y-auto rounded-xs border px-2 py-1.5',
          'bg-surface transition-colors',
          error
            ? 'border-danger/50 focus-within:border-danger focus-within:ring-2 focus-within:ring-danger/50'
            : 'border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/50',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {tags.map((tag, index) => {
          const validation = validate ? validate(tag) : { valid: true };
          return (
            <Badge
              key={`${tag}-${index}`}
              size="small"
              pill
              color={validation.color ?? 'gray'}
              onRemove={disabled ? undefined : () => removeTag(index)}
            >
              <span className="max-w-48 truncate">{tag}</span>
            </Badge>
          );
        })}

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          disabled={disabled}
          placeholder={tags.length === 0 ? placeholder : undefined}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
          className="min-w-20 grow border-0 bg-transparent py-0.5 text-sm/6 text-foreground outline-hidden placeholder:text-muted"
          aria-label={label ?? 'Tag input'}
        />
      </div>

      {(showError || helperText) && (
        <div
          className={clsx('mt-2 text-sm/6', showError ? 'text-danger' : 'text-muted')}
          role={showError ? 'alert' : 'status'}
          aria-live="polite"
        >
          {showError ? errorMessage : helperText}
        </div>
      )}
    </div>
  );
}
