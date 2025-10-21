import type { Meta, StoryObj } from '@storybook/react-vite';
import { Divider } from './Divider';
import { Button } from '@/components/Elements/Button';
import { ButtonGroup } from '@/components/Elements/ButtonGroup';
import {
  PlusIcon,
  PencilIcon,
  PaperClipIcon,
  ChatBubbleBottomCenterTextIcon,
  TrashIcon,
} from '@heroicons/react/20/solid';

const meta = {
  title: 'Components/Layout/Divider',
  component: Divider,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="min-w-80 rounded-lg bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Plain: Story = {
  args: {},
};

export const WithLabel: Story = {
  args: {
    children: 'Continue',
  },
};

export const WithIcon: Story = {
  args: {
    variant: 'icon',
    children: <PlusIcon aria-hidden="true" className="size-5 text-muted" />,
  },
};

export const WithLabelLeft: Story = {
  args: {
    children: 'Continue',
    alignment: 'left',
  },
};

export const WithTitle: Story = {
  args: {
    variant: 'title',
    children: 'Projects',
  },
};

export const WithTitleLeft: Story = {
  args: {
    variant: 'title',
    children: 'Projects',
    alignment: 'left',
  },
};

export const WithButton: Story = {
  render: () => (
    <Divider
      variant="button"
      button={
        <Button variant="outline" size="md" rounded="full" leadingIcon={<PlusIcon />} nowrap>
          Add Item
        </Button>
      }
    />
  ),
};

export const WithTitleAndButton: Story = {
  render: () => (
    <Divider
      variant="button"
      button={
        <Button variant="primary" size="md" rounded="full" leadingIcon={<PlusIcon />} nowrap>
          Create New
        </Button>
      }
    >
      Projects
    </Divider>
  ),
};

export const WithToolbarSecondary: Story = {
  render: () => (
    <Divider
      variant="toolbar"
      toolbarButtons={
        <ButtonGroup>
          <Button variant="secondary" iconOnly leadingIcon={<PencilIcon />} aria-label="Edit" />
          <Button variant="secondary" iconOnly leadingIcon={<PaperClipIcon />} aria-label="Attach" />
          <Button variant="secondary" iconOnly leadingIcon={<ChatBubbleBottomCenterTextIcon />} aria-label="Comment" />
          <Button variant="secondary" iconOnly leadingIcon={<TrashIcon />} aria-label="Delete" />
        </ButtonGroup>
      }
    />
  ),
};

export const WithToolbarOutline: Story = {
  render: () => (
    <Divider
      variant="toolbar"
      toolbarButtons={
        <ButtonGroup>
          <Button variant="outline" iconOnly leadingIcon={<PencilIcon />} aria-label="Edit" />
          <Button variant="outline" iconOnly leadingIcon={<PaperClipIcon />} aria-label="Attach" />
          <Button variant="outline" iconOnly leadingIcon={<ChatBubbleBottomCenterTextIcon />} aria-label="Comment" />
          <Button variant="outline" iconOnly leadingIcon={<TrashIcon />} aria-label="Delete" />
        </ButtonGroup>
      }
    />
  ),
};

// Examples in a container to show them better
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="mb-4 text-sm font-medium text-foreground">Plain</h3>
        <Divider />
      </div>

      <div>
        <h3 className="mb-4 text-sm font-medium text-foreground">With Label (Center)</h3>
        <Divider>Continue</Divider>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-medium text-foreground">With Icon</h3>
        <Divider variant="icon">
          <PlusIcon aria-hidden="true" className="size-5 text-muted" />
        </Divider>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-medium text-foreground">With Label (Left)</h3>
        <Divider alignment="left">Continue</Divider>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-medium text-foreground">With Title (Center)</h3>
        <Divider variant="title">Projects</Divider>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-medium text-foreground">With Title (Left)</h3>
        <Divider variant="title" alignment="left">
          Projects
        </Divider>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-medium text-foreground">With Button</h3>
        <Divider
          variant="button"
          button={
            <Button variant="outline" size="md" rounded="full" leadingIcon={<PlusIcon />} nowrap>
              Button text
            </Button>
          }
        />
      </div>

      <div>
        <h3 className="mb-4 text-sm font-medium text-foreground">With Title and Button</h3>
        <Divider
          variant="button"
          button={
            <Button variant="primary" size="md" rounded="full" leadingIcon={<PlusIcon />} nowrap>
              Create New
            </Button>
          }
        >
          Projects
        </Divider>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-medium text-foreground">With Button (Outline)</h3>
        <Divider
          variant="button"
          button={
            <Button variant="outline" size="md" rounded="full" leadingIcon={<PlusIcon />} nowrap>
              Add Item
            </Button>
          }
        />
      </div>

      <div>
        <h3 className="mb-4 text-sm font-medium text-foreground">With Toolbar (Secondary)</h3>
        <Divider
          variant="toolbar"
          toolbarButtons={
            <ButtonGroup>
              <Button variant="secondary" iconOnly leadingIcon={<PencilIcon />} aria-label="Edit" />
              <Button variant="secondary" iconOnly leadingIcon={<PaperClipIcon />} aria-label="Attach" />
              <Button
                variant="secondary"
                iconOnly
                leadingIcon={<ChatBubbleBottomCenterTextIcon />}
                aria-label="Comment"
              />
              <Button variant="secondary" iconOnly leadingIcon={<TrashIcon />} aria-label="Delete" />
            </ButtonGroup>
          }
        />
      </div>

      <div>
        <h3 className="mb-4 text-sm font-medium text-foreground">With Toolbar (Outline)</h3>
        <Divider
          variant="toolbar"
          toolbarButtons={
            <ButtonGroup>
              <Button variant="outline" iconOnly leadingIcon={<PencilIcon />} aria-label="Edit" />
              <Button variant="outline" iconOnly leadingIcon={<PaperClipIcon />} aria-label="Attach" />
              <Button
                variant="outline"
                iconOnly
                leadingIcon={<ChatBubbleBottomCenterTextIcon />}
                aria-label="Comment"
              />
              <Button variant="outline" iconOnly leadingIcon={<TrashIcon />} aria-label="Delete" />
            </ButtonGroup>
          }
        />
      </div>
    </div>
  ),
};
