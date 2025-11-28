import { type JSX, useMemo } from 'react';
import { SelectMenu, type SelectMenuOption } from '@/components/Forms/SelectMenu';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import type { ClientSelectProps } from './ClientSelect.types';

/**
 * Client implementation selector dropdown component.
 *
 * Displays a list of available Ethereum client implementations and allows selecting one.
 * Shows client logos alongside client names and node counts.
 *
 * Features:
 * - Includes "All Clients" option by default
 * - Shows client logo using ClientLogo component
 * - Displays node count for each client
 * - Keyboard accessible
 * - Dark mode support
 *
 * @example
 * ```tsx
 * const [selectedClient, setSelectedClient] = useState('all');
 * const clients = [
 *   { name: 'lighthouse', count: 150 },
 *   { name: 'prysm', count: 120 },
 *   { name: 'teku', count: 80 },
 * ];
 *
 * // With label
 * <ClientSelect
 *   value={selectedClient}
 *   onChange={setSelectedClient}
 *   clients={clients}
 * />
 *
 * // Without label
 * <ClientSelect
 *   value={selectedClient}
 *   onChange={setSelectedClient}
 *   clients={clients}
 *   showLabel={false}
 * />
 *
 * // Custom label
 * <ClientSelect
 *   value={selectedClient}
 *   onChange={setSelectedClient}
 *   clients={clients}
 *   label="Select Client"
 * />
 * ```
 */
export function ClientSelect({
  value,
  onChange,
  clients,
  showLabel = true,
  label = 'Client Implementation',
  expandToFit = false,
}: ClientSelectProps): JSX.Element {
  const options: SelectMenuOption<string>[] = useMemo(
    () => [
      {
        value: 'all',
        label: 'All Clients',
      },
      ...clients.map(client => ({
        value: client.name,
        label: `${client.name} (${client.count})`,
        icon: <ClientLogo client={client.name} size={20} />,
      })),
    ],
    [clients]
  );

  return (
    <SelectMenu
      value={value}
      onChange={onChange}
      options={options}
      showLabel={showLabel}
      label={label}
      placeholder="Select client"
      expandToFit={expandToFit}
    />
  );
}
