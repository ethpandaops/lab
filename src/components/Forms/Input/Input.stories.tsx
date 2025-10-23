import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { EnvelopeIcon, MagnifyingGlassIcon, UsersIcon, BarsArrowUpIcon } from '@heroicons/react/20/solid';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { expect, userEvent, within, fn } from 'storybook/test';
import { Input } from './Input';
import { Button } from '@/components/Elements/Button';

const meta = {
  title: 'Components/Forms/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'The size of the input',
      table: {
        defaultValue: { summary: 'md' },
      },
    },
    error: {
      control: 'boolean',
      description: 'Whether the input has an error state',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    inline: {
      control: 'boolean',
      description: 'Make addons inline by default (inside border)',
      table: {
        defaultValue: { summary: 'false' },
      },
    },
    label: {
      control: 'text',
      description: 'Label text for the input',
    },
    labelVariant: {
      control: 'select',
      options: ['standard', 'inset', 'overlapping'],
      description: 'Label positioning variant',
      table: {
        defaultValue: { summary: 'standard' },
      },
    },
    helperText: {
      control: 'text',
      description: 'Helper text displayed below the input',
    },
    errorMessage: {
      control: 'text',
      description: 'Error message to display below the input',
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic input field with label
 */
export const Basic: Story = {
  args: {},
  render: () => (
    <div className="flex flex-col gap-4">
      <Input label="Email address" size="sm">
        <Input.Field type="email" placeholder="you@example.com" />
      </Input>
      <Input label="Email address" size="md">
        <Input.Field type="email" placeholder="you@example.com" />
      </Input>
      <Input label="Email address" size="lg">
        <Input.Field type="email" placeholder="you@example.com" />
      </Input>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Test basic rendering
    const inputs = canvas.getAllByRole('textbox');
    await expect(inputs).toHaveLength(3);

    // Test placeholder
    await expect(inputs[0]).toHaveAttribute('placeholder', 'you@example.com');

    // Test email type
    await expect(inputs[0]).toHaveAttribute('type', 'email');

    // Test labels
    const labels = canvas.getAllByText('Email address');
    await expect(labels).toHaveLength(3);

    // Test size classes
    await expect(inputs[0]).toHaveClass('text-sm/6'); // small
    await expect(inputs[1]).toHaveClass('text-base/6'); // medium
    await expect(inputs[2]).toHaveClass('text-base/6'); // large

    // Test that inputs have IDs
    inputs.forEach(input => {
      expect(input).toHaveAttribute('id');
      expect(input.id).toBeTruthy();
    });
  },
};

/**
 * Basic input with icon in different sizes
 */
export const WithIcon: Story = {
  args: {},
  render: () => (
    <div className="flex flex-col gap-4">
      <Input label="Email address" size="sm">
        <Input.Leading>
          <EnvelopeIcon />
        </Input.Leading>
        <Input.Field type="email" placeholder="you@example.com" />
      </Input>
      <Input label="Email address" size="md">
        <Input.Leading>
          <EnvelopeIcon />
        </Input.Leading>
        <Input.Field type="email" placeholder="you@example.com" />
      </Input>
      <Input label="Email address" size="lg">
        <Input.Leading>
          <EnvelopeIcon />
        </Input.Leading>
        <Input.Field type="email" placeholder="you@example.com" />
      </Input>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Test that all inputs render correctly
    const inputs = canvas.getAllByRole('textbox');
    await expect(inputs).toHaveLength(3);

    // Test that labels are present
    const labels = canvas.getAllByText('Email address');
    await expect(labels).toHaveLength(3);

    // Icons are decorative (aria-hidden), so not directly testable
    // Visual inspection in Storybook confirms proper rendering
  },
};

/**
 * Input with trailing icon
 */
export const WithTrailingIcon: Story = {
  args: {},
  render: () => (
    <div className="flex flex-col gap-4">
      <Input label="Email address" size="sm">
        <Input.Field type="email" placeholder="you@example.com" />
        <Input.Trailing>
          <EnvelopeIcon />
        </Input.Trailing>
      </Input>
      <Input label="Email address" size="md">
        <Input.Field type="email" placeholder="you@example.com" />
        <Input.Trailing>
          <EnvelopeIcon />
        </Input.Trailing>
      </Input>
      <Input label="Email address" size="lg">
        <Input.Field type="email" placeholder="you@example.com" />
        <Input.Trailing>
          <EnvelopeIcon />
        </Input.Trailing>
      </Input>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Test that inputs render correctly
    const inputs = canvas.getAllByRole('textbox');
    await expect(inputs).toHaveLength(3);

    // Test that labels are present
    const labels = canvas.getAllByText('Email address');
    await expect(labels).toHaveLength(3);

    // Trailing icons are decorative (aria-hidden)
    // Visual inspection in Storybook confirms proper rendering
  },
};

/**
 * Inline addons (inside the border)
 */
export const InlineAddons: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input label="Price" inline size="sm">
        <Input.Leading>$</Input.Leading>
        <Input.Field type="text" placeholder="0.00" />
        <Input.Trailing>USD</Input.Trailing>
      </Input>
      <Input label="Price" inline size="md">
        <Input.Leading>$</Input.Leading>
        <Input.Field type="text" placeholder="0.00" />
        <Input.Trailing>USD</Input.Trailing>
      </Input>
      <Input label="Price" inline size="lg">
        <Input.Leading>$</Input.Leading>
        <Input.Field type="text" placeholder="0.00" />
        <Input.Trailing>USD</Input.Trailing>
      </Input>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Test inline leading addon
    const leadingAddons = canvas.getAllByText('$');
    await expect(leadingAddons).toHaveLength(3);

    // Test inline trailing addon
    const trailingAddons = canvas.getAllByText('USD');
    await expect(trailingAddons).toHaveLength(3);

    // Test that addons have proper inline styling
    leadingAddons.forEach(addon => {
      expect(addon).toHaveClass('text-gray-500');
    });
  },
};

