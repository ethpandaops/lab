import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { FilterBar, FilterRange, FilterToggle } from './FilterBar';
import { formatRange } from './FilterBar.utils';

const meta = {
  title: 'Components/Forms/FilterBar',
  component: FilterBar,
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
} satisfies Meta<typeof FilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

interface ExampleFilters {
  blobsMin?: number;
  blobsMax?: number;
  paths?: string[];
}

const PATHS = ['Partial gossip', 'Execution layer', 'Reconstruction'];

function Example({ initial = {} }: { initial?: ExampleFilters }): JSX.Element {
  const [filters, setFilters] = useState<ExampleFilters>(initial);
  const blobs = formatRange(filters.blobsMin, filters.blobsMax);
  return (
    <FilterBar
      filters={filters}
      onChange={setFilters}
      title="Filter blocks"
      chips={[
        ...(blobs
          ? [
              {
                id: 'blobs',
                label: 'Blobs',
                value: blobs,
                onRemove: () => setFilters({ ...filters, blobsMin: undefined, blobsMax: undefined }),
              },
            ]
          : []),
        ...(filters.paths?.length
          ? [
              {
                id: 'paths',
                label: 'Completed via',
                value: filters.paths.join(', '),
                onRemove: () => setFilters({ ...filters, paths: undefined }),
              },
            ]
          : []),
      ]}
    >
      {(draft, setDraft) => (
        <>
          <FilterRange
            label="Blobs"
            step={1}
            min={draft.blobsMin}
            max={draft.blobsMax}
            onChange={(blobsMin, blobsMax) => setDraft({ ...draft, blobsMin, blobsMax })}
          />
          <div className="flex flex-wrap gap-1.5">
            {PATHS.map(path => (
              <FilterToggle
                key={path}
                selected={!!draft.paths?.includes(path)}
                onClick={() =>
                  setDraft({
                    ...draft,
                    paths: draft.paths?.includes(path)
                      ? draft.paths.filter(p => p !== path)
                      : [...(draft.paths ?? []), path],
                  })
                }
              >
                {path}
              </FilterToggle>
            ))}
          </div>
        </>
      )}
    </FilterBar>
  );
}

export const Default: Story = {
  args: {} as never,
  render: () => <Example />,
};

export const WithActiveFilters: Story = {
  args: {} as never,
  render: () => <Example initial={{ blobsMin: 6, paths: ['Reconstruction'] }} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('≥ 6')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Remove Blobs filter' }));
    await expect(canvas.queryByText('≥ 6')).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Clear all' }));
    await expect(canvas.queryByText('Reconstruction')).not.toBeInTheDocument();
  },
};
