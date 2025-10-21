import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table } from './Table';
import type { Column } from './Table.types';

interface Transaction {
  id: string;
  company: string;
  share: string;
  commission: string;
  price: string;
  quantity: string;
  netAmount: string;
}

const transactions: Transaction[] = [
  {
    id: 'AAPS0L',
    company: 'Chase & Co.',
    share: 'CAC',
    commission: '+$4.37',
    price: '$3,509.00',
    quantity: '12.00',
    netAmount: '$4,397.00',
  },
  {
    id: 'O2KMND',
    company: 'Amazon.com Inc.',
    share: 'AMZN',
    commission: '+$5.92',
    price: '$2,900.00',
    quantity: '8.80',
    netAmount: '$3,509.00',
  },
  {
    id: '1LP2P4',
    company: 'Procter & Gamble',
    share: 'PG',
    commission: '-$5.65',
    price: '$7,978.00',
    quantity: '2.30',
    netAmount: '$2,652.00',
  },
  {
    id: 'PS9FJGL',
    company: 'Berkshire Hathaway',
    share: 'BRK',
    commission: '+$4.37',
    price: '$3,116.00',
    quantity: '48.00',
    netAmount: '$6,055.00',
  },
  {
    id: 'QYR135',
    company: 'Apple Inc.',
    share: 'AAPL',
    commission: '+$38.00',
    price: '$8,508.00',
    quantity: '36.00',
    netAmount: '$3,496.00',
  },
  {
    id: '99SLSM',
    company: 'NVIDIA Corporation',
    share: 'NVDA',
    commission: '+$1,427.00',
    price: '$4,425.00',
    quantity: '18.00',
    netAmount: '$2,109.00',
  },
  {
    id: 'OSDJLS',
    company: 'Johnson & Johnson',
    share: 'JNJ',
    commission: '+$1,937.23',
    price: '$4,038.00',
    quantity: '32.00',
    netAmount: '$7,210.00',
  },
  {
    id: '4HJK3N',
    company: 'JPMorgan',
    share: 'JPM',
    commission: '-$3.67',
    price: '$3,966.00',
    quantity: '80.00',
    netAmount: '$6,432.00',
  },
];

const meta = {
  title: 'Components/Lists/Table',
  component: Table,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const basicColumns: Column<Transaction>[] = [
  { header: 'Transaction ID', accessor: 'id' },
  { header: 'Company', accessor: 'company', cellClassName: 'font-medium text-foreground' },
  { header: 'Share', accessor: 'share', cellClassName: 'text-foreground' },
  { header: 'Commission', accessor: 'commission' },
  { header: 'Price', accessor: 'price' },
  { header: 'Quantity', accessor: 'quantity' },
  { header: 'Net amount', accessor: 'netAmount' },
];

export const Default: Story = {
  args: {
    data: [],
    columns: [],
  },
  render: () => <Table data={transactions} columns={basicColumns} />,
};

export const WithTitleAndDescription: Story = {
  args: {
    data: [],
    columns: [],
  },
  render: () => (
    <Table
      data={transactions}
      columns={basicColumns}
      title="Transactions"
      description="A table of placeholder stock market data that does not make any sense."
    />
  ),
};

const customColumns: Column<Transaction>[] = [
  { header: 'Transaction ID', accessor: 'id' },
  {
    header: 'Company Info',
    accessor: (row: Transaction) => (
      <div>
        <div className="font-medium text-foreground">{row.company}</div>
        <div className="text-muted">{row.share}</div>
      </div>
    ),
  },
  { header: 'Commission', accessor: 'commission' },
  { header: 'Price', accessor: 'price' },
  { header: 'Quantity', accessor: 'quantity' },
  { header: 'Net amount', accessor: 'netAmount' },
];

export const WithCustomAccessor: Story = {
  args: {
    data: [],
    columns: [],
  },
  render: () => (
    <Table
      data={transactions}
      columns={customColumns}
      title="Custom Accessor Example"
      description="Company and Share columns combined using a custom accessor function."
    />
  ),
};

export const Empty: Story = {
  args: {
    data: [],
    columns: [],
  },
  render: () => <Table data={[]} columns={basicColumns} title="Empty Table" description="No transactions available." />,
};
