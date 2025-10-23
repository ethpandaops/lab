import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { RadioGroup, RadioOption } from './RadioGroup';

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
      >
        <RadioOption id="email" name="Email" />
        <RadioOption id="sms" name="Phone (SMS)" />
        <RadioOption id="push" name="Push notification" />
      </RadioGroup>
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
      >
        <RadioOption id="email" name="Email" />
        <RadioOption id="sms" name="Phone (SMS)" />
        <RadioOption id="push" name="Push notification" />
      </RadioGroup>
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
      >
        <RadioOption id="small" name="Small" description="4 GB RAM / 2 CPUS / 80 GB SSD Storage" />
        <RadioOption id="medium" name="Medium" description="8 GB RAM / 4 CPUS / 160 GB SSD Storage" />
        <RadioOption id="large" name="Large" description="16 GB RAM / 8 CPUS / 320 GB SSD Storage" />
      </RadioGroup>
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
      >
        <RadioOption id="small" name="Small" description="4 GB RAM / 2 CPUS / 80 GB SSD Storage" />
        <RadioOption id="medium" name="Medium" description="8 GB RAM / 4 CPUS / 160 GB SSD Storage" />
        <RadioOption id="large" name="Large" description="16 GB RAM / 8 CPUS / 320 GB SSD Storage" />
      </RadioGroup>
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
      >
        <RadioOption id="checking" name="Checking" description="CIBC ••••6610" />
        <RadioOption id="savings" name="Savings" description="Bank of America ••••0149" />
        <RadioOption id="mastercard" name="Mastercard" description="Capital One ••••7877" />
      </RadioGroup>
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
      >
        <RadioOption id="null" name="None" />
        <RadioOption id="1" name="Baked beans" />
        <RadioOption id="2" name="Coleslaw" />
        <RadioOption id="3" name="French fries" />
        <RadioOption id="4" name="Garden salad" />
        <RadioOption id="5" name="Mashed potatoes" />
      </RadioGroup>
    );
  },
};

// Simple Table
export const Table: Story = {
  render: () => {
    const [value, setValue] = useState('startup');
    return (
      <RadioGroup name="pricing-plan" variant="table" aria-label="Pricing plans" value={value} onChange={setValue}>
        <RadioOption
          id="startup"
          name="Startup"
          detail="$29 / mo"
          description="$290 / yr"
          caption="Up to 5 active job postings"
        />
        <RadioOption
          id="business"
          name="Business"
          detail="$99 / mo"
          description="$990 / yr"
          caption="Up to 25 active job postings"
        />
        <RadioOption
          id="enterprise"
          name="Enterprise"
          detail="$249 / mo"
          description="$2490 / yr"
          caption="Unlimited active job postings"
        />
      </RadioGroup>
    );
  },
};

// Panel
export const Panel: Story = {
  render: () => {
    const [value, setValue] = useState('public');
    return (
      <RadioGroup name="privacy-setting" variant="panel" aria-label="Privacy setting" value={value} onChange={setValue}>
        <RadioOption
          id="public"
          name="Public access"
          description="This project would be available to anyone who has the link"
        />
        <RadioOption
          id="private-to-project-members"
          name="Private to project members"
          description="Only members of this project would be able to access"
        />
        <RadioOption
          id="private-to-you"
          name="Private to you"
          description="You are the only one able to access this project"
        />
      </RadioGroup>
    );
  },
};

// Picker
export const Picker: Story = {
  render: () => {
    const [value, setValue] = useState('block-production-flow');
    return (
      <RadioGroup name="experiment" variant="picker" legend="Choose an experiment" value={value} onChange={setValue}>
        <RadioOption
          id="block-production-flow"
          name="Block Production Flow"
          src="/images/expirements/block-production-flow.png"
        />
        <RadioOption id="fork-readiness" name="Fork Readiness" src="/images/expirements/fork-readiness.png" />
        <RadioOption
          id="geographical-checklist"
          name="Geographical Checklist"
          src="/images/expirements/geographical-checklist.png"
        />
        <RadioOption
          id="locally-built-blocks"
          name="Locally Built Blocks"
          src="/images/expirements/locally-built-blocks.png"
        />
        <RadioOption id="networks" name="Networks" src="/images/expirements/networks.png" />
        <RadioOption id="live" name="Live" src="/images/ethereum/live.png" />
      </RadioGroup>
    );
  },
};

