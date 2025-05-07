import { useDataFetch } from '@/utils/data.ts';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { Link } from 'react-router-dom';
import { XatuCallToAction } from '@/components/xatu/XatuCallToAction';
import { formatDistanceToNow } from 'date-fns';
import useConfig from '@/contexts/config';
import { Card } from '@/components/common/Card';

interface Contributor {
  name: string;
  node_count: number;
  updated_at: number;
}

interface Summary {
  contributors: Contributor[];
  updated_at: number;
}

// Function to generate a deterministic color from a string
const stringToColor = (str: string): string => {
  let hash = 0;
  for (let index = 0; index < str.length; index++) {
    hash = str.codePointAt(index) ?? 0 + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

// Function to generate initials from a string
const getInitials = (name: string): string =>
  name
    .split(/[^\dA-Za-z]/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();

// Function to safely format a timestamp
const formatTimestamp = (timestamp: number): string => {
  try {
    const date = new Date(timestamp * 1000);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (e) {
    return 'Invalid date';
  }
};

const ContributorsList = (): JSX.Element => {
  const config = useConfig();
  const summaryPath = config?.modules?.['xatu_public_contributors']?.path_prefix
    ? `${config.modules['xatu_public_contributors'].path_prefix}/user-summaries/summary.json`
    : null;

  const { data: summaryData, loading, error } = useDataFetch<Summary>(summaryPath);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message="Failed to load contributors data" />;
  }

  if (!summaryData || !summaryData) {
    return <ErrorState message="No data available" />;
  }

  return (
    <div className="space-y-8">
      <XatuCallToAction />

      {/* About Section */}
      <Card className="card-primary">
        <div className="card-body">
          <div className="flex flex-col">
            <h2 className="text-xl font-sans font-bold text-primary mb-2">About</h2>
            <p className="text-base font-mono text-secondary">
              These are the amazing contributors who are helping us monitor the Ethereum network.
              All data is anonymized and no personally identifiable information is collected.
            </p>
            <div className="text-sm font-mono text-tertiary mt-4">
              Last updated{' '}
              <span
                title={new Date(summaryData.updated_at * 1000).toString()}
                className="text-primary cursor-help -b -prominent"
              >
                {formatTimestamp(summaryData.updated_at)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Contributors List */}
      <Card className="card-primary">
        <div className="card-header">
          <div className="flex flex-col">
            <h2 className="text-xl font-sans font-bold text-primary mb-2">Contributors</h2>
            <p className="text-base font-mono text-secondary">
              {summaryData.contributors.length} active contributors across all networks
            </p>
          </div>
        </div>
        <div className="card-body">
          <div className="overflow-x-auto -mx-2">
            <table className="w-full min-w-[300px]">
              <thead>
                <tr className="-b -subtle">
                  <th className="text-left py-2 px-2 text-sm font-mono text-tertiary w-[60%]">
                    Contributor
                  </th>
                  <th className="text-right py-2 px-2 text-sm font-mono text-tertiary w-[20%]">
                    Nodes
                  </th>
                  <th className="text-right py-2 px-2 text-sm font-mono text-tertiary hidden sm:table-cell w-[20%]">
                    Last Update
                  </th>
                </tr>
              </thead>
              <tbody>
                {summaryData.contributors
                  .sort((a, b) => b.node_count - a.node_count)
                  .map(contributor => {
                    const avatarColor = stringToColor(contributor.name);
                    const initials = getInitials(contributor.name);
                    return (
                      <tr
                        key={contributor.name}
                        className="-b -subtle hover:bg-hover transition-colors"
                      >
                        <td className="py-2 px-2 w-[60%]">
                          <Link
                            to={`/xatu/contributors/${contributor.name}`}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                          >
                            <div
                              className="w-6 h-6 flex items-center justify-center text-xs font-mono font-bold text-base shadow-neon transition-transform hover:scale-105"
                              style={{
                                backgroundColor: avatarColor,
                                boxShadow: `0 0 10px ${avatarColor}05`,
                              }}
                            >
                              {initials}
                            </div>
                            <span className="text-sm font-mono text-primary truncate">
                              {contributor.name}
                            </span>
                          </Link>
                        </td>
                        <td className="text-right py-2 px-2 text-sm font-mono text-primary w-[20%]">
                          {contributor.node_count}
                        </td>
                        <td className="text-right py-2 px-2 text-sm font-mono text-tertiary hidden sm:table-cell w-[20%]">
                          {formatTimestamp(contributor.updated_at)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ContributorsList;
