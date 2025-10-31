import { type JSX, useRef, useState, useMemo } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { MultiLineChart } from './MultiLine';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useChartDownload } from '@/hooks/useChartDownload';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Button } from '@/components/Elements/Button';

/**
 * Demo showing how to add download functionality to a real PopoutCard chart
 * This matches the pattern used in GasChart and other epoch charts
 */
export function PopoutCardDownloadDemo(): JSX.Element {
  const cardRef = useRef<HTMLDivElement>(null);
  const { downloadElement } = useChartDownload();
  const [isDownloading, setIsDownloading] = useState(false);
  const colors = useThemeColors();

  // Sample gas data (similar to real GasChart)
  const { series, avgGasUsed } = useMemo(() => {
    const slots = Array.from({ length: 100 }, (_, i) => 9000000 + i);

    const gasUsedData = slots.map(slot => {
      const baseGas = 25 + Math.sin(slot / 10) * 3;
      const noise = Math.random() * 2 - 1;
      return [slot, baseGas + noise] as [number, number];
    });

    const gasLimitData = slots.map(slot => [slot, 30] as [number, number]);

    const avgGasUsed = gasUsedData.reduce((sum, [, gas]) => sum + gas, 0) / gasUsedData.length;

    const series = [
      {
        name: 'Gas Used',
        data: gasUsedData,
        showSymbol: false,
        smooth: true,
        color: colors.primary,
      },
      {
        name: 'Gas Limit',
        data: gasLimitData,
        showSymbol: false,
        smooth: true,
        color: colors.muted,
        lineStyle: 'dashed' as const,
      },
    ];

    return { series, avgGasUsed };
  }, [colors.primary, colors.muted]);

  const handleDownload = async (includeHeader: boolean): Promise<void> => {
    const element = cardRef.current;
    if (!element) {
      console.error('Card element not available');
      return;
    }

    setIsDownloading(true);
    try {
      await downloadElement(element, {
        filename: 'gas-chart',
        includeHeader,
        watermark: true,
        pixelRatio: 2,
      });
    } catch (error) {
      console.error('Failed to download chart:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-surface p-6">
        <h2 className="mb-2 text-lg font-semibold text-foreground">PopoutCard Download Demo</h2>
        <p className="mb-4 text-sm text-muted">
          This is a real PopoutCard component like the ones used in /ethereum/epochs. Click the download buttons below
          to capture the entire card including title, subtitle, legend, and chart.
        </p>

        {/* Real PopoutCard component with download - wrap in ref to capture */}
        <div ref={cardRef}>
          <PopoutCard title="Gas" subtitle={`${avgGasUsed.toFixed(1)}M average gas used per block`} modalSize="full">
            {({ inModal }) => (
              <MultiLineChart
                series={series}
                xAxis={{
                  type: 'value',
                  name: 'Slot',
                  min: 9000000,
                  max: 9000099,
                }}
                yAxis={{
                  name: 'Gas (M)',
                }}
                height={inModal ? 600 : 300}
                grid={{ left: 60 }}
                showLegend={true}
                enableDataZoom={true}
                animationDuration={300}
              />
            )}
          </PopoutCard>
        </div>

        {/* Download controls */}
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => handleDownload(true)} disabled={isDownloading} className="flex items-center gap-2">
            <ArrowDownTrayIcon className="h-4 w-4" />
            Download with Header
          </Button>

          <Button
            onClick={() => handleDownload(false)}
            disabled={isDownloading}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Download (No Header)
          </Button>
        </div>
      </div>

      <div className="rounded-lg bg-surface p-6">
        <h3 className="mb-3 text-base font-semibold text-foreground">What gets captured?</h3>
        <ul className="space-y-2 text-sm text-muted">
          <li className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <span>
              <strong className="text-foreground">PopoutCard wrapper</strong> - Card background, borders, padding
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <span>
              <strong className="text-foreground">Title</strong> - "Gas"
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <span>
              <strong className="text-foreground">Subtitle</strong> - "27.4M average gas used per block"
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <span>
              <strong className="text-foreground">Legend</strong> - Gas Used, Gas Limit
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <span>
              <strong className="text-foreground">Chart</strong> - Full MultiLineChart with all styling
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <span>
              <strong className="text-foreground">Optional ethpandaops header</strong> - Added on top if
              includeHeader=true
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">✓</span>
            <span>
              <strong className="text-foreground">Watermark</strong> - Semi-transparent "ethpandaops.io"
            </span>
          </li>
        </ul>
      </div>

      <div className="rounded-lg bg-surface p-6">
        <h3 className="mb-3 text-base font-semibold text-foreground">Integration Example</h3>
        <div className="overflow-x-auto">
          <pre className="rounded bg-background p-4 text-xs text-foreground">
            {`import { useRef } from 'react';
import { useChartDownload } from '@/hooks/useChartDownload';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart } from '@/components/Charts/MultiLine';

export function GasChart({ data }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { downloadElement } = useChartDownload();

  const handleDownload = async () => {
    if (cardRef.current) {
      await downloadElement(cardRef.current, {
        filename: 'gas-chart',
        includeHeader: true,
        watermark: true,
      });
    }
  };

  return (
    <>
      {/* Wrap PopoutCard in ref */}
      <div ref={cardRef}>
        <PopoutCard title="Gas" subtitle="27.4M avg">
          <MultiLineChart series={series} showLegend={true} />
        </PopoutCard>
      </div>

      {/* Download button */}
      <button onClick={handleDownload}>Download</button>
    </>
  );
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
