import { type JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { NetworkIcon } from '@/components/Ethereum/NetworkIcon';
import { type Network } from '@/hooks/useConfig/useConfig.types';
import { useNetwork } from '@/hooks/useNetwork';
import { SECONDS_PER_SLOT, SLOTS_PER_EPOCH } from '@/utils/beacon';
import { getActiveFork } from '@/utils/forks';
import { NETWORK_ORDER } from '@/utils/networks';
import { formatSlot } from '@/utils/number';

/** Compute the current slot for a network from its genesis time. */
function getCurrentSlot(genesisTime: number, now: number): number {
  const elapsed = now - genesisTime;
  if (elapsed < 0) return 0;
  return Math.floor(elapsed / SECONDS_PER_SLOT);
}

/** Single scoreboard digit cell — flips vertically when the value changes. */
function FlipDigit({ digit }: { digit: string }): JSX.Element {
  const prevRef = useRef(digit);
  const [outgoing, setOutgoing] = useState<string | null>(null);

  useEffect(() => {
    if (digit !== prevRef.current) {
      setOutgoing(prevRef.current);
      prevRef.current = digit;
      const timer = setTimeout(() => setOutgoing(null), 350);
      return () => clearTimeout(timer);
    }
  }, [digit]);

  return (
    <span className="relative inline-flex h-5 w-3.5 items-center justify-center overflow-hidden rounded-[2px] bg-foreground/[0.05]">
      {outgoing !== null && (
        <span
          className="absolute inset-0 flex items-center justify-center"
          style={{ animation: 'digit-out 350ms ease-in forwards' }}
        >
          {outgoing}
        </span>
      )}
      <span
        className="flex items-center justify-center"
        style={outgoing !== null ? { animation: 'digit-in 350ms ease-out both' } : undefined}
      >
        {digit}
      </span>
    </span>
  );
}

/** Scoreboard-style slot display — each digit in its own cell with flip animation. */
function SlotDisplay({ slot }: { slot: number }): JSX.Element {
  const digits = formatSlot(slot).split('');

  return (
    <span className="inline-flex gap-0.5 text-[11px]/4 text-muted/70 tabular-nums transition-colors duration-200 group-hover:text-muted">
      {digits.map((d, i) => (
        <FlipDigit key={`p${digits.length - 1 - i}`} digit={d} />
      ))}
    </span>
  );
}

/** Instrument-style network readout panel. */
function NetworkCard({
  network,
  now,
  onClick,
}: {
  network: Network;
  now: number;
  onClick: (n: Network) => void;
}): JSX.Element {
  const slot = getCurrentSlot(network.genesis_time, now);
  const epoch = Math.floor(slot / SLOTS_PER_EPOCH);
  const activeFork = getActiveFork(network, epoch);
  const forkLabel = activeFork?.combinedName ?? activeFork?.displayName ?? 'Unknown';

  return (
    <button
      type="button"
      onClick={() => onClick(network)}
      className="group flex w-44 cursor-pointer flex-col items-center gap-2.5 rounded-sm border border-border/30 bg-surface px-5 py-5 text-center transition-all duration-200 hover:border-primary/25 sm:w-48"
    >
      <NetworkIcon networkName={network.name} className="size-12" />
      <div className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-success transition-shadow duration-200 group-hover:shadow-[0_0_6px_var(--color-success)]" />
        <span className="text-sm/4 font-semibold tracking-tight text-foreground">{network.display_name}</span>
      </div>
      <span className="text-[10px]/3 font-medium tracking-wide text-muted uppercase">{forkLabel}</span>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[8px]/3 font-medium tracking-[0.2em] text-muted/40 uppercase">Slot</span>
        <SlotDisplay slot={slot} />
      </div>
    </button>
  );
}

/** Hook that returns the current unix timestamp, updating every second. */
function useNow(): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  return now;
}

/** Hero section — observatory entrance with instrument readout panels. */
export function HeroSection(): JSX.Element {
  const { networks, setCurrentNetwork } = useNetwork();
  const navigate = useNavigate();
  const now = useNow();

  const goToNetwork = useCallback(
    (network: Network) => {
      setCurrentNetwork(network);
      void navigate({ to: '/ethereum/live' });
    },
    [setCurrentNetwork, navigate]
  );

  const { staticNets, devnets } = useMemo(() => {
    const s = networks
      .filter(n => NETWORK_ORDER.includes(n.name))
      .sort((a, b) => NETWORK_ORDER.indexOf(a.name) - NETWORK_ORDER.indexOf(b.name));
    const d = networks.filter(n => !NETWORK_ORDER.includes(n.name));
    return { staticNets: s, devnets: d };
  }, [networks]);

  return (
    <div className="relative flex min-h-dvh flex-col justify-center overflow-hidden">
      {/* Atmosphere: single centered glow behind title */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 h-[60%] w-[50%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.04] blur-[120px]" />
      </div>

      {/* Measurement surface: dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        aria-hidden="true"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--color-foreground) 0.75px, transparent 0.75px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 px-6 py-24 text-center sm:px-12 lg:px-20">
        <p className="animate-fade-in text-xs/4 font-semibold tracking-[0.25em] text-primary uppercase">
          Ethereum Infrastructure
        </p>

        <div className="mx-auto mt-5 h-px w-10 animate-fade-in-delay bg-primary/60" />

        <h1 className="mt-8 animate-fade-in-delay-2">
          <span className="block text-lg font-light tracking-wide text-foreground/60 sm:text-xl lg:text-2xl">The</span>
          <span className="mt-1 block text-[clamp(4rem,12vw,11rem)] leading-[0.85] font-black tracking-tighter text-foreground">
            Lab
          </span>
        </h1>

        <div className="mt-8 flex animate-fade-in-delay-3 items-center justify-center gap-2.5">
          <img src="/images/lab.png" alt="" className="size-5 opacity-60" />
          <span className="text-[11px]/3 font-medium tracking-[0.2em] text-muted uppercase">by ethPandaOps</span>
        </div>

        {/* Network instrument panels */}
        {(staticNets.length > 0 || devnets.length > 0) && (
          <div className="mx-auto mt-12 flex max-w-4xl animate-fade-in-delay-4 flex-col items-center gap-3">
            {staticNets.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3">
                {staticNets.map(network => (
                  <NetworkCard key={network.name} network={network} now={now} onClick={goToNetwork} />
                ))}
              </div>
            )}
            {devnets.length > 0 && (
              <>
                <span className="mt-1 text-[10px]/3 font-medium tracking-[0.15em] text-muted/40 uppercase">
                  Devnets
                </span>
                <div className="flex flex-wrap justify-center gap-3">
                  {devnets.map(network => (
                    <NetworkCard key={network.name} network={network} now={now} onClick={goToNetwork} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
