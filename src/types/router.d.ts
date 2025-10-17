// Extend TanStack Router's StaticDataRouteOption for type-safe route configuration
declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    /**
     * Whether to show the network selector in the navbar.
     * Used by the _app layout to conditionally render the NetworkSelector component.
     */
    showNetworkSelector?: boolean;
  }
}

// This export is required to make this file a module
export {};
