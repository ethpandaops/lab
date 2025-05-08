import { useContext as reactUseContext, createContext, useState } from 'react';
import { Config } from '@/api/client.ts';

export const Context = createContext<State | undefined>(undefined);

export default function useContext() {
  const context = reactUseContext(Context);
  if (context === undefined) {
    throw new Error('Config context must be used within a Config provider');
  }
  return context;
}

export interface State {
  config: Config;
  setConfig: (config: Config) => void;
}

export interface ValueProps {
  config: Config;
}

export function useValue(props: ValueProps): State {
  const [config, setConfig] = useState<Config>(props.config);

  return {
    config,
    setConfig,
  };
}
