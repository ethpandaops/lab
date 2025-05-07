import { createContext } from 'react';

import { GetConfigResponse } from '@/api/gen/backend/pkg/server/proto/lab/lab_pb';

export default createContext<GetConfigResponse | null>(null);
