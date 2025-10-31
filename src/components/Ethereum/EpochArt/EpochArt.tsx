import { useEffect, useRef, type JSX } from 'react';
import p5 from 'p5';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { EpochArtProps } from './EpochArt.types';

/**
 * EpochArt - A 3D visualization of an epoch using p5.js
 *
 * Features:
 * - 32-segment ring representing the 32 slots in an epoch
 * - Segments light up based on filled slots
 * - Rotating visualization
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
      let rotation = 0;

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

        const canvas = p.createCanvas(width, height, p.WEBGL);
        canvas.parent(containerRef.current!);
        p.randomSeed(epochNumber);

        // Initialize cached colors
        updateCachedColors();
      };

      p.draw = () => {
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

        // Rotate the entire scene
        rotation += 0.005;
        p.rotateX(p.PI / 6);
        p.rotateY(rotation);

        // Draw outer glow ring
        p.push();
        p.noFill();
        p.strokeWeight(2);
        p.stroke(cachedColors.glowR, cachedColors.glowG, cachedColors.glowB, 60);
        p.torus(50, 3);
        p.pop();

        // Draw 32 segments representing slots
        const segments = 32;
        const radius = 45;
        const segmentAngle = p.TWO_PI / segments;
        const segmentThickness = 4;
        const segmentDepth = 8;

        for (let i = 0; i < segments; i++) {
          const angle = i * segmentAngle;

          p.push();
          p.rotateZ(angle);
          p.translate(radius, 0, 0);

          // Determine if this slot is filled
          const isFilled = i < filledSlots;

          if (isFilled) {
            // Filled slot - bright and solid
            p.strokeWeight(1);
            p.stroke(cachedColors.accentR, cachedColors.accentG, cachedColors.accentB, 255);
            p.fill(cachedColors.primaryR, cachedColors.primaryG, cachedColors.primaryB, 220);
          } else {
            // Empty slot - dim and transparent
            p.strokeWeight(1);
            p.stroke(cachedColors.primaryR, cachedColors.primaryG, cachedColors.primaryB, 100);
            p.fill(cachedColors.primaryR, cachedColors.primaryG, cachedColors.primaryB, 50);
          }

          p.box(segmentThickness, segmentThickness, segmentDepth);
          p.pop();
        }

        // Draw center core
        p.push();
        p.noStroke();
        p.fill(cachedColors.accentR, cachedColors.accentG, cachedColors.accentB, 150);
        p.sphere(12);
        p.pop();

        // Draw inner ring
        p.push();
        p.noFill();
        p.strokeWeight(2);
        p.stroke(cachedColors.primaryR, cachedColors.primaryG, cachedColors.primaryB, 180);
        p.torus(20, 2);
        p.pop();
      };
    };

    // Clean up any existing p5 instance first
    if (p5InstanceRef.current) {
      p5InstanceRef.current.remove();
      p5InstanceRef.current = null;
    }

    // Create p5 instance
    p5InstanceRef.current = new p5(sketch);

    // Cleanup on unmount
    return () => {
      if (p5InstanceRef.current) {
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
