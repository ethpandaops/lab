/**
 * Views whose data is still being modelled. Each renders as a PendingSource card until its table is available.
 */
export const PENDING_SOURCES = {
  nodeCensus: {
    title: 'Node-weighted census',
    description:
      'Peers seen on the P2P network each day, by version, release, country, ASN, custody groups, QUIC and latency.',
  },
  enrCrawl: {
    title: 'ENR crawl',
    description: 'Nodes found by crawling discovery records, counted by client and version.',
  },
  ipPairings: {
    title: 'Pairings by IP',
    description: 'Consensus and execution clients running behind the same IP address.',
  },
  enrForkReadiness: {
    title: 'Fork readiness from ENRs',
    description:
      'Nodes advertising the next fork: next_fork_digest on consensus nodes, fork_id_next on execution nodes.',
  },
  proposerBehaviour: {
    title: 'Proposer behaviour',
    description: 'MEV share and value, blobs, gas, propagation and reorgs of the blocks this client proposed.',
  },
  attestations: {
    title: 'Attestation performance',
    description: 'Head, target and source correctness of validators running this client.',
  },
  custodyCompliance: {
    title: 'Custody compliance',
    description: 'Whether peers on each version serve the columns they custody.',
  },
} as const;
