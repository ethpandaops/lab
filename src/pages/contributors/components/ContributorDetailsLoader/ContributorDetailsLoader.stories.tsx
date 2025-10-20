import type { Meta, StoryObj } from '@storybook/react-vite';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { ContributorDetailsLoader } from './ContributorDetailsLoader';

const meta = {
  title: 'Pages/Contributors/ContributorDetailsLoader',
  component: ContributorDetailsLoader,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Container>
          <Header title="Contributor Details" description="Detailed contribution metrics and activity" />
          <Story />
        </Container>
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof ContributorDetailsLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
