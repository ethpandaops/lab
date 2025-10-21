import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { ClientSelect } from './ClientSelect';

const mockClients = [
  { name: 'lighthouse', count: 125 },
  { name: 'prysm', count: 85 },
  { name: 'nimbus', count: 35 },
  { name: 'teku', count: 20 },
  { name: 'lodestar', count: 10 },
];

const meta: Meta<typeof ClientSelect> = {
  title: 'Components/Ethereum/ClientSelect',
  component: ClientSelect,
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
type Story = StoryObj<typeof meta>;

/**
 * Default client selector with label
 */
export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('all');
    return <ClientSelect value={value} onChange={setValue} clients={mockClients} showLabel />;
  },
};

/**
 * Client selector without label
 */
export const WithoutLabel: Story = {
  render: () => {
    const [value, setValue] = useState('all');
    return <ClientSelect value={value} onChange={setValue} clients={mockClients} showLabel={false} />;
  },
};

/**
 * Client selector with custom label
 */
export const CustomLabel: Story = {
  render: () => {
    const [value, setValue] = useState('all');
    return <ClientSelect value={value} onChange={setValue} clients={mockClients} showLabel label="Select Client" />;
  },
};

/**
 * Client selector with pre-selected value
 */
export const PreSelected: Story = {
  render: () => {
    const [value, setValue] = useState('lighthouse');
    return <ClientSelect value={value} onChange={setValue} clients={mockClients} showLabel />;
  },
};
