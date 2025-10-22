import type { JSX } from 'react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { InputGroup } from '@/components/Forms/InputGroup';
import { Button } from '@/components/Elements/Button';
import { ButtonGroup } from '@/components/Elements/ButtonGroup';
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ListBulletIcon,
  GlobeAltIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import type { GeographicalFiltersFormData, GeographicalFiltersProps } from './GeographicalFilters.types';
import { FiltersDialog } from '../FiltersDialog';

export function GeographicalFilters({
  availableClients,
  availableCountries,
  viewMode,
  onViewModeChange,
  onInsightsClick,
}: GeographicalFiltersProps): JSX.Element {
  const { register } = useFormContext<GeographicalFiltersFormData>();
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);

  return (
    <>
      {/* Search and View Mode Toggle */}
      <InputGroup
        {...register('search')}
        placeholder="Search by username or location..."
        leadingIcon={<MagnifyingGlassIcon className="size-5" />}
        trailingButton={
          <ButtonGroup>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'secondary'}
              onClick={() => onViewModeChange('list')}
              leadingIcon={<ListBulletIcon className="size-5" />}
              className="rounded-l-none"
              aria-label="List View"
            />
            <Button
              variant={viewMode === 'map' ? 'primary' : 'secondary'}
              onClick={() => onViewModeChange('map')}
              leadingIcon={<GlobeAltIcon className="size-5" />}
              aria-label="Map View"
            />
            <Button
              variant="secondary"
              onClick={onInsightsClick}
              leadingIcon={<ChartBarIcon className="size-5" />}
              aria-label="Insights"
            />
            <Button
              variant="secondary"
              onClick={() => setIsFiltersDialogOpen(true)}
              leadingIcon={<AdjustmentsHorizontalIcon className="size-5" />}
              className="rounded-r-sm"
              aria-label="Filters"
            />
          </ButtonGroup>
        }
      />

      {/* Filters Dialog */}
      <FiltersDialog
        open={isFiltersDialogOpen}
        onClose={() => setIsFiltersDialogOpen(false)}
        availableClients={availableClients}
        availableCountries={availableCountries}
      />
    </>
  );
}
