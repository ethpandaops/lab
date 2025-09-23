import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ApiModeContextType {
  useRestApi: boolean;
  toggleApiMode: () => void;
}

const ApiModeContext = createContext<ApiModeContextType>({
  useRestApi: false,
  toggleApiMode: () => {},
});

export const ApiModeProvider = ({ children }: { children: ReactNode }) => {
  const [useRestApi, setUseRestApi] = useState(() => {
    const stored = localStorage.getItem('useRestApiGlobal');
    return stored === 'true';
  });

  const toggleApiMode = () => {
    setUseRestApi(prev => {
      const newValue = !prev;
      localStorage.setItem('useRestApiGlobal', String(newValue));
      console.log('API mode toggled to:', newValue ? 'REST' : 'gRPC');
      return newValue;
    });
  };

  useEffect(() => {
    // Log current API mode on mount
    console.log('API mode initialized:', useRestApi ? 'REST' : 'gRPC');
  }, []);

  return (
    <ApiModeContext.Provider value={{ useRestApi, toggleApiMode }}>
      {children}
    </ApiModeContext.Provider>
  );
};

export const useApiMode = () => {
  const context = useContext(ApiModeContext);
  if (!context) {
    throw new Error('useApiMode must be used within an ApiModeProvider');
  }
  return context;
};

export default useApiMode;
