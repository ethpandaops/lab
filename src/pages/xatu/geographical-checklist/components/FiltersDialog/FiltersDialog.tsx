import type { JSX } from 'react';
import { useFormContext } from 'react-hook-form';
import { Dialog } from '@/components/Overlays/Dialog';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import { ClientSelect } from '@/components/Ethereum/ClientSelect';
import { Button } from '@/components/Elements/Button';
import type { FiltersDialogProps } from './FiltersDialog.types';
import type { GeographicalFiltersFormData } from '../GeographicalFilters/GeographicalFilters.types';
import { CONTINENT_CONFIG } from '../../hooks/useGeographicalData/useGeographicalData.utils';
import type { ContinentCode } from '../../hooks/useGeographicalData/useGeographicalData.types';

export function FiltersDialog({
  open,
  onClose,
  availableClients,
  availableCountries,
}: FiltersDialogProps): JSX.Element {
  const { watch, setValue } = useFormContext<GeographicalFiltersFormData>();
  const continentValue = watch('continent');
  const countryValue = watch('country');
  const clientImplementationValue = watch('clientImplementation');

  const continentOptions = [
    { value: 'all' as const, label: 'All Continents' },
    ...Object.entries(CONTINENT_CONFIG).map(([code, config]) => ({
      value: code as ContinentCode,
      label: `${config.emoji} ${config.name}`,
    })),
  ];

  const countryOptions = [
    { value: 'all' as const, label: 'All Countries' },
    ...availableCountries.map(country => ({
      value: country.code ?? country.name,
      label: `${country.emoji ?? ''} ${country.name}`.trim(),
    })),
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Filters"
      description="Filter nodes by continent, country, or client implementation."
      size="xl"
      allowContentOverflow
      footer={
        <Button variant="primary" onClick={onClose}>
          Apply Filters
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Continent filter */}
          <div>
            <SelectMenu
              value={continentValue}
              onChange={value => setValue('continent', value)}
              options={continentOptions}
              label="Continent"
              showLabel
            />
          </div>

          {/* Country filter */}
          <div>
            <SelectMenu
              value={countryValue}
              onChange={value => setValue('country', value)}
              options={countryOptions}
              label="Country"
              showLabel
            />
          </div>

          {/* Client Implementation filter */}
          <div>
            <ClientSelect
              value={clientImplementationValue}
              onChange={value => setValue('clientImplementation', value)}
              clients={availableClients}
              showLabel
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
}
