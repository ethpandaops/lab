import { type JSX, useMemo, useCallback, useState, useEffect } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { Tab as HeadlessTab } from '@headlessui/react';
import {
  ArrowLeftIcon,
  ClipboardDocumentIcon,
  CodeBracketIcon,
  FireIcon,
  BoltIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import { Tab } from '@/components/Navigation/Tab';
import { GasTooltip } from '@/components/DataDisplay/GasTooltip';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import { Alert } from '@/components/Feedback/Alert';
import { EtherscanIcon } from '@/components/Ethereum/EtherscanIcon';
import { TenderlyIcon } from '@/components/Ethereum/TenderlyIcon';
import { PhalconIcon } from '@/components/Ethereum/PhalconIcon';
import { useTransactionGasData, getCallLabel } from './hooks/useTransactionGasData';
import { useFrameOpcodes } from './hooks/useFrameOpcodes';
import type { ContractOwnerMap } from './hooks/useContractOwners';
import type { FunctionSignatureMap } from './hooks/useFunctionSignatures';
import { GasProfilerSkeleton, OpcodeAnalysis, CategoryPieChart, GasFormula, CallTraceView } from './components';
import { CATEGORY_COLORS, getOpcodeCategory } from './utils';
import type { IntTransactionCallFrame } from '@/api/types.gen';

/**
 * Format gas value with comma separators
 */
function formatGas(value: number): string {
  return value.toLocaleString();
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get call type badge styling
 */
function getCallTypeStyles(callType: string): { bg: string; text: string; border: string } {
  switch (callType) {
    case 'CREATE':
      return { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/30' };
    case 'CREATE2':
      return { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' };
    case 'DELEGATECALL':
      return { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' };
    case 'STATICCALL':
      return { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' };
    case 'CALL':
    default:
      return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' };
  }
}

/**
 * Call detail page - full gas analysis for a specific call
 */
export function CallPage(): JSX.Element {
  const { txHash, callId } = useParams({ from: '/ethereum/execution/gas-profiler/tx/$txHash_/call/$callId' });
  const callIdNum = parseInt(callId, 10);

  const [copied, setCopied] = useState(false);

  // Fetch all transaction data
  const {
    data: txData,
    isLoading,
    error,
  } = useTransactionGasData({
    transactionHash: txHash,
  });

  // Block number derived from transaction data
  const blockNumber = txData?.metadata.blockNumber ?? null;

  // Fetch frame-specific opcodes (only when we have blockNumber)
  const { data: frameOpcodes, isLoading: frameOpcodesLoading } = useFrameOpcodes({
    blockNumber,
    transactionHash: txHash,
    callFrameId: callIdNum,
  });

  // Find the current frame from all frames
  const currentFrame = useMemo<IntTransactionCallFrame | null>(() => {
    if (!txData?.callFrames) return null;
    return txData.callFrames.find(f => f.call_frame_id === callIdNum) ?? null;
  }, [txData?.callFrames, callIdNum]);

  // Find child frames (frames whose parent is this frame)
  const childFrames = useMemo<IntTransactionCallFrame[]>(() => {
    if (!txData?.callFrames) return [];
    return txData.callFrames
      .filter(f => f.parent_call_frame_id === callIdNum)
      .sort((a, b) => (a.call_frame_id ?? 0) - (b.call_frame_id ?? 0));
  }, [txData?.callFrames, callIdNum]);

  // Find all descendant frames (for trace view) - current frame + all children recursively
  const descendantFrames = useMemo<IntTransactionCallFrame[]>(() => {
    if (!txData?.callFrames || !currentFrame) return [];

    const descendants: IntTransactionCallFrame[] = [];
    const frameSet = new Set<number>();

    // Build parent->children map for efficient traversal
    const childrenMap = new Map<number, IntTransactionCallFrame[]>();
    for (const f of txData.callFrames) {
      const parentId = f.parent_call_frame_id ?? -1;
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(f);
    }

    // BFS to collect all descendants
    const queue = [currentFrame];
    while (queue.length > 0) {
      const frame = queue.shift()!;
      const frameId = frame.call_frame_id ?? 0;
      if (frameSet.has(frameId)) continue;
      frameSet.add(frameId);
      descendants.push(frame);

      const children = childrenMap.get(frameId) ?? [];
      for (const child of children) {
        queue.push(child);
      }
    }

    return descendants.sort((a, b) => (a.call_frame_id ?? 0) - (b.call_frame_id ?? 0));
  }, [txData?.callFrames, currentFrame]);

  // Build breadcrumb path from root to current frame
  // Skip depth 0 (transaction root) since we show "TX" separately
  const breadcrumbPath = useMemo<IntTransactionCallFrame[]>(() => {
    if (!txData?.callFrames || !currentFrame) return [];

    const path: IntTransactionCallFrame[] = [];
    let frame: IntTransactionCallFrame | undefined = currentFrame;

    while (frame) {
      path.unshift(frame);
      if (frame.parent_call_frame_id === null || frame.parent_call_frame_id === undefined) break;
      frame = txData.callFrames.find(f => f.call_frame_id === frame!.parent_call_frame_id);
    }

    // Filter out depth 0 (TX root) since we show it separately
    return path.filter(f => (f.depth ?? 0) > 0);
  }, [txData?.callFrames, currentFrame]);

  // Calculate child gas (cumulative - self)
  const childGas = useMemo(() => {
    if (!currentFrame) return 0;
    return (currentFrame.gas_cumulative ?? 0) - (currentFrame.gas ?? 0);
  }, [currentFrame]);

  // Get contract owners and function signatures from txData (memoized to avoid dependency issues)
  const contractOwners: ContractOwnerMap = useMemo(() => txData?.contractOwners ?? {}, [txData?.contractOwners]);
  const functionSignatures: FunctionSignatureMap = useMemo(
    () => txData?.functionSignatures ?? {},
    [txData?.functionSignatures]
  );

  // Calculate opcode category breakdown for pie chart (by gas)
  const opcodeCategoryData = useMemo(() => {
    if (!frameOpcodes || frameOpcodes.length === 0) return [];
    const categoryMap = new Map<string, number>();

    for (const op of frameOpcodes) {
      const category = getOpcodeCategory(op.opcode);
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + op.totalGas);
    }

    return [...categoryMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [frameOpcodes]);

  // Calculate opcode category breakdown for pie chart (by count)
  const opcodeCategoryCountData = useMemo(() => {
    if (!frameOpcodes || frameOpcodes.length === 0) return [];
    const categoryMap = new Map<string, number>();

    for (const op of frameOpcodes) {
      const category = getOpcodeCategory(op.opcode);
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + op.count);
    }

    return [...categoryMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [frameOpcodes]);

  // Handle copy
  const handleCopy = useCallback(async () => {
    if (!currentFrame?.target_address) return;
    const success = await copyToClipboard(currentFrame.target_address);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [currentFrame?.target_address]);

  // Tab state based on URL hash
  const getTabIndexFromHash = useCallback((): number => {
    const hash = window.location.hash.slice(1);
    if (hash === 'overview') return 0;
    if (hash === 'opcodes') return 1;
    return 0;
  }, []);
  const [selectedTabIndex, setSelectedTabIndex] = useState(getTabIndexFromHash);

  // Sync tab with hash on mount and route changes (hash may not be set during initial useState)
  useEffect(() => {
    // Small delay to ensure hash is set after navigation
    const timer = setTimeout(() => {
      const tabIndex = getTabIndexFromHash();
      setSelectedTabIndex(tabIndex);
    }, 0);
    return () => clearTimeout(timer);
  }, [getTabIndexFromHash, callId]);

  // Listen for popstate (browser back/forward) to sync tab with hash
  useEffect(() => {
    const handlePopState = (): void => {
      setSelectedTabIndex(getTabIndexFromHash());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getTabIndexFromHash]);

  // Loading state
  if (isLoading) {
    return (
      <Container>
        <Header title="Call Details" description="Call gas analysis" />
        <GasProfilerSkeleton />
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container>
        <Header title="Call Details" description="Call gas analysis" />
        <Alert variant="error" title="Error loading call" description={error.message} />
      </Container>
    );
  }

  // Transaction not found
  if (!txData) {
    return (
      <Container>
        <Header title="Call Details" description="Call gas analysis" />
        <Alert
          variant="warning"
          title="Transaction not found"
          description="This transaction is not in the indexed data. It may be too old or too recent for the current index range."
        />
        <div className="mt-4">
          <Link
            to="/ethereum/execution/gas-profiler"
            className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Back to Gas Profiler
          </Link>
        </div>
      </Container>
    );
  }

  // Frame not found
  if (!currentFrame) {
    return (
      <Container>
        <Header title="Call Details" description="Call gas analysis" />
        <Alert
          variant="warning"
          title="Call not found"
          description={`Call ${callId} was not found in this transaction.`}
        />
        <div className="mt-4">
          <Link
            to="/ethereum/execution/gas-profiler/tx/$txHash"
            params={{ txHash }}
            className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Back to Transaction
          </Link>
        </div>
      </Container>
    );
  }

  const callTypeStyles = getCallTypeStyles(currentFrame.call_type ?? 'CALL');
  const selfGas = currentFrame.gas ?? 0;
  const cumulativeGas = currentFrame.gas_cumulative ?? 0;

  return (
    <Container>
      <Header title="Call Details" description="Call gas analysis" />

      {/* Call Path Navigation */}
      <div className="mb-6 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Link
            to="/ethereum/execution/gas-profiler/tx/$txHash"
            params={{ txHash }}
            search={{ block: blockNumber }}
            className="text-muted hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
          </Link>
          <Link
            to="/ethereum/execution/gas-profiler/tx/$txHash"
            params={{ txHash }}
            search={{ block: blockNumber }}
            className="text-muted hover:text-foreground"
          >
            TX
          </Link>
          {breadcrumbPath.length > 2 && (
            <>
              <ChevronRightIcon className="size-3 text-border" />
              {/* Expandable dropdown for collapsed items */}
              <div className="group relative">
                <button className="flex items-center gap-1 rounded-xs border border-border bg-surface/50 px-1.5 py-0.5 text-xs text-muted hover:border-primary/50 hover:text-foreground">
                  <EllipsisHorizontalIcon className="size-3.5" />
                  <span>{breadcrumbPath.length - 2}</span>
                </button>
                {/* Dropdown on hover */}
                <div className="absolute top-full left-0 z-50 hidden min-w-56 pt-1 group-hover:block">
                  <div className="rounded-xs border border-border bg-background p-2 shadow-lg">
                    <div className="mb-1.5 border-b border-border pb-1.5 text-xs text-muted">Full call path</div>
                    <div className="space-y-1 text-xs">
                      <Link
                        to="/ethereum/execution/gas-profiler/tx/$txHash"
                        params={{ txHash }}
                        search={{ block: blockNumber }}
                        className="block rounded-xs px-2 py-1 text-muted hover:bg-surface hover:text-foreground"
                      >
                        TX (root)
                      </Link>
                      {breadcrumbPath.map((frame, index) => {
                        const isLast = index === breadcrumbPath.length - 1;
                        const frameStyles = getCallTypeStyles(frame.call_type ?? 'CALL');
                        const frameName = getCallLabel(
                          frame.target_address,
                          frame.function_selector,
                          contractOwners,
                          functionSignatures,
                          'Unknown'
                        );
                        return isLast ? (
                          <div
                            key={frame.call_frame_id}
                            className="flex items-center gap-2 rounded-xs bg-primary/10 px-2 py-1"
                          >
                            <span className={`rounded-xs px-1 py-0.5 text-xs ${frameStyles.bg} ${frameStyles.text}`}>
                              {frame.call_type}
                            </span>
                            <span className="truncate text-foreground">{frameName}</span>
                            <span className="ml-auto text-muted">d{frame.depth}</span>
                          </div>
                        ) : (
                          <Link
                            key={frame.call_frame_id}
                            to="/ethereum/execution/gas-profiler/tx/$txHash/call/$callId"
                            params={{ txHash, callId: String(frame.call_frame_id) }}
                            search={{ block: blockNumber }}
                            className="flex items-center gap-2 rounded-xs px-2 py-1 text-muted hover:bg-surface hover:text-foreground"
                          >
                            <span className={`rounded-xs px-1 py-0.5 text-xs ${frameStyles.bg} ${frameStyles.text}`}>
                              {frame.call_type}
                            </span>
                            <span className="truncate">{frameName}</span>
                            <span className="ml-auto">d{frame.depth}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          {/* Parent (if exists) */}
          {breadcrumbPath.length > 1 && (
            <>
              <ChevronRightIcon className="size-3 text-border" />
              {(() => {
                const parent = breadcrumbPath[breadcrumbPath.length - 2];
                const parentStyles = getCallTypeStyles(parent.call_type ?? 'CALL');
                const parentName = getCallLabel(
                  parent.target_address,
                  parent.function_selector,
                  contractOwners,
                  functionSignatures,
                  'Unknown'
                );
                return (
                  <Link
                    to="/ethereum/execution/gas-profiler/tx/$txHash/call/$callId"
                    params={{ txHash, callId: String(parent.call_frame_id) }}
                    search={{ block: blockNumber }}
                    className="flex items-center gap-1.5 text-muted hover:text-foreground"
                  >
                    <span className={`rounded-xs px-1 py-0.5 text-xs ${parentStyles.bg} ${parentStyles.text}`}>
                      {parent.call_type}
                    </span>
                    <span className="max-w-32 truncate">{parentName}</span>
                  </Link>
                );
              })()}
            </>
          )}
          {/* Current */}
          {(() => {
            const current = breadcrumbPath[breadcrumbPath.length - 1];
            if (!current) return null;
            const currentStyles = getCallTypeStyles(current.call_type ?? 'CALL');
            const currentBreadcrumbName = getCallLabel(
              current.target_address,
              current.function_selector,
              contractOwners,
              functionSignatures,
              'Unknown'
            );
            return (
              <>
                <ChevronRightIcon className="size-3 text-border" />
                <span className="flex items-center gap-1.5">
                  <span className={`rounded-xs px-1 py-0.5 text-xs ${currentStyles.bg} ${currentStyles.text}`}>
                    {current.call_type}
                  </span>
                  <span className="max-w-40 truncate font-medium text-foreground">{currentBreadcrumbName}</span>
                </span>
              </>
            );
          })()}
        </div>
        {/* External links */}
        <div className="flex items-center gap-2">
          {currentFrame.target_address && (
            <a
              href={`https://etherscan.io/address/${currentFrame.target_address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-surface p-1.5 text-muted transition-colors hover:text-foreground"
              title="View address on Etherscan"
            >
              <EtherscanIcon className="size-4" />
            </a>
          )}
          <a
            href={`https://dashboard.tenderly.co/tx/mainnet/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-surface p-1.5 transition-colors hover:opacity-80"
            title="View TX on Tenderly"
          >
            <TenderlyIcon className="size-4" />
          </a>
          <a
            href={`https://phalcon.blocksec.com/explorer/tx/eth/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-surface p-1.5 text-muted transition-colors hover:text-foreground"
            title="View TX on Phalcon"
          >
            <PhalconIcon className="size-4" />
          </a>
        </div>
      </div>

      {/* Quick Stats Row - Always visible */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xs bg-amber-500/10 p-2">
              <BoltIcon className="size-5 text-amber-500" />
            </div>
            <div>
              <div className="text-xl font-semibold text-foreground">{formatGas(selfGas)}</div>
              <div className="text-xs text-muted">Gas</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xs bg-primary/10 p-2">
              <FireIcon className="size-5 text-primary" />
            </div>
            <div>
              <div className="text-xl font-semibold text-foreground">{formatGas(cumulativeGas)}</div>
              <div className="text-xs text-muted">Cumulative</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xs bg-cyan-500/10 p-2">
              <CodeBracketIcon className="size-5 text-cyan-500" />
            </div>
            <div>
              <div className="text-xl font-semibold text-foreground">{childFrames.length}</div>
              <div className="text-xs text-muted">Sub-Calls</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xs bg-purple-500/10 p-2">
              <CpuChipIcon className="size-5 text-purple-500" />
            </div>
            <div>
              <div className="text-xl font-semibold text-foreground">{currentFrame.opcode_count ?? 0}</div>
              <div className="text-xs text-muted">Opcodes</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabbed Content */}
      <HeadlessTab.Group selectedIndex={selectedTabIndex} onChange={setSelectedTabIndex}>
        <HeadlessTab.List className="mb-6 flex gap-1 border-b border-border">
          <Tab hash="overview">Overview</Tab>
          <Tab hash="opcodes">Opcodes</Tab>
        </HeadlessTab.List>

        <HeadlessTab.Panels>
          {/* Overview Tab */}
          <HeadlessTab.Panel>
            {/* Call Gas Breakdown */}
            <Card className="mb-6 overflow-hidden">
              {/* Header row */}
              <div className="flex items-center justify-between px-4 py-3">
                <h3 className="text-sm font-medium text-foreground">Call Gas Breakdown</h3>
                <span className="text-xs text-muted">
                  Call #{currentFrame.call_frame_id} • Depth {currentFrame.depth}
                </span>
              </div>

              {/* Gas Formula */}
              <div className="bg-surface/30 px-4 py-5">
                <GasFormula
                  segments={[
                    {
                      label: 'Gas',
                      value: selfGas,
                      color: 'amber',
                      tooltip: <GasTooltip type="self" context="call" size="md" />,
                    },
                    {
                      label: 'Child Calls',
                      value: childGas,
                      color: 'purple',
                      operator: '+',
                      tooltip: <GasTooltip type="child" context="call" size="md" />,
                    },
                  ]}
                  result={{
                    label: 'Cumulative',
                    value: cumulativeGas,
                    tooltip: <GasTooltip type="cumulative" context="call" size="md" />,
                  }}
                  formatter={formatGas}
                />
              </div>

              {/* Call details - subtle inline display */}
              <div className="border-t border-border px-4 py-2 text-center">
                <div className="inline-flex items-center gap-2">
                  <span
                    className={`rounded-xs px-1.5 py-0.5 text-xs font-medium ${callTypeStyles.bg} ${callTypeStyles.text}`}
                  >
                    {currentFrame.call_type ?? 'CALL'}
                  </span>
                  {currentFrame.target_address && (
                    <>
                      {contractOwners[currentFrame.target_address.toLowerCase()]?.contract_name ? (
                        <span className="text-xs text-muted">
                          {contractOwners[currentFrame.target_address.toLowerCase()]?.contract_name}
                        </span>
                      ) : (
                        <code className="font-mono text-xs text-muted">
                          {currentFrame.target_address.slice(0, 10)}...{currentFrame.target_address.slice(-8)}
                        </code>
                      )}
                      <button
                        onClick={handleCopy}
                        className="rounded-xs p-0.5 text-muted transition-colors hover:text-foreground"
                        title="Copy address"
                      >
                        <ClipboardDocumentIcon className="size-3.5" />
                      </button>
                      {copied && <span className="text-xs text-success">Copied!</span>}
                    </>
                  )}
                  {currentFrame.function_selector &&
                    functionSignatures[currentFrame.function_selector.toLowerCase()]?.name && (
                      <>
                        <span className="text-muted">•</span>
                        <span className="text-xs text-muted">fn </span>
                        <code className="font-mono text-xs text-muted">
                          {functionSignatures[currentFrame.function_selector.toLowerCase()]?.name}
                        </code>
                      </>
                    )}
                </div>
              </div>
            </Card>

            {/* Execution Trace */}
            {descendantFrames.length > 0 ? (
              <CallTraceView
                callFrames={descendantFrames}
                contractOwners={contractOwners}
                functionSignatures={functionSignatures}
                txHash={txHash}
                blockNumber={blockNumber}
                totalGas={cumulativeGas}
                opcodeStats={txData?.callFrameOpcodeStats}
              />
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted">No trace data available</p>
              </Card>
            )}
          </HeadlessTab.Panel>

          {/* Opcodes Tab */}
          <HeadlessTab.Panel>
            {/* Opcode Categories */}
            <div className="mb-6 grid grid-cols-2 gap-6">
              <CategoryPieChart
                data={opcodeCategoryData}
                colorMap={CATEGORY_COLORS}
                title="Gas by Opcode Category"
                subtitle="Where was this call's gas spent?"
                percentLabel="of self gas"
                loading={frameOpcodesLoading}
                emptyMessage="No opcode data"
                height={280}
              />
              <CategoryPieChart
                data={opcodeCategoryCountData}
                colorMap={CATEGORY_COLORS}
                title="Count by Opcode Category"
                subtitle="How often did each category execute?"
                percentLabel="of executions"
                loading={frameOpcodesLoading}
                emptyMessage="No opcode data"
                height={280}
              />
            </div>

            {/* Opcode Analysis - Charts and Table */}
            {frameOpcodes.length > 0 ? (
              <OpcodeAnalysis opcodeStats={frameOpcodes} />
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted">No opcode data available for this call</p>
              </Card>
            )}
          </HeadlessTab.Panel>
        </HeadlessTab.Panels>
      </HeadlessTab.Group>
    </Container>
  );
}
