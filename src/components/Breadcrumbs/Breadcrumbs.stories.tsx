import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import { Breadcrumbs } from './Breadcrumbs';

const meta: Meta<typeof Breadcrumbs> = {
  title: 'Components/Breadcrumbs',
  component: Breadcrumbs,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default breadcrumbs display.
 *
 * Note: Breadcrumbs automatically generate from route matches,
 * so this story shows minimal content in the Storybook environment.
 */
export const Default: Story = {};

/**
 * Example showing breadcrumbs in a narrow container (mobile width).
 * Demonstrates the horizontal scrolling behavior.
 */
export const MobileWidth: Story = {
  decorators: [
    Story => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
};

/**
 * Static example showing what breadcrumbs look like with a shallow hierarchy.
 */
function ShallowBreadcrumbs(): JSX.Element {
  return (
    <nav
      className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Breadcrumb"
    >
      <Link to="/" className="shrink-0 text-sm/6 font-medium text-slate-400 hover:text-white">
        Home
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <ChevronRightIcon className="size-4 shrink-0 text-slate-600" />
        <span className="text-sm/6 font-medium whitespace-nowrap text-white">About</span>
      </div>
    </nav>
  );
}

export const ShallowHierarchy: Story = {
  render: () => <ShallowBreadcrumbs />,
};

/**
 * Static example showing breadcrumbs with multiple levels.
 */
function DeepBreadcrumbs(): JSX.Element {
  return (
    <nav
      className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Breadcrumb"
    >
      <Link to="/" className="shrink-0 text-sm/6 font-medium text-slate-400 hover:text-white">
        Home
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <ChevronRightIcon className="size-4 shrink-0 text-slate-600" />
        <Link to="/experiments" className="text-sm/6 font-medium whitespace-nowrap text-slate-400 hover:text-white">
          Experiments
        </Link>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ChevronRightIcon className="size-4 shrink-0 text-slate-600" />
        <a href="#" className="text-sm/6 font-medium whitespace-nowrap text-slate-400 hover:text-white">
          Layout Examples
        </a>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ChevronRightIcon className="size-4 shrink-0 text-slate-600" />
        <span className="text-sm/6 font-medium whitespace-nowrap text-white">Two Column Basic</span>
      </div>
    </nav>
  );
}

export const DeepHierarchy: Story = {
  render: () => <DeepBreadcrumbs />,
};

/**
 * Static example showing breadcrumbs with very long titles.
 * Demonstrates horizontal scrolling on narrow screens.
 */
function LongTitleBreadcrumbs(): JSX.Element {
  return (
    <nav
      className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Breadcrumb"
    >
      <Link to="/" className="shrink-0 text-sm/6 font-medium text-slate-400 hover:text-white">
        Home
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <ChevronRightIcon className="size-4 shrink-0 text-slate-600" />
        <a
          href="#"
          className="text-sm/6 font-medium whitespace-nowrap text-slate-400 hover:text-white"
          title="Advanced Experimental Layout Configurations"
        >
          Advanced Experimental Layout Configurations
        </a>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ChevronRightIcon className="size-4 shrink-0 text-slate-600" />
        <span
          className="text-sm/6 font-medium whitespace-nowrap text-white"
          title="Multi-Column Responsive Grid Layout Example"
        >
          Multi-Column Responsive Grid Layout Example
        </span>
      </div>
    </nav>
  );
}

export const LongTitles: Story = {
  render: () => <LongTitleBreadcrumbs />,
};

/**
 * Long titles in a narrow container - shows scrolling behavior.
 */
export const LongTitlesMobile: Story = {
  render: () => <LongTitleBreadcrumbs />,
  decorators: [
    Story => (
      <div className="w-72 border border-slate-700 p-4">
        <Story />
        <p className="mt-2 text-xs text-slate-400">Swipe/scroll horizontally to see full breadcrumbs</p>
      </div>
    ),
  ],
};
