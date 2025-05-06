import { FC } from 'react';
import { Timestamp } from '@bufbuild/protobuf';

interface ServerTimestampProps {
  timestamp?: Timestamp;
  format?: 'relative' | 'absolute' | 'both';
}

export const ServerTimestamp: FC<ServerTimestampProps> = ({ timestamp, format = 'relative' }) => {
  if (!timestamp) {
    return <span className="text-tertiary">-</span>;
  }

  const date = timestamp.toDate();

  // Format as absolute time
  const absoluteTime = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date);

  // Format as relative time
  const getRelativeTimeStr = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);

    if (diffSec < 5) {
      return 'just now';
    } else if (diffSec < 60) {
      return `${diffSec}s ago`;
    } else if (diffMin < 60) {
      return `${diffMin}m ago`;
    } else if (diffHour < 24) {
      return `${diffHour}h ago`;
    } else if (diffDay < 30) {
      return `${diffDay}d ago`;
    } else {
      return absoluteTime;
    }
  };

  const relativeTime = getRelativeTimeStr(date);

  // Return based on format
  if (format === 'absolute') {
    return <span title={relativeTime}>{absoluteTime}</span>;
  } else if (format === 'relative') {
    return <span title={absoluteTime}>{relativeTime}</span>;
  } else {
    return (
      <span title={absoluteTime}>
        {relativeTime} <span className="text-tertiary">({absoluteTime})</span>
      </span>
    );
  }
};
