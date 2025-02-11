import { useDataFetch } from '../../utils/data'
import { LoadingState } from '../../components/common/LoadingState'
import { ErrorState } from '../../components/common/ErrorState'
import { Link } from 'react-router-dom'
import { XatuCallToAction } from '../../components/xatu/XatuCallToAction'
import { formatDistanceToNow } from 'date-fns'

interface Contributor {
  name: string
  node_count: number
  updated_at: number
}

// Function to generate a deterministic color from a string
const stringToColor = (str: string): string => {
  let hash = 0
  for (let index = 0; index < str.length; index++) {
    hash = str.codePointAt(index) ?? 0 + ((hash << 5) - hash)
  }
  const hue = hash % 360
  return `hsl(${hue}, 70%, 60%)`
}

// Function to generate initials from a string
const getInitials = (name: string): string => name
  .split(/[^\dA-Za-z]/)
  .filter(Boolean)
  .slice(0, 2)
  .map((word) => word[0])
  .join('')
  .toUpperCase()

const ContributorsList = (): JSX.Element => {
  const { data: contributors, loading, error } = useDataFetch<Contributor[]>(
    'xatu-public-contributors/user-summaries/summary.json'
  )

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return <ErrorState message="Failed to load contributors data" />
  }

  return (
    <div className="space-y-8">
      <XatuCallToAction />

      {/* Page Header */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-cyber-neon/20 to-transparent" />
        </div>
        <div className="relative flex justify-center">
          <div className="px-4 bg-cyber-darker">
            <h1 className="text-3xl md:text-4xl font-sans font-black bg-gradient-to-r from-cyber-neon via-cyber-blue to-cyber-pink bg-clip-text text-transparent animate-text-shine">
              Contributors
            </h1>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="backdrop-blur-sm rounded-lg p-6 border border-cyber-neon/10 hover:border-cyber-neon/20 transition-all">
        <p className="text-sm font-mono text-cyber-neon/70">
          These are the amazing contributors who are helping us monitor the Ethereum network.
          All data is anonymized and no personally identifiable information is collected.
        </p>
      </div>

      {/* Contributors Table */}
      <div className="backdrop-blur-sm rounded-lg border border-cyber-neon/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[300px]">
            <thead>
              <tr className="border-b border-cyber-neon/10">
                <th className="text-left py-4 px-6 text-sm font-mono font-medium text-cyber-neon/90 w-[60%]">Contributor</th>
                <th className="text-right py-4 px-6 text-sm font-mono font-medium text-cyber-neon/90 w-[20%]">Nodes</th>
                <th className="text-right py-4 px-6 text-sm font-mono font-medium text-cyber-neon/90 hidden sm:table-cell w-[20%]">Last Update</th>
              </tr>
            </thead>
            <tbody>
              {contributors?.sort((a, b) => b.node_count - a.node_count)
                .map((contributor) => {
                  const avatarColor = stringToColor(contributor.name)
                  const initials = getInitials(contributor.name)
                  return (
                    <tr
                      key={contributor.name}
                      className="border-b border-cyber-neon/10 hover:bg-cyber-neon/5 transition-all"
                    >
                      <td className="py-4 px-6 w-[60%]">
                        <Link
                          to={`/xatu/contributors/${contributor.name}`}
                          className="flex items-center gap-3 hover:opacity-80 transition-all group"
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-mono font-bold text-cyber-darker group-hover:scale-105 transition-transform"
                            style={{ 
                              backgroundColor: avatarColor,
                              boxShadow: `0 0 15px ${avatarColor}33`,
                            }}
                          >
                            {initials}
                          </div>
                          <span className="text-sm font-mono text-cyber-neon/90 truncate">{contributor.name}</span>
                        </Link>
                      </td>
                      <td className="text-right py-4 px-6 text-sm font-mono font-medium text-cyber-neon w-[20%]">
                        {contributor.node_count.toLocaleString()}
                      </td>
                      <td className="text-right py-4 px-6 text-sm font-mono text-cyber-neon/70 hidden sm:table-cell w-[20%]">
                        {formatDistanceToNow(new Date(contributor.updated_at * 1000), { addSuffix: true })}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ContributorsList 