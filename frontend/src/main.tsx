import './index.css';
import App from '@/App';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ScrollToTop from '@/components/common/ScrollToTop';

const MAX_RETRIES = 1;
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Number.POSITIVE_INFINITY,
      retry: MAX_RETRIES,
      gcTime: 1000 * 60 * 60, // Keep unused data in cache for 1 hour
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnReconnect: false, // Don't refetch when reconnecting
    },
  },
});

const container = document.querySelector('#root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ScrollToTop />
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}
