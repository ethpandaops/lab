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

// Use WeakMap with container element as key - this ensures:
// 1. Same container = same instance (handles StrictMode)
// 2. Automatic cleanup when container is garbage collected
// 3. No memory leaks from orphaned entries
const containerInstances = new WeakMap<HTMLDivElement, p5>();

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
    // Scaled velocity for 24fps (2.5x base rate)
    this.vx = (Math.random() - 0.5) * 0.75;
    this.vy = (Math.random() - 0.5) * 0.75;
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

    // Scaled pulse speed for 24fps (2.5x base rate)
    this.pulsePhase += 0.05;
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
    // Scaled speed for 24fps (2.5x base rate)
    this.speed = 0.025 + Math.random() * 0.05;
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
  const themeColorsRef = useRef<AlgorithmicArtColors | null>(null);
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

    // Check if this container already has a p5 instance (StrictMode remount)
    const existingInstance = containerInstances.get(container);
    if (existingInstance) {
      // Already have an instance for this container, don't create another
      // Just set up cleanup for when component really unmounts
      return () => {
        // Delay cleanup to allow StrictMode's immediate remount to check first
        setTimeout(() => {
          // Only cleanup if no React component is using this container anymore
          // We check by seeing if the container is still in the DOM
          if (!container.isConnected) {
            const instance = containerInstances.get(container);
            if (instance) {
              instance.noLoop();
              instance.remove();
              containerInstances.delete(container);
            }
          }
        }, 100);
      };
    }

    // Clean up any orphaned canvases from the container before creating new one
    const existingCanvases = container.querySelectorAll('canvas');
    existingCanvases.forEach(canvas => canvas.remove());

    // Track cleanup state
    let isCleanedUp = false;

    // Create the sketch
    const sketch = (p: p5): void => {
      const nodes: Node[] = [];
      const particles: Particle[] = [];
      const connectionDistance = 250;
      const maxConnections = 15;
      const maxParticles = 30; // Reduced to lower memory allocations
      let frameCounter = 0;

      // Cache parsed colors to avoid parsing on every frame
      const cachedColors = {
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

      // Track last theme colors to detect changes (compare individual strings, not concatenate)
      let lastBg = '';
      let lastAccent = '';
      let lastPrimary = '';
      let lastMuted = '';

      // Parse hex color helper - mutates target object to avoid allocations
      const parseColorInto = (hex: string, target: { r: number; g: number; b: number }): void => {
        const clean = hex.replace('#', '');
        target.r = parseInt(clean.substring(0, 2), 16);
        target.g = parseInt(clean.substring(2, 4), 16);
        target.b = parseInt(clean.substring(4, 6), 16);
      };

      // Reusable color parsing objects to avoid allocations
      const tempBg = { r: 0, g: 0, b: 0 };
      const tempAccent = { r: 0, g: 0, b: 0 };
      const tempPrimary = { r: 0, g: 0, b: 0 };
      const tempMuted = { r: 0, g: 0, b: 0 };

      // Update cached colors only when theme actually changes
      const updateCachedColors = (): void => {
        const currentTheme = themeColorsRef.current;
        if (!currentTheme) return;

        // Check if any color changed (simple reference comparison for strings)
        if (
          currentTheme.background === lastBg &&
          currentTheme.accent === lastAccent &&
          currentTheme.primary === lastPrimary &&
          currentTheme.muted === lastMuted
        ) {
          return; // No change, skip parsing
        }

        // Update tracking
        lastBg = currentTheme.background;
        lastAccent = currentTheme.accent;
        lastPrimary = currentTheme.primary;
        lastMuted = currentTheme.muted;

        parseColorInto(currentTheme.background, tempBg);
        parseColorInto(currentTheme.accent, tempAccent);
        parseColorInto(currentTheme.primary, tempPrimary);
        parseColorInto(currentTheme.muted, tempMuted);

        cachedColors.bgR = tempBg.r;
        cachedColors.bgG = tempBg.g;
        cachedColors.bgB = tempBg.b;
        cachedColors.accentR = tempAccent.r;
        cachedColors.accentG = tempAccent.g;
        cachedColors.accentB = tempAccent.b;
        cachedColors.primaryR = tempPrimary.r;
        cachedColors.primaryG = tempPrimary.g;
        cachedColors.primaryB = tempPrimary.b;
        cachedColors.mutedR = tempMuted.r;
        cachedColors.mutedG = tempMuted.g;
        cachedColors.mutedB = tempMuted.b;
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
        p.frameRate(24); // Reduced to 24fps to lower memory pressure while staying smooth
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
        if (isCleanedUp) {
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
        // Spawn every 8 frames at 24fps = same rate as every 20 frames at 60fps
        if (frameCounter % 8 === 0 && nodes.length > 0 && particles.length < maxParticles) {
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

    // Create p5 instance and store it
    const instance = new p5(sketch, container);
    containerInstances.set(container, instance);

    // Cleanup on unmount
    return () => {
      // Delay cleanup to allow StrictMode's immediate remount
      setTimeout(() => {
        // Only cleanup if container is no longer in the DOM
        if (!container.isConnected) {
          isCleanedUp = true;
          const storedInstance = containerInstances.get(container);
          if (storedInstance) {
            storedInstance.noLoop();
            storedInstance.remove();
            containerInstances.delete(container);
          }
          // Clean up any orphaned canvases
          const canvases = container.querySelectorAll('canvas');
          canvases.forEach(canvas => canvas.remove());
        }
      }, 100);
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
