import { useEffect, useRef, type JSX } from 'react';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { EpochArtProps } from './EpochArt.types';

/**
 * EpochArt - A 3D visualization of an epoch using Canvas 2D
 *
 * Features:
 * - 32 blocks arranged in a grid (8 columns × 4 rows)
 * - Blocks light up based on filled slots
 * - Animated sequential filling effect
 * - Isometric 3D view
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
  // Slight tilt for 3D depth (matching original p5 rotateX(-0.3), rotateY(0.1))
  const tiltX = -0.3;
  const tiltY = 0.1;

  // Rotate around Y axis
  const rotatedX = x * Math.cos(tiltY) - z * Math.sin(tiltY);
  const rotatedZ = x * Math.sin(tiltY) + z * Math.cos(tiltY);

  // Rotate around X axis
  const finalY = y * Math.cos(tiltX) - rotatedZ * Math.sin(tiltX);

  return {
    x: centerX + rotatedX * scale,
    y: centerY + finalY * scale,
  };
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
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
    // Note: glow color available via finalGlowColor if needed for future enhancements

    // Animation state
    let animationProgress = 0;
    let isRunning = true;

    // Grid configuration
    const cols = 8;
    const rows = 4;
    const blockSize = width / 18; // Scale block size to canvas
    const spacing = width / 13; // Scale spacing to canvas
    const blockDepth = blockSize;

    // Calculate grid dimensions and centering offset
    const gridWidth = (cols - 1) * spacing;
    const gridHeight = (rows - 1) * spacing;
    const offsetX = -gridWidth / 2;
    const offsetY = -gridHeight / 2;

    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 1;

    /** Draw a 3D block at position */
    const drawBlock = (x: number, y: number, z: number, isFilled: boolean, isActivated: boolean): void => {
      const half = blockSize / 2;
      const depthHalf = blockDepth / 2;

      // Define the 8 vertices of the block
      const vertices = [
        { x: x - half, y: y - half, z: z - depthHalf }, // 0: front-top-left
        { x: x + half, y: y - half, z: z - depthHalf }, // 1: front-top-right
        { x: x + half, y: y + half, z: z - depthHalf }, // 2: front-bottom-right
        { x: x - half, y: y + half, z: z - depthHalf }, // 3: front-bottom-left
        { x: x - half, y: y - half, z: z + depthHalf }, // 4: back-top-left
        { x: x + half, y: y - half, z: z + depthHalf }, // 5: back-top-right
        { x: x + half, y: y + half, z: z + depthHalf }, // 6: back-bottom-right
        { x: x - half, y: y + half, z: z + depthHalf }, // 7: back-bottom-left
      ];

      // Project all vertices
      const projected = vertices.map(v => projectIsometric(v.x, v.y, v.z, centerX, centerY, scale));

      // Define visible faces
      const faces = [
        { indices: [4, 5, 1, 0], brightness: 1.1 }, // Top face
        { indices: [1, 5, 6, 2], brightness: 0.9 }, // Right face
        { indices: [0, 1, 2, 3], brightness: 0.8 }, // Front face
      ];

      // Draw faces
      for (const face of faces) {
        ctx.beginPath();
        const pts = face.indices.map(i => projected[i]);
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.closePath();

        if (isActivated && isFilled) {
          // Activated and filled slot - bright and solid
          const fillColor = {
            r: Math.min(255, primary.r * face.brightness),
            g: Math.min(255, primary.g * face.brightness),
            b: Math.min(255, primary.b * face.brightness),
          };
          ctx.fillStyle = `rgba(${fillColor.r}, ${fillColor.g}, ${fillColor.b}, 0.85)`;
          ctx.fill();
          ctx.strokeStyle = `rgba(${accent.r}, ${accent.g}, ${accent.b}, 1)`;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          // Unactivated or empty slot - just outline, no fill
          ctx.strokeStyle = `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.45)`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    };

    /** Render frame */
    const render = (): void => {
      if (!isRunning) return;

      // Clear canvas (transparent)
      ctx.clearRect(0, 0, width, height);

      // Animate the blocks (each block takes ~2 seconds, full cycle ~64 seconds)
      animationProgress += 0.0005;
      if (animationProgress > 1) {
        animationProgress = 0;
      }

      // Draw 32 blocks in reading order (8 columns x 4 rows)
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          // Calculate block index in reading order (left-to-right, top-to-bottom)
          const blockIndex = row * cols + col;

          // Position in 3D space
          const x = offsetX + col * spacing;
          const y = offsetY + row * spacing;
          const z = 0;

          // Calculate if this block should be filled based on animation progress
          const blockProgress = blockIndex / 32;
          const blockActivated = animationProgress >= blockProgress;

          // Determine if this slot is filled
          const isFilled = blockIndex < filledSlots;

          drawBlock(x, y, z, isFilled, blockActivated);
        }
      }

      animationRef.current = requestAnimationFrame(render);
    };

    // Start animation
    render();

    // Cleanup
    return () => {
      isRunning = false;
      cancelAnimationFrame(animationRef.current);
    };
  }, [width, height, epochNumber, filledSlots, finalPrimaryColor, finalAccentColor, finalGlowColor]);

  return (
    <div className="flex items-center justify-center">
      <canvas ref={canvasRef} style={{ width, height }} />
    </div>
  );
}