/**
 * External addons (outside the border)
 */
export const ExternalAddons: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input label="Website" size="sm">
        <Input.Leading>https://</Input.Leading>
        <Input.Field type="text" placeholder="www.example.com" />
      </Input>
      <Input label="Website" size="md">
        <Input.Leading>https://</Input.Leading>
        <Input.Field type="text" placeholder="www.example.com" />
      </Input>
      <Input label="Website" size="lg">
        <Input.Leading>https://</Input.Leading>
        <Input.Field type="text" placeholder="www.example.com" />
      </Input>
    </div>
  ),
};

/**
 * Input with trailing button
 */
export const WithButton: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input label="Search" size="sm">
        <Input.Leading>
          <UsersIcon />
        </Input.Leading>
        <Input.Field type="text" placeholder="Search..." />
        <Input.Trailing>
          <Button variant="secondary" leadingIcon={<BarsArrowUpIcon />}>
            Sort
          </Button>
        </Input.Trailing>
      </Input>
      <Input label="Search" size="md">
        <Input.Leading>
          <UsersIcon />
        </Input.Leading>
        <Input.Field type="text" placeholder="Search..." />
        <Input.Trailing>
          <Button variant="secondary" leadingIcon={<BarsArrowUpIcon />}>
            Sort
          </Button>
        </Input.Trailing>
      </Input>
      <Input label="Search" size="lg">
        <Input.Leading>
          <UsersIcon />
        </Input.Leading>
        <Input.Field type="text" placeholder="Search..." />
        <Input.Trailing>
          <Button variant="secondary" leadingIcon={<BarsArrowUpIcon />}>
            Sort
          </Button>
        </Input.Trailing>
      </Input>
    </div>
  ),
};

/**
 * Input in error state
 */
export const WithError: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input label="Email address" error errorMessage="Please enter a valid email" size="sm">
        <Input.Leading>
          <EnvelopeIcon />
        </Input.Leading>
        <Input.Field type="email" placeholder="you@example.com" defaultValue="invalid" />
      </Input>
      <Input label="Email address" error errorMessage="Please enter a valid email" size="md">
        <Input.Leading>
          <EnvelopeIcon />
        </Input.Leading>
        <Input.Field type="email" placeholder="you@example.com" defaultValue="invalid" />
      </Input>
      <Input label="Email address" error errorMessage="Please enter a valid email" size="lg">
        <Input.Leading>
          <EnvelopeIcon />
        </Input.Leading>
        <Input.Field type="email" placeholder="you@example.com" defaultValue="invalid" />
      </Input>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Test error state rendering
    const inputs = canvas.getAllByRole('textbox');
    inputs.forEach(input => {
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    // Test error message display
    const errorMessages = canvas.getAllByText('Please enter a valid email');
    await expect(errorMessages).toHaveLength(3);

    // Test error message styling
    errorMessages.forEach(msg => {
      expect(msg).toHaveClass('text-danger');
    });

    // Test aria-describedby for accessibility
    inputs.forEach(input => {
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      expect(describedBy).toContain('-error');
    });
  },
};

