import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Dialog } from './Dialog';
import { Button } from '@/components/Elements/Button';
import { Alert } from '@/components/Feedback/Alert';
import { Input } from '@/components/Forms/Input';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import { Toggle } from '@/components/Forms/Toggle';
import { TrashIcon, UserIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

const meta: Meta<typeof Dialog> = {
  title: 'Components/Overlays/Dialog',
  component: Dialog,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    Story => (
      <div className="flex min-h-screen items-center justify-center bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic dialog with title and description
 */
export const Default: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Dialog</Button>
        <Dialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title="Dialog Title"
          description="This is a basic dialog with a title and description."
        >
          <p className="text-sm text-foreground dark:text-gray-300">
            This is the main content of the dialog. You can put any content here.
          </p>
        </Dialog>
      </>
    );
  },
};

/**
 * Dialog with footer buttons
 */
export const WithFooter: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Dialog</Button>
        <Dialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title="Confirm Action"
          description="Are you sure you want to proceed with this action?"
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setIsOpen(false);
                  alert('Action confirmed!');
                }}
              >
                Confirm
              </Button>
            </>
          }
        >
          <p className="text-sm text-foreground dark:text-gray-300">
            This action will make changes to your account. Please review before confirming.
          </p>
        </Dialog>
      </>
    );
  },
};

/**
 * Danger/destructive action dialog
 */
export const DangerDialog: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button variant="danger" onClick={() => setIsOpen(true)}>
          Delete Account
        </Button>
        <Dialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title="Delete Account"
          description="This action cannot be undone. All your data will be permanently deleted."
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                leadingIcon={<TrashIcon />}
                onClick={() => {
                  setIsOpen(false);
                  alert('Account deleted!');
                }}
              >
                Delete Account
              </Button>
            </>
          }
        >
          <Alert
            variant="error"
            title="Warning"
            description="This will permanently delete your account and all associated data. This action cannot be reversed."
          />
        </Dialog>
      </>
    );
  },
};

/**
 * Small dialog
 */
export const SmallSize: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Small Dialog</Button>
        <Dialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title="Small Dialog"
          size="sm"
          footer={
            <Button variant="primary" onClick={() => setIsOpen(false)}>
              Got it
            </Button>
          }
        >
          <p className="text-sm text-foreground dark:text-gray-300">This is a small dialog.</p>
        </Dialog>
      </>
    );
  },
};

/**
 * Large dialog
 */
export const LargeSize: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Large Dialog</Button>
        <Dialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title="Large Dialog"
          description="This dialog has more content and uses the large size."
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setIsOpen(false)}>
                Save Changes
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-foreground dark:text-muted">
              This is a larger dialog that can contain more content. You can add forms, lists, or any other complex
              content here.
            </p>
            <Alert
              variant="info"
              description="Tip: You can use different sizes to accommodate different amounts of content."
            />
          </div>
        </Dialog>
      </>
    );
  },
};

/**
 * Dialog without close button
 */
export const NoCloseButton: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Dialog</Button>
        <Dialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title="Required Action"
          description="You must complete this action to continue."
          showCloseButton={false}
          footer={
            <Button variant="primary" onClick={() => setIsOpen(false)}>
              Complete Action
            </Button>
          }
        >
          <p className="text-sm text-foreground dark:text-gray-300">
            This dialog has no close button in the header, but can still be closed by pressing Escape or clicking the
            footer button.
          </p>
        </Dialog>
      </>
    );
  },
};

/**
 * Dialog with no title or description
 */
export const ContentOnly: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Open Dialog</Button>
        <Dialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          footer={
            <Button variant="primary" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground dark:text-white">Custom Content</h3>
            <p className="text-sm text-foreground dark:text-muted">
              This dialog has no title or description props, allowing for fully custom content layout.
            </p>
          </div>
        </Dialog>
      </>
    );
  },
};

/**
 * Dialog with form inputs
 */
export const WithForm: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [role, setRole] = useState('member');
    const [notifications, setNotifications] = useState(true);

    return (
      <>
        <Button onClick={() => setIsOpen(true)}>Add Team Member</Button>
        <Dialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title="Add Team Member"
          description="Invite a new member to join your team. They will receive an email invitation."
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setIsOpen(false);
                  alert('Team member invited!');
                }}
              >
                Send Invite
              </Button>
            </>
          }
        >
          <form className="space-y-4">
            <Input
              label="Full name"
              type="text"
              placeholder="John Smith"
              leadingIcon={<UserIcon className="size-5" />}
            />

            <Input
              label="Email address"
              type="email"
              placeholder="john@example.com"
              leadingIcon={<EnvelopeIcon className="size-5" />}
            />

            <SelectMenu
              value={role}
              onChange={setRole}
              options={[
                { value: 'member', label: 'Member - Can view and comment' },
                { value: 'editor', label: 'Editor - Can edit and publish' },
                { value: 'admin', label: 'Admin - Full access' },
              ]}
              label="Role"
              showLabel
            />

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="text-sm font-medium text-foreground dark:text-foreground">Email notifications</label>
                <p className="text-sm text-muted dark:text-muted">Send activity notifications to this member</p>
              </div>
              <Toggle checked={notifications} onChange={setNotifications} />
            </div>
          </form>
        </Dialog>
      </>
    );
  },
};
