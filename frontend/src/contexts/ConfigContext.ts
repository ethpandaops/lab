import { createContext } from 'react';

import type { Config } from '@/types';

export default createContext<Config | null>(null);
