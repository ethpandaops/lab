import type { Meta, StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { DatePicker } from './DatePicker';
import { Popover, PopoverButton, PopoverPanel } from '@/components/Overlays/Popover';

const meta: Meta<typeof DatePicker> = {
  title: 'Components/DateTimePickers/DatePicker',
  component: DatePicker,
  decorators: [
    (Story: React.ComponentType) => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DatePicker>;

/**
 * Default date picker with inline display
 */
export const Default: Story = {
  render: () => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    return <DatePicker selected={selectedDate} onChange={(date: Date | null) => setSelectedDate(date)} />;
  },
};

/**
 * Date picker with no initial selection
 */
export const NoInitialDate: Story = {
  render: () => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    return <DatePicker selected={selectedDate} onChange={(date: Date | null) => setSelectedDate(date)} />;
  },
};

/**
 * Date picker with a specific date selected
 */
export const WithSpecificDate: Story = {
  render: () => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date('2025-12-25'));

    return <DatePicker selected={selectedDate} onChange={(date: Date | null) => setSelectedDate(date)} />;
  },
};

/**
 * Date picker with disabled dates
 */
export const WithDisabledDates: Story = {
  render: () => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    // Disable weekends
    const isWeekday = (date: Date): boolean => {
      const day = date.getDay();
      return day !== 0 && day !== 6;
    };

    return (
      <DatePicker
        selected={selectedDate}
        onChange={(date: Date | null) => setSelectedDate(date)}
        filterDate={isWeekday}
      />
    );
  },
};

/**
 * Date picker with date range limits
 */
export const WithDateRange: Story = {
  render: () => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const today = new Date();
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);

    return (
      <DatePicker
        selected={selectedDate}
        onChange={(date: Date | null) => setSelectedDate(date)}
        minDate={today}
        maxDate={maxDate}
      />
    );
  },
};

/**
 * Date picker with range selection
 */
export const RangeSelection: Story = {
  render: () => {
    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const [startDate, setStartDate] = useState<Date | null>(today);
    const [endDate, setEndDate] = useState<Date | null>(weekFromNow);

    const handleChange = (dates: [Date | null, Date | null]): void => {
      const [start, end] = dates;
      setStartDate(start);
      setEndDate(end);
    };

    return (
      <div className="flex flex-col gap-3">
        <div className="text-sm/6 text-muted">
          <p>
            <strong>Start:</strong> {startDate?.toLocaleDateString() ?? 'None'}
          </p>
          <p>
            <strong>End:</strong> {endDate?.toLocaleDateString() ?? 'None'}
          </p>
        </div>
        <DatePicker selectsRange startDate={startDate} endDate={endDate} onChange={handleChange} />
      </div>
    );
  },
};

/**
 * Date picker inside a Popover with button trigger
 */
export const WithPopover: Story = {
  render: () => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    return (
      <div className="flex flex-col gap-4">
        <div className="text-base/7 text-foreground">
          <strong>Selected Date:</strong>{' '}
          <span className="text-muted">{selectedDate?.toLocaleDateString() ?? 'None'}</span>
        </div>

        <Popover className="relative">
          <PopoverButton variant="secondary" size="md">
            <CalendarIcon className="size-5" />
            <span>Select Date</span>
          </PopoverButton>
          <PopoverPanel anchor="bottom start" className="mt-2">
            <DatePicker selected={selectedDate} onChange={(date: Date | null) => setSelectedDate(date)} />
          </PopoverPanel>
        </Popover>
      </div>
    );
  },
};