/**
 * Input with corner hint (e.g., "Optional", "Required")
 */
export const WithCornerHint: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input label="Email address" cornerHint="Optional" size="sm">
        <Input.Leading>
          <EnvelopeIcon />
        </Input.Leading>
        <Input.Field type="email" placeholder="you@example.com" />
      </Input>
      <Input label="Email address" cornerHint="Optional" size="md">
        <Input.Leading>
          <EnvelopeIcon />
        </Input.Leading>
        <Input.Field type="email" placeholder="you@example.com" />
      </Input>
      <Input label="Email address" cornerHint="Optional" size="lg">
        <Input.Leading>
          <EnvelopeIcon />
        </Input.Leading>
        <Input.Field type="email" placeholder="you@example.com" />
      </Input>
    </div>
  ),
};

/**
 * Input with helper text
 */
export const WithHelperText: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input label="Email address" helperText="We'll never share your email" size="sm">
        <Input.Leading>
          <EnvelopeIcon />
        </Input.Leading>
        <Input.Field type="email" placeholder="you@example.com" />
      </Input>
      <Input label="Email address" helperText="We'll never share your email" size="md">
        <Input.Leading>
          <EnvelopeIcon />
        </Input.Leading>
        <Input.Field type="email" placeholder="you@example.com" />
      </Input>
      <Input label="Email address" helperText="We'll never share your email" size="lg">
        <Input.Leading>
          <EnvelopeIcon />
        </Input.Leading>
        <Input.Field type="email" placeholder="you@example.com" />
      </Input>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Test helper text display
    const helperTexts = canvas.getAllByText("We'll never share your email");
    await expect(helperTexts).toHaveLength(3);

    // Test helper text styling (not error)
    helperTexts.forEach(text => {
      expect(text).toHaveClass('text-muted');
      expect(text).not.toHaveClass('text-danger');
    });
  },
};

/**
 * Input with inset label
 */
export const InsetLabel: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input label="Name" labelVariant="inset" size="sm">
        <Input.Field type="text" placeholder="Jane Smith" />
      </Input>
      <Input label="Name" labelVariant="inset" size="md">
        <Input.Field type="text" placeholder="Jane Smith" />
      </Input>
      <Input label="Name" labelVariant="inset" size="lg">
        <Input.Field type="text" placeholder="Jane Smith" />
      </Input>
    </div>
  ),
};

/**
 * Input with overlapping label
 */
export const OverlappingLabel: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input label="Name" labelVariant="overlapping" size="sm">
        <Input.Field type="text" placeholder="Jane Smith" />
      </Input>
      <Input label="Name" labelVariant="overlapping" size="md">
        <Input.Field type="text" placeholder="Jane Smith" />
      </Input>
      <Input label="Name" labelVariant="overlapping" size="lg">
        <Input.Field type="text" placeholder="Jane Smith" />
      </Input>
    </div>
  ),
};

/**
 * Disabled state
 */
export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input label="Email address" size="sm">
        <Input.Field type="email" defaultValue="user@example.com" disabled />
      </Input>
      <Input label="Email address" size="md">
        <Input.Field type="email" defaultValue="user@example.com" disabled />
      </Input>
      <Input label="Email address" size="lg">
        <Input.Field type="email" defaultValue="user@example.com" disabled />
      </Input>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Test disabled state
    const inputs = canvas.getAllByRole('textbox');
    inputs.forEach(input => {
      expect(input).toBeDisabled();
      expect(input).toHaveValue('user@example.com');
    });
  },
};

/**
 * Read-only state
 */
export const ReadOnly: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input label="Email address" size="sm">
        <Input.Field type="email" defaultValue="user@example.com" readOnly />
      </Input>
      <Input label="Email address" size="md">
        <Input.Field type="email" defaultValue="user@example.com" readOnly />
      </Input>
      <Input label="Email address" size="lg">
        <Input.Field type="email" defaultValue="user@example.com" readOnly />
      </Input>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Test readonly state
    const inputs = canvas.getAllByRole('textbox');
    inputs.forEach(input => {
      expect(input).toHaveAttribute('readonly');
      expect(input).toHaveValue('user@example.com');
    });
  },
};

