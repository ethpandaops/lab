import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { RadioGroup } from './RadioGroup';

const meta: Meta<typeof RadioGroup> = {
  title: 'Components/Forms/RadioGroup',
  component: RadioGroup,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="min-w-80 rounded-lg bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof RadioGroup>;

// Simple List
export const SimpleList: Story = {
  render: () => {
    const [value, setValue] = useState('email');
    return (
      <RadioGroup
        name="notification-method"
        variant="simple-list"
        legend="Notifications"
        description="How do you prefer to receive notifications?"
        value={value}
        onChange={setValue}
        options={[
          { id: 'email', name: 'Email' },
          { id: 'sms', name: 'Phone (SMS)' },
          { id: 'push', name: 'Push notification' },
        ]}
      />
    );
  },
};

// Simple Inline List
export const SimpleInline: Story = {
  render: () => {
    const [value, setValue] = useState('email');
    return (
      <RadioGroup
        name="notification-method-inline"
        variant="simple-inline"
        legend="Notifications"
        description="How do you prefer to receive notifications?"
        value={value}
        onChange={setValue}
        options={[
          { id: 'email', name: 'Email' },
          { id: 'sms', name: 'Phone (SMS)' },
          { id: 'push', name: 'Push notification' },
        ]}
      />
    );
  },
};

// List with Description
export const DescriptionList: Story = {
  render: () => {
    const [value, setValue] = useState('small');
    return (
      <RadioGroup
        name="plan-description"
        variant="description-list"
        aria-label="Plan"
        value={value}
        onChange={setValue}
        options={[
          {
            id: 'small',
            name: 'Small',
            description: '4 GB RAM / 2 CPUS / 80 GB SSD Storage',
          },
          {
            id: 'medium',
            name: 'Medium',
            description: '8 GB RAM / 4 CPUS / 160 GB SSD Storage',
          },
          {
            id: 'large',
            name: 'Large',
            description: '16 GB RAM / 8 CPUS / 320 GB SSD Storage',
          },
        ]}
      />
    );
  },
};

// List with Inline Description
export const InlineDescriptionList: Story = {
  render: () => {
    const [value, setValue] = useState('small');
    return (
      <RadioGroup
        name="plan-inline-description"
        variant="inline-description-list"
        aria-label="Plan"
        value={value}
        onChange={setValue}
        options={[
          {
            id: 'small',
            name: 'Small',
            description: '4 GB RAM / 2 CPUS / 80 GB SSD Storage',
          },
          {
            id: 'medium',
            name: 'Medium',
            description: '8 GB RAM / 4 CPUS / 160 GB SSD Storage',
          },
          {
            id: 'large',
            name: 'Large',
            description: '16 GB RAM / 8 CPUS / 320 GB SSD Storage',
          },
        ]}
      />
    );
  },
};

// List with Radio on Right
export const RightRadioList: Story = {
  render: () => {
    const [value, setValue] = useState('checking');
    return (
      <RadioGroup
        name="account"
        variant="right-radio-list"
        legend="Transfer funds"
        description="Transfer your balance to your bank account."
        value={value}
        onChange={setValue}
        options={[
          {
            id: 'checking',
            name: 'Checking',
            description: 'CIBC ••••6610',
          },
          {
            id: 'savings',
            name: 'Savings',
            description: 'Bank of America ••••0149',
          },
          {
            id: 'mastercard',
            name: 'Mastercard',
            description: 'Capital One ••••7877',
          },
        ]}
      />
    );
  },
};

// Simple List with Radio on Right
export const SimpleRightRadioList: Story = {
  render: () => {
    const [value, setValue] = useState('null');
    return (
      <RadioGroup
        name="side"
        variant="simple-right-radio-list"
        legend="Select a side"
        value={value}
        onChange={setValue}
        options={[
          { id: 'null', name: 'None' },
          { id: '1', name: 'Baked beans' },
          { id: '2', name: 'Coleslaw' },
          { id: '3', name: 'French fries' },
          { id: '4', name: 'Garden salad' },
          { id: '5', name: 'Mashed potatoes' },
        ]}
      />
    );
  },
};

// Simple Table
export const Table: Story = {
  render: () => {
    const [value, setValue] = useState('startup');
    return (
      <RadioGroup
        name="pricing-plan"
        variant="table"
        aria-label="Pricing plans"
        value={value}
        onChange={setValue}
        options={[
          {
            id: 'startup',
            name: 'Startup',
            extraInfo: '$29 / mo',
            description: '$290 / yr',
            additionalInfo: 'Up to 5 active job postings',
          },
          {
            id: 'business',
            name: 'Business',
            extraInfo: '$99 / mo',
            description: '$990 / yr',
            additionalInfo: 'Up to 25 active job postings',
          },
          {
            id: 'enterprise',
            name: 'Enterprise',
            extraInfo: '$249 / mo',
            description: '$2490 / yr',
            additionalInfo: 'Unlimited active job postings',
          },
        ]}
      />
    );
  },
};

// Panel
export const Panel: Story = {
  render: () => {
    const [value, setValue] = useState('public');
    return (
      <RadioGroup
        name="privacy-setting"
        variant="panel"
        aria-label="Privacy setting"
        value={value}
        onChange={setValue}
        options={[
          {
            id: 'public',
            name: 'Public access',
            description: 'This project would be available to anyone who has the link',
          },
          {
            id: 'private-to-project-members',
            name: 'Private to project members',
            description: 'Only members of this project would be able to access',
          },
          {
            id: 'private-to-you',
            name: 'Private to you',
            description: 'You are the only one able to access this project',
          },
        ]}
      />
    );
  },
};

// Picker
export const Picker: Story = {
  render: () => {
    const [value, setValue] = useState('pink');
    return (
      <RadioGroup
        name="color"
        variant="picker"
        legend="Choose a label color"
        value={value}
        onChange={setValue}
        options={[
          {
            id: 'pink',
            name: 'Pink',
            classes: 'bg-pink-500 checked:outline-pink-500',
          },
          {
            id: 'purple',
            name: 'Purple',
            classes: 'bg-purple-500 checked:outline-purple-500',
          },
          {
            id: 'blue',
            name: 'Blue',
            classes: 'bg-blue-500 checked:outline-blue-500',
          },
          {
            id: 'green',
            name: 'Green',
            classes: 'bg-green-500 checked:outline-green-500',
          },
          {
            id: 'yellow',
            name: 'Yellow',
            classes: 'bg-yellow-500 checked:outline-yellow-500',
          },
        ]}
      />
    );
  },
};

// Cards
export const Cards: Story = {
  render: () => {
    const [value, setValue] = useState('newsletter');
    return (
      <RadioGroup
        name="mailing-list"
        variant="cards"
        legend="Select a mailing list"
        value={value}
        onChange={setValue}
        options={[
          {
            id: 'newsletter',
            name: 'Newsletter',
            description: 'Last message sent an hour ago',
            extraInfo: '621 users',
          },
          {
            id: 'existing-customers',
            name: 'Existing customers',
            description: 'Last message sent 2 weeks ago',
            extraInfo: '1200 users',
          },
          {
            id: 'trial-users',
            name: 'Trial users',
            description: 'Last message sent 4 days ago',
            extraInfo: '2740 users',
          },
        ]}
      />
    );
  },
};

// Small Cards
export const SmallCards: Story = {
  render: () => {
    const [value, setValue] = useState('16gb');
    return (
      <RadioGroup
        name="option"
        variant="small-cards"
        legend="RAM"
        description="See performance specs"
        aria-label="Choose a memory option"
        value={value}
        onChange={setValue}
        options={[
          { id: '4gb', name: '4 GB' },
          { id: '8gb', name: '8 GB' },
          { id: '16gb', name: '16 GB' },
          { id: '32gb', name: '32 GB' },
          { id: '64gb', name: '64 GB' },
          { id: '128gb', name: '128 GB', disabled: true },
        ]}
      />
    );
  },
};

// Stacked Cards
export const StackedCards: Story = {
  render: () => {
    const [value, setValue] = useState('hobby');
    return (
      <RadioGroup
        name="plan"
        variant="stacked-cards"
        aria-label="Server size"
        value={value}
        onChange={setValue}
        options={[
          {
            id: 'hobby',
            name: 'Hobby',
            description: '8GB / 4 CPUs · 160 GB SSD disk',
            extraInfo: '$40',
            additionalInfo: '/mo',
          },
          {
            id: 'startup',
            name: 'Startup',
            description: '12GB / 6 CPUs · 256 GB SSD disk',
            extraInfo: '$80',
            additionalInfo: '/mo',
          },
          {
            id: 'business',
            name: 'Business',
            description: '16GB / 8 CPUs · 512 GB SSD disk',
            extraInfo: '$160',
            additionalInfo: '/mo',
          },
          {
            id: 'enterprise',
            name: 'Enterprise',
            description: '32GB / 12 CPUs · 1024 GB SSD disk',
            extraInfo: '$240',
            additionalInfo: '/mo',
          },
        ]}
      />
    );
  },
};

// Disabled State
export const Disabled: Story = {
  render: () => {
    const [value, setValue] = useState('option1');
    return (
      <RadioGroup
        name="disabled"
        variant="simple-list"
        legend="Disabled Example"
        description="This radio group is disabled"
        value={value}
        onChange={setValue}
        disabled
        options={[
          { id: 'option1', name: 'Option 1' },
          { id: 'option2', name: 'Option 2' },
          { id: 'option3', name: 'Option 3' },
        ]}
      />
    );
  },
};

// Individual Disabled Options
export const IndividualDisabled: Story = {
  render: () => {
    const [value, setValue] = useState('option1');
    return (
      <RadioGroup
        name="individual-disabled"
        variant="simple-list"
        legend="Individual Disabled Options"
        description="Some options are disabled"
        value={value}
        onChange={setValue}
        options={[
          { id: 'option1', name: 'Available Option 1' },
          { id: 'option2', name: 'Disabled Option 2', disabled: true },
          { id: 'option3', name: 'Available Option 3' },
          { id: 'option4', name: 'Disabled Option 4', disabled: true },
        ]}
      />
    );
  },
};
