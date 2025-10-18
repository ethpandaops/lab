import { type JSX, useState, useEffect } from 'react';
import { useNetwork } from '@/hooks/useNetwork';

const SECONDS_PER_SLOT = 12;
const SLOTS_PER_EPOCH = 32;

export function NetworkSummary(): JSX.Element {
  const { currentNetwork } = useNetwork();
  const [slot, setSlot] = useState<number>(0);
  const [epoch, setEpoch] = useState<number>(0);

  useEffect(() => {
    if (!currentNetwork) return;

    const calculateSlotAndEpoch = (): void => {
      const now = Math.floor(Date.now() / 1000);
      const currentSlot = Math.floor((now - currentNetwork.genesis_time) / SECONDS_PER_SLOT);
      const currentEpoch = Math.floor(currentSlot / SLOTS_PER_EPOCH);

      setSlot(currentSlot);
      setEpoch(currentEpoch);
    };

    // Calculate immediately
    calculateSlotAndEpoch();

    // Update every second
    const interval = setInterval(calculateSlotAndEpoch, 1000);

    return () => clearInterval(interval);
  }, [currentNetwork]);

  if (!currentNetwork) {
    return <div className="bg-[#1e293b] px-4 py-2 text-sm/6 text-slate-500">Loading...</div>;
  }

  return (
    <div className="bg-[#1e293b] px-4 py-2 font-mono text-sm/6">
      <span className="text-slate-400">Slot</span> <span className="text-white">{slot}</span>
      <span className="text-slate-500"> · </span>
      <span className="text-slate-400">Epoch</span> <span className="text-white">{epoch}</span>
    </div>
  );
}
