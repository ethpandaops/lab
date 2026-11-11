import { useMemo } from 'react';
import {
  fctPeerConcentrationClDailyServiceList,
  fctPeerAttnetCountByClClientDailyServiceList,
  fctPeerChurnByClClientDailyServiceList,
  fctPeerChurnDailyServiceList,
  fctPeerConcentrationElDailyServiceList,
  fctPeerCustodyByColumnDailyServiceList,
  fctPeerCustodyCoverageDailyServiceList,
  fctPeerCountByCountryDailyServiceList,
  fctPeerCountByElCountryDailyServiceList,
  fctPeerCountBySourceDailyServiceList,
  fctPeerGoodbyeByClClientDailyServiceList,
  fctPeerGoodbyeDailyServiceList,
  fctPeerReachabilityByClClientDailyServiceList,
  fctPeerSubnetCoverageDailyServiceList,
  fctPeerSubnetDailyServiceList,
  fctPeerSyncStatusByClClientDailyServiceList,
} from '@/api/sdk.gen';
import type {
  FctPeerAttnetCountByClClientDaily,
  FctPeerChurnByClClientDaily,
  FctPeerChurnDaily,
  FctPeerConcentrationClDaily,
  FctPeerCustodyByColumnDaily,
  FctPeerCustodyCoverageDaily,
  FctPeerCountByCountryDaily,
  FctPeerCountBySourceDaily,
  FctPeerGoodbyeByClClientDaily,
  FctPeerGoodbyeDaily,
  FctPeerReachabilityByClClientDaily,
  FctPeerSubnetCoverageDaily,
  FctPeerSubnetDaily,
  FctPeerSyncStatusByClClientDaily,
} from '@/api/types.gen';
import {
  CENSUS_TABLES,
  censusList,
  type FctPeerForkReadinessByClClientDaily,
  type FctPeerForkReadinessByElClientDaily,
} from '@/pages/ethereum/clients/api/client-models';
import type { ClientLayer } from '@/pages/ethereum/clients/utils/client-share';
import type { fetchAllPages } from '@/utils/api-pagination';
import { CUSTODY_COLUMNS_START, EL_CRAWL_START, TOP_PLACES } from '../constants';
import { onChainRows } from '../utils/network-census';
import { topCountries, type ConcentrationRow, type CountryDayRow } from '../utils/network-series';
import { useRangeDays, type UseRangeDaysResult } from './useRangeDays';
import { useRangeEnds, type UseRangeEndsResult } from './useRangeEnds';

type ListFn = Parameters<typeof fetchAllPages>[0];

export interface OverviewCensus {
  /** Network-wide consensus peers by source, custody and connection, one row a day */
  peers: UseRangeDaysResult<FctPeerCountBySourceDaily>;
  /** Consensus peers' head and finality lag, fork and history per client, each day */
  sync: UseRangeDaysResult<FctPeerSyncStatusByClClientDaily>;
  /** How each consensus client's peers connect, each day */
  reachability: UseRangeDaysResult<FctPeerReachabilityByClClientDaily>;
  /** Where each layer's nodes run, one row a day; execution from the crawl's full-scale start */
  concentration: Record<ClientLayer, UseRangeDaysResult<ConcentrationRow>>;
  /** The selected layer's largest countries on the latest day, largest first */
  countryCodes: string[];
  /** Those countries' nodes each day of the range, for the selected layer */
  countries: UseRangeDaysResult<CountryDayRow>;
  /** Consensus peers arriving, returning and leaving, by network type and by client, each day */
  churn: {
    networkTypes: UseRangeDaysResult<FctPeerChurnDaily>;
    clients: UseRangeDaysResult<FctPeerChurnByClClientDaily>;
  };
  /** Goodbyes our sentries received by reason code, network-wide and by client, each day */
  goodbyes: {
    reasons: UseRangeDaysResult<FctPeerGoodbyeDaily>;
    clients: UseRangeDaysResult<FctPeerGoodbyeByClClientDaily>;
  };
  /** Attestation and sync subnets per peer by client, and peers per subnet, each day; every subnet on the latest day */
  subnets: {
    clients: UseRangeDaysResult<FctPeerAttnetCountByClClientDaily>;
    coverage: UseRangeDaysResult<FctPeerSubnetCoverageDaily>;
    latest: UseRangeEndsResult<FctPeerSubnetDaily>;
  };
  /** Custodians per data column each day; every column on the latest day */
  columns: {
    coverage: UseRangeDaysResult<FctPeerCustodyCoverageDaily>;
    latest: UseRangeEndsResult<FctPeerCustodyByColumnDaily>;
  };
  /** Consensus ENRs per client and next fork digest, latest day only */
  clReadiness: UseRangeEndsResult<FctPeerForkReadinessByClClientDaily>;
  /** Execution ENRs on this chain per client and next fork, latest day only */
  elReadiness: FctPeerForkReadinessByElClientDaily[];
  isLoading: boolean;
}

