import { type JSX, useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from '@tanstack/react-router';
import { Route } from '@/routes/ethereum/execution/gas-profiler/tx.$txHash';
import { Tab as HeadlessTab } from '@headlessui/react';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentIcon,
  CodeBracketIcon,
  FireIcon,
  ArrowsPointingOutIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  CogIcon,
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
import { useTransactionGasData } from './hooks/useTransactionGasData';
import { useAllCallFrameOpcodes } from './hooks/useAllCallFrameOpcodes';
import {
  CallTreeSection,
  OpcodeAnalysis,
  GasProfilerSkeleton,
  CategoryPieChart,
  GasFormula,
  ContractInteractionsTable,
  TopItemsByGasTable,
  CallTraceView,
  TopContractsByGasChart,
} from './components';
import type { ContractInteractionItem, TopGasItem, CallFrameData } from './components';
import { getCallLabel } from './hooks/useTransactionGasData';
import { useNetwork } from '@/hooks/useNetwork';
import { CATEGORY_COLORS, CALL_TYPE_COLORS, getOpcodeCategory, getEffectiveGasRefund } from './utils';
import type { CallTreeNode, OpcodeStats } from './IndexPage.types';

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
 * Transaction detail page - full gas analysis
 */
export function TransactionPage(): JSX.Element {
  const { txHash } = useParams({ from: '/ethereum/execution/gas-profiler/tx/$txHash' });
  const { block: blockFromSearch } = Route.useSearch();
  const navigate = useNavigate({ from: '/ethereum/execution/gas-profiler/tx/$txHash' });

  // State for copy feedback
  const [copied, setCopied] = useState(false);

  // State for showing opcodes in flame graph (on by default)
  const [showOpcodes, setShowOpcodes] = useState(true);

  // Fetch transaction data by tx hash
  // Pass blockNumber from URL search params for efficient partition-based filtering
  const {
    data: txData,
    isLoading,
    error,
  } = useTransactionGasData({
    transactionHash: txHash,
    blockNumber: blockFromSearch,
  });

  // Fetch all opcode data for flame graph (only when toggle is enabled)
  const { data: opcodeMap, isLoading: isLoadingOpcodes } = useAllCallFrameOpcodes({
    transactionHash: txHash,
    blockNumber: blockFromSearch,
    enabled: showOpcodes,
  });

  // Get network for fork-aware gas refund calculation
  const { currentNetwork } = useNetwork();

  // Block number: prefer from response (source of truth), fall back to URL param
  const blockNumber = txData?.metadata.blockNumber ?? blockFromSearch ?? null;

  // Get contract owners from txData for name lookup (memoized to avoid dependency issues)
  const contractOwners = useMemo(() => txData?.contractOwners ?? {}, [txData?.contractOwners]);

  // Get function signatures from txData for method name lookup
  const functionSignatures = useMemo(() => txData?.functionSignatures ?? {}, [txData?.functionSignatures]);

  // Contract tree node type
  interface ContractTreeNode {
    address: string;
    name: string | null;
    callTypes: string[];
    selfGas: number;
    totalGas: number;
    callCount: number;
    implementations: ContractTreeNode[];
    isImplementation: boolean;
    firstCallFrameId: number | null; // For click-through to call detail
  }

  // Build contract tree with implementations nested under proxies
  const contractTree = useMemo((): ContractTreeNode[] => {
    if (!txData?.callFrames) return [];

    const frames = txData.callFrames;

    // Map to track implementation relationships: impl address -> proxy address
    const implToProxy = new Map<string, string>();

    // First pass: identify DELEGATECALL relationships
    for (const frame of frames) {
      if ((frame.call_type === 'DELEGATECALL' || frame.call_type === 'CALLCODE') && frame.target_address) {
        // Find the parent frame
        const parentFrame = frames.find(f => f.call_frame_id === frame.parent_call_frame_id);
        if (parentFrame?.target_address && parentFrame.target_address !== frame.target_address) {
          // Only set if not already mapped (first proxy wins)
          if (!implToProxy.has(frame.target_address)) {
            implToProxy.set(frame.target_address, parentFrame.target_address);
          }
        }
      }
    }

    // Second pass: aggregate by contract address
    const contractMap = new Map<
      string,
      {
        address: string;
        name: string | null;
        selfGas: number;
        callCount: number;
        callTypes: Set<string>;
        firstCallFrameId: number | null;
      }
    >();

    for (const frame of frames) {
      // Skip root frame (empty call_type)
      if (!frame.call_type) continue;
      const addr = frame.target_address ?? 'unknown';

      const frameGas = frame.gas ?? 0;
      const existing = contractMap.get(addr);
      if (existing) {
        existing.selfGas += frameGas;
        existing.callCount += 1;
        if (frame.call_type) existing.callTypes.add(frame.call_type);
      } else {
        const ownerName = contractOwners[addr.toLowerCase()]?.contract_name ?? null;
        contractMap.set(addr, {
          address: addr,
          name: ownerName,
          selfGas: frameGas,
          callCount: 1,
          callTypes: new Set(frame.call_type ? [frame.call_type] : []),
          firstCallFrameId: frame.call_frame_id ?? null,
        });
      }
    }

    // Third pass: build tree nodes
    const nodeMap = new Map<string, ContractTreeNode>();

    contractMap.forEach((data, address) => {
      const callTypesArr = [...data.callTypes];
      const isImplementation = !callTypesArr.some(t => t === 'CALL' || t === 'STATICCALL');

      nodeMap.set(address, {
        address: data.address,
        name: data.name,
        callTypes: callTypesArr,
        selfGas: data.selfGas,
        totalGas: data.selfGas, // Will be updated later
        callCount: data.callCount,
        implementations: [],
        isImplementation,
        firstCallFrameId: data.firstCallFrameId,
      });
    });

    // Fourth pass: nest implementations under proxies
    const topLevel: ContractTreeNode[] = [];

    nodeMap.forEach((node, address) => {
      const proxyAddress = implToProxy.get(address);

      if (proxyAddress && nodeMap.has(proxyAddress)) {
        // This is an implementation - nest under proxy
        const proxy = nodeMap.get(proxyAddress)!;
        proxy.implementations.push(node);
      } else {
        // This is a top-level contract
        topLevel.push(node);
      }
    });

    // Fifth pass: calculate total gas (self + implementations) and sort
    topLevel.forEach(node => {
      node.totalGas = node.selfGas + node.implementations.reduce((sum, impl) => sum + impl.selfGas, 0);
      // Sort implementations by gas
      node.implementations.sort((a, b) => b.selfGas - a.selfGas);
    });

    // Sort top-level by total gas descending
    topLevel.sort((a, b) => b.totalGas - a.totalGas);

    return topLevel;
  }, [txData?.callFrames, contractOwners]);

  // Count contracts and implementations
  // An implementation is any contract that's DELEGATECALL-only (no CALL/STATICCALL)
  const contractCounts = useMemo(() => {
    let direct = 0;
    let implementation = 0;

    contractTree.forEach(node => {
      // Top-level can also be an implementation (e.g., first DELEGATECALL from tx entry)
      if (node.isImplementation) {
        implementation += 1;
      } else {
        direct += 1;
      }
      // Nested implementations
      implementation += node.implementations.length;
    });

    return { total: direct + implementation, direct, implementation };
  }, [contractTree]);

  // Calculate call type distribution (excluding root frame which has empty call_type)
  const callTypeDistribution = useMemo(() => {
    if (!txData?.callFrames) return [];
    const typeMap = new Map<string, { type: string; count: number; gasUsed: number }>();

    for (const frame of txData.callFrames) {
      // Skip root frame (depth 0 with empty call_type) - it's the transaction entry, not a call
      if (!frame.call_type) continue;

      const callType = frame.call_type;
      const frameGas = frame.gas ?? 0;
      const existing = typeMap.get(callType);
      if (existing) {
        existing.count += 1;
        existing.gasUsed += frameGas;
      } else {
        typeMap.set(callType, {
          type: callType,
          count: 1,
          gasUsed: frameGas,
        });
      }
    }

    return [...typeMap.values()].sort((a, b) => b.gasUsed - a.gasUsed);
  }, [txData?.callFrames]);

  // Calculate opcode category breakdown for pie chart (by gas)
  const opcodeCategoryData = useMemo(() => {
    if (!txData?.opcodeStats) return [];
    const categoryMap = new Map<string, number>();

    for (const op of txData.opcodeStats) {
      const category = getOpcodeCategory(op.opcode);
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + op.totalGas);
    }

    return [...categoryMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [txData?.opcodeStats]);

  // Calculate opcode category breakdown for pie chart (by count)
  const opcodeCategoryCountData = useMemo(() => {
    if (!txData?.opcodeStats) return [];
    const categoryMap = new Map<string, number>();

    for (const op of txData.opcodeStats) {
      const category = getOpcodeCategory(op.opcode);
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + op.count);
    }

    return [...categoryMap.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [txData?.opcodeStats]);

  // Call type distribution for pie chart (by count) - used for tab visibility check
  const callTypeChartData = useMemo(() => {
    return callTypeDistribution.map(d => ({ name: d.type, value: d.count }));
  }, [callTypeDistribution]);

  // Call type distribution for pie chart (by gas)
  const callTypeGasChartData = useMemo(() => {
    return callTypeDistribution.map(d => ({ name: d.type, value: d.gasUsed }));
  }, [callTypeDistribution]);

  // Top contracts by gas for the chart component
  const topContractsByGas = useMemo(() => {
    return contractTree.map(c => ({
      address: c.address,
      name: c.name,
      gas: c.totalGas,
    }));
  }, [contractTree]);

  // Top calls by gas as TopGasItem[] for the reusable table component
  // Uses self gas (excludes children) to show which calls directly consumed the most gas
  const topCallsItems = useMemo((): TopGasItem[] => {
    if (!txData?.callFrames) return [];
    return [...txData.callFrames]
      .filter(f => f.call_type)
      .sort((a, b) => (b.gas ?? 0) - (a.gas ?? 0))
      .map(f => {
        // Get label similar to flame graph: function name > contract name > address
        const label = getCallLabel(f.target_address, f.function_selector, contractOwners, functionSignatures, '');
        return {
          id: f.call_frame_id ?? 0,
          name: label || null,
          identifier: f.target_address ?? '',
          gas: f.gas ?? 0,
          callType: f.call_type ?? undefined,
        };
      });
  }, [txData?.callFrames, contractOwners, functionSignatures]);

  // Total EVM gas for percentage calculations (root frame's cumulative gas)
  const totalCallGas = useMemo(() => {
    if (!txData?.callFrames?.length) return 0;
    // Root frame (depth 0) has total EVM gas in gas_cumulative
    const rootFrame = txData.callFrames.find(f => f.depth === 0);
    return rootFrame?.gas_cumulative ?? 0;
  }, [txData?.callFrames]);

  // Call frame data for the calls table
  const callFrameData = useMemo((): CallFrameData[] => {
    if (!txData?.callFrames) return [];
    return txData.callFrames
      .filter(f => f.call_type) // Exclude root frame
      .map(f => {
        // Get function name if available
        const funcSelector = f.function_selector?.toLowerCase();
        const funcSig = funcSelector ? functionSignatures[funcSelector] : undefined;
        const functionName = funcSig?.name ? funcSig.name.split('(')[0] : null;

        // Get contract name
        const contractName = contractOwners[f.target_address?.toLowerCase() ?? '']?.contract_name ?? null;

        return {
          callFrameId: f.call_frame_id ?? 0,
          callType: f.call_type ?? '',
          targetAddress: f.target_address ?? '',
          targetName: contractName,
          functionName,
          gasCumulative: f.gas_cumulative ?? 0,
          gasSelf: f.gas ?? 0,
          depth: f.depth ?? 0,
        };
      });
  }, [txData?.callFrames, contractOwners, functionSignatures]);

  // Handle call selection - navigate to call page
  const handleFrameSelect = useCallback(
    (frame: CallTreeNode) => {
      const callId = frame.metadata?.callFrameId;
      if (callId !== undefined) {
        navigate({
          to: '/ethereum/execution/gas-profiler/tx/$txHash/call/$callId',
          params: { txHash, callId: String(callId) },
          search: { block: blockNumber },
        });
      }
    },
    [navigate, txHash, blockNumber]
  );

  // Handle contract click - navigate to first call for that contract
  const handleContractClick = useCallback(
    (callFrameId: number | null) => {
      if (callFrameId !== null) {
        navigate({
          to: '/ethereum/execution/gas-profiler/tx/$txHash/call/$callId',
          params: { txHash, callId: String(callFrameId) },
          search: { block: blockNumber },
        });
      }
    },
    [navigate, txHash, blockNumber]
  );

  // Handle copy
  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(txHash);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [txHash]);

  // Tab state based on URL hash (must be before early returns)
  // Maps hash to expected index - will be refined once we know which tabs are visible
  const getInitialTabIndex = useCallback((): number => {
    const hash = window.location.hash.slice(1);
    // Default mapping: overview=0, trace=1, opcodes=2, calls=3, contracts=4
    if (hash === 'overview') return 0;
    if (hash === 'trace') return 1;
    if (hash === 'opcodes') return 2;
    if (hash === 'calls') return 3;
    if (hash === 'contracts') return 4;
    return 0;
  }, []);
  const [selectedTabIndex, setSelectedTabIndex] = useState(getInitialTabIndex);

  // Listen for popstate (browser back/forward) to sync tab with hash
  useEffect(() => {
    const handlePopState = (): void => {
      setSelectedTabIndex(getInitialTabIndex());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getInitialTabIndex]);

  // Loading state
  if (isLoading) {
    return (
      <Container>
        <Header title={`TX ${txHash.slice(0, 10)}...${txHash.slice(-8)}`} description="Transaction gas analysis" />
        <GasProfilerSkeleton />
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container>
        <Header title={`TX ${txHash.slice(0, 10)}...${txHash.slice(-8)}`} description="Transaction gas analysis" />
        <Alert variant="error" title="Error loading transaction" description={error.message} />
      </Container>
    );
  }

  // No data
  if (!txData) {
    return (
      <Container>
        <Header title={`TX ${txHash.slice(0, 10)}...${txHash.slice(-8)}`} description="Transaction gas analysis" />
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

  const { metadata, callTree } = txData;
  const isSuccess = metadata.status === 'success';
  const totalEvmGas = txData.opcodeStats.reduce((sum: number, op: OpcodeStats) => sum + op.totalGas, 0);

  // Detect simple ETH transfers (no EVM execution, just intrinsic gas)
  const isSimpleTransfer = metadata.evmGasUsed === 0;

  // Calculate effective gas refund based on fork rules (EIP-3529 changed cap from 50% to 20%)
  const { effectiveRefund, isCapped, isPostLondon } = getEffectiveGasRefund(
    metadata.gasRefund,
    metadata.receiptGasUsed,
    metadata.blockNumber,
    currentNetwork
  );
  const refundCapPercent = isPostLondon ? '20%' : '50%';

  return (
    <Container>
      <Header title={`TX ${txHash.slice(0, 10)}...${txHash.slice(-8)}`} description="Transaction gas analysis" />

      {/* Back link + External links */}
      <div className="mb-6 flex items-center justify-between">
        {blockNumber ? (
          <Link
            to="/ethereum/execution/gas-profiler/block/$blockNumber"
            params={{ blockNumber: String(blockNumber) }}
            className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Back to Block {formatGas(blockNumber)}
          </Link>
        ) : (
          <Link
            to="/ethereum/execution/gas-profiler"
            className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Back to Gas Profiler
          </Link>
        )}
        <div className="flex items-center gap-2">
          <a
            href={`https://etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-surface p-1.5 text-muted transition-colors hover:text-foreground"
            title="View on Etherscan"
          >
            <EtherscanIcon className="size-4" />
          </a>
          <a
            href={`https://dashboard.tenderly.co/tx/mainnet/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-surface p-1.5 transition-colors hover:opacity-80"
            title="View on Tenderly"
          >
            <TenderlyIcon className="size-4" />
          </a>
          <a
            href={`https://phalcon.blocksec.com/explorer/tx/eth/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-surface p-1.5 text-muted transition-colors hover:text-foreground"
            title="View on Phalcon"
          >
            <PhalconIcon className="size-4" />
          </a>
        </div>
      </div>

      {/* Quick Stats Row - Always visible */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xs bg-primary/10 p-2">
              <FireIcon className="size-5 text-primary" />
            </div>
            <div>
              <div className="text-xl font-semibold text-foreground">{formatGas(metadata.receiptGasUsed)}</div>
              <div className="text-xs text-muted">Gas Used</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xs bg-cyan-500/10 p-2">
              <CodeBracketIcon className="size-5 text-cyan-500" />
            </div>
            <div>
              <div className="text-xl font-semibold text-foreground">{callFrameData.length}</div>
              <div className="text-xs text-muted">Internal Tx's</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xs bg-purple-500/10 p-2">
              <ArrowsPointingOutIcon className="size-5 text-purple-500" />
            </div>
            <div>
              <div className="text-xl font-semibold text-foreground">{metadata.maxDepth}</div>
              <div className="text-xs text-muted">Max Depth</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xs bg-warning/10 p-2">
              <DocumentTextIcon className="size-5 text-warning" />
            </div>
            <div>
              <div className="text-xl font-semibold text-foreground">{contractCounts.direct}</div>
              <div className="text-xs text-muted">Contracts</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabbed Content */}
      <HeadlessTab.Group selectedIndex={selectedTabIndex} onChange={setSelectedTabIndex}>
        <HeadlessTab.List className="mb-6 flex gap-1 border-b border-border">
          <Tab hash="overview">Overview</Tab>
          {!isSimpleTransfer && callTypeChartData.length > 0 && <Tab hash="trace">Trace</Tab>}
          {!isSimpleTransfer && <Tab hash="opcodes">Opcodes</Tab>}
          {!isSimpleTransfer && callTypeChartData.length > 0 && <Tab hash="calls">Internal Txs</Tab>}
          {contractCounts.direct > 0 && <Tab hash="contracts">Contracts</Tab>}
        </HeadlessTab.List>

        <HeadlessTab.Panels>
          {/* Overview Tab */}
          <HeadlessTab.Panel>
            {/* Transaction Gas Breakdown */}
            <Card className="mb-6 overflow-hidden">
              {/* Header row */}
              <div className="flex items-center justify-between px-4 py-3">
                <h3 className="text-sm font-medium text-foreground">Transaction Gas Breakdown</h3>
                <span className="text-xs text-muted">Position #{metadata.transactionIndex} in block</span>
              </div>

              {/* Gas Formula */}
              <div className="bg-surface/30 px-4 py-5">
                <GasFormula
                  segments={[
                    {
                      label: 'Intrinsic',
                      value: metadata.intrinsicGas ?? 0,
                      color: 'blue',
                      tooltip: <GasTooltip type="intrinsic" context="transaction" size="md" />,
                    },
                    {
                      label: 'EVM Execution',
                      value: metadata.evmGasUsed,
                      color: 'purple',
                      operator: '+',
                      tooltip: <GasTooltip type="evm" context="transaction" size="md" />,
                    },
                    {
                      label: 'Refund',
                      value: effectiveRefund,
                      color: 'green',
                      operator: '-',
                      tooltip: <GasTooltip type="refund" context="transaction" size="md" capPercent={refundCapPercent} />,
                    },
                  ]}
                  result={{
                    label: 'Receipt Gas',
                    value: metadata.receiptGasUsed,
                    tooltip: <GasTooltip type="receipt" context="transaction" size="md" />,
                  }}
                  formatter={formatGas}
                />
              </div>

              {/* TX Hash - subtle inline display */}
              <div className="border-t border-border px-4 py-2 text-center">
                <div className="inline-flex items-center gap-2">
                  {isSuccess ? (
                    <CheckCircleIcon className="size-4 text-success" />
                  ) : (
                    <XCircleIcon className="size-4 text-danger" />
                  )}
                  <code className="font-mono text-xs text-muted" title={txHash}>
                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="rounded-xs p-0.5 text-muted transition-colors hover:text-foreground"
                    title="Copy transaction hash"
                  >
                    <ClipboardDocumentIcon className="size-3.5" />
                  </button>
                  {copied && <span className="text-xs text-success">Copied!</span>}
                </div>
              </div>
            </Card>

            {/* Call Tree or Simple Transfer Message */}
            {isSimpleTransfer ? (
              <Card className="mb-6 p-6 text-center">
                <div className="mb-3 inline-flex rounded-full bg-cyan-500/10 p-3">
                  <svg className="size-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                    />
                  </svg>
                </div>
                <h3 className="mb-1 text-sm font-medium text-foreground">Simple ETH Transfer</h3>
                <p className="text-xs text-muted">
                  This transaction is a simple value transfer with no smart contract interaction.
                  <br />
                  Only intrinsic gas ({formatGas(metadata.intrinsicGas ?? 21000)} gas) was consumed.
                </p>
              </Card>
            ) : (
              callTree && (
                <div className="mb-6">
                  <CallTreeSection
                    callTree={callTree}
                    onFrameSelect={handleFrameSelect}
                    title="Call Tree"
                    showOpcodes={showOpcodes}
                    onShowOpcodesChange={setShowOpcodes}
                    opcodeMap={opcodeMap}
                    isLoadingOpcodes={isLoadingOpcodes}
                  />
                </div>
              )
            )}
          </HeadlessTab.Panel>

          {/* Trace Tab - hierarchical execution tree view */}
          {!isSimpleTransfer && callTypeChartData.length > 0 && (
            <HeadlessTab.Panel>
              <CallTraceView
                callFrames={txData.callFrames}
                contractOwners={contractOwners}
                functionSignatures={functionSignatures}
                txHash={txHash}
                blockNumber={blockNumber}
                totalGas={totalCallGas}
                opcodeStats={txData.callFrameOpcodeStats}
              />
            </HeadlessTab.Panel>
          )}

          {/* Opcodes Tab - only show if not a simple transfer */}
          {!isSimpleTransfer && (
            <HeadlessTab.Panel>
              {/* Opcode bar charts (by gas and by count) */}
              {txData.opcodeStats.length > 0 && (
                <div className="mb-6">
                  <OpcodeAnalysis opcodeStats={txData.opcodeStats} showTable={false} />
                </div>
              )}

              {/* Category pie charts */}
              <div className="mb-6 grid grid-cols-2 gap-6">
                <CategoryPieChart
                  data={opcodeCategoryData}
                  colorMap={CATEGORY_COLORS}
                  title="Gas by Opcode Category"
                  subtitle="Where was EVM gas spent?"
                  percentLabel="of EVM gas"
                  emptyMessage="No opcode data"
                  height={280}
                />
                <CategoryPieChart
                  data={opcodeCategoryCountData}
                  colorMap={CATEGORY_COLORS}
                  title="Count by Opcode Category"
                  subtitle="How often did each category execute?"
                  percentLabel="of executions"
                  emptyMessage="No opcode data"
                  height={280}
                />
              </div>

              {/* Opcode table */}
              {txData.opcodeStats.length > 0 ? (
                <OpcodeAnalysis opcodeStats={txData.opcodeStats} showCharts={false} />
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted">No opcode data available</p>
                </Card>
              )}
            </HeadlessTab.Panel>
          )}

          {/* Internal Txs Tab - only show if not a simple transfer and there are internal txs */}
          {!isSimpleTransfer && callTypeChartData.length > 0 && (
            <HeadlessTab.Panel>
              {/* Top Contracts + Top Internal Txs */}
              <div className="mb-6 grid grid-cols-2 gap-6">
                <TopContractsByGasChart contracts={topContractsByGas} totalGas={totalCallGas} maxContracts={10} />
                <TopItemsByGasTable
                  title="Top Internal Txs by Gas"
                  subtitle="Which internal txs consumed the most gas?"
                  items={topCallsItems}
                  totalGas={totalCallGas}
                  compactCount={5}
                  modalCount={10}
                  columns={{ first: 'Type', second: 'Target' }}
                  onItemClick={item => handleContractClick(item.id as number)}
                />
              </div>

              {/* Internal Tx Type Distribution */}
              <div className="grid grid-cols-2 gap-6">
                <CategoryPieChart
                  data={callTypeChartData}
                  colorMap={CALL_TYPE_COLORS}
                  title="Internal Tx Type Distribution"
                  subtitle="How many of each type?"
                  percentLabel="of internal txs"
                  emptyMessage="No call data"
                  innerRadius={50}
                  outerRadius={75}
                  height={280}
                />
                <CategoryPieChart
                  data={callTypeGasChartData}
                  colorMap={CALL_TYPE_COLORS}
                  title="Gas by Internal Tx Type"
                  subtitle="How much gas did each type consume?"
                  percentLabel="of internal tx gas"
                  emptyMessage="No call data"
                  innerRadius={50}
                  outerRadius={75}
                  height={280}
                />
              </div>
            </HeadlessTab.Panel>
          )}

          {/* Contracts Tab - only render if there are contracts */}
          {contractCounts.direct > 0 && (
            <HeadlessTab.Panel>
              <div>
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-foreground">Contract Interactions</h3>
                      <div className="group relative">
                        <InformationCircleIcon className="size-4 cursor-help text-muted" />
                        <div className="pointer-events-none absolute top-full left-0 z-50 mt-2 hidden w-72 rounded-sm border border-border bg-background p-2 text-xs text-muted shadow-lg group-hover:block">
                          Shows contracts in a tree view. Delegated contracts (
                          <CogIcon className="inline size-3" />) run code on behalf of a proxy contract - this is where
                          gas is actually spent.
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted">All contracts involved in this transaction</p>
                  </div>
                  <span className="text-xs text-muted">
                    {contractCounts.direct} contracts
                    {contractCounts.implementation > 0 && ` · ${contractCounts.implementation} delegated`}
                  </span>
                </div>

                <ContractInteractionsTable
                  contracts={contractTree.map(
                    (c): ContractInteractionItem => ({
                      address: c.address,
                      name: c.name,
                      gas: c.totalGas,
                      callCount: c.callCount,
                      callTypes: c.callTypes,
                      isImplementation: c.isImplementation,
                      implementations: c.implementations.map(impl => ({
                        address: impl.address,
                        name: impl.name,
                        gas: impl.selfGas,
                        callCount: impl.callCount,
                        callTypes: impl.callTypes,
                        isImplementation: true,
                      })),
                    })
                  )}
                  totalGas={totalEvmGas}
                  onContractClick={(contract: ContractInteractionItem) => {
                    // Find the original contract tree node to get firstCallFrameId
                    const treeNode = contractTree.find(c => c.address === contract.address);
                    if (treeNode?.firstCallFrameId !== null && treeNode?.firstCallFrameId !== undefined) {
                      handleContractClick(treeNode.firstCallFrameId);
                      return;
                    }
                    // Check implementations
                    for (const parent of contractTree) {
                      const impl = parent.implementations.find(i => i.address === contract.address);
                      if (impl?.firstCallFrameId !== null && impl?.firstCallFrameId !== undefined) {
                        handleContractClick(impl.firstCallFrameId);
                        return;
                      }
                    }
                  }}
                  percentLabel="% of EVM"
                  showImplementations
                />
              </div>
            </HeadlessTab.Panel>
          )}
        </HeadlessTab.Panels>
      </HeadlessTab.Group>
    </Container>
  );
}
