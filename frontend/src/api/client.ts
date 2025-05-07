import { createClient, Client, Interceptor } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';

import { LabAPI } from '@/api/gen/backend/pkg/api/proto/lab_api_connectweb';
import { GetConfigResponse } from '@/api/gen/backend/pkg/api/proto/lab_api_pb';

export type LabApiClient = Client<typeof LabAPI>;

export type Config = NonNullable<NonNullable<GetConfigResponse['config']>['config']>;

const logger: Interceptor = next => async req => {
  console.log(`sending message to ${req.url}`);
  return await next(req);
};

export function createLabApiClient(baseUrl: string): LabApiClient {
  console.log('Creating LabAPI client with baseUrl:', baseUrl);
  return createClient(
    LabAPI,
    createConnectTransport({
      interceptors: [logger],
      baseUrl,
      useHttpGet: true, // Force HTTP GET for all unary calls
    }),
  );
}
