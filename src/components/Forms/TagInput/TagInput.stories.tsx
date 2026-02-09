import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX, useState } from 'react';
import { TagInput } from './TagInput';
import type { TagInputProps, TagValidationResult } from './TagInput.types';

const meta = {
  title: 'Components/Forms/TagInput',
  component: TagInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-xs bg-surface p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TagInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Wrapper for interactive tag state */
function TagInputWrapper(
  props: Omit<TagInputProps, 'tags' | 'onTagsChange'> & { initialTags?: string[] }
): JSX.Element {
  const { initialTags = [], ...rest } = props;
  const [tags, setTags] = useState<string[]>(initialTags);
  return <TagInput tags={tags} onTagsChange={setTags} {...rest} />;
}

export const Default: Story = {
  args: {} as never,
  render: () => <TagInputWrapper label="Tags" placeholder="Type and press Enter..." />,
};

export const WithTags: Story = {
  args: {} as never,
  render: () => <TagInputWrapper label="Tags" initialTags={['react', 'typescript', 'tailwind']} />,
};

export const WithValidation: Story = {
  args: {} as never,
  render: () => {
    const validate = (value: string): TagValidationResult => {
      if (/^\d+$/.test(value)) return { valid: true, color: 'green' };
      if (value.startsWith('0x')) return { valid: true, color: 'indigo' };
      return { valid: false, color: 'red' };
    };

    return (
      <TagInputWrapper
        label="Validated Tags"
        placeholder="Try numbers, 0x... prefixed, or other text"
        initialTags={['123', '0xabc123', 'invalid']}
        validate={validate}
        helperText="Green = number, Indigo = hex prefix, Red = invalid"
      />
    );
  },
};

/** Regex for a valid BLS pubkey: 0x followed by exactly 96 hex characters */
const PUBKEY_REGEX = /^0x[0-9a-fA-F]{96}$/;

export const ValidatorExample: Story = {
  args: {} as never,
  render: () => {
    const validate = (value: string): TagValidationResult => {
      if (/^\d+$/.test(value) && parseInt(value, 10) >= 0) {
        return { valid: true, color: 'green' };
      }
      if (PUBKEY_REGEX.test(value)) {
        return { valid: true, color: 'indigo' };
      }
      return { valid: false, color: 'red' };
    };

    return (
      <TagInputWrapper
        label="Validators"
        placeholder="Enter validator indices or pubkeys..."
        initialTags={['123', '456', '0x' + 'ab'.repeat(48), 'not-a-validator']}
        validate={validate}
        helperText="Green = index, Indigo = pubkey, Red = invalid"
      />
    );
  },
};

export const Disabled: Story = {
  args: {} as never,
  render: () => <TagInputWrapper label="Disabled Input" initialTags={['locked', 'tags']} disabled />,
};

export const Error: Story = {
  args: {} as never,
  render: () => (
    <TagInputWrapper
      label="With Error"
      initialTags={['some-tag']}
      error
      errorMessage="At least one valid validator is required"
    />
  ),
};

export const ManyTags: Story = {
  args: {} as never,
  render: () => (
    <TagInputWrapper
      label="Many Tags (scrollable)"
      initialTags={Array.from({ length: 30 }, (_, i) => `validator-${i}`)}
    />
  ),
};

export const Empty: Story = {
  args: {} as never,
  render: () => (
    <TagInputWrapper
      label="Empty State"
      placeholder="Start typing to add tags..."
      helperText="Supports comma, space, and newline separated values"
    />
  ),
};
