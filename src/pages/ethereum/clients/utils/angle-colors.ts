/**
 * Colours of the angles Lab measures client adoption from, for wherever they are compared side by side. An angle is
 * a population, not a client, so it never takes a client's colour: these hues sit clear of the common clients
 * (Lighthouse blue, Prysm pink, Teku orange, Nimbus yellow, Lodestar violet, Geth slate, Nethermind cyan, Besu teal,
 * Reth red-orange) and read on both the light and dark themes.
 */
export const ANGLE_COLORS = {
  /** Proposed blocks, stake-weighted, from graffiti */
  blocks: '#10b981',
  /** P2P peers, node-weighted, from the tysm crawler */
  peers: '#d946ef',
  /** Nodes in the ENR crawl */
  enr: '#84cc16',
  /** Xatu nodes reporting to ethPandaOps */
  xatu: '#ef4444',
} as const;

export type Angle = keyof typeof ANGLE_COLORS;
