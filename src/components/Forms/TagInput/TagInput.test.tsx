import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagInput } from './TagInput';

describe('TagInput', () => {
  describe('tag addition', () => {
    it('should add a tag on Enter', async () => {
      const onTagsChange = vi.fn();
      render(<TagInput tags={[]} onTagsChange={onTagsChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'hello');
      await userEvent.keyboard('{Enter}');

      expect(onTagsChange).toHaveBeenCalledWith(['hello']);
    });

    it('should add a tag on comma', async () => {
      const onTagsChange = vi.fn();
      render(<TagInput tags={[]} onTagsChange={onTagsChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'hello');
      await userEvent.keyboard(',');

      expect(onTagsChange).toHaveBeenCalledWith(['hello']);
    });

    it('should add a tag on Tab', async () => {
      const onTagsChange = vi.fn();
      render(<TagInput tags={[]} onTagsChange={onTagsChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'hello');
      await userEvent.keyboard('{Tab}');

      expect(onTagsChange).toHaveBeenCalledWith(['hello']);
    });

    it('should trim whitespace from tags', async () => {
      const onTagsChange = vi.fn();
      render(<TagInput tags={[]} onTagsChange={onTagsChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '  hello  ');
      await userEvent.keyboard('{Enter}');

      expect(onTagsChange).toHaveBeenCalledWith(['hello']);
    });

    it('should split space-separated values on Enter', () => {
      const onTagsChange = vi.fn();
      render(<TagInput tags={[]} onTagsChange={onTagsChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '123 456 789' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onTagsChange).toHaveBeenCalledWith(['123', '456', '789']);
    });

    it('should split comma-separated values on Enter', () => {
      const onTagsChange = vi.fn();
      render(<TagInput tags={[]} onTagsChange={onTagsChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '123,456,789' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onTagsChange).toHaveBeenCalledWith(['123', '456', '789']);
    });

    it('should split mixed delimiters on Enter', () => {
      const onTagsChange = vi.fn();
      render(<TagInput tags={[]} onTagsChange={onTagsChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '123, 456 789' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onTagsChange).toHaveBeenCalledWith(['123', '456', '789']);
    });

    it('should not add empty tags', async () => {
      const onTagsChange = vi.fn();
      render(<TagInput tags={[]} onTagsChange={onTagsChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, '   ');
      await userEvent.keyboard('{Enter}');

      expect(onTagsChange).not.toHaveBeenCalled();
    });
  });

  describe('paste tokenization', () => {
    it('should split pasted text by commas and spaces', () => {
      const onTagsChange = vi.fn();
      render(<TagInput tags={[]} onTagsChange={onTagsChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.paste(input, {
        clipboardData: { getData: () => '123, 456, 789' },
      });

      expect(onTagsChange).toHaveBeenCalledWith(['123', '456', '789']);
    });

    it('should split pasted text by newlines', () => {
      const onTagsChange = vi.fn();
      render(<TagInput tags={[]} onTagsChange={onTagsChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.paste(input, {
        clipboardData: { getData: () => '123\n456\n789' },
      });

      expect(onTagsChange).toHaveBeenCalledWith(['123', '456', '789']);
    });

    it('should handle mixed delimiters in paste', () => {
      const onTagsChange = vi.fn();
      render(<TagInput tags={[]} onTagsChange={onTagsChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.paste(input, {
        clipboardData: { getData: () => '123, 456\n789 012' },
      });

      expect(onTagsChange).toHaveBeenCalledWith(['123', '456', '789', '012']);
    });
  });

  describe('duplicate prevention', () => {
    it('should not add duplicate tags (case-insensitive)', async () => {
      const onTagsChange = vi.fn();
      render(<TagInput tags={['hello']} onTagsChange={onTagsChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'HELLO');
      await userEvent.keyboard('{Enter}');

      expect(onTagsChange).not.toHaveBeenCalled();
    });

    it('should skip duplicates in pasted content', () => {
      const onTagsChange = vi.fn();
      render(<TagInput tags={['123']} onTagsChange={onTagsChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.paste(input, {
        clipboardData: { getData: () => '123, 456' },
      });

      expect(onTagsChange).toHaveBeenCalledWith(['123', '456']);
    });
  });

  describe('tag removal', () => {
    it('should remove last tag on Backspace when input is empty', async () => {
      const onTagsChange = vi.fn();
      render(<TagInput tags={['hello', 'world']} onTagsChange={onTagsChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.click(input);
      await userEvent.keyboard('{Backspace}');

      expect(onTagsChange).toHaveBeenCalledWith(['hello']);
    });

    it('should remove specific tag via Badge onRemove', async () => {
      const onTagsChange = vi.fn();
      render(<TagInput tags={['hello', 'world']} onTagsChange={onTagsChange} />);

      const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
      await userEvent.click(removeButtons[0]);

      expect(onTagsChange).toHaveBeenCalledWith(['world']);
    });
  });

  describe('onSubmit', () => {
    it('should call onSubmit on Enter when input is empty and tags exist', async () => {
      const onSubmit = vi.fn();
      render(<TagInput tags={['hello']} onTagsChange={vi.fn()} onSubmit={onSubmit} />);

      const input = screen.getByRole('textbox');
      await userEvent.click(input);
      await userEvent.keyboard('{Enter}');

      expect(onSubmit).toHaveBeenCalledOnce();
    });

    it('should not call onSubmit when there are no tags', async () => {
      const onSubmit = vi.fn();
      render(<TagInput tags={[]} onTagsChange={vi.fn()} onSubmit={onSubmit} />);

      const input = screen.getByRole('textbox');
      await userEvent.click(input);
      await userEvent.keyboard('{Enter}');

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should not call onSubmit when input has text', async () => {
      const onSubmit = vi.fn();
      const onTagsChange = vi.fn();
      render(<TagInput tags={['hello']} onTagsChange={onTagsChange} onSubmit={onSubmit} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'world');
      await userEvent.keyboard('{Enter}');

      expect(onSubmit).not.toHaveBeenCalled();
      expect(onTagsChange).toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('should disable the input when disabled', () => {
      render(<TagInput tags={[]} onTagsChange={vi.fn()} disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should not show remove buttons when disabled', () => {
      render(<TagInput tags={['hello']} onTagsChange={vi.fn()} disabled />);

      const removeButtons = screen.queryAllByRole('button', { name: 'Remove' });
      expect(removeButtons).toHaveLength(0);
    });
  });

  describe('blur tokenization', () => {
    it('should add tag on blur if input has text', () => {
      const onTagsChange = vi.fn();
      render(<TagInput tags={[]} onTagsChange={onTagsChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'hello' } });
      fireEvent.blur(input);

      expect(onTagsChange).toHaveBeenCalledWith(['hello']);
    });

    it('should split multiple values on blur', () => {
      const onTagsChange = vi.fn();
      render(<TagInput tags={[]} onTagsChange={onTagsChange} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '123 456, 789' } });
      fireEvent.blur(input);

      expect(onTagsChange).toHaveBeenCalledWith(['123', '456', '789']);
    });
  });

  describe('validation', () => {
    it('should pass tag value to validate function and render with color', () => {
      const validate = vi.fn().mockReturnValue({ valid: true, color: 'green' as const });
      render(<TagInput tags={['123']} onTagsChange={vi.fn()} validate={validate} />);

      expect(validate).toHaveBeenCalledWith('123');
      expect(screen.getByText('123')).toBeInTheDocument();
    });
  });

  describe('rendering', () => {
    it('should render label', () => {
      render(<TagInput tags={[]} onTagsChange={vi.fn()} label="Validators" />);

      expect(screen.getByText('Validators')).toBeInTheDocument();
    });

    it('should render placeholder when no tags', () => {
      render(<TagInput tags={[]} onTagsChange={vi.fn()} placeholder="Enter values..." />);

      expect(screen.getByPlaceholderText('Enter values...')).toBeInTheDocument();
    });

    it('should not render placeholder when tags exist', () => {
      render(<TagInput tags={['hello']} onTagsChange={vi.fn()} placeholder="Enter values..." />);

      expect(screen.queryByPlaceholderText('Enter values...')).not.toBeInTheDocument();
    });

    it('should render helper text', () => {
      render(<TagInput tags={[]} onTagsChange={vi.fn()} helperText="Some help" />);

      expect(screen.getByText('Some help')).toBeInTheDocument();
    });

    it('should render error message when error is true', () => {
      render(<TagInput tags={[]} onTagsChange={vi.fn()} error errorMessage="Something went wrong" />);

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should prioritize error message over helper text', () => {
      render(<TagInput tags={[]} onTagsChange={vi.fn()} error errorMessage="Error!" helperText="Helper" />);

      expect(screen.getByText('Error!')).toBeInTheDocument();
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
    });
  });
});
