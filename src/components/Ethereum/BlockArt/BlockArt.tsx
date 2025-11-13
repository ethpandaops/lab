import { useEffect, useRef, type JSX } from 'react';
import p5 from 'p5';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { BlockArtProps } from './BlockArt.types';

/**
 * BlockArt - A simple 3D block visualization using p5.js
 *
 * Features:
 * - Static 3D cube with nice isometric angle
 * - Glowing edges
 * - Theme-aware colors
 * - Transparent background
 * - Procedural variations based on block data
 *
 * @example
 * ```tsx
 * <BlockArt
 *   width={180}
 *   height={180}
 *   blockHash="0x1234..."
 *   blockNumber={12345}
 * />
 * ```
 */
interface BlockArtColors {
  primary: string;
  accent: string;
  glow: string;
}

export function BlockArt({
  width = 180,
  height = 180,
  blockHash,
  blockNumber = 0,
  primaryColor,
  accentColor,
  glowColor,
}: BlockArtProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  const themeColorsRef = useRef<BlockArtColors | null>(null);
  const isCleanedUpRef = useRef(false);
  const themeColors = useThemeColors();

  // Use theme colors as defaults
  const finalPrimaryColor = primaryColor || themeColors.primary;
  const finalAccentColor = accentColor || themeColors.accent;
  const finalGlowColor = glowColor || themeColors.accent;

  // Update theme colors ref when they change (reactive to theme swaps)
  useEffect(() => {
    themeColorsRef.current = {
      primary: finalPrimaryColor,
      accent: finalAccentColor,
      glow: finalGlowColor,
    };
  }, [finalPrimaryColor, finalAccentColor, finalGlowColor]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Reset cleanup flag on mount
    isCleanedUpRef.current = false;

    // Hash-based seed for procedural generation
    const hashToSeed = (hash?: string): number => {
      if (!hash) return blockNumber || 12345;
      let seed = 0;
      for (let i = 0; i < Math.min(hash.length, 16); i++) {
        seed += hash.charCodeAt(i);
      }
      return seed;
    };

    const seed = hashToSeed(blockHash);

    // Parse hex color helper
    const parseColor = (hex: string): { r: number; g: number; b: number } => {
      const clean = hex.replace('#', '');
      return {
        r: parseInt(clean.substring(0, 2), 16),
        g: parseInt(clean.substring(2, 4), 16),
        b: parseInt(clean.substring(4, 6), 16),
      };
    };

    // Create the sketch
    const sketch = (p: p5): void => {
      // Cache parsed colors
      let cachedColors = {
        primaryR: 0,
        primaryG: 0,
        primaryB: 0,
        accentR: 0,
        accentG: 0,
        accentB: 0,
        glowR: 0,
        glowG: 0,
        glowB: 0,
      };

      // Update cached colors from theme ref
      const updateCachedColors = (): void => {
        const currentColors = themeColorsRef.current;
        if (!currentColors) return;

        const primary = parseColor(currentColors.primary);
        const accent = parseColor(currentColors.accent);
        const glow = parseColor(currentColors.glow);

        cachedColors = {
          primaryR: primary.r,
          primaryG: primary.g,
          primaryB: primary.b,
          accentR: accent.r,
          accentG: accent.g,
          accentB: accent.b,
          glowR: glow.r,
          glowG: glow.g,
          glowB: glow.b,
        };
      };

      p.setup = () => {
        // Clean up any existing canvases in the container before creating new one
        if (container) {
          const existingCanvases = container.querySelectorAll('canvas');
          existingCanvases.forEach(canvas => canvas.remove());
        }

        p.createCanvas(width, height, p.WEBGL);
        p.randomSeed(seed);
        p.loop(); // Ensure animation loop starts

        // Initialize cached colors
        updateCachedColors();
      };

      p.draw = () => {
        // Stop drawing if component is cleaned up
        if (isCleanedUpRef.current) {
          p.noLoop();
          return;
        }

        // Update colors if theme changed
        if (themeColorsRef.current) {
          updateCachedColors();
        }

        // Transparent background
        p.clear();

        // Lighting for 3D effect
        p.ambientLight(80);
        p.directionalLight(255, 255, 255, 0, 0, -1);
        p.pointLight(255, 255, 255, 100, -100, 100);

        // Static rotation for nice isometric view
        p.rotateX(p.PI / 6);
        p.rotateY(p.PI / 4);

        // Draw outer glow layers using cached colors
        p.noFill();
        p.strokeWeight(3);
        p.stroke(cachedColors.glowR, cachedColors.glowG, cachedColors.glowB, 40);
        p.box(75);

        p.strokeWeight(2);
        p.stroke(cachedColors.glowR, cachedColors.glowG, cachedColors.glowB, 80);
        p.box(70);

        // Draw main cube using cached colors
        p.strokeWeight(2);
        p.stroke(cachedColors.accentR, cachedColors.accentG, cachedColors.accentB, 200);
        p.fill(cachedColors.primaryR, cachedColors.primaryG, cachedColors.primaryB, 200);
        p.box(65);

        // Inner core using cached colors
        p.noStroke();
        p.fill(cachedColors.accentR, cachedColors.accentG, cachedColors.accentB, 100);
        p.box(20);
      };
    };

    // Create p5 instance with container ref for proper cleanup
    const instance = new p5(sketch, container);
    p5InstanceRef.current = instance;

    // Cleanup on unmount
    return () => {
      isCleanedUpRef.current = true;

      if (p5InstanceRef.current) {
        // First stop the loop explicitly
        p5InstanceRef.current.noLoop();
        // Then remove the canvas and cleanup
        p5InstanceRef.current.remove();
        p5InstanceRef.current = null;
      }

      // Extra cleanup: manually remove any remaining canvases
      if (container) {
        const canvases = container.querySelectorAll('canvas');
        canvases.forEach(canvas => canvas.remove());
      }
    };
  }, [width, height, blockHash, blockNumber]); // Removed color deps - they update via ref

  return (
    <div className="flex items-center justify-center">
      <div ref={containerRef} style={{ width, height }} />
    </div>
  );
}
