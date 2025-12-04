/**
 * AlgorithmicArt - Network Constellation generative art component
 *
 * Creates an animated visualization of network nodes with glowing connections
 * and data packets traveling along edges, representing Ethereum network topology.
 *
 * Uses native Canvas 2D API for minimal memory footprint.
 *
 * @example
 * ```tsx
 * <AlgorithmicArt
 *   height={600}
 *   seed={12345}
 *   showOverlay
 *   overlayTitle="Welcome to The Lab"
 *   overlaySubtitle="Ethereum data visualizations"
 * />
 * ```
 */

import { useEffect, useRef, type JSX } from 'react';
import { useThemeColors } from '@/hooks/useThemeColors';
import clsx from 'clsx';
import type { AlgorithmicArtProps, AlgorithmicArtColors } from './AlgorithmicArt.types';

/** Simple seeded random number generator */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Parse hex color to RGB */
function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

/** Node in the network */
interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pulsePhase: number;
  connections: number[]; // indices of connected nodes
}

/** Traveling particle */
interface Particle {
  fromIdx: number;
  toIdx: number;
  progress: number;
  speed: number;
  size: number;
}

/**
 * AlgorithmicArt component - Pure Canvas 2D implementation
 */
export function AlgorithmicArt({
  height = 600,
  width = '100%',
  seed = 12345,
  colors,
  className,
  speed = 1,
  showOverlay = false,
  overlayTitle,
  overlaySubtitle,
}: AlgorithmicArtProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const themeColors = useThemeColors();
  const artColors = colors || themeColors;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Animation state
    let animationId: number;
    let isRunning = true;

    // Initialize with seeded random
    const random = seededRandom(seed);

    // Configuration
    const connectionDistance = 250;
    const maxConnections = 15;
    const maxParticles = 30;

    // State arrays - pre-allocated
    let nodes: NetworkNode[] = [];
    let particles: Particle[] = [];
    let frameCounter = 0;

    // Cached colors
    let bgColor = { r: 0, g: 0, b: 0 };
    let accentColor = { r: 0, g: 0, b: 0 };
    let primaryColor = { r: 0, g: 0, b: 0 };
    let mutedColor = { r: 0, g: 0, b: 0 };
    let lastColorKey = '';

    /** Update cached colors if theme changed */
    const updateColors = (colors: AlgorithmicArtColors): void => {
      const colorKey = colors.background + colors.accent + colors.primary + colors.muted;
      if (colorKey === lastColorKey) return;
      lastColorKey = colorKey;

      bgColor = parseHexColor(colors.background);
      accentColor = parseHexColor(colors.accent);
      primaryColor = parseHexColor(colors.primary);
      mutedColor = parseHexColor(colors.muted);
    };

    /** Initialize nodes and connections */
    const initializeNodes = (canvasWidth: number, canvasHeight: number): void => {
      nodes = [];
      particles = [];

      // Reset random seed for reproducibility
      const initRandom = seededRandom(seed);

      // Create nodes based on canvas area
      const nodeCount = Math.floor((canvasWidth * canvasHeight) / 15000);
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: initRandom() * canvasWidth,
          y: initRandom() * canvasHeight,
          vx: (initRandom() - 0.5) * 0.5,
          vy: (initRandom() - 0.5) * 0.5,
          radius: 3 + initRandom() * 4,
          pulsePhase: initRandom() * Math.PI * 2,
          connections: [],
        });
      }

      // Establish connections - each node connects to nearest neighbors
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const distances: { idx: number; dist: number }[] = [];

        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const other = nodes[j];
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < connectionDistance) {
            distances.push({ idx: j, dist });
          }
        }

        distances.sort((a, b) => a.dist - b.dist);
        node.connections = distances.slice(0, maxConnections).map(d => d.idx);
      }
    };

    /** Resize canvas to container */
    const resizeCanvas = (): void => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      initializeNodes(rect.width, height);
    };

    /** Draw a circle with glow effect */
    const drawGlowCircle = (
      x: number,
      y: number,
      radius: number,
      r: number,
      g: number,
      b: number,
      alpha: number,
      pulse: number
    ): void => {
      // Outer glow
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.2 * pulse})`;
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Inner glow
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.5 * pulse})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * pulse})`;
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    };

    /** Main render loop */
    const render = (): void => {
      if (!isRunning) return;

      const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
      const canvasHeight = canvas.height / (window.devicePixelRatio || 1);

      // Update colors
      updateColors(artColors);

      // Clear with background
      ctx.fillStyle = `rgb(${bgColor.r}, ${bgColor.g}, ${bgColor.b})`;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      frameCounter += speed;

      // Update nodes
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 0 || node.x > canvasWidth) node.vx *= -1;
        if (node.y < 0 || node.y > canvasHeight) node.vy *= -1;

        // Keep within bounds
        node.x = Math.max(0, Math.min(canvasWidth, node.x));
        node.y = Math.max(0, Math.min(canvasHeight, node.y));

        node.pulsePhase += 0.03;
      }

      // Draw connections
      ctx.lineWidth = 1;
      for (const node of nodes) {
        for (const connIdx of node.connections) {
          const other = nodes[connIdx];
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const alpha = Math.max(0, Math.min(1, 1 - distance / connectionDistance)) * 0.12;

          ctx.strokeStyle = `rgba(${accentColor.r}, ${accentColor.g}, ${accentColor.b}, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(other.x, other.y);
          ctx.stroke();
        }
      }

      // Spawn particles
      if (frameCounter % 12 === 0 && nodes.length > 0 && particles.length < maxParticles) {
        const fromIdx = Math.floor(random() * nodes.length);
        const fromNode = nodes[fromIdx];
        if (fromNode.connections.length > 0) {
          const toIdx = fromNode.connections[Math.floor(random() * fromNode.connections.length)];
          particles.push({
            fromIdx,
            toIdx,
            progress: 0,
            speed: 0.015 + random() * 0.025,
            size: 2 + random() * 3,
          });
        }
      }

      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.progress += particle.speed;

        if (particle.progress >= 1) {
          particles.splice(i, 1);
        } else {
          const from = nodes[particle.fromIdx];
          const to = nodes[particle.toIdx];
          const x = from.x + (to.x - from.x) * particle.progress;
          const y = from.y + (to.y - from.y) * particle.progress;

          // Glow
          ctx.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.4)`;
          ctx.beginPath();
          ctx.arc(x, y, particle.size * 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Core
          ctx.fillStyle = `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.8)`;
          ctx.beginPath();
          ctx.arc(x, y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const pulse = Math.sin(node.pulsePhase) * 0.3 + 0.7;

        // Cycle through colors
        let color: { r: number; g: number; b: number };
        if (i % 3 === 0) {
          color = primaryColor;
        } else if (i % 3 === 1) {
          color = accentColor;
        } else {
          color = mutedColor;
        }

        drawGlowCircle(node.x, node.y, node.radius, color.r, color.g, color.b, 0.6, pulse);
      }

      animationId = requestAnimationFrame(render);
    };

    // Initialize
    resizeCanvas();
    updateColors(artColors);
    render();

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      isRunning = false;
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, [height, seed, speed, artColors]);

  return (
    <div className={clsx('relative overflow-hidden', className)} style={{ width, height }}>
      <div ref={containerRef} className="absolute inset-0">
        <canvas ref={canvasRef} className="block size-full" />
      </div>

      {showOverlay && (overlayTitle || overlaySubtitle) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="text-center">
            {overlayTitle && (
              <h1 className="font-sans text-4xl font-bold text-foreground drop-shadow-lg sm:text-5xl lg:text-6xl">
                {overlayTitle}
              </h1>
            )}
            {overlaySubtitle && (
              <p className="mt-4 font-sans text-lg text-muted drop-shadow-lg sm:text-xl">{overlaySubtitle}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
