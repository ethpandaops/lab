import React, { createContext, useContext, useState, useCallback } from 'react';

export interface SlotDataRequest {
  id: string;
  slot: number;
  network: string;
  apiMode: 'REST' | 'gRPC';
  startTime: number;
  endTime?: number;
  duration?: number;
  payload?: any;
  error?: string;
  endpoints?: string[]; // For REST mode, list of endpoints called
}

interface SlotDataTrackerContextType {
  requests: SlotDataRequest[];
  trackRequest: (request: Omit<SlotDataRequest, 'id' | 'startTime'>) => string;
  updateRequest: (id: string, updates: Partial<SlotDataRequest>) => void;
  clearRequests: () => void;
}

const SlotDataTrackerContext = createContext<SlotDataTrackerContextType | undefined>(undefined);

const MAX_REQUESTS = 10;

export function SlotDataTrackerProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<SlotDataRequest[]>([]);

  const trackRequest = useCallback((request: Omit<SlotDataRequest, 'id' | 'startTime'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newRequest: SlotDataRequest = {
      ...request,
      id,
      startTime: Date.now(),
    };

    setRequests(prev => {
      const updated = [newRequest, ...prev];
      // Keep only the last MAX_REQUESTS
      return updated.slice(0, MAX_REQUESTS);
    });

    return id;
  }, []);

  const updateRequest = useCallback((id: string, updates: Partial<SlotDataRequest>) => {
    setRequests(prev =>
      prev.map(req => {
        if (req.id === id) {
          const endTime = updates.endTime || Date.now();
          const duration = endTime - req.startTime;
          return { ...req, ...updates, endTime, duration };
        }
        return req;
      }),
    );
  }, []);

  const clearRequests = useCallback(() => {
    setRequests([]);
  }, []);

  return (
    <SlotDataTrackerContext.Provider
      value={{
        requests,
        trackRequest,
        updateRequest,
        clearRequests,
      }}
    >
      {children}
    </SlotDataTrackerContext.Provider>
  );
}

export function useSlotDataTracker() {
  const context = useContext(SlotDataTrackerContext);
  if (!context) {
    // Return a no-op implementation if not within provider
    return {
      requests: [],
      trackRequest: () => '',
      updateRequest: () => {},
      clearRequests: () => {},
    };
  }
  return context;
}
