import { Outlet, useLocation, Navigate } from 'react-router-dom';

function Beacon() {
  const location = useLocation();

  // If we're at exactly /beacon or /beacon/, redirect to experiments
  if (location.pathname === '/beacon' || location.pathname === '/beacon/') {
    return <Navigate to="/experiments" replace />;
  }

  // Otherwise render the child route
  return <Outlet />;
}

export { Beacon };
