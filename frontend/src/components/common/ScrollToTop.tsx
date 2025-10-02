import { useEffect } from 'react';
import { useLocation } from '@tanstack/react-router';

/**
 * ScrollToTop component
 * Scrolls to the top of the page when the route changes
 */
export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'instant',
    });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
