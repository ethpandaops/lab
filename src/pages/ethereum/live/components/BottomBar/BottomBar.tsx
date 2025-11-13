import { type JSX, memo, useState } from 'react';
import { TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import clsx from 'clsx';
import { Tab } from '@/components/Navigation/Tab';
import { BlobDataAvailability } from '../BlobDataAvailability';
import { DataColumnDataAvailability } from '../DataColumnDataAvailability';
import { AttestationArrivals } from '../AttestationArrivals';
import type { BottomBarProps } from './BottomBar.types';

function BottomBarComponent({
  activeFork,
  blockVersion: _blockVersion,
  blobCount: _blobCount,
  dataColumnBlobCount,
  dataColumnFirstSeenData,
  currentSlot,
  deduplicatedBlobData,
  visibleContinentalPropagationData,
  attestationChartValues,
  attestationTotalExpected,
  attestationMaxCount,
  mode: _mode,
}: BottomBarProps): JSX.Element {
  const [selectedTab, setSelectedTab] = useState(0);

  // Determine which availability component to show based on active fork
  // This uses wallclock time (current epoch) to avoid fetching data before deciding which view to show
  const forkName = activeFork?.name ?? '';

  // Determine which availability component to show
  // Fulu and later: show PeerDAS data column availability
  // Deneb and Electra: show blob availability
  // Earlier forks: show neither
  const showBlobAvailability = forkName === 'deneb' || forkName === 'electra';
  const showDataColumnAvailability = forkName === 'fulu' || forkName === 'glaos';

  return (
    <>
      {/* Desktop Layout - Three-column grid */}
      <div className="hidden h-full grid-cols-3 lg:grid">
        {/* Column 1: First Seen / Data Columns (spans 2 columns for PeerDAS) */}
        <div className={clsx('h-full border-r border-border', showDataColumnAvailability && 'col-span-2')}>
          {showBlobAvailability && (
            <BlobDataAvailability
              key={`first-seen-${currentSlot}`}
              deduplicatedBlobData={deduplicatedBlobData}
              visibleContinentalPropagationData={visibleContinentalPropagationData}
              maxTime={12000}
              variant="first-seen-only"
            />
          )}

          {showDataColumnAvailability && (
            <DataColumnDataAvailability
              blobCount={dataColumnBlobCount}
              firstSeenData={dataColumnFirstSeenData}
              maxTime={12000}
            />
          )}

          {!showBlobAvailability && !showDataColumnAvailability && (
            <div className="flex h-full items-center justify-center p-4">
              <p className="text-sm text-muted">Data unavailable</p>
            </div>
          )}
        </div>

        {/* Column 2: Continental Propagation (only shown for blobs) */}
        {showBlobAvailability && (
          <div className="h-full border-r border-border">
            <BlobDataAvailability
              key={`continental-${currentSlot}`}
              deduplicatedBlobData={deduplicatedBlobData}
              visibleContinentalPropagationData={visibleContinentalPropagationData}
              maxTime={12000}
              variant="continental-only"
            />
          </div>
        )}

        {/* Column 3: Attestation Arrivals */}
        <div className="h-full">
          <AttestationArrivals
            attestationChartValues={attestationChartValues}
            totalExpected={attestationTotalExpected}
            maxCount={attestationMaxCount}
          />
        </div>
      </div>

      {/* Mobile Layout - Tabbed */}
      <div className="flex h-full flex-col bg-background md:border-t md:border-border lg:hidden">
        <TabGroup selectedIndex={selectedTab} onChange={setSelectedTab} className="flex min-h-0 flex-1 flex-col">
          <TabList className="flex shrink-0 border-y border-border bg-surface/50">
            {showBlobAvailability && <Tab className="flex-1">Propagation</Tab>}
            {showDataColumnAvailability && <Tab className="flex-1">Data Columns</Tab>}
            <Tab className="flex-1">Attestations</Tab>
          </TabList>
          <TabPanels className="min-h-0 flex-1 md:p-3">
            {showBlobAvailability && (
              <TabPanel className="h-full">
                <BlobDataAvailability
                  key={`mobile-both-${currentSlot}`}
                  deduplicatedBlobData={deduplicatedBlobData}
                  visibleContinentalPropagationData={visibleContinentalPropagationData}
                  maxTime={12000}
                />
              </TabPanel>
            )}
            {showDataColumnAvailability && (
              <TabPanel className="h-full">
                <DataColumnDataAvailability
                  blobCount={dataColumnBlobCount}
                  firstSeenData={dataColumnFirstSeenData}
                  maxTime={12000}
                />
              </TabPanel>
            )}
            <TabPanel className="h-full">
              <AttestationArrivals
                attestationChartValues={attestationChartValues}
                totalExpected={attestationTotalExpected}
                maxCount={attestationMaxCount}
              />
            </TabPanel>
          </TabPanels>
        </TabGroup>
      </div>
    </>
  );
}

// Custom comparison function to prevent re-renders when data hasn't changed
const arePropsEqual = (prevProps: BottomBarProps, nextProps: BottomBarProps): boolean => {
  return (
    prevProps.activeFork?.name === nextProps.activeFork?.name &&
    prevProps.blockVersion === nextProps.blockVersion &&
    prevProps.currentSlot === nextProps.currentSlot &&
    prevProps.dataColumnBlobCount === nextProps.dataColumnBlobCount &&
    prevProps.dataColumnFirstSeenData === nextProps.dataColumnFirstSeenData &&
    prevProps.deduplicatedBlobData === nextProps.deduplicatedBlobData &&
    prevProps.visibleContinentalPropagationData === nextProps.visibleContinentalPropagationData &&
    prevProps.attestationChartValues === nextProps.attestationChartValues &&
    prevProps.attestationTotalExpected === nextProps.attestationTotalExpected &&
    prevProps.attestationMaxCount === nextProps.attestationMaxCount
  );
};

export const BottomBar = memo(BottomBarComponent, arePropsEqual);
