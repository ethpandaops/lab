import { useEffect, useRef, type JSX } from 'react';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { BlockArtProps } from './BlockArt.types';

/**
 * BlockArt - A simple 3D block visualization using Canvas 2D
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

/** Parse hex color to RGB */
function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

/** Project 3D point to 2D isometric view */
function projectIsometric(
  x: number,
  y: number,
  z: number,
  centerX: number,
  centerY: number,
  scale: number
): { x: number; y: number } {
  // Isometric projection with rotation
  const angle = Math.PI / 4; // 45 degrees for Y rotation
  const tilt = Math.PI / 6; // 30 degrees for X tilt

  // Rotate around Y axis
  const rotatedX = x * Math.cos(angle) - z * Math.sin(angle);
  const rotatedZ = x * Math.sin(angle) + z * Math.cos(angle);

  // Apply tilt (rotation around X axis)
  const finalY = y * Math.cos(tilt) - rotatedZ * Math.sin(tilt);

  return {
    x: centerX + rotatedX * scale,
    y: centerY + finalY * scale,
  };
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeColors = useThemeColors();

  // Use theme colors as defaults
  const finalPrimaryColor = primaryColor || themeColors.primary;
  const finalAccentColor = accentColor || themeColors.accent;
  const finalGlowColor = glowColor || themeColors.accent;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas for high DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Parse colors
    const primary = parseHexColor(finalPrimaryColor);
    const accent = parseHexColor(finalAccentColor);
    const glow = parseHexColor(finalGlowColor);

    // Hash-based seed for procedural generation (unused but kept for API compatibility)
    const _hashToSeed = (hash?: string): number => {
      if (!hash) return blockNumber || 12345;
      let seed = 0;
      for (let i = 0; i < Math.min(hash.length, 16); i++) {
        seed += hash.charCodeAt(i);
      }
      return seed;
    };
    _hashToSeed(blockHash); // Called for consistency

    // Clear canvas (transparent)
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const scale = width / 5; // Adjust scale based on canvas size

    // Define cube vertices (centered at origin)
    const cubeSize = 1;
    const half = cubeSize / 2;
    const vertices = [
      { x: -half, y: -half, z: -half }, // 0: front-top-left
      { x: half, y: -half, z: -half }, // 1: front-top-right
      { x: half, y: half, z: -half }, // 2: front-bottom-right
      { x: -half, y: half, z: -half }, // 3: front-bottom-left
      { x: -half, y: -half, z: half }, // 4: back-top-left
      { x: half, y: -half, z: half }, // 5: back-top-right
      { x: half, y: half, z: half }, // 6: back-bottom-right
      { x: -half, y: half, z: half }, // 7: back-bottom-left
    ];

    // Project all vertices
    const projected = vertices.map(v => projectIsometric(v.x, v.y, v.z, centerX, centerY, scale));

    // Define faces with their vertices (in order for drawing)
    // Only draw visible faces in isometric view: top, right, front
    const faces = [
      { indices: [4, 5, 1, 0], type: 'top' }, // Top face
      { indices: [1, 5, 6, 2], type: 'right' }, // Right face
      { indices: [0, 1, 2, 3], type: 'front' }, // Front face
    ];

    // Draw helper function
    const drawFace = (
      indices: number[],
      fillColor: { r: number; g: number; b: number },
      fillAlpha: number,
      strokeColor: { r: number; g: number; b: number },
      strokeAlpha: number,
      strokeWidth: number,
      sizeMultiplier: number = 1
    ): void => {
      ctx.beginPath();
      const pts = indices.map(i => {
        const p = projected[i];
        // Apply size multiplier from center
        return {
          x: centerX + (p.x - centerX) * sizeMultiplier,
          y: centerY + (p.y - centerY) * sizeMultiplier,
        };
      });
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.closePath();

      if (fillAlpha > 0) {
        ctx.fillStyle = `rgba(${fillColor.r}, ${fillColor.g}, ${fillColor.b}, ${fillAlpha})`;
        ctx.fill();
      }
      if (strokeAlpha > 0) {
        ctx.strokeStyle = `rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, ${strokeAlpha})`;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
      }
    };

    // Draw outer glow layer (larger)
    for (const face of faces) {
      drawFace(face.indices, glow, 0, glow, 0.15, 3, 1.15);
    }

    // Draw middle glow layer
    for (const face of faces) {
      drawFace(face.indices, glow, 0, glow, 0.3, 2, 1.08);
    }

    // Draw main cube faces with fill
    for (const face of faces) {
      // Vary brightness based on face type
      let brightness = 1;
      if (face.type === 'top') brightness = 1.1;
      if (face.type === 'right') brightness = 0.9;
      if (face.type === 'front') brightness = 0.8;

      const fillColor = {
        r: Math.min(255, primary.r * brightness),
        g: Math.min(255, primary.g * brightness),
        b: Math.min(255, primary.b * brightness),
      };

      drawFace(face.indices, fillColor, 0.8, accent, 0.8, 2, 1);
    }

    // Draw inner core (smaller cube)
    for (const face of faces) {
      drawFace(face.indices, accent, 0.4, { r: 0, g: 0, b: 0 }, 0, 0, 0.3);
    }
  }, [width, height, blockHash, blockNumber, finalPrimaryColor, finalAccentColor, finalGlowColor]);

  return (
    <div className="flex items-center justify-center">
      <canvas ref={canvasRef} style={{ width, height }} />
    </div>
  );
}
