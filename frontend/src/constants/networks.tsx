import { FaEthereum } from 'react-icons/fa';

export const NETWORK_METADATA = {
  mainnet: {
    name: 'Mainnet',
    icon: <FaEthereum className="w-5 h-5 text-white" />,
    color: '#627EEA',
  },
  sepolia: {
    name: 'Sepolia',
    icon: '🐬',
    color: '#CFB5F0',
  },
  holesky: {
    name: 'Holesky',
    icon: '🐱',
    color: '#A4E887',
  },
  hoodi: {
    name: 'Hoodi',
    icon: '🦊',
    color: '#FF9E2C',
  },
} as const;

export type NetworkKey = keyof typeof NETWORK_METADATA;
