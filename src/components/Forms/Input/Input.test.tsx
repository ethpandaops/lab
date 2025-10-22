import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from './Input';

/**
 * Unit tests for Input component
 *
 * Visual and interaction tests have been migrated to Input.stories.tsx as play functions.
 * This file focuses on:
 * - Edge cases
 * - Component composition logic
 * - Props that don't have visual representations
 */
describe('Input', () => {
  describe('wrapper className', () => {
    it('should apply wrapper className', () => {
      const { container } = render(
        <Input wrapperClassName="custom-wrapper">
          <Input.Field />
        </Input>
      );
      const wrapper = container.querySelector('.custom-wrapper');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('ID generation', () => {
    it('should use custom id when provided', () => {
      render(
        <Input id="custom-id">
          <Input.Field />
        </Input>
      );
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', 'custom-id');
    });

    it('should generate unique id when not provided', () => {
      // Render two separate inputs in the same component to test unique ID generation
      render(
        <div>
          <Input>
            <Input.Field data-testid="input-1" />
          </Input>
          <Input>
            <Input.Field data-testid="input-2" />
          </Input>
        </div>
      );

      const input1 = screen.getByTestId('input-1');
      const input2 = screen.getByTestId('input-2');

      const id1 = input1.id;
      const id2 = input2.id;

      // IDs should be unique
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });
  });

  describe('aria-describedby composition', () => {
    it('should link to error message with aria-describedby', () => {
      render(
        <Input error errorMessage="This field is required" id="test-input">
          <Input.Field />
        </Input>
      );
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-input-error');
    });

    it('should link to helper text with aria-describedby', () => {
      render(
        <Input helperText="Helper text" id="test-input">
          <Input.Field />
        </Input>
      );
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-input-error');
    });

    it('should include corner hint in aria-describedby', () => {
      render(
        <Input helperText="Helper text" cornerHint="Optional" id="test-input">
          <Input.Field />
        </Input>
      );
      const input = screen.getByRole('textbox');
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).toContain('test-input-error');
      expect(describedBy).toContain('test-input-corner-hint');
    });
  });

  describe('error priority', () => {
    it('should prioritize error message over helper text', () => {
      render(
        <Input error errorMessage="This field is required" helperText="Helper text">
          <Input.Field />
        </Input>
      );
      expect(screen.getByText('This field is required')).toBeInTheDocument();
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
    });
  });

  describe('required attribute', () => {
    it('should set aria-required when required prop is true', () => {
      render(
        <Input required>
          <Input.Field />
        </Input>
      );
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('should not set aria-required when required prop is false', () => {
      render(
        <Input>
          <Input.Field />
        </Input>
      );
      const input = screen.getByRole('textbox');
      expect(input).not.toHaveAttribute('aria-required');
    });
  });

  describe('label and input association', () => {
    it('should associate label with input via htmlFor', () => {
      render(
        <Input label="Email address" id="email-input">
          <Input.Field />
        </Input>
      );
      const label = screen.getByText('Email address');
      const input = screen.getByRole('textbox');
      expect(label).toHaveAttribute('for', 'email-input');
      expect(input).toHaveAttribute('id', 'email-input');
    });
  });
});
