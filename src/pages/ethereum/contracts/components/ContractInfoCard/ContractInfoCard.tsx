import { type JSX } from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/Elements/Badge';
import { CopyToClipboard } from '@/components/Elements/CopyToClipboard';
import { EtherscanIcon } from '@/components/Ethereum/EtherscanIcon';
import { useNetwork } from '@/hooks/useNetwork';
import { getLabelColor } from '../../utils';
import type { ContractInfoCardProps } from './ContractInfoCard.types';

/** Known source info for external links */
const SOURCE_INFO: Record<string, { url: string; description: string }> = {
  dune: {
    url: 'https://dune.com',
    description: 'Contract labels and metadata from Dune Analytics',
  },
  growthepie: {
    url: 'https://growthepie.xyz',
    description: 'Layer 2 and DeFi contract classifications',
  },
  'eth-labels': {
    url: 'https://github.com/dawsbot/eth-labels',
    description: 'Community-curated Ethereum address labels',
  },
};

/**
 * ContractInfoCard displays contract information in a unified card layout
 * matching the pattern from SlotBasicInfoCard and EpochHeader.
 */
export function ContractInfoCard({ address, contractOwner }: ContractInfoCardProps): JSX.Element {
  const { currentNetwork } = useNetwork();
  const serviceUrls = currentNetwork?.service_urls;

  // Build Etherscan link for contract address
  const etherscanUrl = serviceUrls?.explorer ? `${serviceUrls.explorer}/address/${address}` : null;

  return (
    <div className="overflow-hidden rounded-sm border border-border bg-surface">
      {/* Header section */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {contractOwner?.contract_name ?? 'Contract'}
            </h1>
            <div className="mt-1 flex items-center gap-1">
              <span className="font-mono text-sm text-muted">{address}</span>
              <CopyToClipboard content={address} successMessage="Address copied!" />
            </div>
          </div>

          {/* External links */}
          {etherscanUrl && (
            <div className="flex items-center gap-2">
              <a
                href={etherscanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block opacity-70 transition-opacity hover:opacity-100"
                aria-label="View on Etherscan"
              >
                <EtherscanIcon className="size-5" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Content section */}
      <div className="p-6">
        <div className="flex flex-col gap-6">
          {/* Labels section */}
          {contractOwner?.labels && contractOwner.labels.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {contractOwner.labels.map(label => (
                <Badge key={label} color={getLabelColor(label)} size="small" variant="flat">
                  {label}
                </Badge>
              ))}
            </div>
          )}

          {/* Metadata section */}
          {contractOwner &&
            (contractOwner.account_owner || contractOwner.factory_contract || contractOwner.sources) && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-foreground">Contract Details</h3>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Owner */}
                  {contractOwner.account_owner && (
                    <div>
                      <dt className="text-xs font-medium text-muted">Owner</dt>
                      <dd className="mt-1 text-sm text-foreground">{contractOwner.account_owner}</dd>
                    </div>
                  )}

                  {/* Factory */}
                  {contractOwner.factory_contract && (
                    <div className="sm:col-span-2 lg:col-span-2">
                      <dt className="text-xs font-medium text-muted">Factory</dt>
                      <dd className="mt-1 flex items-center gap-1">
                        <span className="font-mono text-sm text-foreground">{contractOwner.factory_contract}</span>
                        <CopyToClipboard
                          content={contractOwner.factory_contract}
                          successMessage="Factory address copied!"
                        />
                      </dd>
                    </div>
                  )}

                  {/* Sources */}
                  {contractOwner.sources && contractOwner.sources.length > 0 && (
                    <div className="sm:col-span-2 lg:col-span-3">
                      <dt className="text-xs font-medium text-muted">Data Sources</dt>
                      <dd className="mt-1 flex flex-wrap items-center gap-2">
                        {contractOwner.sources.map(source => {
                          const info = SOURCE_INFO[source];
                          return info ? (
                            <span key={source} className="group relative">
                              <a
                                href={info.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-sm text-foreground underline decoration-muted/50 underline-offset-2 transition-colors hover:decoration-foreground"
                              >
                                {source}
                                <ArrowTopRightOnSquareIcon className="size-3" />
                              </a>
                              <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-xs bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background opacity-0 shadow-xs transition-opacity group-hover:opacity-100">
                                {info.description}
                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
                              </span>
                            </span>
                          ) : (
                            <span key={source} className="text-sm text-foreground">
                              {source}
                            </span>
                          );
                        })}
                      </dd>
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
