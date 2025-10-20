import type { VersionBadgeProps } from './VersionBadge.types';

export function VersionBadge({ version, className = '' }: VersionBadgeProps): JSX.Element {
  return (
    <span
      className={`inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 ${className}`}
    >
      {version}
    </span>
  );
}