/**
 * User Interactions - Tests onChange, onBlur, onFocus events
 */
export const UserInteractions: Story = {
  render: function InteractionsExample() {
    const handleChange = fn();
    const handleBlur = fn();
    const handleFocus = fn();

    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
          <strong>Interaction Testing:</strong> This story tests onChange, onBlur, and onFocus events. Open the
          Interactions panel to see event handlers being called.
        </div>
        <Input label="Email address">
          <Input.Leading>
            <EnvelopeIcon />
          </Input.Leading>
          <Input.Field
            type="email"
            placeholder="you@example.com"
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
          />
        </Input>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const user = userEvent.setup();

    const input = canvas.getByRole('textbox');

    // Test onFocus event
    await user.click(input);
    await expect(input).toHaveFocus();

    // Test onChange event
    await user.type(input, 'test@example.com');
    await expect(input).toHaveValue('test@example.com');

    // Test onBlur event
    await user.tab();
    await expect(input).not.toHaveFocus();
  },
};

/**
 * Input Types - Tests different HTML input types (password, number, search)
 */
export const InputTypes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
        <strong>Input Types:</strong> Testing different HTML input types with proper attributes.
      </div>
      <Input label="Password">
        <Input.Field type="password" placeholder="Enter password" data-testid="password-input" />
      </Input>
      <Input label="Number">
        <Input.Field type="number" placeholder="Enter number" data-testid="number-input" />
      </Input>
      <Input label="Search">
        <Input.Field type="search" placeholder="Search..." data-testid="search-input" />
      </Input>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Test password type
    const passwordInput = canvas.getByTestId('password-input');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Test number type
    const numberInput = canvas.getByTestId('number-input');
    await expect(numberInput).toHaveAttribute('type', 'number');

    // Test search type (has searchbox role)
    const searchInput = canvas.getByRole('searchbox');
    await expect(searchInput).toBeInTheDocument();
  },
};

/**
 * Kitchen sink - all features combined
 */
export const KitchenSink: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <Input label="Email with icon">
        <Input.Leading>
          <EnvelopeIcon />
        </Input.Leading>
        <Input.Field type="email" placeholder="you@example.com" />
      </Input>

      <Input label="Price with inline addons" inline>
        <Input.Leading>$</Input.Leading>
        <Input.Field type="text" placeholder="0.00" />
        <Input.Trailing>USD</Input.Trailing>
      </Input>

      <Input label="Website with external addon">
        <Input.Leading>https://</Input.Leading>
        <Input.Field type="text" placeholder="www.example.com" />
      </Input>

      <Input label="Search with button and icon">
        <Input.Leading>
          <MagnifyingGlassIcon />
        </Input.Leading>
        <Input.Field type="text" placeholder="Search..." />
        <Input.Trailing>
          <Button variant="primary">Search</Button>
        </Input.Trailing>
      </Input>

      <Input label="Error state" error errorMessage="This field is required">
        <Input.Leading>
          <EnvelopeIcon />
        </Input.Leading>
        <Input.Field type="email" placeholder="you@example.com" />
      </Input>

      <Input label="Inset label" labelVariant="inset">
        <Input.Field type="text" placeholder="Jane Smith" />
      </Input>

      <Input label="Overlapping label" labelVariant="overlapping">
        <Input.Field type="text" placeholder="Jane Smith" />
      </Input>
    </div>
  ),
};

/**
 * Form example with multiple inputs
 */
export const FormExample: Story = {
  render: () => (
    <form className="flex flex-col gap-4">
      <Input label="Full name" helperText="Enter your full legal name" required>
        <Input.Field type="text" placeholder="Jane Smith" />
      </Input>

      <Input label="Email address" required>
        <Input.Leading>
          <EnvelopeIcon />
        </Input.Leading>
        <Input.Field type="email" placeholder="you@example.com" />
      </Input>

      <Input label="Website" helperText="Your personal or company website">
        <Input.Leading>https://</Input.Leading>
        <Input.Field type="text" placeholder="www.example.com" />
      </Input>

      <Input label="Search">
        <Input.Leading>
          <MagnifyingGlassIcon />
        </Input.Leading>
        <Input.Field type="text" placeholder="Search..." />
        <Input.Trailing>
          <Button variant="primary">Search</Button>
        </Input.Trailing>
      </Input>
    </form>
  ),
};

