import type { ClientReadinessData } from '../../utils/fork-data-processor.types';

export interface ClientReadinessCardProps {
  data: ClientReadinessData;
  /** Fork the readiness is for, carried to the client page */
  forkName?: string;
}
