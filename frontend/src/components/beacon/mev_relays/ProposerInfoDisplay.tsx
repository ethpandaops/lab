import React from 'react';

/**
 * Props for the ProposerInfoDisplay component.
 */
export interface ProposerInfoDisplayProps {
  /** The index of the proposer validator. Can be bigint, number, or undefined if missing. */
  proposerIndex: bigint | number | undefined;
  /** The name of the entity associated with the proposer (e.g., pool name), or undefined if unknown. */
  entity: string | undefined;
}

/**
 * Displays the proposer validator index and associated entity name for a slot.
 */
export const ProposerInfoDisplay: React.FC<ProposerInfoDisplayProps> = ({
  proposerIndex,
  entity,
}) => {
  // Format proposerIndex, handling potential BigInt and undefined values
  const formattedProposerIndex = proposerIndex !== undefined ? proposerIndex.toString() : 'Unknown';

  // Determine entity display value, providing a fallback
  const entityDisplay = entity || '-';

  return (
    <div className="space-y-1">
      <div className="text-sm">
        <span className="text-secondary">Proposer Index: </span>
        <span className="font-mono text-tertiary">{formattedProposerIndex}</span>
      </div>
      <div className="text-sm">
        <span className="text-secondary">Entity: </span>
        <span className="font-mono text-tertiary">{entityDisplay}</span>
      </div>
    </div>
  );
};

export default ProposerInfoDisplay;