/**
 * React Hook Form Integration with Zod
 *
 * Example showing how to integrate with react-hook-form and Zod for type-safe validation.
 * This pattern provides automatic validation, error handling, and form state management.
 *
 * **Installation (if using Zod resolver):**
 * ```bash
 * pnpm add @hookform/resolvers
 * ```
 *
 * @example
 * ```tsx
 * import { useForm } from 'react-hook-form';
 * import { z } from 'zod';
 * import { zodResolver } from '@hookform/resolvers/zod';
 *
 * const schema = z.object({
 *   email: z.string().email('Invalid email address'),
 *   username: z.string().min(3, 'Username must be at least 3 characters'),
 * });
 *
 * type FormData = z.infer<typeof schema>;
 *
 * function MyForm() {
 *   const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
 *     resolver: zodResolver(schema),
 *   });
 *
 *   const onSubmit = (data: FormData) => {
 *     console.log(data);
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit(onSubmit)}>
 *       <Input
 *         label="Email"
 *         error={!!errors.email}
 *         errorMessage={errors.email?.message}
 *         required
 *       >
 *         <Input.Leading><EnvelopeIcon /></Input.Leading>
 *         <Input.Field
 *           type="email"
 *           inputMode="email"
 *           {...register('email')}
 *         />
 *       </Input>
 *     </form>
 *   );
 * }
 * ```
 */
export const ReactHookFormIntegration: Story = {
  render: function ReactHookFormExample() {
    // Define validation schema with Zod
    const formSchema = z.object({
      email: z.string().min(1, 'Email is required').email('Invalid email address'),
      username: z
        .string()
        .min(1, 'Username is required')
        .min(3, 'Username must be at least 3 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
      phone: z
        .string()
        .min(1, 'Phone is required')
        .regex(/^\d{10}$/, 'Phone must be exactly 10 digits')
        .transform(val => val.replace(/\D/g, '')),
      company: z.string().optional(), // Optional field
    });

    type FormData = z.infer<typeof formSchema>;

    const [submitted, setSubmitted] = React.useState(false);
    const [submittedData, setSubmittedData] = React.useState<FormData | null>(null);

    // Manual Zod validation (alternative to @hookform/resolvers)
    const {
      register,
      handleSubmit,
      formState: { errors, isSubmitting, isValid, isDirty, touchedFields },
      trigger,
    } = useForm<FormData>({
      mode: 'onTouched', // Validate on touch/blur
      defaultValues: {
        email: '',
        username: '',
        phone: '',
        company: '',
      },
      // Manual Zod resolver
      resolver: async data => {
        try {
          const validData = formSchema.parse(data);
          return { values: validData, errors: {} };
        } catch (error) {
          if (error instanceof z.ZodError) {
            return {
              values: {},
              errors: error.issues.reduce(
                (acc, issue) => {
                  const path = issue.path[0] as string;
                  acc[path] = { type: 'validation', message: issue.message };
                  return acc;
                },
                {} as Record<string, { type: string; message: string }>
              ),
            };
          }
          return { values: {}, errors: {} };
        }
      },
    });

    const onSubmit = (data: FormData): void => {
      // Show submission feedback instead of actually submitting
      setSubmittedData(data);
      setSubmitted(true);

      // Reset feedback after 5 seconds
      setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    };

    const isFormValid = isValid && isDirty;

    return (
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="mb-4 rounded-md bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
          <strong>React Hook Form + Zod:</strong> This example uses react-hook-form with Zod validation. The submit
          button is disabled until all required fields are valid. Try filling out the form to see validation in action.
        </div>

        {submitted && submittedData && (
          <div className="rounded-md bg-green-50 p-4 text-sm text-green-900 dark:bg-green-900/20 dark:text-green-200">
            <strong>✅ Form Submitted Successfully!</strong>
            <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(submittedData, null, 2)}</pre>
          </div>
        )}

        <Input
          label="Email address"
          error={!!errors.email}
          errorMessage={errors.email?.message}
          required
          cornerHint={touchedFields.email && !errors.email ? '✓ Valid' : undefined}
        >
          <Input.Leading type="icon">
            <EnvelopeIcon />
          </Input.Leading>
          <Input.Field
            type="email"
            inputMode="email"
            placeholder="you@example.com"
            {...register('email')}
            onBlur={() => trigger('email')}
          />
        </Input>

        <Input
          label="Username"
          error={!!errors.username}
          errorMessage={errors.username?.message}
          helperText="3+ characters, letters, numbers, and underscores only"
          required
          cornerHint={touchedFields.username && !errors.username ? '✓ Valid' : undefined}
        >
          <Input.Leading type="icon">
            <UsersIcon />
          </Input.Leading>
          <Input.Field type="text" placeholder="johndoe" {...register('username')} onBlur={() => trigger('username')} />
        </Input>

        <Input
          label="Phone number"
          error={!!errors.phone}
          errorMessage={errors.phone?.message}
          helperText="10 digits, formatting will be removed"
          required
          cornerHint={touchedFields.phone && !errors.phone ? '✓ Valid' : undefined}
        >
          <Input.Field
            type="tel"
            inputMode="tel"
            placeholder="(555) 123-4567"
            {...register('phone')}
            onBlur={() => trigger('phone')}
          />
        </Input>

        <Input
          label="Company"
          error={!!errors.company}
          errorMessage={errors.company?.message}
          helperText="Your company or organization name"
          cornerHint="Optional"
        >
          <Input.Field type="text" placeholder="Acme Inc." {...register('company')} />
        </Input>

        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" disabled={!isFormValid || isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
          {!isFormValid && isDirty && (
            <span className="text-sm text-muted">Please fill all required fields correctly</span>
          )}
          {isFormValid && <span className="text-sm text-green-600 dark:text-green-400">✓ Form is ready to submit</span>}
        </div>
      </form>
    );
  },
};

