import { useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import { Alert } from '@/components/Feedback/Alert';
import { Input } from '@/components/Forms/Input';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Table } from '@/components/Lists/Table';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import { formatEpoch } from '@/utils';

import { useEntitiesData } from './hooks';
import { EntitiesSkeleton } from './components/EntitiesSkeleton';

/**
 * Entities list page - displays Ethereum validator entities
 *
 * Shows data from the last finalized epoch (current epoch - 2):
 * - Entity name
 * - Online/offline status
 * - Validator count
 * - Attestation rate
 *
 * Allows navigation to entity detail page and searching/filtering
 */
export function IndexPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { entities, isLoading, error } = useEntitiesData();
  const { epoch: currentEpoch } = useBeaconClock();
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate last finalized epoch (current - 2)
  const lastFinalizedEpoch = useMemo(() => Math.max(0, currentEpoch - 2), [currentEpoch]);

  // Filter entities based on search term
  const filteredEntities = useMemo(() => {
    if (!searchTerm.trim()) {
      return entities;
    }

    const search = searchTerm.toLowerCase();
    return entities.filter(entity => entity.entity.toLowerCase().includes(search));
  }, [entities, searchTerm]);

  // Format table data
  const tableData = useMemo(() => {
    return filteredEntities.map(entity => {
      // Determine status based on attestation rate
      let status: string;
      let statusType: 'online' | 'degraded' | 'offline';

      if (entity.rate === 0) {
        status = 'Offline';
        statusType = 'offline';
      } else if (entity.rate < 0.95) {
        status = 'Degraded';
        statusType = 'degraded';
      } else {
        status = 'Online';
        statusType = 'online';
      }

      return {
        name: entity.entity,
        status,
        statusType,
        validatorCount: entity.validatorCount.toLocaleString(),
        validatorCountValue: entity.validatorCount,
        attestationRate: `${(entity.rate * 100).toFixed(2)}%`,
        attestationRateValue: entity.rate,
      };
    });
  }, [filteredEntities]);

  // Handle row click navigation
  const handleRowClick = (row: (typeof tableData)[0]): void => {
    navigate({
      to: '/ethereum/entities/$entity',
      params: { entity: encodeURIComponent(row.name) },
    });
  };

  if (isLoading) {
    return (
      <Container>
        <Header
          title="Entities"
          description="Track validator entities and their performance on the Ethereum beacon chain"
        />
        <EntitiesSkeleton />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header
          title="Entities"
          description="Track validator entities and their performance on the Ethereum beacon chain"
        />
        <Alert variant="error" title="Error loading entities" description={error.message} />
      </Container>
    );
  }

  return (
    <Container>
      <Header
        title="Entities"
        description="Track validator entities and their performance on the Ethereum beacon chain"
      />

      <div className="mt-6">
        <Input>
          <Input.Field
            placeholder="Search by entity name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </Input>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-muted">
            Showing {filteredEntities.length} of {entities.length} entities
          </span>
          <span className="text-muted">
            Data from epoch <span className="font-medium text-foreground">{formatEpoch(lastFinalizedEpoch)}</span>
          </span>
        </div>
      </div>

      {/* Entities Table */}
      <div className="mt-6">
        <Table
          variant="nested"
          data={tableData}
          columns={[
            {
              header: 'Entity Name',
              accessor: row => <span className="font-medium text-primary">{row.name}</span>,
            },
            {
              header: 'Status',
              accessor: row => (
                <span
                  className={
                    row.statusType === 'online'
                      ? 'font-medium text-success'
                      : row.statusType === 'degraded'
                        ? 'font-medium text-warning'
                        : 'font-medium text-danger'
                  }
                >
                  {row.status}
                </span>
              ),
            },
            {
              header: 'Validators',
              accessor: row => <span className="font-medium text-foreground">{row.validatorCount}</span>,
            },
            {
              header: 'Online Rate',
              accessor: row => (
                <span
                  className={
                    row.attestationRateValue < 0.95
                      ? 'text-warning'
                      : row.attestationRateValue >= 0.99
                        ? 'text-success'
                        : 'text-muted'
                  }
                >
                  {row.attestationRate}
                </span>
              ),
            },
          ]}
          onRowClick={handleRowClick}
        />
      </div>
    </Container>
  );
}
