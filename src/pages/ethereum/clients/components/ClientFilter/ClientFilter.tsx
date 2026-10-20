import { type JSX, useMemo } from 'react';
import { SelectMenu, type SelectMenuOption } from '@/components/Forms/SelectMenu';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { formatClientName, type ClientLayer } from '../../utils/client-share';

export interface ClientFilterProps {
  layer: ClientLayer;
  /** Selected client, undefined for all */
  value?: string;
  onChange: (client: string | undefined) => void;
  /** Clients to pick from, in display order */
  clients: string[];
}

/**
 * Consensus or execution client selector for the filter bar.
 */
export function ClientFilter({ layer, value, onChange, clients }: ClientFilterProps): JSX.Element {
  const options: SelectMenuOption<string>[] = useMemo(() => {
    const names = value && !clients.includes(value) ? [value, ...clients] : clients;
    return [
      { value: '', label: layer === 'consensus' ? 'All consensus clients' : 'All execution clients' },
      ...names.map(client => ({
        value: client,
        label: formatClientName(client),
        icon: <ClientLogo client={client} size={20} />,
      })),
    ];
  }, [clients, layer, value]);

  return (
    <SelectMenu
      value={value ?? ''}
      onChange={client => onChange(client || undefined)}
      options={options}
      className="w-full sm:w-60"
    />
  );
}
