import { type JSX, memo, useState } from 'react';
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import clsx from 'clsx';
import { BlobDataAvailability } from '../BlobDataAvailability';
import { DataColumnDataAvailability } from '../DataColumnDataAvailability';
import { AttestationArrivals } from '../AttestationArrivals';
import type { BottomBarProps } from './BottomBar.types';

function BottomBarComponent({
  blockVersion,
  blobCount: _blobCount,
  dataColumnBlobCount,
  currentTime,
  deduplicatedBlobData,
  visibleContinentalPropagationData,
  attestationChartValues,
  attestationTotalExpected,
  attestationMaxCount,
  mode: _mode,
}: BottomBarProps): JSX.Element {
  const [selectedTab, setSelectedTab] = useState(0);

  // Detect block version to choose availability component
  const version = blockVersion?.toLowerCase() ?? '';

  // Determine which availability component to show
  const showBlobAvailability = version.includes('deneb') || version.includes('electra') || !version;
  const showDataColumnAvailability = version.includes('fulu');

  return (
    <>
      {/* Desktop Layout - Grid */}
      <div className="hidden h-full grid-cols-12 gap-4 border-t border-border bg-background px-4 py-3 md:grid">
        {/* Columns 1-8: Data Availability Section */}
        <div className="col-span-8 h-full">
          {showBlobAvailability && (
            <BlobDataAvailability
              currentTime={currentTime}
              deduplicatedBlobData={deduplicatedBlobData}
              visibleContinentalPropagationData={visibleContinentalPropagationData}
              maxTime={12000}
            />
          )}

          {showDataColumnAvailability && (
            <DataColumnDataAvailability
              blobCount={dataColumnBlobCount}
              currentTime={currentTime}
              firstSeenData={[]}
              maxTime={12000}
            />
          )}

          {!showBlobAvailability && !showDataColumnAvailability && (
            <div className="flex h-full items-center justify-center rounded-sm bg-surface p-4">
              <p className="text-sm text-muted">Data availability visualization unavailable for this block version</p>
            </div>
          )}
        </div>

        {/* Columns 9-12: Attestation Arrivals */}
        <div className="col-span-4 h-full">
          <AttestationArrivals
            currentTime={currentTime}
            attestationChartValues={attestationChartValues}
            totalExpected={attestationTotalExpected}
            maxCount={attestationMaxCount}
          />
        </div>
      </div>

      {/* Mobile Layout - Tabbed */}
      <div className="flex h-full flex-col bg-background md:hidden md:border-t md:border-border">
        <TabGroup selectedIndex={selectedTab} onChange={setSelectedTab} className="flex min-h-0 flex-1 flex-col">
          <TabList className="flex shrink-0 border-y border-border bg-surface/50">
            {showBlobAvailability && (
              <Tab
                className={({ selected }) =>
                  clsx(
                    'flex-1 px-4 py-2.5 text-sm font-medium transition-colors',
                    selected ? 'border-b-2 border-primary text-foreground' : 'text-muted hover:text-foreground'
                  )
                }
              >
                Propagation
              </Tab>
            )}
            {showDataColumnAvailability && (
              <Tab
                className={({ selected }) =>
                  clsx(
                    'flex-1 px-4 py-2.5 text-sm font-medium transition-colors',
                    selected ? 'border-b-2 border-primary text-foreground' : 'text-muted hover:text-foreground'
                  )
                }
              >
                Data Columns
              </Tab>
            )}
            <Tab
              className={({ selected }) =>
                clsx(
                  'flex-1 px-4 py-2.5 text-sm font-medium transition-colors',
                  selected ? 'border-b-2 border-primary text-foreground' : 'text-muted hover:text-foreground'
                )
              }
            >
              Attestations
            </Tab>
          </TabList>
          <TabPanels className="min-h-0 flex-1 md:p-3">
            {showBlobAvailability && (
              <TabPanel className="h-full">
                <BlobDataAvailability
                  currentTime={currentTime}
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
                  currentTime={currentTime}
                  firstSeenData={[]}
                  maxTime={12000}
                />
              </TabPanel>
            )}
            <TabPanel className="h-full">
              <AttestationArrivals
                currentTime={currentTime}
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
    prevProps.blockVersion === nextProps.blockVersion &&
    prevProps.currentTime === nextProps.currentTime &&
    prevProps.deduplicatedBlobData === nextProps.deduplicatedBlobData &&
    prevProps.visibleContinentalPropagationData === nextProps.visibleContinentalPropagationData &&
    prevProps.attestationChartValues === nextProps.attestationChartValues &&
    prevProps.attestationTotalExpected === nextProps.attestationTotalExpected &&
    prevProps.attestationMaxCount === nextProps.attestationMaxCount
  );
};

export const BottomBar = memo(BottomBarComponent, arePropsEqual);
