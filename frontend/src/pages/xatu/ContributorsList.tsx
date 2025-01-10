import { useDataFetch } from '../../utils/data'
import { LoadingState } from '../../components/common/LoadingState'
import { ErrorState } from '../../components/common/ErrorState'
import { Link } from 'react-router-dom'

interface Contributor {
  name: string
  node_count: number
}

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
      <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-6 border border-gray-800 shadow-xl">
        <h2 className="text-xl font-semibold text-cyan-400 mb-2">Xatu Contributors</h2>
        <p className="text-gray-300 mb-6">
          These are the amazing contributors who are helping us monitor the Ethereum network.
          All data is anonymized and no personally identifiable information is collected.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-gray-400">Contributor</th>
                <th className="text-right py-3 px-4 text-gray-400">Nodes</th>
              </tr>
            </thead>
            <tbody>
              {contributors?.sort((a, b) => b.node_count - a.node_count)
                .map((contributor) => (
                  <tr
                    key={contributor.name}
                    className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link
                        to={`/experiments/xatu-contributors/contributors/${contributor.name}`}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        {contributor.name}
                      </Link>
                    </td>
                    <td className="text-right py-3 px-4 text-gray-300">
                      {contributor.node_count}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ContributorsList 