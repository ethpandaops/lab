import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { RangeInput } from './RangeInput';

const meta: Meta<typeof RangeInput> = {
  title: 'Components/Forms/RangeInput',
  component: RangeInput,
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof RangeInput>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState(50);
    return <RangeInput id="default" label="Volume" value={value} onChange={setValue} />;
  },
};

export const WithPercentageSuffix: Story = {
  render: () => {
    const [value, setValue] = useState(75);
    return <RangeInput id="percentage" label="Availability" value={value} suffix="%" onChange={setValue} />;
  },
};

export const WithCustomRange: Story = {
  render: () => {
    const [value, setValue] = useState(500);
    return (
      <RangeInput
        id="custom-range"
        label="Response Time"
        value={value}
        min={0}
        max={1000}
        step={50}
        suffix="ms"
        onChange={setValue}
      />
    );
  },
};

export const MinimumAvailability: Story = {
  render: () => {
    const [minValue, setMinValue] = useState(0);
    const [maxValue, setMaxValue] = useState(100);
    return (
      <div className="space-y-3">
        <RangeInput
          id="min-availability"
          label="Min"
          value={minValue}
          min={0}
          max={100}
          step={5}
          suffix="%"
          onChange={setMinValue}
        />
        <RangeInput
          id="max-availability"
          label="Max"
          value={maxValue}
          min={0}
          max={100}
          step={5}
          suffix="%"
          onChange={setMaxValue}
        />
      </div>
    );
  },
};
