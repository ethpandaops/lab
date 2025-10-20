import type { Meta, StoryObj } from '@storybook/react-vite';
import { VersionBadge } from './VersionBadge';

const meta = {
  title: 'Components/Data/VersionBadge',
  component: VersionBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof VersionBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Standard version badge
 */
export const Standard: Story = {
  args: {
    version: 'v0.0.70-7195855',
  },
};

/**
 * Short version
 */
export const ShortVersion: Story = {
  args: {
    version: 'v1.0.0',
  },
};

/**
 * Long version with commit hash
 */
export const LongVersion: Story = {
  args: {
    version: 'v0.0.72-abc123def456',
  },
};

/**
 * Development version
 */
export const DevVersion: Story = {
  args: {
    version: 'v0.0.68-dev',
  },
};

/**
 * Multiple version badges
 */
export const MultipleBadges: Story = {
  args: {
    version: 'v1.0.0',
  },
  render: () => (
    <div className="flex items-center gap-2">
      <VersionBadge version="v0.0.70-7195855" />
      <VersionBadge version="v0.0.71-main" />
      <VersionBadge version="v0.0.72-latest" />
    </div>
  ),
};
