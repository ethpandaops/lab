/**
 * AlgorithmicArt - Network Constellation generative art component
 *
 * Creates an animated visualization of network nodes with glowing connections
 * and data packets traveling along edges, representing Ethereum network topology.
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
import p5 from 'p5';
import { useThemeColors } from '@/hooks/useThemeColors';
import clsx from 'clsx';
import type { AlgorithmicArtProps, AlgorithmicArtColors } from './AlgorithmicArt.types';

/**
 * Node class representing a network node
 */
class Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  connections: Node[];
  pulsePhase: number;

  constructor(x: number, y: number, radius: number) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.radius = radius;
    this.connections = [];
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  /**
   * Update node position with gentle drift
   */
  update(width: number, height: number): void {
    this.x += this.vx;
    this.y += this.vy;

    // Bounce off edges
    if (this.x < 0 || this.x > width) this.vx *= -1;
    if (this.y < 0 || this.y > height) this.vy *= -1;

    // Keep within bounds
    this.x = Math.max(0, Math.min(width, this.x));
    this.y = Math.max(0, Math.min(height, this.y));

    this.pulsePhase += 0.02;
  }

  /**
   * Display the node with pre-parsed RGB values
   */
  display(p: p5, r: number, g: number, b: number, alpha: number): void {
    const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;

    // Outer glow
    p.noStroke();
    p.fill(r, g, b, alpha * 0.2 * pulse);
    p.circle(this.x, this.y, this.radius * 3);

    // Inner glow
    p.fill(r, g, b, alpha * 0.5 * pulse);
    p.circle(this.x, this.y, this.radius * 2);

    // Core
    p.fill(r, g, b, alpha * pulse);
    p.circle(this.x, this.y, this.radius);
  }

  /**
   * Calculate distance to another node
   */
  distanceTo(other: Node): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

/**
 * Particle class for traveling data packets
 */
class Particle {
  from: Node;
  to: Node;
  progress: number;
  speed: number;
  size: number;

  constructor(from: Node, to: Node) {
    this.from = from;
    this.to = to;
    this.progress = 0;
    this.speed = 0.01 + Math.random() * 0.02;
    this.size = 2 + Math.random() * 3;
  }

  /**
   * Update particle position
   */
  update(): boolean {
    this.progress += this.speed;
    return this.progress >= 1;
  }

  /**
   * Display the particle with pre-parsed RGB values
   */
  display(p: p5, r: number, g: number, b: number): void {
    const x = this.from.x + (this.to.x - this.from.x) * this.progress;
    const y = this.from.y + (this.to.y - this.from.y) * this.progress;

    // Glow
    p.noStroke();
    p.fill(r, g, b, 100);
    p.circle(x, y, this.size * 3);

    // Core
    p.fill(r, g, b, 200);
    p.circle(x, y, this.size);
  }
}

