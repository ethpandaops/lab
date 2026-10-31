import { type JSX, type ReactNode, useEffect, useRef } from 'react';
import { InformationCircleIcon } from '@heroicons/react/16/solid';
import { Dialog } from '@/components/Overlays/Dialog';

export type MethodologySection = 'throughput' | 'cost-model' | 'workload' | 'opcodes';

/** Small header button that opens the methodology dialog at a section */
export function MethodologyButton({ onClick }: { onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-xs px-1.5 py-1 text-xs text-muted transition-colors hover:text-foreground"
    >
      <InformationCircleIcon className="size-3.5" />
      Methodology
    </button>
  );
}

function Section({ id, title, children }: { id: MethodologySection; title: string; children: ReactNode }): JSX.Element {
  return (
    <section id={`methodology-${id}`} className="scroll-mt-4 space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Formula({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="overflow-x-auto rounded-sm bg-background px-3 py-2 font-mono text-xs text-foreground">
      {children}
    </div>
  );
}

/** How every number on the performance page is derived */
export function MethodologyDialog({
  open,
  section,
  onClose,
}: {
  open: boolean;
  section: MethodologySection;
  onClose: () => void;
}): JSX.Element {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      bodyRef.current?.querySelector(`#methodology-${section}`)?.scrollIntoView({ block: 'start' });
    }, 50);
    return () => window.clearTimeout(id);
  }, [open, section]);

  return (
    <Dialog open={open} onClose={onClose} title="Methodology" size="lg">
      <div ref={bodyRef} className="max-h-[70vh] space-y-6 overflow-y-auto pr-1 text-sm/6 text-muted">
        <p>
          Durations are engine_newPayload calls timed by the consensus client, so they include validating the block and
          computing its state root, not only running the EVM. Reference nodes run every execution client on the same
          EIP-7870 hardware. The opcode fits always use reference nodes only, whatever the toggle above says.
        </p>

        <Section id="throughput" title="Execution throughput">
          <Formula>Mgas/s = gas used ÷ engine_newPayload duration</Formula>
          <p>
            Over a period, throughput is total gas over total duration, so large blocks weigh more than small ones. P95
            uses each block&apos;s 95th percentile duration across reference nodes: the throughput the slowest nodes
            get.
          </p>
          <p>
            Chain demand is gas used per second of wall clock (gas used per block ÷ 12 s). Headroom is the slowest
            client&apos;s throughput divided by chain demand.
          </p>
        </Section>

        <Section id="cost-model" title="Cost model and gas limit ceiling">
          <Formula>duration ms = overhead + marginal cost × Mgas</Formula>
          <p>
            Fitted by least squares to every block of the last 6 hours (less for shorter ranges), per client. Typical
            node uses each block&apos;s median duration across reference nodes, slow node its 95th percentile.
          </p>
          <Formula>ceiling = (budget − overhead) ÷ marginal cost</Formula>
          <p>
            The ceiling is the largest block that fits in the execution budget. It extrapolates the straight line far
            past the largest block seen, and real costs may grow faster than linearly (larger state, more cache misses),
            so read it as an upper bound.
          </p>
        </Section>

        <Section id="workload" title="Throughput by block size and workload">
          <p>
            Throughput by block size is the median per-block Mgas/s in 5 Mgas buckets. The distribution covers blocks
            above 5 Mgas, where fixed overhead no longer dominates.
          </p>
          <p>
            Workload sensitivity splits each block&apos;s gas into resources (compute, state access, state growth,
            history, block size, logs, memory). For each resource, blocks in the top fifth by that resource&apos;s share
            of gas are compared with blocks in the bottom fifth. Only blocks above 10 Mgas count.
          </p>
        </Section>

        <Section id="opcodes" title="Opcode pricing">
          <p>For each client, block duration is regressed on the gas each opcode group used in the block:</p>
          <Formula>duration ms = b₀ + b₁ × txs/100 + b₂ × non-opcode Mgas + Σ b_g × Mgas_g</Formula>
          <p>
            b_g is nanoseconds per gas spent on opcode group g. Non-opcode gas is gas used minus opcode gas: intrinsic
            transaction cost, calldata and precompiles, net of refunds. Opcode gas comes from execution traces of every
            canonical block.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <span className="text-foreground">Outliers.</span> Per hour and client, blocks above the 99th percentile
              duration and blocks above 3× the median ms per Mgas are dropped.
            </li>
            <li>
              <span className="text-foreground">Constraints.</span> Coefficients can&apos;t be negative, and a ridge
              penalty pulls each b_g towards the client&apos;s average ns per gas. Opcodes the data can&apos;t separate,
              because they are rare or always run together, stay close to 1× instead of swinging to extremes.
            </li>
            <li>
              <span className="text-foreground">× gas price.</span> b_g ÷ the client&apos;s average ns per gas. 1× means
              gas prices the opcode in line with the rest of that client&apos;s execution, 2× means each unit of its gas
              takes twice as long.
            </li>
            <li>
              <span className="text-foreground">Intervals.</span> A fit runs per client per UTC day. The matrix shows
              the median over the range&apos;s days, with a 5–95% interval from resampling days. Each day&apos;s own
              interval comes from resampling its hours. Releases are fitted over every hour they ran and resampled in
              6-hour blocks. Releases with fewer than 24 hours are left out.
            </li>
            <li>
              <span className="text-foreground">Highlighting.</span> A cell is coloured when its interval excludes 1×
              and it is at least 10% away from it.
            </li>
          </ul>
          <p>
            Ratios are relative to each client&apos;s own average, which also absorbs work outside the EVM such as the
            state root. Compare ratios across clients, and treat ns per op as approximate. Opcodes priced for state
            growth or history (SSTORE, CREATE, LOG, CALL with value) are expected below 1×: their gas pays for more than
            execution time.
          </p>
          <p>
            Cheap opcodes such as PUSH, DUP and arithmetic are executed alongside each other in nearly fixed
            proportions, so they are fitted as groups. A high ratio there is consistent with per-instruction overhead
            that a few gas doesn&apos;t cover.
          </p>
        </Section>
      </div>
    </Dialog>
  );
}
