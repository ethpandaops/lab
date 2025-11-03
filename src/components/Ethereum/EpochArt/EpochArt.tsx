import { useEffect, useRef, type JSX } from 'react';
import p5 from 'p5';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { EpochArtProps } from './EpochArt.types';

/**
 * EpochArt - A 3D visualization of an epoch using p5.js
 *
 * Features:
 * - 32 blocks arranged in a snaking blockchain grid (4 columns × 8 rows)
 * - Blocks light up based on filled slots
 * - Animated connecting lines that draw sequentially through the snaking path
 * - Static 90-degree rotation for side view (no spinning)
 * - Theme-aware colors
 * - Transparent background
 * - Procedural variations based on epoch number
 *
 * @example
 * ```tsx
 * <EpochArt
 *   width={180}
 *   height={180}
 *   epochNumber={12345}
 *   filledSlots={30}
 * />
 * ```
 */
interface EpochArtColors {
  primary: string;
  accent: string;
  glow: string;
}

export function EpochArt({
  width = 180,
  height = 180,
  epochNumber = 0,
  filledSlots = 32,
  primaryColor,
  accentColor,
  glowColor,
}: EpochArtProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<p5 | null>(null);
  const themeColorsRef = useRef<EpochArtColors | null>(null);
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
    if (!containerRef.current) return;

    // Reset cleanup flag on mount
    isCleanedUpRef.current = false;

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
      // Animation progress for sequential line drawing (0 to 1)

      let animationProgress = 0;

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
        // Remove any existing canvases in the container first
        while (containerRef.current?.firstChild) {
          containerRef.current.removeChild(containerRef.current.firstChild);
        }

        p.createCanvas(width, height, p.WEBGL);
        p.randomSeed(epochNumber);
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

        // Slight tilt to see 3D depth
        p.rotateX(-0.3);
        p.rotateY(0.1);

        // Animate the blocks (each block takes ~2 seconds, full cycle ~64 seconds)
        animationProgress += 0.0005;
        if (animationProgress > 1) {
          animationProgress = 0;
        }

        // Draw 32 blocks in reading order (4 columns x 8 rows)
        const cols = 4;
        const rows = 8;
        const blockSize = 10;
        const spacing = 14;
        const blockDepth = 10;

        // Calculate grid dimensions and centering offset
        const gridWidth = (cols - 1) * spacing;
        const gridHeight = (rows - 1) * spacing;
        const offsetX = -gridWidth / 2;
        const offsetY = -gridHeight / 2;

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            // Calculate block index in reading order (left-to-right, top-to-bottom)
            // Row 0: 0,1,2,3 | Row 1: 4,5,6,7 | Row 2: 8,9,10,11 etc.
            const blockIndex = row * cols + col;

            // Position in 3D space
            // x = horizontal position (left to right)
            // y = vertical position (top to bottom)
            const x = offsetX + col * spacing;
            const y = offsetY + row * spacing;
            const z = 0;

            // Calculate if this block should be filled based on animation progress
            const blockProgress = blockIndex / 32;
            const blockActivated = animationProgress >= blockProgress;

            p.push();
            p.translate(x, y, z);

            // Determine if this slot is filled
            const isFilled = blockIndex < filledSlots;

            if (blockActivated && isFilled) {
              // Activated and filled slot - bright and solid
              p.strokeWeight(1);
              p.stroke(cachedColors.accentR, cachedColors.accentG, cachedColors.accentB, 255);
              p.fill(cachedColors.primaryR, cachedColors.primaryG, cachedColors.primaryB, 220);
            } else {
              // Unactivated or empty slot - just outline, no fill
              p.strokeWeight(1);
              p.stroke(cachedColors.primaryR, cachedColors.primaryG, cachedColors.primaryB, 120);
              p.noFill();
            }

            p.box(blockSize, blockSize, blockDepth);
            p.pop();
          }
        }
      };
    };

    // Create p5 instance with container ref for proper cleanup
    const instance = new p5(sketch, containerRef.current);
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
    };
  }, [width, height, epochNumber, filledSlots]);

  return (
    <div className="flex items-center justify-center">
      <div ref={containerRef} style={{ width, height }} />
    </div>
  );
}
