import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';

interface RedirectProps {
  to: string;
}

/**
 * Simple redirect component that navigates to the specified path
 */
const Redirect: React.FC<RedirectProps> = ({ to }) => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: to as any, replace: true });
  }, [navigate, to]);

  return null;
};

export default Redirect;