// Cards
export const Cards: Story = {
  render: () => {
    const [value, setValue] = useState('newsletter');
    return (
      <RadioGroup name="mailing-list" variant="cards" legend="Select a mailing list" value={value} onChange={setValue}>
        <RadioOption id="newsletter" name="Newsletter" description="Last message sent an hour ago" detail="621 users" />
        <RadioOption
          id="existing-customers"
          name="Existing customers"
          description="Last message sent 2 weeks ago"
          detail="1200 users"
        />
        <RadioOption
          id="trial-users"
          name="Trial users"
          description="Last message sent 4 days ago"
          detail="2740 users"
        />
      </RadioGroup>
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
      >
        <RadioOption id="4gb" name="4 GB" />
        <RadioOption id="8gb" name="8 GB" />
        <RadioOption id="16gb" name="16 GB" />
        <RadioOption id="32gb" name="32 GB" />
        <RadioOption id="64gb" name="64 GB" />
        <RadioOption id="128gb" name="128 GB" disabled />
      </RadioGroup>
    );
  },
};

// Stacked Cards
export const StackedCards: Story = {
  render: () => {
    const [value, setValue] = useState('hobby');
    return (
      <RadioGroup name="plan" variant="stacked-cards" aria-label="Server size" value={value} onChange={setValue}>
        <RadioOption id="hobby" name="Hobby" description="8GB / 4 CPUs · 160 GB SSD disk" detail="$40" caption="/mo" />
        <RadioOption
          id="startup"
          name="Startup"
          description="12GB / 6 CPUs · 256 GB SSD disk"
          detail="$80"
          caption="/mo"
        />
        <RadioOption
          id="business"
          name="Business"
          description="16GB / 8 CPUs · 512 GB SSD disk"
          detail="$160"
          caption="/mo"
        />
        <RadioOption
          id="enterprise"
          name="Enterprise"
          description="32GB / 12 CPUs · 1024 GB SSD disk"
          detail="$240"
          caption="/mo"
        />
      </RadioGroup>
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
      >
        <RadioOption id="option1" name="Option 1" />
        <RadioOption id="option2" name="Option 2" />
        <RadioOption id="option3" name="Option 3" />
      </RadioGroup>
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
      >
        <RadioOption id="option1" name="Available Option 1" />
        <RadioOption id="option2" name="Disabled Option 2" disabled />
        <RadioOption id="option3" name="Available Option 3" />
        <RadioOption id="option4" name="Disabled Option 4" disabled />
      </RadioGroup>
    );
  },
};

// Custom Content with Children
export const CustomContent: Story = {
  render: () => {
    const [value, setValue] = useState('option1');
    return (
      <RadioGroup
        name="custom-content"
        variant="simple-list"
        legend="Custom Content"
        description="Using children prop for custom rich content"
        value={value}
        onChange={setValue}
      >
        <RadioOption id="option1">
          <strong>Bold Option 1</strong>
        </RadioOption>
        <RadioOption id="option2">
          <em>Italic Option 2</em>
        </RadioOption>
        <RadioOption id="option3">
          <span className="text-primary">Colored Option 3</span>
        </RadioOption>
      </RadioGroup>
    );
  },
};

// Mixed Props - Description List with Custom Children
export const MixedPropsDescriptionList: Story = {
  render: () => {
    const [value, setValue] = useState('custom');
    return (
      <RadioGroup
        name="mixed-props"
        variant="description-list"
        aria-label="Mixed Props Example"
        value={value}
        onChange={setValue}
      >
        <RadioOption id="standard" name="Standard Option" description="Using name and description props" />
        <RadioOption id="custom" description="Custom styled content below">
          <span className="font-bold text-primary">Custom</span> <span className="text-muted">styled option</span>
        </RadioOption>
        <RadioOption id="mixed" name="Mixed Approach" description="This combines name prop with description" />
      </RadioGroup>
    );
  },
};
