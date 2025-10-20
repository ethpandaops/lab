import { Link } from '@tanstack/react-router';

const dummyContributoors = [
  {
    id: '1',
    name: 'Alice Johnson',
    role: 'Core Developer',
    contributions: 156,
    avatar: '👩‍💻',
  },
  {
    id: '2',
    name: 'Bob Smith',
    role: 'Documentation',
    contributions: 89,
    avatar: '👨‍📝',
  },
  {
    id: '3',
    name: 'Charlie Davis',
    role: 'Community Manager',
    contributions: 234,
    avatar: '👤',
  },
  {
    id: '4',
    name: 'Diana Lee',
    role: 'Designer',
    contributions: 67,
    avatar: '🎨',
  },
];

export function ContributoorsPage(): JSX.Element {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Contributoors</h1>
      <p className="mb-8 text-gray-600">Meet our amazing community of contributors</p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {dummyContributoors.map(contributoor => (
          <Link
            key={contributoor.id}
            to="/contributoor/$id"
            params={{ id: contributoor.id }}
            className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg"
          >
            <div className="mb-4 flex items-center gap-4">
              <div className="text-4xl">{contributoor.avatar}</div>
              <div>
                <h2 className="text-xl font-semibold">{contributoor.name}</h2>
                <p className="text-sm text-gray-500">{contributoor.role}</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">{contributoor.contributions}</span> contributions
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
