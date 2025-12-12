import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';

interface AddressStorageData {
  address: string;
  label?: string;
  bytes: number;
  slotCount: number;
  percentOfTotal: number;
}

// Mock data - will be replaced with real API data
const MOCK_TOP_ADDRESSES: AddressStorageData[] = [
  {
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    label: 'Uniswap',
    bytes: 2_500_000_000_000,
    slotCount: 15_000_000,
    percentOfTotal: 12.5,
  },
  {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    label: 'WETH',
    bytes: 1_800_000_000_000,
    slotCount: 10_500_000,
    percentOfTotal: 9.0,
  },
  {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    label: 'USDC',
    bytes: 1_500_000_000_000,
    slotCount: 9_200_000,
    percentOfTotal: 7.5,
  },
  {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    label: 'USDT',
    bytes: 1_200_000_000_000,
    slotCount: 7_800_000,
    percentOfTotal: 6.0,
  },
  {
    address: '0x6B175474E89094C44Da98b954EescdcCB44fBF',
    label: 'DAI',
    bytes: 900_000_000_000,
    slotCount: 5_500_000,
    percentOfTotal: 4.5,
  },
  {
    address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    label: 'Uniswap V2 Router',
    bytes: 750_000_000_000,
    slotCount: 4_200_000,
    percentOfTotal: 3.75,
  },
  {
    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    label: 'LINK',
    bytes: 600_000_000_000,
    slotCount: 3_600_000,
    percentOfTotal: 3.0,
  },
  {
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    label: 'WBTC',
    bytes: 480_000_000_000,
    slotCount: 2_900_000,
    percentOfTotal: 2.4,
  },
  {
    address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
    label: 'SHIB',
    bytes: 420_000_000_000,
    slotCount: 2_500_000,
    percentOfTotal: 2.1,
  },
  {
    address: '0x1f98407Aabd2bA88ab4ED8BE33E4b74C04eD3F',
    label: 'Unknown',
    bytes: 350_000_000_000,
    slotCount: 2_100_000,
    percentOfTotal: 1.75,
  },
];

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1000) {
    return `${(gb / 1024).toFixed(2)} TB`;
  }
  if (gb >= 1) {
    return `${gb.toFixed(2)} GB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

function formatCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(2)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(2)}K`;
  }
  return count.toLocaleString();
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function TopAddressesByStorage(): JSX.Element {
  return (
    <Card rounded className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Top 10 Addresses by Storage</h3>
        <p className="text-xs text-muted">Contracts with the most storage slot bytes</p>
        <p className="mt-1 text-xs text-amber-400">Mock data - API not yet available</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium text-muted uppercase">
              <th className="pr-4 pb-3">#</th>
              <th className="pr-4 pb-3">Address</th>
              <th className="pr-4 pb-3 text-right">Storage Size</th>
              <th className="pr-4 pb-3 text-right">Slot Count</th>
              <th className="pb-3 text-right">% of Total</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_TOP_ADDRESSES.map((item, index) => (
              <tr key={item.address} className="border-b border-border/50 last:border-0">
                <td className="py-3 pr-4 text-sm text-muted">{index + 1}</td>
                <td className="py-3 pr-4">
                  <div className="flex flex-col">
                    <span className="font-mono text-sm text-foreground">{truncateAddress(item.address)}</span>
                    {item.label && <span className="text-xs text-muted">{item.label}</span>}
                  </div>
                </td>
                <td className="py-3 pr-4 text-right">
                  <span className="font-mono text-sm font-medium text-foreground tabular-nums">
                    {formatBytes(item.bytes)}
                  </span>
                </td>
                <td className="py-3 pr-4 text-right">
                  <span className="font-mono text-sm text-muted tabular-nums">{formatCount(item.slotCount)}</span>
                </td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${Math.min(item.percentOfTotal * 8, 100)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono text-sm text-muted tabular-nums">
                      {item.percentOfTotal.toFixed(2)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
