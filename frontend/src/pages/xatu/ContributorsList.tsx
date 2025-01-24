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
    <div className="space-y-4">
      <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-4 border border-gray-800 shadow-xl">
        <h2 className="text-xl font-semibold text-cyan-400 mb-2">Xatu Contributors</h2>
        <p className="text-gray-300 text-sm">
          These are the amazing contributors who are helping us monitor the Ethereum network.
          All data is anonymized and no personally identifiable information is collected.
        </p>
      </div>

      <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-4 border border-gray-800 shadow-xl">
        <div className="overflow-x-auto -mx-2">
          <table className="w-full min-w-[300px]">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-2 px-2 text-gray-400 text-sm w-[60%]">Contributor</th>
                <th className="text-right py-2 px-2 text-gray-400 text-sm w-[20%]">Nodes</th>
                <th className="text-right py-2 px-2 text-gray-400 text-sm hidden sm:table-cell w-[20%]">Last Update</th>
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
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="py-2 px-2 w-[60%]">
                        <Link
                          to={`/xatu/contributors/${contributor.name}`}
                          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          <div
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                            style={{ 
                              backgroundColor: avatarColor,
                              boxShadow: `0 0 10px ${avatarColor}33`,
                            }}
                          >
                            {initials}
                          </div>
                          <span className="text-sm truncate">{contributor.name}</span>
                        </Link>
                      </td>
                      <td className="text-right py-2 px-2 text-gray-300 text-sm w-[20%]">
                        {contributor.node_count}
                      </td>
                      <td className="text-right py-2 px-2 text-gray-300 text-sm hidden sm:table-cell w-[20%]">
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