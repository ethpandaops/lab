import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { DataTable } from './DataTable';
import type { DataTableColumn } from './DataTable.types';
import { Badge } from '@/components/Elements/Badge';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  status: 'active' | 'inactive';
  createdAt: string;
  age: number;
}

const sampleData: User[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'admin',
    status: 'active',
    createdAt: '2024-01-15',
    age: 28,
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    role: 'user',
    status: 'active',
    createdAt: '2024-02-20',
    age: 34,
  },
  {
    id: '3',
    name: 'Carol Williams',
    email: 'carol@example.com',
    role: 'user',
    status: 'inactive',
    createdAt: '2024-03-10',
    age: 42,
  },
  {
    id: '4',
    name: 'David Brown',
    email: 'david@example.com',
    role: 'guest',
    status: 'active',
    createdAt: '2024-04-05',
    age: 25,
  },
  {
    id: '5',
    name: 'Emma Davis',
    email: 'emma@example.com',
    role: 'admin',
    status: 'active',
    createdAt: '2024-05-12',
    age: 31,
  },
  {
    id: '6',
    name: 'Frank Miller',
    email: 'frank@example.com',
    role: 'user',
    status: 'inactive',
    createdAt: '2024-06-18',
    age: 29,
  },
  {
    id: '7',
    name: 'Grace Wilson',
    email: 'grace@example.com',
    role: 'user',
    status: 'active',
    createdAt: '2024-07-22',
    age: 37,
  },
  {
    id: '8',
    name: 'Henry Moore',
    email: 'henry@example.com',
    role: 'guest',
    status: 'active',
    createdAt: '2024-08-14',
    age: 26,
  },
  {
    id: '9',
    name: 'Ivy Taylor',
    email: 'ivy@example.com',
    role: 'admin',
    status: 'active',
    createdAt: '2024-09-09',
    age: 33,
  },
  {
    id: '10',
    name: 'Jack Anderson',
    email: 'jack@example.com',
    role: 'user',
    status: 'inactive',
    createdAt: '2024-10-01',
    age: 40,
  },
  {
    id: '11',
    name: 'Karen Thomas',
    email: 'karen@example.com',
    role: 'user',
    status: 'active',
    createdAt: '2024-11-05',
    age: 27,
  },
  {
    id: '12',
    name: 'Liam Jackson',
    email: 'liam@example.com',
    role: 'guest',
    status: 'active',
    createdAt: '2024-11-15',
    age: 30,
  },
];

const basicColumns: DataTableColumn<User>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
    meta: {
      filterType: 'text',
      filterPlaceholder: 'Search names...',
      enableHiding: true,
      cellClassName: 'font-medium text-foreground',
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => row.original.email,
    meta: {
      filterType: 'text',
      filterPlaceholder: 'Search emails...',
      enableHiding: true,
    },
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => {
      const role = row.original.role;
      const colorMap = {
        admin: 'red' as const,
        user: 'blue' as const,
        guest: 'gray' as const,
      };
      return <Badge color={colorMap[role]}>{role}</Badge>;
    },
    meta: {
      filterType: 'select',
      filterOptions: [
        { value: 'admin', label: 'Admin' },
        { value: 'user', label: 'User' },
        { value: 'guest', label: 'Guest' },
      ],
      filterPlaceholder: 'All roles',
      enableHiding: true,
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge color={status === 'active' ? 'green' : 'gray'} dot>
          {status}
        </Badge>
      );
    },
    meta: {
      filterType: 'select',
      filterOptions: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
      ],
      filterPlaceholder: 'All statuses',
      enableHiding: true,
    },
  },
  {
    accessorKey: 'age',
    header: 'Age',
    cell: ({ row }) => row.original.age,
    meta: {
      filterType: 'number-range',
      filterPlaceholder: 'Min age...',
      enableHiding: true,
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    meta: {
      filterType: 'date-range',
      enableHiding: true,
    },
  },
];

const meta: Meta<typeof DataTable<User>> = {
  title: 'Lists/DataTable',
  component: DataTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DataTable<User>>;

export const Default: Story = {
  args: {
    data: sampleData,
    columns: basicColumns,
    title: 'Users',
    description: 'A comprehensive list of all users in the system',
  },
};

export const WithLoading: Story = {
  args: {
    data: [],
    columns: basicColumns,
    isLoading: true,
    title: 'Loading Data',
  },
};

export const EmptyState: Story = {
  args: {
    data: [],
    columns: basicColumns,
    emptyMessage: 'No users found. Try adjusting your filters.',
    title: 'Users',
  },
};

export const WithPagination: Story = {
  args: {
    data: sampleData,
    columns: basicColumns,
    pageSize: 5,
    title: 'Paginated Users',
    description: 'Showing 5 users per page',
  },
};

export const Clickable: Story = {
  args: {
    data: sampleData,
    columns: basicColumns,
    onRowClick: (row: User) => {
      alert(`Clicked on ${row.name}`);
    },
    title: 'Clickable Rows',
    description: 'Click on any row to see details',
  },
};

export const Controlled: Story = {
  render: () => {
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnVisibility, setColumnVisibility] = useState({});

    return (
      <DataTable
        data={sampleData}
        columns={basicColumns}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        sorting={sorting}
        onSortingChange={setSorting}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
        title="Controlled DataTable"
        description="All state is managed externally"
      />
    );
  },
};

export const MinimalColumns: Story = {
  args: {
    data: sampleData,
    columns: [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
        meta: {
          cellClassName: 'font-medium text-foreground',
        },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => row.original.email,
      },
    ],
    title: 'Minimal Example',
    description: 'Just name and email columns, no filters',
  },
};

export const NoHeaderOrDescription: Story = {
  args: {
    data: sampleData,
    columns: basicColumns,
  },
};

/** A row expands into a full-width row of details; the caller owns which rows are open */
export const ExpandedRow: Story = {
  render: args => {
    const [open, setOpen] = useState<string | null>('1');
    return (
      <DataTable
        {...args}
        onRowClick={user => setOpen(current => (current === user.id ? null : user.id))}
        renderExpandedRow={user =>
          open === user.id ? (
            <p className="text-sm text-muted">
              {user.email} joined on {user.createdAt}.
            </p>
          ) : null
        }
      />
    );
  },
  args: {
    data: sampleData,
    columns: basicColumns,
    title: 'Users',
  },
};
