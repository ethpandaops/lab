import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type JSX } from 'react';
import { Notification } from './Notification';
import { Button } from '@/components/Elements/Button';

const meta = {
  title: 'Components/Overlays/Notification',
  component: Notification,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Whether the notification is visible',
    },
    position: {
      control: 'select',
      options: ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'],
      description: 'Position on screen',
    },
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'danger'],
      description: 'Variant/type of notification',
    },
    duration: {
      control: 'number',
      description: 'Duration in milliseconds before auto-dismiss (0 to disable)',
    },
    showCloseButton: {
      control: 'boolean',
      description: 'Whether to show a close button',
    },
  },
  decorators: [
    Story => (
      <div className="min-h-screen bg-background p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Notification>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Interactive demo showing how notifications are triggered by user actions
 */
export const Interactive: Story = {
  render: function InteractiveDemo(): JSX.Element {
    const [show, setShow] = useState(false);

    const handleClick = (): void => {
      setShow(true);
    };

    return (
      <div className="flex items-center justify-center gap-4">
        <Button onClick={handleClick}>Show Notification</Button>
        <Notification
          open={show}
          onClose={() => setShow(false)}
          variant="success"
          position="top-center"
          duration={3000}
        >
          Action completed successfully!
        </Notification>
      </div>
    );
  },
};

/**
 * Success notification - typically used for successful operations
 */
export const Success: Story = {
  render: function SuccessDemo(): JSX.Element {
    const [show, setShow] = useState(false);

    return (
      <div className="flex items-center justify-center gap-4">
        <Button onClick={() => setShow(true)}>Copy to Clipboard</Button>
        <Notification
          open={show}
          onClose={() => setShow(false)}
          variant="success"
          position="top-center"
          duration={3000}
        >
          Copied to clipboard!
        </Notification>
      </div>
    );
  },
};

/**
 * Info notification - for informational messages
 */
export const Info: Story = {
  render: function InfoDemo(): JSX.Element {
    const [show, setShow] = useState(false);

    return (
      <div className="flex items-center justify-center gap-4">
        <Button onClick={() => setShow(true)}>Show Info</Button>
        <Notification open={show} onClose={() => setShow(false)} variant="info" position="top-center" duration={3000}>
          New data available
        </Notification>
      </div>
    );
  },
};

/**
 * Warning notification - for warning messages
 */
export const Warning: Story = {
  render: function WarningDemo(): JSX.Element {
    const [show, setShow] = useState(false);

    return (
      <div className="flex items-center justify-center gap-4">
        <Button onClick={() => setShow(true)}>Show Warning</Button>
        <Notification
          open={show}
          onClose={() => setShow(false)}
          variant="warning"
          position="top-center"
          duration={3000}
        >
          Connection unstable
        </Notification>
      </div>
    );
  },
};

/**
 * Danger notification - for error messages
 */
export const Danger: Story = {
  render: function DangerDemo(): JSX.Element {
    const [show, setShow] = useState(false);

    return (
      <div className="flex items-center justify-center gap-4">
        <Button onClick={() => setShow(true)}>Show Error</Button>
        <Notification open={show} onClose={() => setShow(false)} variant="danger" position="top-center" duration={3000}>
          Failed to save changes
        </Notification>
      </div>
    );
  },
};

/**
 * Different positions on screen
 */
export const Positions: Story = {
  render: function PositionsDemo(): JSX.Element {
    const [activePosition, setActivePosition] = useState<string | null>(null);

    const positions = [
      { value: 'top-left' as const, label: 'Top Left' },
      { value: 'top-center' as const, label: 'Top Center' },
      { value: 'top-right' as const, label: 'Top Right' },
      { value: 'bottom-left' as const, label: 'Bottom Left' },
      { value: 'bottom-center' as const, label: 'Bottom Center' },
      { value: 'bottom-right' as const, label: 'Bottom Right' },
    ];

    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="grid grid-cols-3 gap-4">
          {positions.map(pos => (
            <Button key={pos.value} onClick={() => setActivePosition(pos.value)}>
              {pos.label}
            </Button>
          ))}
        </div>
        {positions.map(pos => (
          <Notification
            key={pos.value}
            open={activePosition === pos.value}
            onClose={() => setActivePosition(null)}
            variant="info"
            position={pos.value}
            duration={3000}
          >
            Notification at {pos.label}
          </Notification>
        ))}
      </div>
    );
  },
};

/**
 * With close button for manual dismissal
 */
export const WithCloseButton: Story = {
  render: function WithCloseButtonDemo(): JSX.Element {
    const [show, setShow] = useState(false);

    return (
      <div className="flex items-center justify-center gap-4">
        <Button onClick={() => setShow(true)}>Show with Close Button</Button>
        <Notification
          open={show}
          onClose={() => setShow(false)}
          variant="info"
          position="top-center"
          duration={0}
          showCloseButton
        >
          This notification stays until you close it
        </Notification>
      </div>
    );
  },
};

/**
 * Custom duration - quick notification
 */
export const QuickDismiss: Story = {
  render: function QuickDismissDemo(): JSX.Element {
    const [show, setShow] = useState(false);

    return (
      <div className="flex items-center justify-center gap-4">
        <Button onClick={() => setShow(true)}>Quick Notification (1s)</Button>
        <Notification
          open={show}
          onClose={() => setShow(false)}
          variant="success"
          position="top-center"
          duration={1000}
        >
          Quick message!
        </Notification>
      </div>
    );
  },
};

/**
 * Long duration notification
 */
export const LongDuration: Story = {
  render: function LongDurationDemo(): JSX.Element {
    const [show, setShow] = useState(false);

    return (
      <div className="flex items-center justify-center gap-4">
        <Button onClick={() => setShow(true)}>Long Notification (10s)</Button>
        <Notification
          open={show}
          onClose={() => setShow(false)}
          variant="info"
          position="top-center"
          duration={10000}
          showCloseButton
        >
          This notification lasts 10 seconds (or close it manually)
        </Notification>
      </div>
    );
  },
};

/**
 * Multiple notifications can be triggered sequentially
 */
export const MultipleActions: Story = {
  render: function MultipleActionsDemo(): JSX.Element {
    const [show1, setShow1] = useState(false);
    const [show2, setShow2] = useState(false);
    const [show3, setShow3] = useState(false);

    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="flex gap-4">
          <Button onClick={() => setShow1(true)}>Save</Button>
          <Button onClick={() => setShow2(true)}>Delete</Button>
          <Button onClick={() => setShow3(true)}>Export</Button>
        </div>
        <Notification
          open={show1}
          onClose={() => setShow1(false)}
          variant="success"
          position="top-center"
          duration={3000}
        >
          Saved successfully!
        </Notification>
        <Notification
          open={show2}
          onClose={() => setShow2(false)}
          variant="danger"
          position="top-center"
          duration={3000}
        >
          Item deleted
        </Notification>
        <Notification open={show3} onClose={() => setShow3(false)} variant="info" position="top-center" duration={3000}>
          Exported to CSV
        </Notification>
      </div>
    );
  },
};
