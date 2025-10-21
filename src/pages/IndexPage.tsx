import { type JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { Container } from '@/components/Layout/Container';
import { Card } from '@/components/Layout/Card';
import { BeakerIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { Header } from '@/components/Layout/Header';

export function IndexPage(): JSX.Element {
  return (
    <Container>
      <Header title="Welcome to Lab" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/experiments" className="block">
          <Card>
            <div className="flex flex-col gap-3">
              <BeakerIcon className="size-8 text-primary" />
              <h3 className="text-lg/7 font-semibold text-foreground">Experiments</h3>
              <p className="text-sm/6 text-muted">Explore data visualizations and experiments</p>
            </div>
          </Card>
        </Link>
        <Link to="/contributors" className="block">
          <Card>
            <div className="flex flex-col gap-3">
              <UserGroupIcon className="size-8 text-primary" />
              <h3 className="text-lg/7 font-semibold text-foreground">Contributors</h3>
              <p className="text-sm/6 text-muted">View and analyze contributor data</p>
            </div>
          </Card>
        </Link>
      </div>
    </Container>
  );
}
