import type { Meta, StoryObj } from '@storybook/react-vite';
import { ListContainer, ListItem } from './ListContainer';

const meta = {
  title: 'Components/Layout/ListContainer',
  component: ListContainer,
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
  argTypes: {
    variant: {
      control: 'select',
      options: ['simple', 'card', 'flat', 'separate'],
      description: 'The visual style variant of the list container',
    },
    fullWidthOnMobile: {
      control: 'boolean',
      description: 'Whether to display full-width on mobile devices (removes rounded corners and adjusts padding)',
    },
    as: {
      control: 'select',
      options: ['ul', 'ol', 'div'],
      description: 'The HTML element to render',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
} satisfies Meta<typeof ListContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

// Example data for all stories
const items = [
  { id: 1, title: 'Item One', description: 'First item description' },
  { id: 2, title: 'Item Two', description: 'Second item description' },
  { id: 3, title: 'Item Three', description: 'Third item description' },
];

/**
 * Interactive playground to test all variants and props.
 * Use the controls panel to change the variant, fullWidthOnMobile, element type, and other props.
 */
export const Playground: Story = {
  args: {
    variant: 'card',
    fullWidthOnMobile: false,
    as: 'ul',
  },
  render: args => (
    <ListContainer {...args}>
      {items.map(item => (
        <ListItem key={item.id}>
          <div>
            <h3 className="text-sm/6 font-semibold text-foreground">{item.title}</h3>
            <p className="mt-1 text-sm/5 text-muted">{item.description}</p>
          </div>
        </ListItem>
      ))}
    </ListContainer>
  ),
};

/**
 * Simple list with dividers between items.
 * Best for basic lists without a card container.
 */
export const Simple: Story = {
  args: {},
  render: () => (
    <ListContainer variant="simple">
      {items.map(item => (
        <ListItem key={item.id}>
          <div>
            <h3 className="text-sm/6 font-semibold text-foreground">{item.title}</h3>
            <p className="mt-1 text-sm/5 text-muted">{item.description}</p>
          </div>
        </ListItem>
      ))}
    </ListContainer>
  ),
};

/**
 * Full-width on mobile example.
 * Shows how the fullWidthOnMobile prop adjusts padding for mobile devices.
 */
export const FullWidthOnMobile: Story = {
  args: {},
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 text-sm/6 text-muted">Card - Normal</p>
        <ListContainer variant="card" fullWidthOnMobile={false}>
          {items.map(item => (
            <ListItem key={item.id}>
              <div>
                <h3 className="text-sm/6 font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm/5 text-muted">{item.description}</p>
              </div>
            </ListItem>
          ))}
        </ListContainer>
      </div>

      <div>
        <p className="mb-3 text-sm/6 text-muted">Card - Full Width on Mobile</p>
        <ListContainer variant="card" fullWidthOnMobile={true}>
          {items.map(item => (
            <ListItem key={item.id}>
              <div>
                <h3 className="text-sm/6 font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm/5 text-muted">{item.description}</p>
              </div>
            </ListItem>
          ))}
        </ListContainer>
      </div>
    </div>
  ),
};

/**
 * Card container with dividers between items.
 * Provides a card background with shadow and outline in dark mode.
 */
export const Card: Story = {
  args: {},
  render: () => (
    <ListContainer variant="card">
      {items.map(item => (
        <ListItem key={item.id}>
          <div>
            <h3 className="text-sm/6 font-semibold text-foreground">{item.title}</h3>
            <p className="mt-1 text-sm/5 text-muted">{item.description}</p>
          </div>
        </ListItem>
      ))}
    </ListContainer>
  ),
};

/**
 * Flat card with border instead of shadow.
 * Uses a solid border for a more minimal appearance.
 */
export const Flat: Story = {
  args: {},
  render: () => (
    <ListContainer variant="flat">
      {items.map(item => (
        <ListItem key={item.id}>
          <div>
            <h3 className="text-sm/6 font-semibold text-foreground">{item.title}</h3>
            <p className="mt-1 text-sm/5 text-muted">{item.description}</p>
          </div>
        </ListItem>
      ))}
    </ListContainer>
  ),
};

/**
 * Separate cards for each item with spacing between.
 * Each item gets its own card container with shadow and spacing.
 */
export const Separate: Story = {
  args: {},
  render: () => (
    <ListContainer variant="separate">
      {items.map(item => (
        <ListItem key={item.id}>
          <div>
            <h3 className="text-sm/6 font-semibold text-foreground">{item.title}</h3>
            <p className="mt-1 text-sm/5 text-muted">{item.description}</p>
          </div>
        </ListItem>
      ))}
    </ListContainer>
  ),
};

/**
 * Complex content example with the card variant.
 * Shows how the component works with richer content.
 */
export const WithComplexContent: Story = {
  args: {},
  render: () => (
    <ListContainer variant="card">
      <ListItem>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm/6 font-semibold text-foreground">Network Status</h3>
            <p className="mt-1 text-sm/5 text-muted">All systems operational</p>
          </div>
          <span className="inline-flex items-center rounded-xs bg-success/10 px-2 py-1 text-xs font-medium text-success">
            Healthy
          </span>
        </div>
      </ListItem>
      <ListItem>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm/6 font-semibold text-foreground">API Response Time</h3>
            <p className="mt-1 text-sm/5 text-muted">Average: 145ms</p>
          </div>
          <span className="inline-flex items-center rounded-xs bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
            Degraded
          </span>
        </div>
      </ListItem>
      <ListItem>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm/6 font-semibold text-foreground">Database Connection</h3>
            <p className="mt-1 text-sm/5 text-muted">Connection failed</p>
          </div>
          <span className="inline-flex items-center rounded-xs bg-danger/10 px-2 py-1 text-xs font-medium text-danger">
            Error
          </span>
        </div>
      </ListItem>
    </ListContainer>
  ),
};

/**
 * Using an ordered list instead of unordered.
 * Pass `as="ol"` to render an ordered list.
 */
export const OrderedList: Story = {
  args: {},
  render: () => (
    <ListContainer variant="card" as="ol">
      {items.map(item => (
        <ListItem key={item.id}>
          <div>
            <h3 className="text-sm/6 font-semibold text-foreground">{item.title}</h3>
            <p className="mt-1 text-sm/5 text-muted">{item.description}</p>
          </div>
        </ListItem>
      ))}
    </ListContainer>
  ),
};

/**
 * Square corners by default, but can be rounded via className.
 * Pass `className="rounded-sm"` or other rounding utilities to customize.
 */
export const WithRoundedCorners: Story = {
  args: {},
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-3 text-sm/6 text-muted">Square (default)</p>
        <ListContainer variant="card">
          {items.map(item => (
            <ListItem key={item.id}>
              <div>
                <h3 className="text-sm/6 font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm/5 text-muted">{item.description}</p>
              </div>
            </ListItem>
          ))}
        </ListContainer>
      </div>

      <div>
        <p className="mb-3 text-sm/6 text-muted">Rounded (className=&quot;rounded-sm&quot;)</p>
        <ListContainer variant="card" className="rounded-sm">
          {items.map(item => (
            <ListItem key={item.id}>
              <div>
                <h3 className="text-sm/6 font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm/5 text-muted">{item.description}</p>
              </div>
            </ListItem>
          ))}
        </ListContainer>
      </div>

      <div>
        <p className="mb-3 text-sm/6 text-muted">Separate items (className=&quot;rounded-lg&quot;)</p>
        <ListContainer variant="separate">
          {items.map(item => (
            <ListItem key={item.id} className="rounded-lg">
              <div>
                <h3 className="text-sm/6 font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm/5 text-muted">{item.description}</p>
              </div>
            </ListItem>
          ))}
        </ListContainer>
      </div>
    </div>
  ),
};
