import { type JSX } from 'react';
import { Dialog } from '@/components/Overlays/Dialog';

interface SimulatorHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Help dialog for the Gas Repricing Simulator
 *
 * Provides comprehensive documentation about how the simulator works,
 * what can and cannot be overridden, and important behaviors to understand.
 */
export function SimulatorHelpDialog({ open, onClose }: SimulatorHelpDialogProps): JSX.Element {
  return (
    <Dialog open={open} onClose={onClose} title="How the Gas Repricing Simulator Works" size="xl">
      <div className="space-y-6 text-sm text-foreground">
        {/* Overview Section */}
        <section>
          <h3 className="mb-2 font-semibold text-foreground">Overview</h3>
          <p className="text-muted">
            The simulator re-executes transactions with custom gas costs. It runs the actual EVM with your modified gas
            schedule, allowing you to analyze &ldquo;what if&rdquo; scenarios for gas repricing proposals.
          </p>
        </section>

        {/* What You Can Override */}
        <section>
          <div className="mb-4">
            <h4 className="mb-1 font-medium text-foreground">Constant Gas Opcodes</h4>
            <p className="text-muted">
              Simple opcodes with fixed costs: <code className="font-mono text-foreground">ADD</code>,{' '}
              <code className="font-mono text-foreground">MUL</code>,{' '}
              <code className="font-mono text-foreground">PUSH1-32</code>,{' '}
              <code className="font-mono text-foreground">DUP1-16</code>,{' '}
              <code className="font-mono text-foreground">SWAP1-16</code>,{' '}
              <code className="font-mono text-foreground">JUMP</code>, etc. Changing these directly affects the
              per-execution cost.
            </p>
          </div>

          <div>
            <h4 className="mb-2 font-medium text-foreground">Dynamic Gas Components</h4>
            <p className="mb-2 text-muted">
              These are cost parameters used by multiple operations (not opcodes themselves):
            </p>

            <div className="overflow-x-auto rounded-xs border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface">
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 font-medium text-foreground">Key</th>
                    <th className="px-3 py-2 font-medium text-foreground">Description</th>
                    <th className="px-3 py-2 font-medium text-foreground">Used By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-foreground">SLOAD_COLD</td>
                    <td className="px-3 py-2 text-muted">First read of storage slot</td>
                    <td className="px-3 py-2 font-mono text-muted">SLOAD</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-foreground">SLOAD_WARM</td>
                    <td className="px-3 py-2 text-muted">Subsequent reads of same slot</td>
                    <td className="px-3 py-2 font-mono text-muted">SLOAD, SSTORE</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-foreground">SSTORE_SET</td>
                    <td className="px-3 py-2 text-muted">Creating new storage slot</td>
                    <td className="px-3 py-2 font-mono text-muted">SSTORE</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-foreground">SSTORE_RESET</td>
                    <td className="px-3 py-2 text-muted">Modifying existing slot</td>
                    <td className="px-3 py-2 font-mono text-muted">SSTORE</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-foreground">CALL_COLD</td>
                    <td className="px-3 py-2 text-muted">First access to an address</td>
                    <td className="px-3 py-2 font-mono text-muted">CALL, STATICCALL, BALANCE, EXTCODESIZE, etc.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-foreground">CALL_VALUE_XFER</td>
                    <td className="px-3 py-2 text-muted">Sending ETH with a call</td>
                    <td className="px-3 py-2 font-mono text-muted">CALL, CALLCODE</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-foreground">CALL_NEW_ACCOUNT</td>
                    <td className="px-3 py-2 text-muted">Creating account via transfer</td>
                    <td className="px-3 py-2 font-mono text-muted">CALL</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-foreground">MEMORY</td>
                    <td className="px-3 py-2 text-muted">Memory expansion (linear coefficient)</td>
                    <td className="px-3 py-2 text-muted">All memory-expanding opcodes</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-foreground">COPY</td>
                    <td className="px-3 py-2 text-muted">Per-word copy cost</td>
                    <td className="px-3 py-2 font-mono text-muted">CALLDATACOPY, CODECOPY, MCOPY, etc.</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-foreground">KECCAK256_WORD</td>
                    <td className="px-3 py-2 text-muted">Per-word hashing cost</td>
                    <td className="px-3 py-2 font-mono text-muted">KECCAK256, CREATE2</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-foreground">
                      LOG / LOG_TOPIC / LOG_DATA
                    </td>
                    <td className="px-3 py-2 text-muted">Logging costs</td>
                    <td className="px-3 py-2 font-mono text-muted">LOG0-4</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-foreground">EXP_BYTE</td>
                    <td className="px-3 py-2 text-muted">Per-byte exponent cost</td>
                    <td className="px-3 py-2 font-mono text-muted">EXP</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-foreground">INIT_CODE_WORD</td>
                    <td className="px-3 py-2 text-muted">Per-word deployment cost</td>
                    <td className="px-3 py-2 font-mono text-muted">CREATE, CREATE2</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-mono whitespace-nowrap text-foreground">CREATE_BY_SELFDESTRUCT</td>
                    <td className="px-3 py-2 text-muted">Account creation via selfdestruct</td>
                    <td className="px-3 py-2 font-mono text-muted">SELFDESTRUCT</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* What You Cannot Override */}
        <section>
          <h3 className="mb-2 font-semibold text-foreground">What You Cannot Override</h3>
          <div className="overflow-x-auto rounded-xs border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 font-medium text-foreground">Component</th>
                  <th className="px-3 py-2 font-medium text-foreground">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-3 py-2 font-medium whitespace-nowrap text-foreground">Intrinsic gas</td>
                  <td className="px-3 py-2 text-muted">
                    Base transaction cost (21000) and calldata pricing are applied before EVM execution
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium whitespace-nowrap text-foreground">Memory quadratic cost</td>
                  <td className="px-3 py-2 text-muted">
                    The words<sup>2</sup> ÷ 512 portion of memory expansion is fixed
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium whitespace-nowrap text-foreground">Gas refunds</td>
                  <td className="px-3 py-2 text-muted">Refund amounts for storage clearing, etc.</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium whitespace-nowrap text-foreground">Precompile costs</td>
                  <td className="px-3 py-2 text-muted">
                    Gas costs for <code className="font-mono">ECRECOVER</code>,{' '}
                    <code className="font-mono">SHA256</code>, etc.
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium whitespace-nowrap text-foreground">
                    Pre-Berlin <code className="font-mono">SSTORE</code>
                  </td>
                  <td className="px-3 py-2 text-muted">
                    Legacy storage pricing for historical blocks (pre-April 2021)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Important Behaviors */}
        <section>
          <h3 className="mb-3 font-semibold text-foreground">Important Behaviors</h3>

          <div className="space-y-3">
            <div className="rounded-xs border border-border bg-background/50 p-3">
              <h4 className="mb-2 font-medium text-foreground">Memory Gas Affects Many Opcodes</h4>
              <p className="mb-2 text-muted">
                The <code className="font-mono text-foreground">MEMORY</code> parameter controls the linear coefficient
                in memory expansion:
              </p>
              <code className="block rounded-xs border border-border bg-surface px-3 py-2 font-mono text-xs text-foreground">
                memory_cost = (words<sup>2</sup> ÷ 512) + (MEMORY × words)
              </code>
              <p className="mt-2 text-muted">
                Changing <code className="font-mono text-foreground">MEMORY</code> affects:{' '}
                <code className="font-mono">MLOAD</code>, <code className="font-mono">MSTORE</code>,{' '}
                <code className="font-mono">CALL</code>, <code className="font-mono">CREATE</code>,{' '}
                <code className="font-mono">KECCAK256</code>, <code className="font-mono">LOG</code>,{' '}
                <code className="font-mono">RETURN</code>, and all copy operations.
              </p>
            </div>

            <div className="rounded-xs border border-border bg-background/50 p-3">
              <h4 className="mb-2 font-medium text-foreground">Cold vs Warm Access</h4>
              <p className="mb-2 text-muted">
                Cold access (first touch in transaction) costs more than warm access (already touched).
              </p>
              <ul className="space-y-2 text-muted">
                <li className="flex gap-2">
                  <span className="text-muted">•</span>
                  <span>
                    <code className="font-mono text-foreground">CALL_COLD</code> sets the cold access cost for
                    addresses. Applies to: <code className="font-mono">CALL</code>,{' '}
                    <code className="font-mono">STATICCALL</code>, <code className="font-mono">DELEGATECALL</code>,{' '}
                    <code className="font-mono">CALLCODE</code>, <code className="font-mono">BALANCE</code>,{' '}
                    <code className="font-mono">EXTCODESIZE</code>, <code className="font-mono">EXTCODEHASH</code>,{' '}
                    <code className="font-mono">EXTCODECOPY</code>.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-muted">•</span>
                  <span>
                    Warm access cost for calls is controlled by the opcode&apos;s base cost (
                    <code className="font-mono">CALL</code>, <code className="font-mono">STATICCALL</code>,{' '}
                    <code className="font-mono">DELEGATECALL</code>, <code className="font-mono">CALLCODE</code>{' '}
                    sliders).
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-muted">•</span>
                  <span>
                    <code className="font-mono text-foreground">SLOAD_COLD</code> /{' '}
                    <code className="font-mono text-foreground">SLOAD_WARM</code> control storage slot access costs.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-xs border border-border bg-background/50 p-3">
              <h4 className="mb-2 font-medium text-foreground">Execution Divergence</h4>
              <p className="mb-2 text-muted">
                Since the simulator runs real EVM execution, any gas cost change can cause different behavior:
              </p>
              <ul className="space-y-2 text-muted">
                <li className="flex gap-2">
                  <span className="text-muted">•</span>
                  <span>
                    Transactions may run out of gas earlier (if costs increase) or have more gas remaining (if costs
                    decrease)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-muted">•</span>
                  <span>
                    Contracts using <code className="font-mono">gasleft()</code> checks may take different code paths
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-muted">•</span>
                  <span>
                    The &ldquo;Diverged&rdquo; indicator shows when original and simulated execution produced different
                    results
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </Dialog>
  );
}