const ALL = {};

const TABLES = {
  peers: 'fct_peer_count_by_source_daily',
  sync: 'fct_peer_sync_status_by_cl_client_daily',
  reachability: 'fct_peer_reachability_by_cl_client_daily',
  concentration: { consensus: 'fct_peer_concentration_cl_daily', execution: 'fct_peer_concentration_el_daily' },
  countries: { consensus: 'fct_peer_count_by_country_daily', execution: 'fct_peer_count_by_el_country_daily' },
  churn: 'fct_peer_churn_daily',
  churnClients: 'fct_peer_churn_by_cl_client_daily',
  goodbyes: 'fct_peer_goodbye_daily',
  goodbyeClients: 'fct_peer_goodbye_by_cl_client_daily',
  attnets: 'fct_peer_attnet_count_by_cl_client_daily',
  subnetCoverage: 'fct_peer_subnet_coverage_daily',
  subnets: 'fct_peer_subnet_daily',
  columnCoverage: 'fct_peer_custody_coverage_daily',
  columns: 'fct_peer_custody_by_column_daily',
} as const;

const COUNTRY_LISTS: Record<ClientLayer, ListFn> = {
  consensus: fctPeerCountByCountryDailyServiceList as ListFn,
  execution: fctPeerCountByElCountryDailyServiceList as ListFn,
};

/** Execution history starts where the crawl counts nodes at today's scale */
const FLOOR: Record<ClientLayer, string | undefined> = { consensus: undefined, execution: EL_CRAWL_START };

/**
 * Everything the network overview shows: the daily series over the range, for `layer` where the nodes run, and fork
 * readiness on the latest day. Each read is a few rows a day; the countries are the layer's ten largest.
 */
