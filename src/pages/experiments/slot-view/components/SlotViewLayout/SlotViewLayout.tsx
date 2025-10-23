import { type JSX, useMemo, useState, useEffect, useRef } from 'react';
import { useSlotPlayerState, useSlotPlayerProgress, useSlotPlayerActions } from '@/hooks/useSlotPlayer';
import { MapChart } from '@/components/Charts/Map';
import { Sidebar } from '../Sidebar';
import { BlockDetailsCard } from '../BlockDetailsCard';
import { BottomBar } from '../BottomBar';
import { useSlotViewData } from '../../hooks';
import type { SlotViewLayoutProps } from './SlotViewLayout.types';

export function SlotViewLayout({ mode }: SlotViewLayoutProps): JSX.Element {
  const { currentSlot, isPlaying } = useSlotPlayerState();
  const { slotProgress } = useSlotPlayerProgress();
  const actions = useSlotPlayerActions();

  // Throttle currentTime updates to 10fps (100ms) for better performance
  // This reduces React re-renders significantly while still looking smooth
  const [currentTime, setCurrentTime] = useState(slotProgress);
  const rafRef = useRef<number | null>(null);
  const slotProgressRef = useRef(slotProgress);
  const lastUpdateTimeRef = useRef(0);

  // Keep ref up to date
  slotProgressRef.current = slotProgress;

  useEffect(() => {
    const updateCurrentTime = (timestamp: number): void => {
      // Only update state every 100ms (10fps) to reduce React re-renders
      if (timestamp - lastUpdateTimeRef.current >= 100) {
        setCurrentTime(slotProgressRef.current);
        lastUpdateTimeRef.current = timestamp;
      }
      rafRef.current = requestAnimationFrame(updateCurrentTime);
    };

    rafRef.current = requestAnimationFrame(updateCurrentTime);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Fetch all slot data
  const slotData = useSlotViewData(currentSlot);

  // Filter map points based on current time (progressive reveal)
  // Only show nodes that have seen the block by the current playback time
  const visibleMapPoints = useMemo(() => {
    return slotData.mapPoints.filter(point => {
      // Show point only if the earliest node in this city group has seen the block
      // currentTime is in ms from slot start, earliestSeenTime is also in ms from slot start
      return point.earliestSeenTime <= currentTime;
    });
  }, [slotData.mapPoints, currentTime]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* Main Content Area - 74% height */}
      <div className="grid h-[74vh] grid-cols-12 gap-4 p-4">
        {/* Columns 1-9: Main Content */}
        <div className="col-span-9 flex h-full flex-col gap-4 overflow-hidden">
          {/* Block Details Card */}
          <div className="shrink-0">
            <BlockDetailsCard
              data={slotData.blockDetails}
              currentTime={currentTime}
              attestationData={slotData.attestationData}
              attestationTotalExpected={slotData.attestationTotalExpected}
            />
          </div>

          {/* Map Section - takes all remaining vertical space */}
          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="h-full w-full">
              <MapChart points={visibleMapPoints} height="100%" pointSize={6} />
            </div>
          </div>
        </div>

        {/* Columns 10-12: Sidebar - flex column constrained to parent height */}
        <div className="col-span-3 flex h-full flex-col overflow-hidden">
          <Sidebar
            phases={slotData.sidebarPhases}
            currentTime={currentTime}
            slotDuration={12000}
            items={slotData.sidebarItems}
            isPlaying={isPlaying}
            onPlayPause={actions.toggle}
            onBackward={actions.previousSlot}
            onForward={actions.nextSlot}
            onTimeClick={timeMs => actions.seekToTime(timeMs)}
            isLive={mode === 'live'}
          />
        </div>
      </div>

      {/* Bottom Bar - 26% height */}
      <div className="h-[26vh]">
        <BottomBar slotData={slotData} currentTime={currentTime} mode={mode} />
      </div>
    </div>
  );
}
