import { type JSX } from 'react';
import {
  CpuChipIcon,
  CircleStackIcon,
  ServerStackIcon,
  CommandLineIcon,
} from '@heroicons/react/24/outline';
import type { FctNodeHostSpec } from '@/api/types.gen';
import { formatBytes } from '../utils';

interface NodeSpecsCardProps {
  spec: FctNodeHostSpec;
}

function SpecGroup({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="mb-1 text-xs/4 font-medium text-muted">{title}</h4>
        <div className="space-y-0.5">{children}</div>
      </div>
    </div>
  );
}

function SpecValue({ label, value }: { label: string; value: string | number | undefined }): JSX.Element | null {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm/5">
      <span className="text-muted">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
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

  const coreBreakdown =
    spec.cpu_performance_cores && spec.cpu_performance_cores > 0
      ? `${spec.cpu_performance_cores}P + ${spec.cpu_efficiency_cores ?? 0}E`
      : undefined;

  return (
    <div className="grid grid-cols-1 gap-5 rounded-sm border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
      <SpecGroup icon={CpuChipIcon} title="CPU">
        {spec.cpu_model && (
          <p className="truncate text-sm/5 font-medium text-foreground" title={spec.cpu_model}>
            {spec.cpu_model}
          </p>
        )}
        <SpecValue label="Cores" value={spec.cpu_online_cores} />
        {coreBreakdown && <SpecValue label="Layout" value={coreBreakdown} />}
        <SpecValue label="Arch" value={spec.architecture} />
      </SpecGroup>

      <SpecGroup icon={ServerStackIcon} title="Memory">
        <SpecValue label="Total" value={spec.memory_total_bytes ? formatBytes(spec.memory_total_bytes, 1) : undefined} />
        <SpecValue label="Type" value={spec.memory_type} />
        {spec.memory_speed_mts !== undefined && spec.memory_speed_mts > 0 && (
          <SpecValue label="Speed" value={`${spec.memory_speed_mts} MT/s`} />
        )}
        <SpecValue label="DIMMs" value={spec.memory_dimm_count} />
      </SpecGroup>

      <SpecGroup icon={CircleStackIcon} title="Disk">
        <SpecValue label="Total" value={spec.disk_total_bytes ? formatBytes(spec.disk_total_bytes, 1) : undefined} />
        <SpecValue label="Type" value={diskType} />
        <SpecValue label="Drives" value={spec.disk_count} />
        {spec.disk_models && spec.disk_models.length > 0 && (
          <p className="truncate text-sm/5 text-muted" title={spec.disk_models[0]}>
            {spec.disk_models[0]}
          </p>
        )}
      </SpecGroup>

      <SpecGroup icon={CommandLineIcon} title="System">
        <SpecValue label="OS" value={spec.os_name} />
        {spec.kernel_release && (
          <p className="truncate text-sm/5 text-muted" title={spec.kernel_release}>
            {spec.kernel_release}
          </p>
        )}
      </SpecGroup>
    </div>
  );
}
