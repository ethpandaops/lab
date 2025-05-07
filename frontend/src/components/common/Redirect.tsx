import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface RedirectProps {
  to: string;
}

/**
 * Simple redirect component that navigates to the specified path
 */
const Redirect: React.FC<RedirectProps> = ({ to }) => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(to, { replace: true });
  }, [navigate, to]);

  return null;
};

export default Redirect;
