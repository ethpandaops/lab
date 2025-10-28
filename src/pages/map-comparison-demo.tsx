import { useState } from 'react';
import { MapChart } from '@/components/Charts/Map';
import { Map2DChart } from '@/components/Charts/Map2D';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';

/**
 * Demo page to compare 3D vs 2D map performance
 * Navigate to this page to see side-by-side comparison
 */

// Generate test data
const generatePoints = (count: number) => {
  const cities = [
    { name: 'New York, USA', coords: [-74.006, 40.7128] as [number, number] },
    { name: 'London, UK', coords: [-0.1276, 51.5074] as [number, number] },
    { name: 'Tokyo, Japan', coords: [139.6917, 35.6895] as [number, number] },
    { name: 'Sydney, Australia', coords: [151.2093, -33.8688] as [number, number] },
    { name: 'São Paulo, Brazil', coords: [-46.6333, -23.5505] as [number, number] },
    { name: 'Mumbai, India', coords: [72.8777, 19.076] as [number, number] },
    { name: 'Paris, France', coords: [2.3522, 48.8566] as [number, number] },
    { name: 'Berlin, Germany', coords: [13.405, 52.52] as [number, number] },
    { name: 'Singapore', coords: [103.8198, 1.3521] as [number, number] },
    { name: 'Dubai, UAE', coords: [55.2708, 25.2048] as [number, number] },
  ];

  const points = [];
  for (let i = 0; i < count; i++) {
    // Use real cities or generate random points
    if (i < cities.length) {
      points.push({
        name: cities[i].name,
        coords: cities[i].coords,
        value: Math.floor(Math.random() * 100) + 20,
      });
    } else {
      const lat = Math.random() * 160 - 80; // Avoid poles
      const lon = Math.random() * 360 - 180;
      points.push({
        name: `Node ${i}`,
        coords: [lon, lat] as [number, number],
        value: Math.floor(Math.random() * 50) + 1,
      });
    }
  }
  return points;
};

export default function MapComparisonDemo() {
  const [pointCount, setPointCount] = useState(100);
  const [points, setPoints] = useState(generatePoints(pointCount));
  const [renderTime3D, setRenderTime3D] = useState<number | null>(null);
  const [renderTime2D, setRenderTime2D] = useState<number | null>(null);

  const handleGeneratePoints = (count: number) => {
    setPointCount(count);
    const start = performance.now();
    const newPoints = generatePoints(count);
    setPoints(newPoints);
    console.log(`Generated ${count} points in ${performance.now() - start}ms`);
  };

  const measure3D = () => {
    const start = performance.now();
    requestAnimationFrame(() => {
      setRenderTime3D(performance.now() - start);
    });
  };

  const measure2D = () => {
    const start = performance.now();
    requestAnimationFrame(() => {
      setRenderTime2D(performance.now() - start);
    });
  };

  return (
    <Container>
      <Header
        title="Map Performance Comparison"
        description="Compare 3D WebGL vs 2D Canvas rendering performance"
      />

      {/* Controls */}
      <Card className="mb-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Test Dataset Size</h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleGeneratePoints(50)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                50 Points
              </button>
              <button
                onClick={() => handleGeneratePoints(100)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                100 Points
              </button>
              <button
                onClick={() => handleGeneratePoints(500)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                500 Points
              </button>
              <button
                onClick={() => handleGeneratePoints(1000)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                1000 Points
              </button>
              <button
                onClick={() => handleGeneratePoints(2000)}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
              >
                2000 Points (Slow on 3D!)
              </button>
            </div>
            <p className="text-sm text-muted mt-2">Current: {pointCount} points</p>
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded">
            <div>
              <h4 className="font-semibold">3D Map (WebGL)</h4>
              <p className="text-sm text-muted">
                {renderTime3D ? `Last render: ${renderTime3D.toFixed(2)}ms` : 'Not measured'}
              </p>
            </div>
            <div>
              <h4 className="font-semibold">2D Map (Canvas)</h4>
              <p className="text-sm text-muted">
                {renderTime2D ? `Last render: ${renderTime2D.toFixed(2)}ms` : 'Not measured'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Side by Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3D Map */}
        <Card>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">3D Map (geo3D + WebGL)</h3>
              <button
                onClick={measure3D}
                className="px-3 py-1 text-sm bg-secondary rounded hover:bg-secondary/80"
              >
                Measure Render
              </button>
            </div>
            <div className="text-sm text-muted space-y-1">
              <p>✨ Beautiful 3D effects</p>
              <p>⚠️ Slower with large datasets</p>
              <p>📦 +500KB bundle (echarts-gl)</p>
            </div>
            <div onLoad={measure3D}>
              <MapChart
                points={points}
                height={500}
                pointSize={4}
                showEffect={false}
                regionHeight={0}
              />
            </div>
          </div>
        </Card>

        {/* 2D Map */}
        <Card>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">2D Map (geo + Canvas)</h3>
              <button
                onClick={measure2D}
                className="px-3 py-1 text-sm bg-secondary rounded hover:bg-secondary/80"
              >
                Measure Render
              </button>
            </div>
            <div className="text-sm text-muted space-y-1">
              <p>🚀 Much faster rendering</p>
              <p>✅ Smooth with 5000+ points</p>
              <p>📦 No extra bundle size</p>
            </div>
            <div onLoad={measure2D}>
              <Map2DChart points={points} height={500} pointSizeMultiplier={1} />
            </div>
          </div>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="mt-6">
        <h3 className="text-lg font-semibold mb-2">How to Test</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted">
          <li>Click different point count buttons above</li>
          <li>Watch how fast each map renders</li>
          <li>Try panning and zooming on each map</li>
          <li>Notice the performance difference, especially with 1000+ points</li>
          <li>On 3D map: Right-click drag to rotate (slower)</li>
          <li>On 2D map: Drag to pan (faster and smoother)</li>
        </ol>
      </Card>
    </Container>
  );
}
