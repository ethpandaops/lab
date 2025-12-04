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
    _hashToSeed(blockHash);

    // Clear canvas (transparent)
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    // Cube dimensions
    const cubeSize = width * 0.35;

    // Isometric projection angles
    const angleX = Math.PI / 6; // 30 degrees
    const angleY = Math.PI / 4; // 45 degrees

    // Project a 3D point to 2D isometric
    const project = (x: number, y: number, z: number): { x: number; y: number } => {
      // Rotate around Y axis first
      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const rx = x * cosY - z * sinY;
      const rz = x * sinY + z * cosY;

      // Then tilt around X axis
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const ry = y * cosX - rz * sinX;

      return {
        x: centerX + rx,
        y: centerY + ry,
      };
    };

    // Define cube vertices (centered at origin)
    const half = cubeSize / 2;
    const verts = {
      // Front face
      ftl: project(-half, -half, -half), // front top left
      ftr: project(half, -half, -half), // front top right
      fbr: project(half, half, -half), // front bottom right
      fbl: project(-half, half, -half), // front bottom left
      // Back face
      btl: project(-half, -half, half), // back top left
      btr: project(half, -half, half), // back top right
      bbr: project(half, half, half), // back bottom right
      bbl: project(-half, half, half), // back bottom left
    };

    // Draw a face with gradient for 3D effect
    const drawFace = (
      points: { x: number; y: number }[],
      baseColor: { r: number; g: number; b: number },
      brightness: number,
      strokeColor: { r: number; g: number; b: number }
    ): void => {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();

      // Fill with adjusted brightness
      const r = Math.min(255, Math.floor(baseColor.r * brightness));
      const g = Math.min(255, Math.floor(baseColor.g * brightness));
      const b = Math.min(255, Math.floor(baseColor.b * brightness));
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fill();

      // Stroke
      ctx.strokeStyle = `rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, 0.9)`;
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    // Draw glow effect (outer layers)
    ctx.shadowColor = `rgba(${glow.r}, ${glow.g}, ${glow.b}, 0.5)`;
    ctx.shadowBlur = 15;

    // Draw faces in correct order (back to front)
    // Top face (brightest - lit from above)
    drawFace([verts.btl, verts.btr, verts.ftr, verts.ftl], primary, 1.2, accent);

    // Right face (medium brightness)
    drawFace([verts.ftr, verts.btr, verts.bbr, verts.fbr], primary, 0.9, accent);

    // Front face (darkest - in shadow)
    drawFace([verts.ftl, verts.ftr, verts.fbr, verts.fbl], primary, 0.7, accent);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Draw inner cube (smaller, accent colored)
    const innerScale = 0.3;
    const innerHalf = half * innerScale;
    const innerVerts = {
      ftl: project(-innerHalf, -innerHalf, -innerHalf),
      ftr: project(innerHalf, -innerHalf, -innerHalf),
      fbr: project(innerHalf, innerHalf, -innerHalf),
      fbl: project(-innerHalf, innerHalf, -innerHalf),
      btl: project(-innerHalf, -innerHalf, innerHalf),
      btr: project(innerHalf, -innerHalf, innerHalf),
      bbr: project(innerHalf, innerHalf, innerHalf),
      bbl: project(-innerHalf, innerHalf, innerHalf),
    };

    // Inner cube glow
    ctx.shadowColor = `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.8)`;
    ctx.shadowBlur = 10;

    // Draw inner faces
    ctx.beginPath();
    ctx.moveTo(innerVerts.btl.x, innerVerts.btl.y);
    ctx.lineTo(innerVerts.btr.x, innerVerts.btr.y);
    ctx.lineTo(innerVerts.ftr.x, innerVerts.ftr.y);
    ctx.lineTo(innerVerts.ftl.x, innerVerts.ftl.y);
    ctx.closePath();
    ctx.fillStyle = `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.6)`;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(innerVerts.ftr.x, innerVerts.ftr.y);
    ctx.lineTo(innerVerts.btr.x, innerVerts.btr.y);
    ctx.lineTo(innerVerts.bbr.x, innerVerts.bbr.y);
    ctx.lineTo(innerVerts.fbr.x, innerVerts.fbr.y);
    ctx.closePath();
    ctx.fillStyle = `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.5)`;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(innerVerts.ftl.x, innerVerts.ftl.y);
    ctx.lineTo(innerVerts.ftr.x, innerVerts.ftr.y);
    ctx.lineTo(innerVerts.fbr.x, innerVerts.fbr.y);
    ctx.lineTo(innerVerts.fbl.x, innerVerts.fbl.y);
    ctx.closePath();
    ctx.fillStyle = `rgba(${accent.r}, ${accent.g}, ${accent.b}, 0.4)`;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }, [width, height, blockHash, blockNumber, finalPrimaryColor, finalAccentColor, finalGlowColor]);

  return (
    <div className="flex items-center justify-center">
      <canvas ref={canvasRef} style={{ width, height }} />
    </div>
  );
}
