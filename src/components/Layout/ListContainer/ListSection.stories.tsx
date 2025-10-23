import type { Meta, StoryObj } from '@storybook/react-vite';
import { ListContainer, ListItem, ListSection } from './';

const meta = {
  title: 'Components/Layout/ListSection',
  component: ListSection,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ListSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic section with simple list items
 */
export const Basic: Story = {
  args: {
    title: 'Navigation',
  },
  render: () => (
    <ListContainer variant="simple" withDividers={false} compact>
      <ListSection title="Navigation">
        <ListItem>
          <a href="#home" className="block px-2.5 py-1.5 text-sm font-semibold text-muted hover:text-primary">
            Home
          </a>
        </ListItem>
        <ListItem>
          <a href="#about" className="block px-2.5 py-1.5 text-sm font-semibold text-muted hover:text-primary">
            About
          </a>
        </ListItem>
        <ListItem>
          <a href="#contact" className="block px-2.5 py-1.5 text-sm font-semibold text-muted hover:text-primary">
            Contact
          </a>
        </ListItem>
      </ListSection>
    </ListContainer>
  ),
};

/**
 * Section with nested subsections
 */
export const WithNestedSubsections: Story = {
  args: {
    title: 'Ethereum',
  },
  render: () => (
    <ListContainer variant="simple" withDividers={false} compact className="flex flex-col gap-y-7">
      <ListSection title="Ethereum">
        <ListSection title="Consensus" nested>
          <ListItem>
            <a
              href="#real-time"
              className="block rounded-lg px-2.5 py-1.5 text-sm font-semibold text-muted hover:bg-primary/10 hover:text-primary"
            >
              Real-Time
            </a>
          </ListItem>
          <ListItem>
            <a
              href="#validators"
              className="block rounded-lg px-2.5 py-1.5 text-sm font-semibold text-muted hover:bg-primary/10 hover:text-primary"
            >
              Validators
            </a>
          </ListItem>
        </ListSection>

        <ListSection title="Execution" nested>
          <ListItem>
            <a
              href="#blocks"
              className="block rounded-lg px-2.5 py-1.5 text-sm font-semibold text-muted hover:bg-primary/10 hover:text-primary"
            >
              Blocks
            </a>
          </ListItem>
          <ListItem>
            <a
              href="#transactions"
              className="block rounded-lg px-2.5 py-1.5 text-sm font-semibold text-muted hover:bg-primary/10 hover:text-primary"
            >
              Transactions
            </a>
          </ListItem>
        </ListSection>
      </ListSection>
    </ListContainer>
  ),
};

/**
 * Collapsible sections with default states
 */
export const Collapsible: Story = {
  args: {
    title: 'Settings',
  },
  render: () => (
    <ListContainer variant="simple" withDividers={false} compact className="flex flex-col gap-y-7">
      <ListSection title="Settings" collapsible>
        <ListItem>
          <a href="#general" className="block px-2.5 py-1.5 text-sm font-semibold text-muted hover:text-primary">
            General
          </a>
        </ListItem>
        <ListItem>
          <a href="#privacy" className="block px-2.5 py-1.5 text-sm font-semibold text-muted hover:text-primary">
            Privacy
          </a>
        </ListItem>
        <ListItem>
          <a href="#security" className="block px-2.5 py-1.5 text-sm font-semibold text-muted hover:text-primary">
            Security
          </a>
        </ListItem>
      </ListSection>

      <ListSection title="Advanced" collapsible defaultCollapsed>
        <ListItem>
          <a href="#developer" className="block px-2.5 py-1.5 text-sm font-semibold text-muted hover:text-primary">
            Developer
          </a>
        </ListItem>
        <ListItem>
          <a href="#experimental" className="block px-2.5 py-1.5 text-sm font-semibold text-muted hover:text-primary">
            Experimental
          </a>
        </ListItem>
      </ListSection>
    </ListContainer>
  ),
};

/**
 * Complex navigation structure with multiple levels
 */
export const SidebarExample: Story = {
  args: {
    title: 'Ethereum',
  },
  render: () => (
    <div className="w-72 space-y-4">
      <ListContainer variant="simple" withDividers={false} compact className="flex flex-col gap-y-7">
        <ListSection title="Ethereum">
          <ListSection title="Consensus" nested>
            <ListItem>
              <a
                href="#real-time"
                className="block rounded-lg px-2.5 py-1.5 text-sm font-semibold text-muted transition-all hover:bg-primary/10 hover:text-primary"
              >
                Real-Time
              </a>
            </ListItem>
            <ListItem>
              <a
                href="#validators"
                className="block rounded-lg px-2.5 py-1.5 text-sm font-semibold text-muted transition-all hover:bg-primary/10 hover:text-primary"
              >
                Validators
              </a>
            </ListItem>
            <ListItem>
              <a
                href="#attestations"
                className="block rounded-lg px-2.5 py-1.5 text-sm font-semibold text-muted transition-all hover:bg-primary/10 hover:text-primary"
              >
                Attestations
              </a>
            </ListItem>
          </ListSection>

          <ListSection title="Execution" nested>
            <ListItem>
              <a
                href="#blocks"
                className="block rounded-lg px-2.5 py-1.5 text-sm font-semibold text-muted transition-all hover:bg-primary/10 hover:text-primary"
              >
                Blocks
              </a>
            </ListItem>
            <ListItem>
              <a
                href="#transactions"
                className="block rounded-lg px-2.5 py-1.5 text-sm font-semibold text-muted transition-all hover:bg-primary/10 hover:text-primary"
              >
                Transactions
              </a>
            </ListItem>
          </ListSection>
        </ListSection>

        <ListSection title="Xatu">
          <ListItem>
            <a
              href="#contributors"
              className="block rounded-lg px-2.5 py-1.5 text-sm font-semibold text-muted transition-all hover:bg-primary/10 hover:text-primary"
            >
              Contributors
            </a>
          </ListItem>
          <ListItem>
            <a
              href="#geographical-checklist"
              className="block rounded-lg px-2.5 py-1.5 text-sm font-semibold text-muted transition-all hover:bg-primary/10 hover:text-primary"
            >
              Geographical Checklist
            </a>
          </ListItem>
          <ListItem>
            <a
              href="#locally-built-blocks"
              className="block rounded-lg px-2.5 py-1.5 text-sm font-semibold text-muted transition-all hover:bg-primary/10 hover:text-primary"
            >
              Locally Built Blocks
            </a>
          </ListItem>
        </ListSection>
      </ListContainer>
    </div>
  ),
};

/**
 * Collapsible nested subsections
 */
export const CollapsibleNested: Story = {
  args: {
    title: 'Documentation',
  },
  render: () => (
    <ListContainer variant="simple" withDividers={false} compact className="flex flex-col gap-y-7">
      <ListSection title="Documentation" collapsible>
        <ListSection title="Getting Started" nested collapsible>
          <ListItem>
            <a href="#installation" className="block px-2.5 py-1.5 text-sm font-semibold text-muted hover:text-primary">
              Installation
            </a>
          </ListItem>
          <ListItem>
            <a href="#quick-start" className="block px-2.5 py-1.5 text-sm font-semibold text-muted hover:text-primary">
              Quick Start
            </a>
          </ListItem>
        </ListSection>

        <ListSection title="API Reference" nested collapsible defaultCollapsed>
          <ListItem>
            <a href="#endpoints" className="block px-2.5 py-1.5 text-sm font-semibold text-muted hover:text-primary">
              Endpoints
            </a>
          </ListItem>
          <ListItem>
            <a
              href="#authentication"
              className="block px-2.5 py-1.5 text-sm font-semibold text-muted hover:text-primary"
            >
              Authentication
            </a>
          </ListItem>
        </ListSection>
      </ListSection>
    </ListContainer>
  ),
};
