import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardHeader, CardBody, CardFooter } from './Card';

const meta = {
  title: 'Components/Layout/Card',
  component: Card,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic secondary card with simple content.
 */
export const Secondary: Story = {
  args: {
    children: <p>This is a basic secondary card</p>,
  },
};

/**
 * Primary card variant with isPrimary prop.
 */
export const Primary: Story = {
  args: {
    isPrimary: true,
    children: <p>This is a primary card</p>,
  },
};

/**
 * Interactive card with onClick handler.
 * Click the card to see the interaction.
 */
export const Interactive: Story = {
  args: {
    isInteractive: true,
    onClick: () => alert('Card clicked!'),
    children: <p>Click me! I&apos;m an interactive card</p>,
  },
};

/**
 * Card with header, body, and footer sections.
 */
export const WithSections: Story = {
  args: {
    children: null,
  },
  render: () => (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-bold">Card Header</h3>
      </CardHeader>
      <CardBody>
        <p>This is the card body with some content.</p>
      </CardBody>
      <CardFooter>
        <button className="btn">Action</button>
      </CardFooter>
    </Card>
  ),
};

/**
 * Primary card with all sections.
 */
export const PrimaryWithSections: Story = {
  args: {
    children: null,
  },
  render: () => (
    <Card isPrimary>
      <CardHeader>
        <h3 className="text-lg font-bold">Primary Card</h3>
      </CardHeader>
      <CardBody>
        <p>This is a primary card with header, body, and footer.</p>
      </CardBody>
      <CardFooter>
        <div className="flex gap-2">
          <button className="btn">Cancel</button>
          <button className="btn btn-primary">Confirm</button>
        </div>
      </CardFooter>
    </Card>
  ),
};

/**
 * Interactive card with sections.
 * Click the card to see the interaction.
 */
export const InteractiveWithSections: Story = {
  args: {
    children: null,
  },
  render: () => (
    <Card isInteractive onClick={() => alert('Card clicked!')}>
      <CardHeader>
        <h3 className="text-lg font-bold">Interactive Card</h3>
      </CardHeader>
      <CardBody>
        <p>Click anywhere on this card to trigger the action.</p>
      </CardBody>
      <CardFooter>
        <span className="text-sm text-secondary">Click me!</span>
      </CardFooter>
    </Card>
  ),
};

/**
 * Card with custom className.
 */
export const CustomStyled: Story = {
  args: {
    className: 'border-4 border-blue-500',
    children: <p>This card has a custom blue border</p>,
  },
};