/**
 * Error Handling Patterns
 *
 * Guidelines for when to use different error handling approaches:
 *
 * 1. **Inline Validation (error + errorMessage props)**
 *    - Use for: Real-time validation, form submission errors
 *    - When: Field loses focus (onBlur) or form is submitted
 *    - Best for: Individual field validation
 *
 * 2. **Helper Text (helperText prop)**
 *    - Use for: Guidance, format hints, character counts
 *    - When: No error state, providing helpful context
 *    - Best for: User assistance, not for errors
 *
 * 3. **Corner Hints (cornerHint prop)**
 *    - Use for: Optional/required indicators, character limits
 *    - When: Space-constrained layouts
 *    - Best for: Field metadata
 *
 * @example
 * ```tsx
 * // Pattern 1: Validation error (use error + errorMessage)
 * <Input
 *   label="Email"
 *   error={!!errors.email}
 *   errorMessage={errors.email?.message}
 * >
 *   <Input.Field {...register('email')} />
 * </Input>
 *
 * // Pattern 2: Helpful guidance (use helperText)
 * <Input
 *   label="Password"
 *   helperText="Must be at least 8 characters with 1 number and 1 special character"
 * >
 *   <Input.Field type="password" />
 * </Input>
 *
 * // Pattern 3: Optional field indicator (use cornerHint)
 * <Input label="Middle name" cornerHint="Optional">
 *   <Input.Field type="text" />
 * </Input>
 * ```
 */
export const ErrorHandlingPatterns: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
        <strong>Error Handling Best Practices:</strong>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Use error + errorMessage for validation failures</li>
          <li>Use helperText for guidance and format hints</li>
          <li>Use cornerHint for optional/required indicators</li>
          <li>Validate on blur, not on every keystroke (better UX)</li>
          <li>Clear errors when user starts typing again</li>
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">1. Validation Error (Red border, error message)</h3>
        <Input label="Email address" error errorMessage="Please enter a valid email address" required>
          <Input.Leading type="icon">
            <EnvelopeIcon />
          </Input.Leading>
          <Input.Field type="email" placeholder="you@example.com" defaultValue="invalid-email" />
        </Input>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">2. Helper Text (Guidance, no error)</h3>
        <Input label="Password" helperText="Must be at least 8 characters with 1 number and 1 special character">
          <Input.Field type="password" placeholder="Enter password" />
        </Input>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">3. Corner Hint (Optional field indicator)</h3>
        <Input label="Middle name" cornerHint="Optional">
          <Input.Field type="text" placeholder="Optional middle name" />
        </Input>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">4. Combined: Required with character limit</h3>
        <Input label="Bio" cornerHint="Max 160 chars" helperText="Tell us about yourself" required>
          <Input.Field type="text" placeholder="I'm a developer who..." maxLength={160} />
        </Input>
      </div>
    </div>
  ),
};

