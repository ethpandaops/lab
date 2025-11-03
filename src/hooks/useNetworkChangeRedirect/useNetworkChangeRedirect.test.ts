import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNetworkChangeRedirect } from './useNetworkChangeRedirect';

// Mock the router
const mockNavigate = vi.fn();
const mockSubscribe = vi.fn();
const mockRouter = {
  navigate: mockNavigate,
  subscribe: mockSubscribe,
};
const mockSearch = {};

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => mockRouter,
  useNavigate: () => mockNavigate,
  useSearch: () => mockSearch,
}));

describe('useNetworkChangeRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not subscribe if redirectPath is undefined', () => {
    renderHook(() => useNetworkChangeRedirect(undefined));

    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('should subscribe to router events when redirectPath is provided', () => {
    const unsubscribe = vi.fn();
    mockSubscribe.mockReturnValue(unsubscribe);

    renderHook(() => useNetworkChangeRedirect('/ethereum/slots'));

    expect(mockSubscribe).toHaveBeenCalledWith('onBeforeLoad', expect.any(Function));
  });

  it('should not navigate on initial mount', () => {
    const unsubscribe = vi.fn();
    let subscribedCallback: ((event: unknown) => void) | undefined;
    mockSubscribe.mockImplementation((_event, callback) => {
      subscribedCallback = callback;
      return unsubscribe;
    });

    // Mock that we're already on a page with network=mainnet
    mockSearch.network = 'mainnet';

    renderHook(() => useNetworkChangeRedirect('/ethereum/slots'));

    // Simulate initial navigation with same network param
    subscribedCallback?.({
      toLocation: {
        search: { network: 'mainnet' },
      },
    });

    expect(mockNavigate).not.toHaveBeenCalled();

    // Clean up
    delete mockSearch.network;
  });

  it('should navigate when network changes from one value to another', () => {
    const unsubscribe = vi.fn();
    let subscribedCallback: ((event: unknown) => void) | undefined;
    mockSubscribe.mockImplementation((_event, callback) => {
      subscribedCallback = callback;
      return unsubscribe;
    });

    renderHook(() => useNetworkChangeRedirect('/ethereum/slots'));

    // Simulate initial network
    subscribedCallback?.({
      toLocation: {
        search: { network: 'mainnet' },
      },
    });

    // Change to different network
    subscribedCallback?.({
      toLocation: {
        search: { network: 'holesky' },
      },
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/ethereum/slots',
      search: { network: 'holesky' },
      replace: true,
    });
  });

  it('should navigate with empty search when network is removed', () => {
    const unsubscribe = vi.fn();
    let subscribedCallback: ((event: unknown) => void) | undefined;
    mockSubscribe.mockImplementation((_event, callback) => {
      subscribedCallback = callback;
      return unsubscribe;
    });

    renderHook(() => useNetworkChangeRedirect('/ethereum/epochs'));

    // Start with a network
    subscribedCallback?.({
      toLocation: {
        search: { network: 'holesky' },
      },
    });

    // Remove network (switch to mainnet/default)
    subscribedCallback?.({
      toLocation: {
        search: {},
      },
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/ethereum/epochs',
      search: {},
      replace: true,
    });
  });

  it('should not navigate when network stays the same', () => {
    const unsubscribe = vi.fn();
    let subscribedCallback: ((event: unknown) => void) | undefined;
    mockSubscribe.mockImplementation((_event, callback) => {
      subscribedCallback = callback;
      return unsubscribe;
    });

    renderHook(() => useNetworkChangeRedirect('/ethereum/slots'));

    // Initial network
    subscribedCallback?.({
      toLocation: {
        search: { network: 'mainnet' },
      },
    });

    mockNavigate.mockClear();

    // Same network again
    subscribedCallback?.({
      toLocation: {
        search: { network: 'mainnet' },
      },
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should unsubscribe on unmount', () => {
    const unsubscribe = vi.fn();
    mockSubscribe.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useNetworkChangeRedirect('/ethereum/entities'));

    expect(unsubscribe).not.toHaveBeenCalled();

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