/**
 * AlgorithmicArt component
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
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  const themeColorsRef = useRef<AlgorithmicArtColors | null>(null);
  const isCleanedUpRef = useRef(false);
  const themeColors = useThemeColors();
  const artColors = colors || themeColors;

  // Update theme colors ref when they change
  useEffect(() => {
    themeColorsRef.current = artColors;
  }, [artColors]);

  // Main effect for p5.js instance management
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Track if cleanup has been called before we create the instance
    let cancelled = false;

    // Use setTimeout(0) to defer p5 creation to next event loop tick
    // This ensures any cleanup from React StrictMode's rapid unmount/remount completes first
    const timeoutId = setTimeout(() => {
      if (cancelled) return;

      // Clean up any orphaned canvases from the container before creating new one
      const existingCanvases = container.querySelectorAll('canvas');
      existingCanvases.forEach(canvas => canvas.remove());

      // Clean up local ref if it exists
      if (p5InstanceRef.current) {
        p5InstanceRef.current.noLoop();
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }

      // Reset cleanup flag
      isCleanedUpRef.current = false;

      // Create the sketch
      const sketch = (p: p5): void => {
        const nodes: Node[] = [];
        const particles: Particle[] = [];
        const connectionDistance = 250;
        const maxConnections = 15;
        const maxParticles = 50;
        let frameCounter = 0;

        // Cache parsed colors to avoid parsing on every frame
        let cachedColors = {
          bgR: 0,
          bgG: 0,
          bgB: 0,
          accentR: 0,
          accentG: 0,
          accentB: 0,
          primaryR: 0,
          primaryG: 0,
          primaryB: 0,
          mutedR: 0,
          mutedG: 0,
          mutedB: 0,
        };

        // Parse hex color helper
        const parseColor = (hex: string): { r: number; g: number; b: number } => {
          const clean = hex.replace('#', '');
          return {
            r: parseInt(clean.substring(0, 2), 16),
            g: parseInt(clean.substring(2, 4), 16),
            b: parseInt(clean.substring(4, 6), 16),
          };
        };

        // Update cached colors when theme changes
        const updateCachedColors = (): void => {
          const currentTheme = themeColorsRef.current;
          if (!currentTheme) return;

          const bg = parseColor(currentTheme.background);
          const accent = parseColor(currentTheme.accent);
          const primary = parseColor(currentTheme.primary);
          const muted = parseColor(currentTheme.muted);

          cachedColors = {
            bgR: bg.r,
            bgG: bg.g,
            bgB: bg.b,
            accentR: accent.r,
            accentG: accent.g,
            accentB: accent.b,
            primaryR: primary.r,
            primaryG: primary.g,
            primaryB: primary.b,
            mutedR: muted.r,
            mutedG: muted.g,
            mutedB: muted.b,
          };
        };

        /**
         * Initialize or reinitialize nodes and connections
         */
        const initializeNodes = (canvasWidth: number): void => {
          // Clear existing nodes and particles
          nodes.length = 0;
          particles.length = 0;

          // Set seed for reproducibility
          p.randomSeed(seed);
          p.noiseSeed(seed);

          // Create nodes based on canvas area
          const nodeCount = Math.floor((canvasWidth * height) / 15000);
          for (let i = 0; i < nodeCount; i++) {
            const radius = 3 + Math.random() * 4;
            const node = new Node(Math.random() * canvasWidth, Math.random() * height, radius);
            nodes.push(node);
          }

          // Establish connections - each node connects to its nearest neighbors
          nodes.forEach(node => {
            const nearby = nodes
              .filter(other => other !== node && node.distanceTo(other) < connectionDistance)
              .sort((a, b) => node.distanceTo(a) - node.distanceTo(b))
              .slice(0, maxConnections);

            node.connections = nearby;
          });
        };

        p.setup = () => {
          const canvasWidth = container.offsetWidth || 600;
          p.createCanvas(canvasWidth, height);
          p.frameRate(60);
          p.loop();

          // Initialize cached colors
          updateCachedColors();

          // Initialize nodes and connections
          initializeNodes(canvasWidth);
        };

        p.windowResized = () => {
          const canvasWidth = container.offsetWidth;
          p.resizeCanvas(canvasWidth, height);

          // Reinitialize nodes and particles with new dimensions
          initializeNodes(canvasWidth);
        };

        p.draw = () => {
          // Stop drawing if component is cleaned up
          if (isCleanedUpRef.current) {
            p.noLoop();
            return;
          }

          // Update cached colors if theme changed
          const currentTheme = themeColorsRef.current;
          if (!currentTheme) return;

          // Update colors cache
          updateCachedColors();

          // Use cached background color
          p.background(cachedColors.bgR, cachedColors.bgG, cachedColors.bgB, 255);

          frameCounter += speed;

          // Update nodes
          nodes.forEach(node => {
            node.update(p.width, p.height);
          });

          // Draw connections using cached accent color
          nodes.forEach(node => {
            node.connections.forEach(connected => {
              const distance = node.distanceTo(connected);
              const alpha = p.map(distance, 0, connectionDistance, 30, 5);

              p.stroke(cachedColors.accentR, cachedColors.accentG, cachedColors.accentB, alpha);
              p.strokeWeight(1);
              p.line(node.x, node.y, connected.x, connected.y);
            });
          });

          // Spawn particles (with limit to prevent memory issues)
          if (frameCounter % 20 === 0 && nodes.length > 0 && particles.length < maxParticles) {
            const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
            if (randomNode.connections.length > 0) {
              const target = randomNode.connections[Math.floor(Math.random() * randomNode.connections.length)];
              particles.push(new Particle(randomNode, target));
            }
          }

          // Update and draw particles using cached primary color
          for (let i = particles.length - 1; i >= 0; i--) {
            const particle = particles[i];
            const done = particle.update();

            if (done) {
              particles.splice(i, 1);
            } else {
              particle.display(p, cachedColors.primaryR, cachedColors.primaryG, cachedColors.primaryB);
            }
          }

          // Draw nodes using cached colors
          nodes.forEach((node, i) => {
            // Alternate between primary, accent, and muted colors
            if (i % 3 === 0) {
              node.display(p, cachedColors.primaryR, cachedColors.primaryG, cachedColors.primaryB, 150);
            } else if (i % 3 === 1) {
              node.display(p, cachedColors.accentR, cachedColors.accentG, cachedColors.accentB, 150);
            } else {
              node.display(p, cachedColors.mutedR, cachedColors.mutedG, cachedColors.mutedB, 150);
            }
          });
        };
      };

      // Create p5 instance
      const instance = new p5(sketch, container);
      p5InstanceRef.current = instance;
    }, 0);

    // Cleanup on unmount
    return () => {
      // Cancel pending creation if cleanup runs before setTimeout fires
      cancelled = true;
      clearTimeout(timeoutId);

      isCleanedUpRef.current = true;

      if (p5InstanceRef.current) {
        p5InstanceRef.current.noLoop();
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }

      // Manually remove any canvases from the container
      const canvases = container.querySelectorAll('canvas');
      canvases.forEach(canvas => canvas.remove());
    };
  }, [height, seed, speed]);

  return (
    <div className={clsx('relative overflow-hidden', className)} style={{ width, height }}>
      <div ref={containerRef} className="absolute inset-0" />

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
