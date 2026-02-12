import type { JSX } from 'react';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';

export interface NodeClientInfo {
  cl: string;
  el: string;
}

interface NodeSelectorProps {
  nodes: string[];
  selectedNode: string | null;
  onChange: (node: string | null) => void;
  nodeClientInfo: Map<string, NodeClientInfo>;
}

export function NodeSelector({ nodes, selectedNode, onChange, nodeClientInfo }: NodeSelectorProps): JSX.Element {
  const options = [
    { value: '__all__', label: `All nodes (${nodes.length})` },
    ...nodes.map(node => {
      const info = nodeClientInfo.get(node);
      const shortName = node.split('/').pop() ?? node;
      return {
        value: node,
        label: shortName,
        icon:
          info?.cl || info?.el ? (
            <span className="flex items-center gap-px">
              {info.cl && <ClientLogo client={info.cl} size={12} />}
              {info.el && <ClientLogo client={info.el} size={12} />}
            </span>
          ) : undefined,
      };
    }),
  ];

  return (
    <SelectMenu
      value={selectedNode ?? '__all__'}
      onChange={(value: string) => onChange(value === '__all__' ? null : value)}
      options={options}
      expandToFit
    />
  );
}
