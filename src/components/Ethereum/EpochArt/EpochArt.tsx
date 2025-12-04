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
    const glow = parseHexColor(finalGlowColor);

    // Animation state
    let animationProgress = 0;
    let isRunning = true;

    // Grid configuration - 8 cols x 4 rows = 32 slots
    const cols = 8;
    const rows = 4;

    // Scale based on canvas size
    const padding = width * 0.1;
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;

    const blockWidth = availableWidth / cols;
    const blockHeight = availableHeight / rows;
    const blockSize = Math.min(blockWidth, blockHeight) * 0.8;
    const spacing = Math.min(blockWidth, blockHeight);

    // Centering offsets
    const gridWidth = (cols - 1) * spacing;
    const gridHeight = (rows - 1) * spacing;
    const startX = (width - gridWidth) / 2;
    const startY = (height - gridHeight) / 2;

    // Isometric projection angles (subtle tilt)
    const angleX = -0.3;
    const angleY = 0.1;

    /** Project 3D point to 2D */
    const project = (x: number, y: number, z: number): { x: number; y: number } => {
      // Rotate around Y axis
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const rx = x * cosY - z * sinY;
      const rz = x * sinY + z * cosY;

      // Rotate around X axis
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const ry = y * cosX - rz * sinX;

      return { x: rx, y: ry };
    };

    /** Draw a single 3D block */
    const drawBlock = (
      centerX: number,
      centerY: number,
      size: number,
      isFilled: boolean,
      isActivated: boolean
    ): void => {
      const half = size / 2;
      const depth = size * 0.6;

      // Define vertices in local space
      const verts = {
        ftl: project(-half, -half, -depth / 2),
        ftr: project(half, -half, -depth / 2),
        fbr: project(half, half, -depth / 2),
        fbl: project(-half, half, -depth / 2),
        btl: project(-half, -half, depth / 2),
        btr: project(half, -half, depth / 2),
        bbr: project(half, half, depth / 2),
        bbl: project(-half, half, depth / 2),
      };

      // Translate to screen position
      const translate = (p: { x: number; y: number }) => ({
        x: centerX + p.x,
        y: centerY + p.y,
      });

      const screenVerts = {
        ftl: translate(verts.ftl),
        ftr: translate(verts.ftr),
        fbr: translate(verts.fbr),
        fbl: translate(verts.fbl),
        btl: translate(verts.btl),
        btr: translate(verts.btr),
        bbr: translate(verts.bbr),
        bbl: translate(verts.bbl),
      };

      // Helper to draw a face
      const drawFace = (
        points: { x: number; y: number }[],
        fillColor: string | null,
        strokeColor: string,
        strokeWidth: number
      ): void => {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();

        if (fillColor) {
          ctx.fillStyle = fillColor;
          ctx.fill();
        }
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();
      };

      if (isActivated && isFilled) {
        // Filled block - solid with color
        const topColor = `rgb(${Math.min(255, Math.floor(primary.r * 1.2))}, ${Math.min(255, Math.floor(primary.g * 1.2))}, ${Math.min(255, Math.floor(primary.b * 1.2))})`;
        const rightColor = `rgb(${Math.floor(primary.r * 0.9)}, ${Math.floor(primary.g * 0.9)}, ${Math.floor(primary.b * 0.9)})`;
        const frontColor = `rgb(${Math.floor(primary.r * 0.7)}, ${Math.floor(primary.g * 0.7)}, ${Math.floor(primary.b * 0.7)})`;
        const strokeColor = `rgb(${accent.r}, ${accent.g}, ${accent.b})`;

        // Draw with glow
        ctx.shadowColor = `rgba(${glow.r}, ${glow.g}, ${glow.b}, 0.4)`;
        ctx.shadowBlur = 4;

        // Top face
        drawFace([screenVerts.btl, screenVerts.btr, screenVerts.ftr, screenVerts.ftl], topColor, strokeColor, 1);
        // Right face
        drawFace([screenVerts.ftr, screenVerts.btr, screenVerts.bbr, screenVerts.fbr], rightColor, strokeColor, 1);
        // Front face
        drawFace([screenVerts.ftl, screenVerts.ftr, screenVerts.fbr, screenVerts.fbl], frontColor, strokeColor, 1);

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      } else {
        // Empty or unactivated block - outline only but visible
        const strokeColor = `rgba(${primary.r}, ${primary.g}, ${primary.b}, 0.6)`;

        // Top face
        drawFace([screenVerts.btl, screenVerts.btr, screenVerts.ftr, screenVerts.ftl], null, strokeColor, 0.5);
        // Right face
        drawFace([screenVerts.ftr, screenVerts.btr, screenVerts.bbr, screenVerts.fbr], null, strokeColor, 0.5);
        // Front face
        drawFace([screenVerts.ftl, screenVerts.ftr, screenVerts.fbr, screenVerts.fbl], null, strokeColor, 0.5);
      }
    };

    /** Render frame */
    const render = (): void => {
      if (!isRunning) return;

      // Clear canvas (transparent)
      ctx.clearRect(0, 0, width, height);

      // Animate the blocks
      animationProgress += 0.0005;
      if (animationProgress > 1) {
        animationProgress = 0;
      }

      // Draw 32 blocks in reading order (8 columns x 4 rows)
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const blockIndex = row * cols + col;

          // Position on screen
          const x = startX + col * spacing;
          const y = startY + row * spacing;

          // Check activation based on animation progress
          const blockProgress = blockIndex / 32;
          const blockActivated = animationProgress >= blockProgress;

          // Check if slot is filled
          const isFilled = blockIndex < filledSlots;

          drawBlock(x, y, blockSize, isFilled, blockActivated);
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
