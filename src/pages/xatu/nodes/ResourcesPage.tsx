import { type FormEvent, type JSX, useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import {
  fctBlockDataColumnSidecarFirstSeenByNodeServiceListOptions,
  fctBlockFirstSeenByNodeServiceListOptions,
  fctHeadFirstSeenByNodeServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import { Button } from '@/components/Elements/Button';
import { Input } from '@/components/Forms/Input';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { useTableBounds } from '@/hooks/useBounds';
import { useNetwork } from '@/hooks/useNetwork';
import { Route } from '@/routes/xatu/nodes/resources';
import { slotToTimestamp, timestampToSlot } from '@/utils/beacon';
import { NodeResourcesPanel } from './components/NodeResources';

/**
 * CPU, memory, disk and network of Xatu nodes' client processes around one slot, annotated with when each Xatu node
 * saw the slot's block, head and data columns. Without `?slot=` it opens the latest slot the resource tables cover.
 */
export function ResourcesPage(): JSX.Element {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: '/xatu/nodes/resources' });
  const { currentNetwork } = useNetwork();
  const { data: bounds } = useTableBounds('fct_node_cpu_utilization_by_process');
  // One slot back from the table's newest row, so the slot's rows are complete
  const latestSlot =
    currentNetwork && bounds ? timestampToSlot(bounds.max, currentNetwork.genesis_time) - 1 : undefined;
  const slot = search.slot ?? latestSlot;

  // Pin the default slot in the URL so the page stays on it as the bounds move
  useEffect(() => {
    if (search.slot === undefined && latestSlot !== undefined) {
      navigate({ search: prev => ({ ...prev, slot: latestSlot }), replace: true, resetScroll: false });
    }
  }, [search.slot, latestSlot, navigate]);

  // Same queries as the slot page, so they share its cache
  const slotTimestamp = currentNetwork && slot !== undefined ? slotToTimestamp(slot, currentNetwork.genesis_time) : 0;
  const query = { query: { slot_start_date_time_eq: slotTimestamp, page_size: 10000 } };
  const enabled = slotTimestamp > 0;
  const block = useQuery({ ...fctBlockFirstSeenByNodeServiceListOptions(query), enabled });
  const head = useQuery({ ...fctHeadFirstSeenByNodeServiceListOptions(query), enabled });
  const dataColumns = useQuery({ ...fctBlockDataColumnSidecarFirstSeenByNodeServiceListOptions(query), enabled });

  const goTo = (target: number): void => {
    navigate({ search: prev => ({ ...prev, slot: target }), resetScroll: false });
  };

  const submitSlot = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const value = Number.parseInt(String(new FormData(event.currentTarget).get('slot') ?? ''), 10);
    if (!Number.isNaN(value) && value >= 0) goTo(value);
  };

  return (
    <Container>
      <Header title="Xatu node resources" />

      {slot === undefined ? (
        <LoadingContainer className="h-96 rounded-sm" />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              rounded="sm"
              leadingIcon={<ChevronLeftIcon />}
              disabled={slot === 0}
              onClick={() => goTo(slot - 1)}
              aria-label="Previous slot"
            >
              Previous
            </Button>
            <form key={slot} onSubmit={submitSlot} className="w-32">
              <Input size="sm">
                <Input.Field
                  name="slot"
                  inputMode="numeric"
                  defaultValue={slot}
                  aria-label="Slot"
                  className="tabular-nums"
                />
              </Input>
            </form>
            <Button
              variant="secondary"
              size="sm"
              rounded="sm"
              trailingIcon={<ChevronRightIcon />}
              disabled={latestSlot !== undefined && slot >= latestSlot}
              onClick={() => goTo(slot + 1)}
              aria-label="Next slot"
            >
              Next
            </Button>
            <Link
              to="/ethereum/slots/$slot"
              params={{ slot: String(slot) }}
              className="text-sm/6 font-medium text-primary hover:underline sm:ml-auto"
            >
              Slot {slot}
            </Link>
          </div>

          <NodeResourcesPanel
            slot={slot}
            blockPropagation={block.data?.fct_block_first_seen_by_node ?? []}
            headPropagation={head.data?.fct_head_first_seen_by_node ?? []}
            dataColumnPropagation={dataColumns.data?.fct_block_data_column_sidecar_first_seen_by_node ?? []}
          />
        </div>
      )}
    </Container>
  );
}
