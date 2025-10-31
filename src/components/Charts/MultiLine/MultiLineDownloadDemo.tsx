import { type JSX, useRef, useState } from 'react';
import { MultiLineChart } from './MultiLine';
import { useChartDownload } from '@/hooks/useChartDownload';
import { Button } from '@/components/Elements/Button';
import { Card } from '@/components/Layout/Card';

/**
 * Demo component showing how to capture a full chart component with header/title
 */
export function MultiLineDownloadDemo(): JSX.Element {
  const cardRef = useRef<HTMLDivElement>(null);
  const { downloadElement, getElementImageDataUrl } = useChartDownload();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sampleSeries = [
    {
      name: 'Gas Used',
      data: [
        [100, 25],
        [101, 28],
        [102, 24],
        [103, 30],
        [104, 27],
        [105, 29],
        [106, 26],
      ] as [number, number][],
      color: '#ff6b6b',
      showSymbol: false,
    },
    {
      name: 'Gas Limit',
      data: [
        [100, 30],
        [101, 30],
        [102, 30],
        [103, 30],
        [104, 30],
        [105, 30],
        [106, 30],
      ] as [number, number][],
      color: '#999999',
      showSymbol: false,
      lineStyle: 'dashed' as const,
    },
  ];

  const handleDownload = async (options: { withWatermark?: boolean; includeHeader?: boolean }): Promise<void> => {
    const element = cardRef.current;
    if (!element) {
      console.error('Card element not available');
      return;
    }

    setIsLoading(true);
    try {
      await downloadElement(element, {
        filename: 'gas-chart-demo',
        watermark: options.withWatermark ?? false,
        pixelRatio: 2,
        includeHeader: options.includeHeader ?? true,
      });
    } catch (error) {
      console.error('Failed to download chart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async (options: { withWatermark?: boolean; includeHeader?: boolean }): Promise<void> => {
    const element = cardRef.current;
    if (!element) {
      console.error('Card element not available');
      return;
    }

    setIsLoading(true);
    try {
      const dataUrl = await getElementImageDataUrl(element, {
        watermark: options.withWatermark ?? false,
        pixelRatio: 2,
        includeHeader: options.includeHeader ?? true,
      });
      setPreviewUrl(dataUrl);
    } catch (error) {
      console.error('Failed to generate preview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Full Component Download Demo</h2>
        <p className="mb-4 text-sm text-muted">
          This captures the entire card including title, subtitle, chart, and all styling. Perfect for PopoutCard
          components!
        </p>

        {/* This entire card will be captured */}
        <div ref={cardRef}>
          <Card>
            <div className="space-y-4 p-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Gas Usage</h3>
                <p className="text-sm text-muted">27.4M average gas used per block</p>
              </div>
              <MultiLineChart
                series={sampleSeries}
                xAxis={{
                  type: 'value',
                  name: 'Slot',
                  min: 100,
                  max: 106,
                }}
                yAxis={{
                  name: 'Gas (M)',
                }}
                height={300}
                showLegend={true}
                enableDataZoom={false}
                animationDuration={300}
              />
            </div>
          </Card>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={() => handleDownload({ includeHeader: true })} disabled={isLoading}>
            Download with Header
          </Button>

          <Button onClick={() => handleDownload({ includeHeader: false })} disabled={isLoading} variant="secondary">
            Download (No Header)
          </Button>

          <Button
            onClick={() => handleDownload({ includeHeader: true, withWatermark: true })}
            disabled={isLoading}
            variant="secondary"
          >
            Download + Watermark
          </Button>

          <Button onClick={() => handlePreview({ includeHeader: true })} disabled={isLoading} variant="secondary">
            Preview
          </Button>
        </div>
      </div>

      {previewUrl && (
        <div className="rounded-lg bg-surface p-6">
          <h3 className="mb-3 text-base font-semibold text-foreground">Preview</h3>
          <div className="rounded border border-border bg-background p-4">
            <img src={previewUrl} alt="Chart preview" className="mx-auto max-w-full" />
          </div>
        </div>
      )}

      <div className="rounded-lg bg-surface p-6">
        <h3 className="mb-3 text-base font-semibold text-foreground">How it works</h3>
        <ol className="list-inside list-decimal space-y-2 text-sm text-muted">
          <li>html-to-image library captures the entire HTML element (Card with title, subtitle, chart)</li>
          <li>Element is rendered to canvas with specified pixelRatio for quality</li>
          <li>Optional: Header image is composited on top</li>
          <li>Optional: Watermark is added with semi-transparent text</li>
          <li>Final composed image is downloaded or returned as data URL</li>
        </ol>

        <div className="mt-4 rounded bg-background p-3">
          <p className="text-xs font-semibold text-foreground">✨ Key Advantage</p>
          <p className="text-xs text-muted">
            Captures ALL React components including PopoutCard titles, subtitles, legends, filters - not just the
            ECharts canvas!
          </p>
        </div>
      </div>
    </div>
  );
}