/**
 * Custom Validation Examples
 *
 * Common validation patterns and their implementations:
 *
 * 1. **Email Validation**
 *    - Pattern: RFC 5322 simplified regex
 *    - inputMode: "email" for mobile keyboards
 *
 * 2. **Phone Validation**
 *    - Pattern: Flexible formatting (allow spaces, dashes, parens)
 *    - inputMode: "tel" for numeric keyboard
 *
 * 3. **Numeric Validation**
 *    - Pattern: Allow only numbers and decimals
 *    - inputMode: "numeric" or "decimal"
 *
 * 4. **URL Validation**
 *    - Pattern: Basic URL structure
 *    - inputMode: "url" for URL keyboard
 *
 * @example
 * ```tsx
 * // Email validation with Zod
 * const emailSchema = z.string().email('Invalid email');
 *
 * // Phone validation (US format)
 * const phoneSchema = z.string().regex(
 *   /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
 *   'Invalid phone number'
 * );
 *
 * // URL validation
 * const urlSchema = z.string().url('Invalid URL');
 *
 * // Currency validation (positive numbers only)
 * const priceSchema = z.string().regex(
 *   /^\d+(\.\d{1,2})?$/,
 *   'Invalid price format'
 * );
 * ```
 */
export const CustomValidationExamples: Story = {
  render: () => {
    const [values, setValues] = React.useState({
      email: '',
      phone: '',
      price: '',
      url: '',
    });
    const [errors, setErrors] = React.useState<Record<string, string>>({});

    const validators = {
      email: (val: string) => {
        if (!val) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Invalid email format';
        return '';
      },
      phone: (val: string) => {
        if (!val) return 'Phone is required';
        const cleaned = val.replace(/\D/g, '');
        if (cleaned.length !== 10) return 'Phone must be 10 digits';
        return '';
      },
      price: (val: string) => {
        if (!val) return 'Price is required';
        if (!/^\d+(\.\d{1,2})?$/.test(val)) return 'Invalid price format (e.g., 10.99)';
        if (parseFloat(val) < 0) return 'Price must be positive';
        return '';
      },
      url: (val: string) => {
        if (!val) return 'URL is required';
        try {
          new URL(val);
          return '';
        } catch {
          return 'Invalid URL format';
        }
      },
    };

    const handleBlur = (field: keyof typeof values): void => {
      const error = validators[field](values[field]);
      setErrors(prev => ({ ...prev, [field]: error }));
    };

    const handleChange = (field: keyof typeof values, value: string): void => {
      setValues(prev => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    };

    return (
      <div className="flex flex-col gap-6">
        <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
          <strong>Custom Validation Patterns:</strong> These examples show common validation scenarios with appropriate
          inputMode for better mobile UX. Try filling out the fields to see validation in action.
        </div>

        <Input
          label="Email address"
          error={!!errors.email}
          errorMessage={errors.email}
          helperText="Format: user@example.com"
          required
        >
          <Input.Leading type="icon">
            <EnvelopeIcon />
          </Input.Leading>
          <Input.Field
            type="email"
            inputMode="email"
            placeholder="you@example.com"
            value={values.email}
            onChange={e => handleChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
          />
        </Input>

        <Input
          label="Phone number"
          error={!!errors.phone}
          errorMessage={errors.phone}
          helperText="Format: (555) 123-4567 or 5551234567"
          required
        >
          <Input.Field
            type="tel"
            inputMode="tel"
            placeholder="(555) 123-4567"
            value={values.phone}
            onChange={e => handleChange('phone', e.target.value)}
            onBlur={() => handleBlur('phone')}
          />
        </Input>

        <Input
          label="Price"
          error={!!errors.price}
          errorMessage={errors.price}
          helperText="Format: 10.99 (up to 2 decimal places)"
          inline
          required
        >
          <Input.Leading type="text">$</Input.Leading>
          <Input.Field
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={values.price}
            onChange={e => handleChange('price', e.target.value)}
            onBlur={() => handleBlur('price')}
          />
          <Input.Trailing type="text">USD</Input.Trailing>
        </Input>

        <Input
          label="Website URL"
          error={!!errors.url}
          errorMessage={errors.url}
          helperText="Format: https://example.com"
          required
        >
          <Input.Leading type="text">https://</Input.Leading>
          <Input.Field
            type="url"
            inputMode="url"
            placeholder="www.example.com"
            value={values.url}
            onChange={e => handleChange('url', e.target.value)}
            onBlur={() => handleBlur('url')}
          />
        </Input>
      </div>
    );
  },
};
