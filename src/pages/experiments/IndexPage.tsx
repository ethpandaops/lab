import { type JSX } from 'react';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { useIsPageEnabled } from '@/hooks/useIsPageEnabled';

interface ExperimentCard {
  name: string;
  path: string;
  imagePath: string;
}

const experimentCards: ExperimentCard[] = [
  { name: 'Live', path: '/ethereum/live', imagePath: '/images/ethereum/live.png' },
  { name: 'Contributors', path: '/xatu/contributors', imagePath: '/images/expirements/contributors.png' },
  {
    name: 'Geographical Checklist',
    path: '/xatu/geographical-checklist',
    imagePath: '/images/expirements/geographical-checklist.png',
  },
  {
    name: 'Locally Built Blocks',
    path: '/xatu/locally-built-blocks',
    imagePath: '/images/expirements/locally-built-blocks.png',
  },
  { name: 'Fork Readiness', path: '/xatu/fork-readiness', imagePath: '/images/expirements/fork-readiness.png' },
];

export function IndexPage(): JSX.Element {
  return (
    <Container>
      <Header title="Experiments" description="Explore cutting-edge Ethereum data visualizations and analytics" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {experimentCards.map(experiment => (
          <ExperimentCardItem key={experiment.path} experiment={experiment} />
        ))}
      </div>
    </Container>
  );
}

/**
 * Individual experiment card that checks if it should be rendered
 */
function ExperimentCardItem({ experiment }: { experiment: ExperimentCard }): JSX.Element | null {
  const isEnabled = useIsPageEnabled(experiment.path);

  if (!isEnabled) {
    return null;
  }

  return (
    <Link to={experiment.path} className="block">
      <Card featureImage={<img src={experiment.imagePath} alt={experiment.name} />}>
        <div className="flex flex-col gap-3">
          <h3 className="text-lg/7 font-semibold text-foreground">{experiment.name}</h3>
        </div>
      </Card>
    </Link>
  );
}
