import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProgressBar } from './ProgressBar';

const meta = {
  title: 'Components/Navigation/ProgressBar',
  component: ProgressBar,
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
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Simple: Story = {
  name: 'Simple (No Segments)',
  args: {
    progress: 37.5,
    statusMessage: 'Migrating MySQL database...',
  },
};

export const AutoDistributed: Story = {
  name: 'Auto-Distributed Segments',
  args: {
    progress: 37.5,
    statusMessage: 'Migrating MySQL database...',
    segments: [
      { label: 'Copying files' },
      { label: 'Migrating database' },
      { label: 'Compiling assets' },
      { label: 'Deployed' },
    ],
  },
};

export const WithMarks: Story = {
  name: 'Segments with Marks',
  args: {
    progress: 62,
    statusMessage: 'Processing deployment...',
    segments: [
      { label: 'Start', showMark: true },
      { label: 'Middle', showMark: true },
      { label: 'End', showMark: true },
    ],
  },
};

export const ColoredMarks: Story = {
  args: {
    progress: 45,
    statusMessage: 'Multi-stage build...',
    segments: [
      { label: 'Init', showMark: true, markColor: 'bg-success' },
      { label: 'Build', showMark: true, markColor: 'bg-primary' },
      { label: 'Test', showMark: true, markColor: 'bg-warning' },
      { label: 'Deploy', showMark: true, markColor: 'bg-error' },
    ],
  },
};

export const CustomPercentages: Story = {
  args: {
    progress: 65,
    statusMessage: 'Custom segment distribution...',
    segments: [
      { label: 'Quick init', percentage: 0, showMark: true },
      { label: 'Heavy processing', percentage: 10, showMark: true },
      { label: 'Validation', percentage: 80, showMark: true },
      { label: 'Complete', percentage: 100, showMark: true },
    ],
  },
};

export const MixedConfiguration: Story = {
  name: 'Mixed (Some with Marks)',
  args: {
    progress: 50,
    statusMessage: 'Building application...',
    segments: [
      { label: 'Start', showMark: true, markColor: 'bg-success' },
      { label: 'Processing' },
      { label: 'Finalizing' },
      { label: 'Done', showMark: true, markColor: 'bg-success' },
    ],
  },
};

export const TwoSegments: Story = {
  args: {
    progress: 25,
    statusMessage: 'Processing...',
    segments: [{ label: 'Start' }, { label: 'Finish' }],
  },
};

export const FiveSegments: Story = {
  args: {
    progress: 60,
    statusMessage: 'Installing dependencies...',
    segments: [
      { label: 'Init', showMark: true },
      { label: 'Download' },
      { label: 'Install' },
      { label: 'Build' },
      { label: 'Complete', showMark: true },
    ],
  },
};

export const Complete: Story = {
  args: {
    progress: 100,
    statusMessage: 'Deployment complete!',
    fillColor: 'bg-success',
    segments: [
      { label: 'Copying files' },
      { label: 'Migrating database' },
      { label: 'Compiling assets' },
      { label: 'Deployed' },
    ],
  },
};

export const Starting: Story = {
  args: {
    progress: 5,
    statusMessage: 'Starting deployment...',
    segments: [
      { label: 'Copying files' },
      { label: 'Migrating database' },
      { label: 'Compiling assets' },
      { label: 'Deployed' },
    ],
  },
};

export const CustomColors: Story = {
  name: 'Custom Fill Colors',
  args: {
    progress: 75,
    statusMessage: 'Warning state (orange)',
    fillColor: 'bg-warning',
    backgroundColor: 'bg-zinc-800',
  },
};

export const SuccessColor: Story = {
  name: 'Success (Green)',
  args: {
    progress: 100,
    statusMessage: 'All nodes ready!',
    fillColor: 'bg-success',
    backgroundColor: 'bg-zinc-800',
  },
};

export const DangerColor: Story = {
  name: 'Danger (Red)',
  args: {
    progress: 25,
    statusMessage: 'Critical issues detected',
    fillColor: 'bg-danger',
    backgroundColor: 'bg-zinc-800',
  },
};
