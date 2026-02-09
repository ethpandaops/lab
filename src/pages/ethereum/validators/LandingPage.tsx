import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { DocumentTextIcon, BoltIcon } from '@heroicons/react/24/outline';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';

interface ValidatorPageCard {
  name: string;
  description: string;
  path: string;
  icon: typeof DocumentTextIcon;
}

const validatorPages: ValidatorPageCard[] = [
  {
    name: 'Report',
    description:
      'Analyze validator performance including attestation correctness, sync committee participation, and balance history.',
    path: '/ethereum/validators/report',
    icon: DocumentTextIcon,
  },
  {
    name: 'Battle',
    description: 'Compare validators head-to-head across key performance metrics to see how they stack up.',
    path: '/ethereum/validators/battle',
    icon: BoltIcon,
  },
];

/** Landing page for the validators section */
export function LandingPage(): JSX.Element {
  return (
    <Container>
      <Header title="Validators" description="Explore Ethereum validator performance analysis and comparison tools" />

      <div className="grid gap-4 sm:grid-cols-2">
        {validatorPages.map(page => {
          const Icon = page.icon;
          return (
            <Link key={page.path} to={page.path} className="block">
              <Card isInteractive>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Icon className="size-5 text-primary" />
                    <h3 className="text-lg/7 font-semibold text-foreground">{page.name}</h3>
                  </div>
                  <p className="text-sm/5 text-muted">{page.description}</p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </Container>
  );
}
