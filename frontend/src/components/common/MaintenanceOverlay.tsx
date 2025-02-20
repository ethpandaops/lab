import React from 'react';

export const MaintenanceOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 backdrop-blur-md /90 flex items-center justify-center">
      <div className="text-center space-y-4 p-8  -default  backdrop-blur-sm">
        <h1 className="text-4xl font-sans font-black bg-gradient-to-r from-primary via-accent to-error bg-clip-text text-transparent animate-text-shine">
          Offline for Maintenance
        </h1>
        <p className="text-lg font-mono text-tertiary">
          Come back soon...
        </p>
      </div>
    </div>
  );
};

export default MaintenanceOverlay; 