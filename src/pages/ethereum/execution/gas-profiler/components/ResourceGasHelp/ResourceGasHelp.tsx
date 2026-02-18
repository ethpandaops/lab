import { type JSX, useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Dialog } from '@/components/Overlays/Dialog';

/**
 * Help modal explaining how resource gas decomposition works.
 * Renders as a small info button that opens a detailed reference dialog.
 */
export function ResourceGasHelp(): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-xs px-3 py-1.5 text-sm text-muted transition-colors hover:bg-primary/10 hover:text-primary"
      >
        <InformationCircleIcon className="size-4" />
        How is this calculated?
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="How is resource gas calculated?" size="xl">
        <div className="space-y-6 text-sm leading-relaxed text-foreground">
          <p className="text-muted">
            Every unit of EVM gas pays for a specific system resource. We decompose gas into 7 categories so you can see
            what a transaction actually spent its gas on.
          </p>

          {/* Resource categories */}
          <div>
            <h3 className="mb-3 text-base font-semibold text-foreground">Resources</h3>
            <dl className="space-y-4">
              <ResourceDef color="#3b82f6" term="Compute">
                Pure EVM execution. The cost of running instructions: arithmetic, logic, control flow, stack
                manipulation, and precompile execution (ecrecover, bn256Pairing, etc.). For opcodes that touch storage
                or accounts, only the base &ldquo;warm access&rdquo; cost is counted here &mdash; the cold penalty goes
                to Address Access.
              </ResourceDef>

              <ResourceDef color="#8b5cf6" term="Memory">
                The cost of expanding EVM memory. The EVM charges a quadratic fee as memory grows, meaning large memory
                usage gets disproportionately expensive. Applies to any opcode that reads, writes, or returns memory.
              </ResourceDef>

              <ResourceDef color="#f59e0b" term="Address Access">
                The first-touch penalty for accounts and storage slots (EIP-2929). The first time a transaction accesses
                an address or storage slot, it pays a cold access surcharge. Repeat accesses within the same transaction
                are warm and much cheaper. This incentivizes access locality.
              </ResourceDef>

              <ResourceDef color="#ef4444" term="State Growth">
                The cost of writing to Ethereum&rsquo;s persistent state. This is the bulk of what SSTORE charges
                (beyond the base and cold costs), the code deposit cost when deploying contracts, and SELFDESTRUCT fund
                transfers. Net state cost can be computed as State Growth &minus; Gas Refund, since clearing storage
                slots generates refunds.
              </ResourceDef>

              <ResourceDef color="#06b6d4" term="History">
                The cost of data that nodes must store but the EVM doesn&rsquo;t re-read. This includes LOG event data,
                contract deployment code storage overhead, and a portion of intrinsic transaction costs. A share of
                per-byte calldata cost is also attributed here.
              </ResourceDef>

              <ResourceDef color="#ec4899" term="Bloom Topics">
                The cost of indexing LOG event topics in the block&rsquo;s bloom filter. Each topic on a LOG opcode has
                a portion of its per-topic charge attributed to bloom filter maintenance, with the remainder going to
                History.
              </ResourceDef>

              <ResourceDef color="#64748b" term="Block Size">
                The cost of including transaction calldata in the block. This only appears at the transaction level
                (always zero for individual opcodes) and scales with the number and type of calldata bytes, plus a fixed
                overhead from the intrinsic base cost.
              </ResourceDef>
            </dl>
          </div>

          {/* How it works */}
          <div>
            <h3 className="mb-3 text-base font-semibold text-foreground">How it works</h3>
            <p className="mb-3 text-muted">The decomposition happens in three layers:</p>
            <ol className="list-inside list-decimal space-y-2 text-muted">
              <li>
                <strong className="text-foreground">Opcode level</strong> &mdash; Each EVM opcode&rsquo;s gas is split
                into the resources it consumes based on its semantics. For example, a cold SLOAD splits into a small
                Compute portion (the warm base) and a larger Address Access portion (the cold premium). A CREATE splits
                across Compute, Address Access, State Growth, and History. The invariant{' '}
                <em>sum of all 7 resources = total gas</em> holds for every single opcode.
              </li>
              <li>
                <strong className="text-foreground">Transaction level</strong> &mdash; Opcode-level resources are summed
                across all call frames in the transaction. Precompile execution gas is added to Compute. Intrinsic gas
                (the fixed cost every transaction pays before EVM execution) is decomposed across Compute, History,
                Address Access, State Growth, and Block Size based on whether it&rsquo;s a regular transaction or
                contract creation, plus per-byte calldata costs.
              </li>
              <li>
                <strong className="text-foreground">Block level</strong> &mdash; Transaction-level resources are summed
                across all transactions in the block.
              </li>
            </ol>
          </div>

          {/* Precompiles */}
          <div>
            <h3 className="mb-3 text-base font-semibold text-foreground">Precompile calls</h3>
            <p className="text-muted">
              Calls to precompiled contracts (ecrecover, sha256, bn256Pairing, etc.) appear as separate call frames.
              Their execution gas is attributed entirely to Compute, while the parent CALL opcode retains only its
              access overhead.
            </p>
          </div>

          {/* Gas refunds */}
          <div>
            <h3 className="mb-3 text-base font-semibold text-foreground">Gas refunds</h3>
            <p className="text-muted">
              SSTORE operations that clear storage slots generate gas refunds. Refunds are reported separately and are
              not subtracted from any resource category.
            </p>
          </div>
        </div>
      </Dialog>
    </>
  );
}

/** Styled definition for a resource category */
function ResourceDef({
  color,
  term,
  children,
}: {
  color: string;
  term: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex gap-3">
      <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <div>
        <dt className="font-semibold text-foreground">{term}</dt>
        <dd className="mt-0.5 text-muted">{children}</dd>
      </div>
    </div>
  );
}
