import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import clsx from 'clsx'
import { FaEthereum } from 'react-icons/fa'
import { useContext } from 'react'
import { NetworkContext } from '../../../App'
import { formatEntityName } from '../../../utils/format'

interface BlockDetailsProps {
  slot: number
  proposer: string
  proposerIndex?: number
  txCount: number
  blockSize?: number
  baseFee?: number
  gasUsed?: number
  gasLimit?: number
  executionBlockNumber?: number
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function BlockDetailsOverlay({
  slot,
  proposer,
  proposerIndex,
  txCount,
  blockSize,
  baseFee,
  gasUsed,
  gasLimit,
  executionBlockNumber,
  isCollapsed,
  onToggleCollapse
}: BlockDetailsProps): JSX.Element {
  const { selectedNetwork } = useContext(NetworkContext)
  const epoch = Math.floor(slot / 32)
  const slotInEpoch = (slot % 32) + 1

  return (
    <div className={clsx(
      'absolute transition-all duration-300 ease-in-out z-10',
      'w-full md:w-96',
      isCollapsed
        ? 'h-12 md:top-4 md:left-4'
        : 'h-auto md:top-4 md:left-4',
      'bottom-0 md:bottom-auto',
      'left-0',
      'backdrop-blur-lg bg-surface/40 ring-1 ring-inset ring-white/5 rounded-lg overflow-hidden'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <FaEthereum className="w-4 h-4 text-accent" />
          <span className="font-mono text-sm">Slot</span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 hover:bg-hover rounded-lg transition-colors"
        >
          {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-4 pt-0 space-y-4">
          {/* Basic Info */}
          <div className="space-y-2">
            <div className="text-xs text-tertiary">Slot Info</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-xs text-tertiary">Number</div>
                <div className="font-mono">{slot}</div>
              </div>
              <div>
                <div className="text-xs text-tertiary">Slot in Epoch</div>
                <div className="font-mono">{slotInEpoch} of 32</div>
              </div>
              <div>
                <div className="text-xs text-tertiary">Epoch</div>
                <div className="font-mono">{epoch}</div>
              </div>
            </div>
          </div>

          {/* Proposer */}
          <div className="space-y-2">
            <div className="text-xs text-tertiary">Proposer</div>
            <div className="space-y-1">
              <div className="font-mono text-sm flex items-center gap-1">
                {formatEntityName(proposer).name}
                {formatEntityName(proposer).type && (
                  <span className="text-xs text-tertiary/40 font-normal">
                    [{formatEntityName(proposer).type}]
                  </span>
                )}
              </div>
              {proposerIndex !== undefined && (
                <div className="text-xs text-tertiary">
                  Validator Index: <span className="font-mono">{proposerIndex}</span>
                </div>
              )}
            </div>
          </div>

          {/* Transaction Info */}
          <div className="space-y-2">
            <div className="text-xs text-tertiary">Transaction Info</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-xs text-tertiary">Count</div>
                <div className="font-mono">{txCount.toLocaleString()}</div>
              </div>
              {blockSize && (
                <div>
                  <div className="text-xs text-tertiary">Size</div>
                  <div className="font-mono">{(blockSize / 1024).toFixed(2)} KB</div>
                </div>
              )}
            </div>
          </div>

          {/* Gas Info */}
          {(gasUsed || gasLimit || baseFee) && (
            <div className="space-y-2">
              <div className="text-xs text-tertiary">Gas</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {gasUsed && (
                  <div>
                    <div className="text-xs text-tertiary">Used</div>
                    <div className="font-mono">{gasUsed.toLocaleString()}</div>
                  </div>
                )}
                {gasLimit && (
                  <div>
                    <div className="text-xs text-tertiary">Limit</div>
                    <div className="font-mono">{gasLimit.toLocaleString()}</div>
                  </div>
                )}
                {baseFee && (
                  <div className="col-span-2">
                    <div className="text-xs text-tertiary">Base Fee</div>
                    <div className="font-mono">{(baseFee / 1e9).toFixed(2)} Gwei</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Execution Block */}
          {executionBlockNumber && (
            <div className="space-y-1">
              <div className="text-xs text-tertiary">Execution Block</div>
              <div className="font-mono text-sm">{executionBlockNumber}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 