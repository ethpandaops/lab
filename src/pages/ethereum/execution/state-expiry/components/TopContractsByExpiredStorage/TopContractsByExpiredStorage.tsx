import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';

interface ContractExpiredStorageData {
  address: string;
  label?: string;
  expiredBytes: number;
  expiredSlotCount: number;
  percentOfTotalExpired: number;
}

// Mock data - will be replaced with real API data
const MOCK_TOP_EXPIRED_CONTRACTS: ContractExpiredStorageData[] = [
  {
    address: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
    label: 'Old Uniswap Router',
    expiredBytes: 850_000_000_000,
    expiredSlotCount: 5_200_000,
    percentOfTotalExpired: 18.5,
  },
  {
    address: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    label: 'Deprecated Swap Contract',
    expiredBytes: 620_000_000_000,
    expiredSlotCount: 3_800_000,
    percentOfTotalExpired: 13.5,
  },
  {
    address: '0x7BE8076f4EA4A4AD08075C2508e481d6C946D12b',
    label: 'Old OpenSea',
    expiredBytes: 480_000_000_000,
    expiredSlotCount: 2_900_000,
    percentOfTotalExpired: 10.4,
  },
  {
    address: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    label: 'Uniswap V2 Factory',
    expiredBytes: 350_000_000_000,
    expiredSlotCount: 2_100_000,
    percentOfTotalExpired: 7.6,
  },
  {
    address: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    label: 'Old Swap Router',
    expiredBytes: 280_000_000_000,
    expiredSlotCount: 1_700_000,
    percentOfTotalExpired: 6.1,
  },
  {
    address: '0x881D40237659C251811CEC9c364ef91dC08D300C',
    label: 'Deprecated Bridge',
    expiredBytes: 220_000_000_000,
    expiredSlotCount: 1_350_000,
    percentOfTotalExpired: 4.8,
  },
  {
    address: '0x1111111254fb6c44bAC0beD2854e76F90643097d',
    label: 'Old 1inch Router',
    expiredBytes: 180_000_000_000,
    expiredSlotCount: 1_100_000,
    percentOfTotalExpired: 3.9,
  },
  {
    address: '0xDef1C0ded9bec7F1a1670819833240f027b25EfF',
    label: 'Old 0x Exchange',
    expiredBytes: 150_000_000_000,
    expiredSlotCount: 920_000,
    percentOfTotalExpired: 3.3,
  },
  {
    address: '0x3dfd23A6c5E8BbcFc9581d2E864a68feb6a076d3',
    label: 'Aave V1',
    expiredBytes: 120_000_000_000,
    expiredSlotCount: 730_000,
    percentOfTotalExpired: 2.6,
  },
  {
    address: '0x398eC7346DcD622eDc5ae82352F02bE94C62d119',
    label: 'Old Lending Pool',
    expiredBytes: 95_000_000_000,
    expiredSlotCount: 580_000,
    percentOfTotalExpired: 2.1,
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

export function TopContractsByExpiredStorage(): JSX.Element {
  return (
    <Card rounded className="border-amber-500/20 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Top 10 Contracts by Expired Storage</h3>
        <p className="text-xs text-muted">Contracts with the most expired storage (6-month inactivity)</p>
        <p className="mt-1 text-xs text-amber-400">Mock data - API not yet available</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium text-muted uppercase">
              <th className="pr-4 pb-3">#</th>
              <th className="pr-4 pb-3">Contract</th>
              <th className="pr-4 pb-3 text-right">Expired Size</th>
              <th className="pr-4 pb-3 text-right">Expired Slots</th>
              <th className="pb-3 text-right">% of Expired</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_TOP_EXPIRED_CONTRACTS.map((item, index) => (
              <tr key={item.address} className="border-b border-border/50 last:border-0">
                <td className="py-3 pr-4 text-sm text-muted">{index + 1}</td>
                <td className="py-3 pr-4">
                  <div className="flex flex-col">
                    <span className="font-mono text-sm text-foreground">{truncateAddress(item.address)}</span>
                    {item.label && <span className="text-xs text-muted">{item.label}</span>}
                  </div>
                </td>
                <td className="py-3 pr-4 text-right">
                  <span className="font-mono text-sm font-medium text-amber-400 tabular-nums">
                    {formatBytes(item.expiredBytes)}
                  </span>
                </td>
                <td className="py-3 pr-4 text-right">
                  <span className="font-mono text-sm text-amber-400/70 tabular-nums">
                    {formatCount(item.expiredSlotCount)}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-2 w-16 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-300"
                        style={{ width: `${Math.min(item.percentOfTotalExpired * 5, 100)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono text-sm text-amber-400 tabular-nums">
                      {item.percentOfTotalExpired.toFixed(1)}%
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
