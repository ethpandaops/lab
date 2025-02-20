import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Block {
  id: number
}

const BLOCK_INTERVAL = 12000 // 12 seconds
const MAX_BLOCKS = 3 // Show fewer blocks
const STARTING_BLOCK = 150

export function BlockchainViz(): JSX.Element {
  const [blocks, setBlocks] = useState<Block[]>([])
  const intervalRef = useRef<NodeJS.Timeout>()

  // Initialize blocks
  useEffect(() => {
    // Start with initial blocks
    const initialBlocks = Array.from({ length: MAX_BLOCKS }, (_, i) => ({
      id: STARTING_BLOCK + i
    }))
    setBlocks(initialBlocks)

    // Set up interval for new blocks
    const addBlock = () => {
      setBlocks(prev => {
        const nextId = prev[prev.length - 1].id + 1
        return [...prev.slice(1), { id: nextId }]
      })
    }

    intervalRef.current = setInterval(addBlock, BLOCK_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const nextBlockId = blocks.length > 0 ? blocks[blocks.length - 1].id + 1 : STARTING_BLOCK

  return (
    <div className="w-full overflow-hidden py-8">
      <div className="flex items-center gap-8">
        <AnimatePresence initial={false} mode="popLayout">
          {blocks.map((block) => (
            <motion.div
              key={block.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative flex-shrink-0"
            >
              {/* Block */}
              <div className="w-24 h-24 backdrop-blur-md   -default bg-surface/80 flex flex-col items-center justify-center">
                <div className="text-2xl font-mono font-bold text-primary">
                  #{block.id}
                </div>
              </div>

              {/* Connection line to next block */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2" style={{ transform: 'translateX(100%)' }}>
                <div className="w-8 h-1 bg-gradient-to-r from-primary to-primary/20" />
                <div className="absolute top-1/2 right-0 w-0 h-0 -translate-y-1/2 -t-[6px] -t-transparent -b-[6px] -b-transparent -l-[8px] -l-primary/20" />
              </div>
            </motion.div>
          ))}

          {/* Upcoming block placeholder */}
          <motion.div
            key="upcoming"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative flex-shrink-0"
          >
            <div className="w-24 h-24   -dashed -subtle flex items-center justify-center">
              <div className="text-2xl font-mono font-bold text-primary/20">
                #{nextBlockId}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
} 