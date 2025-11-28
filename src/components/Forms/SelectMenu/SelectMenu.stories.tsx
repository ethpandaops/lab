import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { SelectMenu } from './SelectMenu';
import type { SelectMenuOption } from './SelectMenu.types';
import { GlobeAltIcon, UserIcon, CogIcon } from '@heroicons/react/16/solid';

const meta: Meta = {
  title: 'Components/Forms/SelectMenu',
  component: SelectMenu,
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
type Story = StoryObj;

interface Country {
  code: string;
  name: string;
}

const countries: SelectMenuOption<Country>[] = [
  { value: { code: 'us', name: 'United States' }, label: 'United States' },
  { value: { code: 'ca', name: 'Canada' }, label: 'Canada' },
  { value: { code: 'mx', name: 'Mexico' }, label: 'Mexico' },
  { value: { code: 'uk', name: 'United Kingdom' }, label: 'United Kingdom' },
  { value: { code: 'de', name: 'Germany' }, label: 'Germany' },
];

const countriesWithIcons: SelectMenuOption<Country>[] = countries.map(country => ({
  ...country,
  icon: <GlobeAltIcon className="size-5 text-primary" />,
}));

/**
 * Default select menu with label
 */
export const Default: Story = {
  render: () => {
    const [selected, setSelected] = useState(countries[0].value);
    return <SelectMenu value={selected} onChange={setSelected} options={countries} showLabel label="Country" />;
  },
};

/**
 * Select menu without label
 */
export const WithoutLabel: Story = {
  render: () => {
    const [selected, setSelected] = useState(countries[0].value);
    return <SelectMenu value={selected} onChange={setSelected} options={countries} />;
  },
};

/**
 * Select menu with icons
 */
export const WithIcons: Story = {
  render: () => {
    const [selected, setSelected] = useState(countriesWithIcons[0].value);
    return (
      <SelectMenu value={selected} onChange={setSelected} options={countriesWithIcons} showLabel label="Country" />
    );
  },
};

/**
 * Disabled select menu
 */
export const Disabled: Story = {
  render: () => {
    const [selected, setSelected] = useState(countries[0].value);
    return (
      <SelectMenu value={selected} onChange={setSelected} options={countries} showLabel label="Country" disabled />
    );
  },
};

type Role = 'admin' | 'user' | 'guest';

const roles: SelectMenuOption<Role>[] = [
  { value: 'admin', label: 'Administrator', icon: <CogIcon className="size-5 text-primary" /> },
  { value: 'user', label: 'User', icon: <UserIcon className="size-5 text-secondary" /> },
  { value: 'guest', label: 'Guest', icon: <UserIcon className="size-5 text-muted" /> },
];

/**
 * Select menu with different icons
 */
export const DifferentIcons: Story = {
  render: () => {
    const [selected, setSelected] = useState<Role>('user');
    return <SelectMenu value={selected} onChange={setSelected} options={roles} showLabel label="Role" />;
  },
};

/**
 * Select menu with rounded corners
 */
export const Rounded: Story = {
  render: () => {
    const [selected, setSelected] = useState(countries[0].value);
    return <SelectMenu value={selected} onChange={setSelected} options={countries} showLabel label="Country" rounded />;
  },
};

/**
 * Comparison between rounded and sharp corners
 */
export const RoundedComparison: Story = {
  render: () => {
    const [selectedSharp, setSelectedSharp] = useState(countries[0].value);
    const [selectedRounded, setSelectedRounded] = useState(countries[0].value);
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h3 className="mb-2 font-semibold text-foreground">Sharp Corners (Default)</h3>
          <SelectMenu value={selectedSharp} onChange={setSelectedSharp} options={countries} showLabel label="Country" />
        </div>
        <div>
          <h3 className="mb-2 font-semibold text-foreground">Rounded Corners</h3>
          <SelectMenu
            value={selectedRounded}
            onChange={setSelectedRounded}
            options={countries}
            showLabel
            label="Country"
            rounded
          />
        </div>
      </div>
    );
  },
};
