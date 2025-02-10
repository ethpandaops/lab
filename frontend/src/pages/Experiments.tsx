import { Link } from 'react-router-dom'
import { Beaker } from 'lucide-react'

interface ExperimentGroup {
  name: string
  description: string
  path: string
  icon?: React.ReactNode
}

const experimentGroups: ExperimentGroup[] = [
  {
    name: 'Xatu Contributors',
    description: 'Explore the Xatu dataset and its contributors',
    path: '/experiments/xatu-contributors',
    icon: <img src="/xatu.png" alt="" className="w-6 h-6 rounded-full bg-white/10 p-0.5" />
  },
]

export const Experiments = () => {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Beaker className="w-6 h-6 text-accent" />
        <h2 className="text-2xl font-bold text-primary">Experiments</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {experimentGroups.map((group) => (
          <Link
            key={group.name}
            to={group.path}
            className="group relative backdrop-blur-md rounded-lg p-6 shadow-xl hover:border-cyan-500/50 transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                {group.icon}
                <h3 className="text-lg font-semibold text-accent">{group.name}</h3>
              </div>
              <p className="text-primary">{group.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
} 