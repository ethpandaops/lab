import { Link, useParams } from '@tanstack/react-router';

const dummyContributoors = {
  '1': {
    id: '1',
    name: 'Alice Johnson',
    role: 'Core Developer',
    contributions: 156,
    avatar: '👩‍💻',
    bio: 'Passionate about building scalable systems and mentoring developers.',
    joined: '2023-01-15',
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    recentContributions: [
      { id: 1, title: 'Implemented new authentication system', date: '2024-03-15' },
      { id: 2, title: 'Refactored database layer', date: '2024-03-10' },
      { id: 3, title: 'Added comprehensive testing suite', date: '2024-03-05' },
    ],
  },
  '2': {
    id: '2',
    name: 'Bob Smith',
    role: 'Documentation',
    contributions: 89,
    avatar: '👨‍📝',
    bio: 'Making complex topics accessible through clear, concise documentation.',
    joined: '2023-03-20',
    skills: ['Technical Writing', 'Markdown', 'API Documentation'],
    recentContributions: [
      { id: 1, title: 'Updated API reference guide', date: '2024-03-14' },
      { id: 2, title: 'Created getting started tutorial', date: '2024-03-08' },
      { id: 3, title: 'Improved troubleshooting docs', date: '2024-03-01' },
    ],
  },
  '3': {
    id: '3',
    name: 'Charlie Davis',
    role: 'Community Manager',
    contributions: 234,
    avatar: '👤',
    bio: 'Building vibrant communities and fostering collaboration.',
    joined: '2022-11-10',
    skills: ['Community Building', 'Event Planning', 'Social Media'],
    recentContributions: [
      { id: 1, title: 'Organized monthly community meetup', date: '2024-03-12' },
      { id: 2, title: 'Moderated Q&A session', date: '2024-03-09' },
      { id: 3, title: 'Published community newsletter', date: '2024-03-03' },
    ],
  },
  '4': {
    id: '4',
    name: 'Diana Lee',
    role: 'Designer',
    contributions: 67,
    avatar: '🎨',
    bio: 'Crafting beautiful and intuitive user experiences.',
    joined: '2023-06-05',
    skills: ['UI/UX Design', 'Figma', 'Design Systems', 'Accessibility'],
    recentContributions: [
      { id: 1, title: 'Redesigned dashboard interface', date: '2024-03-11' },
      { id: 2, title: 'Created component library', date: '2024-03-07' },
      { id: 3, title: 'Conducted user research study', date: '2024-03-02' },
    ],
  },
};

export function ContributoorDetailPage(): JSX.Element {
  const { id } = useParams({ from: '/contributoor/$id' });
  const contributoor = dummyContributoors[id as keyof typeof dummyContributoors];

  if (!contributoor) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-4 text-2xl font-bold">Contributoor not found</h1>
        <Link to="/contributoor" className="text-blue-600 hover:underline">
          ← Back to all contributoors
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/contributoor" className="mb-6 inline-block text-blue-600 hover:underline">
        ← Back to all contributoors
      </Link>

      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-8 shadow-lg">
        <div className="mb-6 flex items-start gap-6">
          <div className="text-6xl">{contributoor.avatar}</div>
          <div className="flex-1">
            <h1 className="mb-2 text-3xl font-bold">{contributoor.name}</h1>
            <p className="mb-2 text-lg text-gray-600">{contributoor.role}</p>
            <p className="text-gray-700">{contributoor.bio}</p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 font-semibold text-gray-700">Joined</h3>
            <p className="text-gray-600">{new Date(contributoor.joined).toLocaleDateString()}</p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-gray-700">Total Contributions</h3>
            <p className="text-2xl font-bold text-blue-600">{contributoor.contributions}</p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="mb-3 font-semibold text-gray-700">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {contributoor.skills.map(skill => (
              <span key={skill} className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-semibold text-gray-700">Recent Contributions</h3>
          <div className="space-y-3">
            {contributoor.recentContributions.map(contribution => (
              <div key={contribution.id} className="rounded-sm border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start justify-between">
                  <p className="font-medium text-gray-900">{contribution.title}</p>
                  <span className="text-sm text-gray-500">{new Date(contribution.date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
