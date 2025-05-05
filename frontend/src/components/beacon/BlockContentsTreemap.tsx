import React, { useMemo } from 'react'
import { NivoTreemapChart, TreeMapNode } from '@/components/charts/NivoTreemapChart'

interface BlockContentsTreemapProps {
  transactionCount?: number
  className?: string
  height?: string | number
  width?: string | number
}

const BlockContentsTreemap: React.FC<BlockContentsTreemapProps> = ({
  transactionCount = 0,
  className = '',
  height = '100%',
  width = '100%',
}) => {
  // Generate a fake block structure with the specified number of transactions
  const blockData = useMemo(() => {
    const generateTransactions = (count: number): TreeMapNode[] => {
      return Array.from({ length: count }).map((_, i) => {
        // Add some variety to transaction sizes
        const txSize = Math.max(1, Math.floor(Math.random() * 5) + 1)
        
        return {
          id: `tx-${i}`,
          value: txSize,
        }
      })
    }

    // Create hierarchical block structure
    const data: TreeMapNode = {
      id: 'beacon-block',
      value: undefined, // Parent nodes don't need explicit values as they're calculated from children
      children: [
        {
          id: 'execution-block',
          value: undefined,
          children: generateTransactions(transactionCount),
        },
      ],
    }

    return data
  }, [transactionCount])

  // Special tooltip to show appropriate labels for different levels
  const CustomTooltip = ({ node }: { node: TreeMapNode }) => {
    if (node.id === 'beacon-block') {
      return (
        <div className="bg-gray-800 text-white text-xs p-2 rounded shadow-lg">
          <p className="font-medium">Beacon Block</p>
          <p>Contains: Consensus data & execution payload</p>
        </div>
      )
    }
    
    if (node.id === 'execution-block') {
      return (
        <div className="bg-gray-800 text-white text-xs p-2 rounded shadow-lg">
          <p className="font-medium">Execution Block</p>
          <p>{`Contains: ${transactionCount} transactions`}</p>
        </div>
      )
    }
    
    // Transaction node
    return (
      <div className="bg-gray-800 text-white text-xs p-2 rounded shadow-lg">
        <p className="font-medium">Transaction</p>
        <p>Size: {node.value} units</p>
      </div>
    )
  }

  // Show the transaction count in any case
  const showCount = (count: number | undefined) => {
    return (
      <div className="absolute top-0 left-0 bg-black/70 text-white text-xs p-1">
        Count: {count !== undefined ? count : 'undefined'}
      </div>
    )
  }
  
  // If there are no transactions, show a placeholder
  if (transactionCount === 0 || transactionCount === undefined) {
    return (
      <div className={`relative flex items-center justify-center text-gray-400 ${className}`} style={{ height, width }}>
        {showCount(transactionCount)}
        {transactionCount === 0 ? 'No transactions in block' : 'Waiting for transaction data...'}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} style={{ height, width }}>
      {showCount(transactionCount)}
      <NivoTreemapChart
        data={blockData}
        height={height}
        width={width}
        valueFormat=">-.0f"
        colors={{ scheme: 'blues' }}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.3]] }}
        labelSkipSize={12}
        padding={4}
        enableLabel={true}
        enableParentLabel={true}
        isInteractive={true}
        tooltip={CustomTooltip}
      />
    </div>
  )
}

export default BlockContentsTreemap