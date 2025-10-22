import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  describe('basic rendering', () => {
    it('should render an input element', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<Input placeholder="Enter your email" />);
      const input = screen.getByPlaceholderText('Enter your email');
      expect(input).toBeInTheDocument();
    });

    it('should render with default value', () => {
      render(<Input defaultValue="test@example.com" />);
      const input = screen.getByDisplayValue('test@example.com');
      expect(input).toBeInTheDocument();
    });

    it('should render with custom id', () => {
      render(<Input id="custom-id" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', 'custom-id');
    });

    it('should generate id when not provided', () => {
      render(<Input />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id');
      expect(input.id).toMatch(/^input-/);
    });
  });

  describe('input types', () => {
    it('should render email input type', () => {
      render(<Input type="email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should render password input type', () => {
      render(<Input type="password" />);
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it('should render number input type', () => {
      render(<Input type="number" />);
      const input = document.querySelector('input[type="number"]');
      expect(input).toBeInTheDocument();
    });

    it('should render search input type', () => {
      render(<Input type="search" />);
      const input = screen.getByRole('searchbox');
      expect(input).toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    it('should render small size', () => {
      render(<Input size="sm" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input.className).toContain('text-sm/6');
    });

    it('should render medium size by default', () => {
      render(<Input data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input.className).toContain('text-base/6');
    });

    it('should render large size', () => {
      render(<Input size="lg" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input.className).toContain('text-base/6');
    });
  });

  describe('states', () => {
    it('should render disabled state', () => {
      render(<Input disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should render readonly state', () => {
      render(<Input readOnly />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('readonly');
    });

    it('should render required state', () => {
      render(<Input required />);
      const input = screen.getByRole('textbox');
      expect(input).toBeRequired();
    });
  });

  describe('error state', () => {
    it('should apply error styles when error prop is true', () => {
      render(<Input error />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should display error message', () => {
      render(<Input error errorMessage="This field is required" />);
      const errorMessage = screen.getByText('This field is required');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage.className).toContain('text-danger');
    });

    it('should link error message with aria-describedby', () => {
      render(<Input id="test-input" error errorMessage="Error message" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-input-error');
      expect(screen.getByText('Error message')).toHaveAttribute('id', 'test-input-error');
    });

    it('should not display error message when error is false', () => {
      render(<Input errorMessage="This field is required" />);
      expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
    });
  });

  describe('labels', () => {
    it('should render with label', () => {
      render(<Input label="Email address" id="email" />);
      const label = screen.getByText('Email address');
      expect(label).toBeInTheDocument();
      expect(label.tagName).toBe('LABEL');
      expect(label).toHaveAttribute('for', 'email');
    });

    it('should render with inset label', () => {
      render(<Input insetLabel="Name" />);
      const label = screen.getByText('Name');
      expect(label).toBeInTheDocument();
      expect(label.className).toContain('text-xs');
    });

    it('should render with overlapping label', () => {
      render(<Input overlappingLabel="Name" />);
      const label = screen.getByText('Name');
      expect(label).toBeInTheDocument();
      expect(label.className).toContain('absolute');
      expect(label.className).toContain('-top-2');
    });
  });

  describe('helper text', () => {
    it('should display helper text', () => {
      render(<Input helperText="We'll never share your email" />);
      const helperText = screen.getByText("We'll never share your email");
      expect(helperText).toBeInTheDocument();
      expect(helperText.className).toContain('text-muted');
    });

    it('should prefer error message over helper text when error is true', () => {
      render(<Input error errorMessage="Error text" helperText="Helper text" />);
      expect(screen.getByText('Error text')).toBeInTheDocument();
      expect(screen.queryByText('Helper text')).not.toBeInTheDocument();
    });
  });

  describe('icons', () => {
    it('should render with leading icon', () => {
      const Icon = (): JSX.Element => <svg data-testid="leading-icon">Icon</svg>;
      render(<Input leadingIcon={<Icon />} />);
      expect(screen.getByTestId('leading-icon')).toBeInTheDocument();
    });

    it('should render with trailing icon', () => {
      const Icon = (): JSX.Element => <svg data-testid="trailing-icon">Icon</svg>;
      render(<Input trailingIcon={<Icon />} />);
      expect(screen.getByTestId('trailing-icon')).toBeInTheDocument();
    });

    it('should render with both leading and trailing icons', () => {
      const LeadingIcon = (): JSX.Element => <svg data-testid="leading-icon">Icon</svg>;
      const TrailingIcon = (): JSX.Element => <svg data-testid="trailing-icon">Icon</svg>;
      render(<Input leadingIcon={<LeadingIcon />} trailingIcon={<TrailingIcon />} />);
      expect(screen.getByTestId('leading-icon')).toBeInTheDocument();
      expect(screen.getByTestId('trailing-icon')).toBeInTheDocument();
    });
  });

  describe('add-ons', () => {
    it('should render with external leading add-on', () => {
      render(<Input leadingAddon={{ content: 'https://' }} />);
      expect(screen.getByText('https://')).toBeInTheDocument();
    });

    it('should render with external trailing add-on', () => {
      render(<Input trailingAddon={{ content: '@example.com' }} />);
      expect(screen.getByText('@example.com')).toBeInTheDocument();
    });

    it('should render with inline leading add-on', () => {
      render(<Input leadingAddonInline={{ content: '$' }} />);
      expect(screen.getByText('$')).toBeInTheDocument();
    });

    it('should render with inline trailing add-on', () => {
      render(<Input trailingAddonInline={{ content: 'USD' }} />);
      expect(screen.getByText('USD')).toBeInTheDocument();
    });

    it('should render with both inline add-ons', () => {
      render(<Input leadingAddonInline={{ content: '$' }} trailingAddonInline={{ content: 'USD' }} />);
      expect(screen.getByText('$')).toBeInTheDocument();
      expect(screen.getByText('USD')).toBeInTheDocument();
    });
  });

  describe('selects', () => {
    it('should render with leading select', () => {
      const options = [
        { value: 'us', label: 'US' },
        { value: 'ca', label: 'CA' },
      ];
      render(
        <Input
          leadingSelect={{
            id: 'country',
            name: 'country',
            options,
            'aria-label': 'Country',
          }}
        />
      );
      const select = screen.getByLabelText('Country');
      expect(select).toBeInTheDocument();
      expect(select.tagName).toBe('SELECT');
    });

    it('should render with trailing select', () => {
      const options = [
        { value: 'usd', label: 'USD' },
        { value: 'eur', label: 'EUR' },
      ];
      render(
        <Input
          trailingSelect={{
            id: 'currency',
            name: 'currency',
            options,
            'aria-label': 'Currency',
          }}
        />
      );
      const select = screen.getByLabelText('Currency');
      expect(select).toBeInTheDocument();
    });

    it('should call onChange when select value changes', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      const options = [
        { value: 'usd', label: 'USD' },
        { value: 'eur', label: 'EUR' },
      ];
      render(
        <Input
          trailingSelect={{
            id: 'currency',
            name: 'currency',
            options,
            onChange: handleChange,
            'aria-label': 'Currency',
          }}
        />
      );
      const select = screen.getByLabelText('Currency');
      await user.selectOptions(select, 'eur');
      expect(handleChange).toHaveBeenCalledWith('eur');
    });
  });

  describe('keyboard shortcut', () => {
    it('should render keyboard shortcut hint', () => {
      render(<Input keyboardShortcut="⌘K" />);
      expect(screen.getByText('⌘K')).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('should render default variant', () => {
      render(<Input variant="default" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input.className).toContain('outline-gray-300');
    });

    it('should render gray background variant', () => {
      render(<Input grayBackground data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input.className).toContain('bg-gray-50');
    });
  });

  describe('trailing button', () => {
    it('should render with trailing button', () => {
      render(
        <Input
          trailingButton={{
            variant: 'secondary',
            children: 'Sort',
          }}
        />
      );
      expect(screen.getByRole('button', { name: 'Sort' })).toBeInTheDocument();
    });

    it('should call button onClick when clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(
        <Input
          trailingButton={{
            variant: 'secondary',
            onClick: handleClick,
            children: 'Sort',
          }}
        />
      );
      const button = screen.getByRole('button', { name: 'Sort' });
      await user.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('user interactions', () => {
    it('should accept user input', async () => {
      const user = userEvent.setup();
      render(<Input placeholder="Enter text" />);
      const input = screen.getByPlaceholderText('Enter text');
      await user.type(input, 'test input');
      expect(input).toHaveValue('test input');
    });

    it('should call onChange handler', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} />);
      const input = screen.getByRole('textbox');
      await user.type(input, 'a');
      expect(handleChange).toHaveBeenCalled();
    });

    it('should not accept input when disabled', async () => {
      const user = userEvent.setup();
      render(<Input disabled defaultValue="" />);
      const input = screen.getByRole('textbox');
      await user.type(input, 'test');
      expect(input).toHaveValue('');
    });

    it('should not accept input when readonly', async () => {
      const user = userEvent.setup();
      render(<Input readOnly defaultValue="readonly" />);
      const input = screen.getByRole('textbox');
      await user.type(input, 'new text');
      // readonly inputs should not accept new input
      expect(input).toHaveValue('readonly');
    });
  });

  describe('accessibility', () => {
    it('should have proper aria attributes for error state', () => {
      render(<Input error errorMessage="Error message" id="test-input" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'test-input-error');
    });

    it('should associate label with input', () => {
      render(<Input label="Email" id="email-input" />);
      const label = screen.getByText('Email');
      const input = screen.getByRole('textbox');
      expect(label).toHaveAttribute('for', 'email-input');
      expect(input).toHaveAttribute('id', 'email-input');
    });

    it('should mark required inputs properly', () => {
      render(<Input required />);
      const input = screen.getByRole('textbox');
      expect(input).toBeRequired();
    });

    it('should apply aria-label to selects', () => {
      render(
        <Input
          leadingSelect={{
            id: 'country',
            name: 'country',
            options: [{ value: 'us', label: 'US' }],
            'aria-label': 'Select country',
          }}
        />
      );
      const select = screen.getByLabelText('Select country');
      expect(select).toHaveAttribute('aria-label', 'Select country');
    });
  });

  describe('className customization', () => {
    it('should accept custom className', () => {
      render(<Input className="custom-class" data-testid="input" />);
      const input = screen.getByTestId('input');
      expect(input.className).toContain('custom-class');
    });

    it('should accept wrapperClassName', () => {
      render(<Input wrapperClassName="wrapper-class" />);
      const wrapper = screen.getByRole('textbox').parentElement;
      expect(wrapper?.className).toContain('wrapper-class');
    });

    it('should accept labelClassName', () => {
      render(<Input label="Test" labelClassName="label-class" />);
      const label = screen.getByText('Test');
      expect(label.className).toContain('label-class');
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref to input element', () => {
      const ref = { current: null };
      render(<Input ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('should allow calling focus on forwarded ref', () => {
      const ref = { current: null };
      render(<Input ref={ref} />);
      (ref.current as HTMLInputElement | null)?.focus();
      expect(document.activeElement).toBe(ref.current);
    });
  });

  describe('form integration', () => {
    it('should have name attribute for form submission', () => {
      render(<Input name="email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('name', 'email');
    });

    it('should have value attribute for controlled input', () => {
      render(<Input value="controlled" onChange={() => {}} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('controlled');
    });

    it('should respect autoComplete attribute', () => {
      render(<Input autoComplete="email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('autocomplete', 'email');
    });
  });
});