export function useOverviewCensus(days: number | null, layer: ClientLayer): OverviewCensus {
  const peers = useRangeDays<FctPeerCountBySourceDaily>(
    fctPeerCountBySourceDailyServiceList as ListFn,
    TABLES.peers,
    days
  );
  const sync = useRangeDays<FctPeerSyncStatusByClClientDaily>(
    fctPeerSyncStatusByClClientDailyServiceList as ListFn,
    TABLES.sync,
    days
  );
  const reachability = useRangeDays<FctPeerReachabilityByClClientDaily>(
    fctPeerReachabilityByClClientDailyServiceList as ListFn,
    TABLES.reachability,
    days
  );
  const concentrationCl = useRangeDays<FctPeerConcentrationClDaily>(
    fctPeerConcentrationClDailyServiceList as ListFn,
    TABLES.concentration.consensus,
    days
  );
  const concentrationEl = useRangeDays<ConcentrationRow>(
    fctPeerConcentrationElDailyServiceList as ListFn,
    TABLES.concentration.execution,
    days,
    { floor: EL_CRAWL_START }
  );

  const churn = useRangeDays<FctPeerChurnDaily>(fctPeerChurnDailyServiceList as ListFn, TABLES.churn, days);
  const churnClients = useRangeDays<FctPeerChurnByClClientDaily>(
    fctPeerChurnByClClientDailyServiceList as ListFn,
    TABLES.churnClients,
    days
  );
  const goodbyes = useRangeDays<FctPeerGoodbyeDaily>(fctPeerGoodbyeDailyServiceList as ListFn, TABLES.goodbyes, days);
  const goodbyeClients = useRangeDays<FctPeerGoodbyeByClClientDaily>(
    fctPeerGoodbyeByClClientDailyServiceList as ListFn,
    TABLES.goodbyeClients,
    days
  );
  const attnets = useRangeDays<FctPeerAttnetCountByClClientDaily>(
    fctPeerAttnetCountByClClientDailyServiceList as ListFn,
    TABLES.attnets,
    days
  );
  const subnetCoverage = useRangeDays<FctPeerSubnetCoverageDaily>(
    fctPeerSubnetCoverageDailyServiceList as ListFn,
    TABLES.subnetCoverage,
    days
  );
  // 68 and 128 rows a day: the latest day only, never the range
  const latestSubnets = useRangeEnds<FctPeerSubnetDaily>(
    fctPeerSubnetDailyServiceList as ListFn,
    TABLES.subnets,
    ALL,
    1
  );
  const columnCoverage = useRangeDays<FctPeerCustodyCoverageDaily>(
    fctPeerCustodyCoverageDailyServiceList as ListFn,
    TABLES.columnCoverage,
    days,
    { floor: CUSTODY_COLUMNS_START }
  );
  const latestColumns = useRangeEnds<FctPeerCustodyByColumnDaily>(
    fctPeerCustodyByColumnDailyServiceList as ListFn,
    TABLES.columns,
    ALL,
    1
  );

  const latestCountries = useRangeEnds<FctPeerCountByCountryDaily>(
    COUNTRY_LISTS[layer],
    TABLES.countries[layer],
    ALL,
    1
  );
  const countryCodes = useMemo(() => topCountries(latestCountries.end, TOP_PLACES), [latestCountries.end]);
  const countries = useRangeDays<CountryDayRow>(COUNTRY_LISTS[layer], TABLES.countries[layer], days, {
    filters: countryCodes.length > 0 ? { country_code_in_values: countryCodes.join(',') } : null,
    floor: FLOOR[layer],
  });

  const clReadiness = useRangeEnds<FctPeerForkReadinessByClClientDaily>(
    censusList(CENSUS_TABLES.clReadiness),
    CENSUS_TABLES.clReadiness,
    ALL,
    1
  );
  const elReadiness = useRangeEnds<FctPeerForkReadinessByElClientDaily>(
    censusList(CENSUS_TABLES.elReadiness),
    CENSUS_TABLES.elReadiness,
    ALL,
    1
  );
  const elOnChain = useMemo(() => onChainRows(elReadiness.end), [elReadiness.end]);

  return {
    peers,
    sync,
    reachability,
    concentration: { consensus: concentrationCl, execution: concentrationEl },
    countryCodes,
    countries: { rows: countries.rows, isLoading: latestCountries.isLoading || countries.isLoading },
    churn: { networkTypes: churn, clients: churnClients },
    goodbyes: { reasons: goodbyes, clients: goodbyeClients },
    subnets: { clients: attnets, coverage: subnetCoverage, latest: latestSubnets },
    columns: { coverage: columnCoverage, latest: latestColumns },
    clReadiness,
    elReadiness: elOnChain,
    isLoading: [
      peers,
      sync,
      reachability,
      churn,
      churnClients,
      goodbyes,
      goodbyeClients,
      attnets,
      subnetCoverage,
      latestSubnets,
      columnCoverage,
      latestColumns,
    ].some(read => read.isLoading),
  };
}
