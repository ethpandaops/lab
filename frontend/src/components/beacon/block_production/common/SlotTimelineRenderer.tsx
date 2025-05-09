import React, { useRef, useEffect } from 'react';
import { useTimeline } from '@/contexts/timeline';
import { Phase } from './types';
import { getCurrentPhase } from './PhaseUtils';

interface SlotTimelineRendererProps {
  nodeBlockSeen: Record<string, number>;
  nodeBlockP2P: Record<string, number>;
  blockTime?: number;
  attestationsCount?: number;
  totalExpectedAttestations?: number;
  width: number;
  height: number;
  onPhaseChange?: (phase: Phase) => void;
}

const SlotTimelineRenderer: React.FC<SlotTimelineRendererProps> = ({
  nodeBlockSeen,
  nodeBlockP2P,
  blockTime,
  attestationsCount = 0,
  totalExpectedAttestations = 0,
  width,
  height,
  onPhaseChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getCurrentTimeMs, isPlaying } = useTimeline();
  
  // Store phase in a ref to avoid re-renders when it changes
  const phaseRef = useRef<Phase | null>(null);
  
  // Function to calculate time markers
  const calculateTimeMarkers = () => {
    // Calculate propagation time from node data
    let earliestNodeTime = Infinity;
    
    // Check API timings
    Object.values(nodeBlockSeen).forEach(time => {
      if (typeof time === 'number') {
        earliestNodeTime = Math.min(earliestNodeTime, time);
      }
    });
    
    // Check P2P timings
    Object.values(nodeBlockP2P).forEach(time => {
      if (typeof time === 'number') {
        earliestNodeTime = Math.min(earliestNodeTime, time);
      }
    });
    
    // Use block time if available and earlier than node times
    if (blockTime !== undefined && blockTime < earliestNodeTime) {
      earliestNodeTime = blockTime;
    }
    
    // Set default propagation time if no data
    const propagationTime = earliestNodeTime === Infinity ? 4000 : earliestNodeTime;
    
    // Find the earliest attestation time
    let attestationTime = Infinity;
    // In a full implementation, this would look at attestation data
    // For now, using a default relative to propagation time
    attestationTime = propagationTime + 1500;
    
    // Determine acceptance time (66% attestations)
    let acceptanceTime = Infinity;
    // In a full implementation, this would calculate based on 66% threshold
    // For now, using a default relative to attestation time
    acceptanceTime = attestationTime + 2000;
    
    return {
      propagationTime,
      attestationTime,
      acceptanceTime,
    };
  };
  
  // Main animation function
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas DPI for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    
    // Style canvas
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    // Get time markers once for efficient rendering
    const { propagationTime, attestationTime, acceptanceTime } = calculateTimeMarkers();
    
    // Define colors
    const phaseColors = {
      background: 'rgba(17, 24, 39, 0.5)',
      building: {
        active: 'rgba(249, 115, 22, 0.4)', // bright orange
        inactive: 'rgba(249, 115, 22, 0.15)', // faded orange
      },
      propagating: {
        active: 'rgba(168, 85, 247, 0.4)', // bright purple
        inactive: 'rgba(168, 85, 247, 0.15)', // faded purple
      },
      attesting: {
        active: 'rgba(59, 130, 246, 0.4)', // bright blue
        inactive: 'rgba(59, 130, 246, 0.15)', // faded blue
      },
      accepted: {
        active: 'rgba(34, 197, 94, 0.4)', // bright green
        inactive: 'rgba(34, 197, 94, 0.15)', // faded green
      },
      progress: 'rgba(255, 255, 255, 0.3)',
      marker: 'rgba(255, 255, 255, 0.7)',
      text: 'rgba(156, 163, 175, 0.7)',
    };
    
    // Animation function
    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Get current time directly from timeline
      const currentTime = getCurrentTimeMs();
      
      // Calculate phase
      const currentPhase = getCurrentPhase(
        currentTime,
        nodeBlockSeen,
        nodeBlockP2P,
        blockTime,
        attestationsCount,
        totalExpectedAttestations,
      );
      
      // Notify parent if phase changed
      if (currentPhase !== phaseRef.current) {
        phaseRef.current = currentPhase;
        if (onPhaseChange) {
          onPhaseChange(currentPhase);
        }
      }
      
      // Draw phases background
      const barHeight = height * 0.6;
      const barY = height * 0.1;
      
      // Scale times to canvas width
      const getX = (timeMs: number) => (timeMs / 12000) * width;
      
      // Draw background with rounded corners
      ctx.fillStyle = phaseColors.background;
      ctx.beginPath();
      const cornerRadius = 4;
      ctx.moveTo(cornerRadius, barY);
      ctx.lineTo(width - cornerRadius, barY);
      ctx.quadraticCurveTo(width, barY, width, barY + cornerRadius);
      ctx.lineTo(width, barY + barHeight - cornerRadius);
      ctx.quadraticCurveTo(width, barY + barHeight, width - cornerRadius, barY + barHeight);
      ctx.lineTo(cornerRadius, barY + barHeight);
      ctx.quadraticCurveTo(0, barY + barHeight, 0, barY + barHeight - cornerRadius);
      ctx.lineTo(0, barY + cornerRadius);
      ctx.quadraticCurveTo(0, barY, cornerRadius, barY);
      ctx.closePath();
      ctx.fill();
      
      // Calculate percentages for phase transitions
      const propagationPercent = Math.min(98, Math.max(2, (propagationTime / 12000) * 100));
      const attestationPercent = Math.min(
        98,
        Math.max(propagationPercent + 1, (attestationTime / 12000) * 100)
      );
      const acceptancePercent = Math.min(
        98,
        Math.max(attestationPercent + 1, (acceptanceTime / 12000) * 100)
      );
      
      // Draw phases
      // Building phase
      ctx.fillStyle = 
        currentPhase === Phase.Building ? phaseColors.building.active : phaseColors.building.inactive;
      ctx.fillRect(0, barY, getX(propagationTime), barHeight);
      
      // Propagating phase
      ctx.fillStyle = 
        currentPhase === Phase.Propagating ? phaseColors.propagating.active : phaseColors.propagating.inactive;
      ctx.fillRect(getX(propagationTime), barY, 
        getX(attestationTime) - getX(propagationTime), barHeight);
      
      // Attesting phase
      ctx.fillStyle = 
        currentPhase === Phase.Attesting ? phaseColors.attesting.active : phaseColors.attesting.inactive;
      ctx.fillRect(getX(attestationTime), barY, 
        getX(acceptanceTime) - getX(attestationTime), barHeight);
      
      // Accepted phase
      ctx.fillStyle = 
        currentPhase === Phase.Accepted ? phaseColors.accepted.active : phaseColors.accepted.inactive;
      ctx.fillRect(getX(acceptanceTime), barY, 
        width - getX(acceptanceTime), barHeight);
      
      // Draw phase transition markers
      ctx.fillStyle = phaseColors.marker;
      // Propagation marker
      ctx.fillRect(getX(propagationTime) - 1, barY, 2, barHeight);
      // Attestation marker
      ctx.fillRect(getX(attestationTime) - 1, barY, 2, barHeight);
      // Acceptance marker
      ctx.fillRect(getX(acceptanceTime) - 1, barY, 2, barHeight);
      
      // Draw progress overlay - clip to the right max
      const progressX = Math.min(getX(currentTime), width);
      ctx.fillStyle = phaseColors.progress;
      ctx.fillRect(0, barY, progressX, barHeight);
      
      // Draw time cursor - glowing dot
      ctx.beginPath();
      ctx.arc(Math.min(progressX, width - 6), barY + barHeight/2, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      
      // Draw time ticks
      ctx.fillStyle = phaseColors.text;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      
      for (let i = 0; i <= 12; i += 2) {
        const tickX = getX(i * 1000);
        // Draw tick mark
        ctx.fillRect(tickX, barY + barHeight + 2, 1, 4);
        // Draw tick label
        ctx.fillText(`${i}s`, tickX, barY + barHeight + 14);
      }
      
      // Continue animation
      requestAnimationFrame(animate);
    };
    
    // Start animation
    const animationId = requestAnimationFrame(animate);
    
    // Clean up
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [
    width, 
    height, 
    nodeBlockSeen, 
    nodeBlockP2P, 
    blockTime, 
    attestationsCount, 
    totalExpectedAttestations, 
    getCurrentTimeMs, 
    onPhaseChange
  ]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="rounded-lg" 
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
      }} 
    />
  );
};

export default SlotTimelineRenderer;