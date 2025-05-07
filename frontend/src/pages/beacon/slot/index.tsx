import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Search } from 'lucide-react';
import useNetwork from '@/contexts/network';
import { BeaconClockManager } from '@/utils/beacon.ts';
import { Card, CardBody } from '@/components/common/Card';

function SlotLookup() {
  const navigate = useNavigate();
  const [slotNumber, setSlotNumber] = useState('');
  const { selectedNetwork } = useNetwork();
  const clock = BeaconClockManager.getInstance().getBeaconClock(selectedNetwork);
  const currentSlot = clock?.getCurrentSlot() || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotNumber) return;
    navigate(`${slotNumber}`);
  };

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card isPrimary className="relative">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent" />

        <CardBody className="relative">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Search className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-sans font-bold text-primary">
                Slot Explorer
              </h1>
              <p className="text-sm font-mono text-tertiary mt-1">
                Search for a specific slot to view detailed information
              </p>
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="number"
                  value={slotNumber}
                  onChange={e => setSlotNumber(e.target.value)}
                  placeholder={`Current slot: ${currentSlot.toLocaleString()}`}
                  className="w-full bg-nav/50 backdrop-blur-sm border border-subtle rounded-lg pl-4 pr-32 py-3 text-lg font-mono text-primary placeholder:text-tertiary focus:border-accent focus:outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <button
                    type="submit"
                    disabled={!slotNumber}
                    className="flex items-center gap-2 px-4 py-1.5 bg-accent/10 backdrop-blur-sm border border-accent/20 rounded-md text-accent hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={() => navigate('live')}
              className="group flex items-center gap-2 px-4 py-2 bg-nav/50 backdrop-blur-sm border border-accent/20 rounded-lg text-sm font-mono text-accent hover:bg-accent/20 hover:border-accent transition-colors"
            >
              <span>View Live Slot</span>
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            </button>
            <button
              onClick={() => navigate(`${currentSlot}`)}
              className="flex items-center gap-2 px-4 py-2 bg-nav/50 backdrop-blur-sm border border-subtle rounded-lg text-sm font-mono text-tertiary hover:text-primary hover:border-white/20 transition-colors"
            >
              <span>Current Slot</span>
              <span className="text-primary">{currentSlot.toLocaleString()}</span>
            </button>
          </div>
        </CardBody>
      </Card>

      {/* Warning Section */}
      <Card className="relative border border-warning/20">
        <div className="absolute inset-0 bg-gradient-to-br from-warning/5 via-transparent to-transparent" />
        <CardBody className="relative flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4 text-warning" />
          </div>
          <p className="text-sm font-mono text-secondary">
            This is an experimental feature. Historical slot data is only available for the past few
            days.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

export { SlotLookup };
