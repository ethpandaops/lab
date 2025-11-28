import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProgressSteps } from './ProgressSteps';
import type { ProgressStep } from './ProgressSteps.types';

const meta = {
  title: 'Components/Navigation/ProgressSteps',
  component: ProgressSteps,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    Story => (
      <div className="mx-auto max-w-4xl rounded-lg bg-surface p-8">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof ProgressSteps>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample data for step-based variants
const simpleSteps: ProgressStep[] = [
  { id: 'Step 1', name: 'Job details', to: '#', status: 'complete' },
  { id: 'Step 2', name: 'Application form', to: '#', status: 'current' },
  { id: 'Step 3', name: 'Preview', to: '#', status: 'upcoming' },
];

const panelSteps: ProgressStep[] = [
  { id: '01', name: 'Job details', to: '#', status: 'complete' },
  { id: '02', name: 'Application form', to: '#', status: 'current' },
  { id: '03', name: 'Preview', to: '#', status: 'upcoming' },
];

const bulletSteps: ProgressStep[] = [
  { name: 'Step 1', to: '#', status: 'complete' },
  { name: 'Step 2', to: '#', status: 'current' },
  { name: 'Step 3', to: '#', status: 'upcoming' },
  { name: 'Step 4', to: '#', status: 'upcoming' },
];

const circleSteps: ProgressStep[] = [
  { name: 'Step 1', to: '#', status: 'complete' },
  { name: 'Step 2', to: '#', status: 'complete' },
  { name: 'Step 3', to: '#', status: 'current' },
  { name: 'Step 4', to: '#', status: 'upcoming' },
  { name: 'Step 5', to: '#', status: 'upcoming' },
];

const bulletsTextSteps: ProgressStep[] = [
  { name: 'Create account', to: '#', status: 'complete' },
  { name: 'Profile information', to: '#', status: 'current' },
  { name: 'Theme', to: '#', status: 'upcoming' },
  { name: 'Preview', to: '#', status: 'upcoming' },
];

const circlesTextSteps: ProgressStep[] = [
  {
    name: 'Create account',
    description: 'Vitae sed mi luctus laoreet.',
    to: '#',
    status: 'complete',
  },
  {
    name: 'Profile information',
    description: 'Cursus semper viverra facilisis et et some more.',
    to: '#',
    status: 'current',
  },
  {
    name: 'Business information',
    description: 'Penatibus eu quis ante.',
    to: '#',
    status: 'upcoming',
  },
  {
    name: 'Theme',
    description: 'Faucibus nec enim leo et.',
    to: '#',
    status: 'upcoming',
  },
  {
    name: 'Preview',
    description: 'Iusto et officia maiores porro ad non quas.',
    to: '#',
    status: 'upcoming',
  },
];

export const Simple: Story = {
  args: {
    variant: 'simple',
    steps: simpleSteps,
  },
};

export const Panels: Story = {
  args: {
    variant: 'panels',
    steps: panelSteps,
  },
};

export const Bullets: Story = {
  args: {
    variant: 'bullets',
    steps: bulletSteps,
  },
};

export const Circles: Story = {
  args: {
    variant: 'circles',
    steps: circleSteps,
  },
};

export const BulletsWithText: Story = {
  args: {
    variant: 'bullets-text',
    steps: bulletsTextSteps,
  },
};

export const CirclesWithText: Story = {
  args: {
    variant: 'circles-text',
    steps: circlesTextSteps,
  },
};

export const AllComplete: Story = {
  name: 'All Steps Complete',
  args: {
    variant: 'circles',
    steps: circleSteps.map(step => ({ ...step, status: 'complete' as const })),
  },
};

export const AllUpcoming: Story = {
  name: 'All Steps Upcoming',
  args: {
    variant: 'circles',
    steps: circleSteps.map((step, idx) => ({
      ...step,
      status: idx === 0 ? ('current' as const) : ('upcoming' as const),
    })),
  },
};
