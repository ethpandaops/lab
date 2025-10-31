import { type JSX, useRef, useState } from 'react';
import type ReactEChartsCore from 'echarts-for-react/lib/core';
import { LineChart } from './Line';
import { useChartDownload } from '@/hooks/useChartDownload';
import { Button } from '@/components/Elements/Button';

/**
 * Demo component showing how to use the chart download functionality
 */
export function ChartDownloadDemo(): JSX.Element {
  const chartRef = useRef<ReactEChartsCore>(null);
  const { downloadChart, getComposedImageDataUrl } = useChartDownload();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sampleData = [820, 932, 901, 934, 1290, 1330, 1320];
  const sampleLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const handleDownload = async (withWatermark: boolean): Promise<void> => {
    const instance = chartRef.current?.getEchartsInstance();
    if (!instance) {
      console.error('Chart instance not available');
      return;
    }

    setIsLoading(true);
    try {
      await downloadChart(instance, {
        filename: 'sample-chart',
        watermark: withWatermark,
        pixelRatio: 2,
      });
    } catch (error) {
      console.error('Failed to download chart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async (withWatermark: boolean): Promise<void> => {
    const instance = chartRef.current?.getEchartsInstance();
    if (!instance) {
      console.error('Chart instance not available');
      return;
    }

    setIsLoading(true);
    try {
      const dataUrl = await getComposedImageDataUrl(instance, {
        watermark: withWatermark,
        pixelRatio: 2,
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
        <h2 className="mb-4 text-lg font-semibold text-foreground">Chart Download Demo</h2>

        <div className="mb-4">
          <LineChart
            ref={chartRef}
            data={sampleData}
            labels={sampleLabels}
            title="Sample Weekly Data"
            height={400}
            showArea={true}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => handleDownload(false)} disabled={isLoading}>
            Download Chart
          </Button>

          <Button onClick={() => handleDownload(true)} disabled={isLoading} variant="secondary">
            Download with Watermark
          </Button>

          <Button onClick={() => handlePreview(false)} disabled={isLoading} variant="secondary">
            Preview Composition
          </Button>

          <Button onClick={() => handlePreview(true)} disabled={isLoading} variant="secondary">
            Preview with Watermark
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
          <li>ECharts generates the chart image using getDataURL() with specified pixelRatio</li>
          <li>Header image is loaded and composited on top using HTML Canvas API</li>
          <li>Optional watermark is added with semi-transparent text overlay</li>
          <li>Final composed image is either downloaded or returned as data URL</li>
        </ol>
      </div>
    </div>
  );
}
