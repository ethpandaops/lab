import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { DatePicker } from './DatePicker';
import { Popover, PopoverButton, PopoverPanel } from '@/components/Overlays/Popover';

const meta = {
  title: 'Components/DateTimePickers/DatePicker',
  component: DatePicker,
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
  argTypes: {
    value: {
      control: 'date',
    },
    minDate: {
      control: 'date',
    },
    maxDate: {
      control: 'date',
    },
    isOpen: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic usage of the DatePicker with Popover integration
 */
export const Basic: Story = {
  args: {
    value: new Date(),
    onChange: () => {},
  },
  render: () => {
    const [date, setDate] = useState(new Date());

    return (
      <div className="flex flex-col items-start gap-4">
        <Popover className="relative">
          <PopoverButton variant="secondary" size="md">
            <CalendarIcon className="size-5" />
            <span>{date.toLocaleDateString()}</span>
          </PopoverButton>
          <PopoverPanel anchor="bottom start" className="mt-2">
            <DatePicker value={date} onChange={newDate => setDate(newDate)} isOpen={true} />
          </PopoverPanel>
        </Popover>
      </div>
    );
  },
};

/**
 * DatePicker with minimum and maximum date constraints
 */
export const WithMinMaxDates: Story = {
  args: {
    value: new Date(),
    onChange: () => {},
  },
  render: () => {
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() - 7); // 7 days ago
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 7); // 7 days from now

    const [date, setDate] = useState(today);

    return (
      <div className="flex flex-col gap-4">
        <div className="text-sm text-foreground/70">
          <p>Min date: {minDate.toLocaleDateString()}</p>
          <p>Max date: {maxDate.toLocaleDateString()}</p>
          <p className="mt-2 font-medium">Selected: {date.toLocaleDateString()}</p>
        </div>
        <Popover className="relative">
          <PopoverButton variant="primary" size="md">
            <CalendarIcon className="size-5" />
            Select Date (within range)
          </PopoverButton>
          <PopoverPanel anchor="bottom start" className="mt-2">
            <DatePicker
              value={date}
              onChange={newDate => setDate(newDate)}
              minDate={minDate}
              maxDate={maxDate}
              isOpen={true}
            />
          </PopoverPanel>
        </Popover>
      </div>
    );
  },
};

/**
 * DatePicker always visible (no popover)
 */
export const AlwaysVisible: Story = {
  args: {
    value: new Date(),
    onChange: () => {},
  },
  render: () => {
    const [date, setDate] = useState(new Date());

    return (
      <div className="flex flex-col gap-4">
        <div className="text-sm font-medium text-foreground">Selected: {date.toLocaleDateString()}</div>
        <div className="inline-block rounded-sm border border-border bg-white dark:bg-zinc-800">
          <DatePicker value={date} onChange={newDate => setDate(newDate)} isOpen={true} />
        </div>
      </div>
    );
  },
};

/**
 * Multiple DatePickers for date range selection
 */
export const DateRangePicker: Story = {
  args: {
    value: new Date(),
    onChange: () => {},
  },
  render: () => {
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(() => {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date;
    });

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <Popover className="relative">
            <PopoverButton variant="secondary" size="sm">
              <CalendarIcon className="size-4" />
              Start: {startDate.toLocaleDateString()}
            </PopoverButton>
            <PopoverPanel anchor="bottom start" className="mt-2">
              <DatePicker
                value={startDate}
                onChange={newDate => setStartDate(newDate)}
                maxDate={endDate}
                isOpen={true}
              />
            </PopoverPanel>
          </Popover>

          <span className="text-foreground/50">→</span>

          <Popover className="relative">
            <PopoverButton variant="secondary" size="sm">
              <CalendarIcon className="size-4" />
              End: {endDate.toLocaleDateString()}
            </PopoverButton>
            <PopoverPanel anchor="bottom start" className="mt-2">
              <DatePicker value={endDate} onChange={newDate => setEndDate(newDate)} minDate={startDate} isOpen={true} />
            </PopoverPanel>
          </Popover>
        </div>

        <div className="rounded-md border border-border bg-background p-4">
          <p className="text-sm text-foreground/70">
            Date range: {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
          </p>
          <p className="mt-1 text-sm text-foreground/70">
            Days: {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))}
          </p>
        </div>
      </div>
    );
  },
};

/**
 * Different button variants and sizes
 */
export const ButtonVariants: Story = {
  args: {
    value: new Date(),
    onChange: () => {},
  },
  render: () => {
    const [date, setDate] = useState(new Date());

    return (
      <div className="flex flex-wrap gap-4">
        <Popover className="relative">
          <PopoverButton variant="primary" size="sm">
            <CalendarIcon className="size-4" />
            Primary Small
          </PopoverButton>
          <PopoverPanel anchor="bottom start" className="mt-2">
            <DatePicker value={date} onChange={setDate} isOpen={true} />
          </PopoverPanel>
        </Popover>

        <Popover className="relative">
          <PopoverButton variant="secondary" size="md">
            <CalendarIcon className="size-5" />
            Secondary Medium
          </PopoverButton>
          <PopoverPanel anchor="bottom start" className="mt-2">
            <DatePicker value={date} onChange={setDate} isOpen={true} />
          </PopoverPanel>
        </Popover>

        <Popover className="relative">
          <PopoverButton variant="soft" size="lg">
            <CalendarIcon className="size-6" />
            Soft Large
          </PopoverButton>
          <PopoverPanel anchor="bottom start" className="mt-2">
            <DatePicker value={date} onChange={setDate} isOpen={true} />
          </PopoverPanel>
        </Popover>
      </div>
    );
  },
};
