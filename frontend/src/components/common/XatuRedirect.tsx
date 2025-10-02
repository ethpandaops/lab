import { useEffect } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';

/**
 * Redirect component that automatically redirects from /xatu/* to /xatu-data/*
 * Preserves the rest of the path and all query parameters
 */
const XatuRedirect: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Replace /xatu with /xatu-data in the pathname
    const newPath = location.pathname.replace(/^\/xatu(?=$|\/)/, '/xatu-data');

    // Navigate with proper path and preserve search params
    navigate({
      to: newPath,
      replace: true,
    });
  }, [navigate, location]);

  return null;
};

export default XatuRedirect;
