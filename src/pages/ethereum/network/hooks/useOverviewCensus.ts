import { useMemo } from 'react';
import {
  fctPeerConcentrationClDailyServiceList,
  fctPeerConcentrationElDailyServiceList,
  fctPeerCountByCountryDailyServiceList,
  fctPeerCountByElCountryDailyServiceList,
  fctPeerCountBySourceDailyServiceList,
  fctPeerReachabilityByClClientDailyServiceList,
  fctPeerSyncStatusByClClientDailyServiceList,
} from '@/api/sdk.gen';
import type {
  FctPeerConcentrationClDaily,
  FctPeerCountByCountryDaily,
  FctPeerCountBySourceDaily,
  FctPeerReachabilityByClClientDaily,
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
import { EL_CRAWL_START, TOP_PLACES } from '../constants';
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
    clReadiness,
    elReadiness: elOnChain,
    isLoading: peers.isLoading || sync.isLoading || reachability.isLoading,
  };
}
