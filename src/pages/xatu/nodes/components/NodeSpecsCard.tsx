import { type JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import type { FctNodeHostSpec } from '@/api/types.gen';
import { formatBytes } from '../utils';

interface NodeSpecsCardProps {
  spec: FctNodeHostSpec;
}

function SpecRow({ label, value }: { label: string; value: string | number | undefined }): JSX.Element | null {
  if (value === undefined || value === null || value === '') return null;

  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function NodeSpecsCard({ spec }: NodeSpecsCardProps): JSX.Element {
  const diskType =
    spec.disk_rotational && spec.disk_rotational.length > 0
      ? spec.disk_rotational.every(r => r === 0)
        ? 'SSD'
        : spec.disk_rotational.every(r => r === 1)
          ? 'HDD'
          : 'Mixed'
      : undefined;

  return (
    <Card header={<h3 className="text-lg/7 font-semibold text-foreground">Hardware Specs</h3>} rounded>
      <dl className="divide-y divide-border">
        <SpecRow label="CPU Model" value={spec.cpu_model} />
        <SpecRow label="CPU Vendor" value={spec.cpu_vendor} />
        <SpecRow label="Architecture" value={spec.architecture} />
        <SpecRow label="Physical Cores" value={spec.cpu_physical_cores} />
        <SpecRow label="Logical Cores" value={spec.cpu_logical_cores} />
        <SpecRow label="Online Cores" value={spec.cpu_online_cores} />
        {spec.cpu_performance_cores !== undefined && spec.cpu_performance_cores > 0 && (
          <SpecRow label="Performance Cores" value={spec.cpu_performance_cores} />
        )}
        {spec.cpu_efficiency_cores !== undefined && spec.cpu_efficiency_cores > 0 && (
          <SpecRow label="Efficiency Cores" value={spec.cpu_efficiency_cores} />
        )}
        <SpecRow
          label="Total Memory"
          value={spec.memory_total_bytes ? formatBytes(spec.memory_total_bytes, 1) : undefined}
        />
        <SpecRow label="Memory Type" value={spec.memory_type} />
        {spec.memory_speed_mts !== undefined && spec.memory_speed_mts > 0 && (
          <SpecRow label="Memory Speed" value={`${spec.memory_speed_mts} MT/s`} />
        )}
        <SpecRow label="DIMMs" value={spec.memory_dimm_count} />
        <SpecRow label="Total Disk" value={spec.disk_total_bytes ? formatBytes(spec.disk_total_bytes, 1) : undefined} />
        <SpecRow label="Disk Type" value={diskType} />
        <SpecRow label="Disk Count" value={spec.disk_count} />
        {spec.disk_models && spec.disk_models.length > 0 && <SpecRow label="Disk Model" value={spec.disk_models[0]} />}
        <SpecRow label="OS" value={spec.os_name} />
        <SpecRow label="Kernel" value={spec.kernel_release} />
      </dl>
    </Card>
  );
}
