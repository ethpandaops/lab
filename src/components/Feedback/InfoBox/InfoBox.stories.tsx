import type { Meta, StoryObj } from '@storybook/react-vite';
import { BookOpenIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import { InfoBox } from './InfoBox';

const meta = {
  title: 'Components/Feedback/InfoBox',
  component: InfoBox,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof InfoBox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <p>
        This is an info box that provides additional context or educational content to the user. It can contain any
        content including paragraphs, links, and other elements.
      </p>
    ),
  },
};

export const WithMultipleParagraphs: Story = {
  args: {
    children: (
      <>
        <p>
          <span className="font-medium text-foreground">
            PeerDAS transforms Ethereum&apos;s data availability layer.
          </span>{' '}
          Instead of every node storing every blob, data is erasure coded with 2x redundancy and split into 128 columns.
        </p>
        <p>
          Each node commits to storing a subset based on its identity and validator balance. 64 distinct columns are
          required to reconstruct the full blob matrix.
        </p>
      </>
    ),
  },
};

export const WithCustomIcon: Story = {
  args: {
    icon: <LightBulbIcon />,
    children: (
      <p>
        <span className="font-medium text-foreground">Pro tip:</span> You can customize the icon to match the type of
        information being displayed.
      </p>
    ),
  },
};

export const WithBookIcon: Story = {
  args: {
    icon: <BookOpenIcon />,
    children: (
      <p>
        <span className="font-medium text-foreground">Learn more:</span> Check out our documentation for detailed guides
        and tutorials.
      </p>
    ),
  },
};

export const WithoutIcon: Story = {
  args: {
    hideIcon: true,
    children: (
      <p>
        This info box has no icon, providing a cleaner look when the informational context is already clear from the
        surrounding content.
      </p>
    ),
  },
};

export const WithLink: Story = {
  args: {
    children: (
      <p>
        This dashboard is powered by{' '}
        <a
          href="https://github.com/ethp2p/dasmon"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          dasmon
        </a>
        , an open-source custody monitoring engine.
      </p>
    ),
  },
};
