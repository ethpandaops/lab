import type { EntityValidatorStatusData } from '../../hooks/useEntityValidatorStatusData';
import type { TimePeriod } from '../../constants';

export interface ValidatorStatusChartProps {
  data: EntityValidatorStatusData | null;
  timePeriod: TimePeriod;
}
