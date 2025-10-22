import { type JSX } from 'react';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';

export function IndexPage(): JSX.Element {
  return (
    <Container>
      <Header title="Experiments" description="Explore cutting-edge Ethereum data visualizations and analytics" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/experiments/networks" className="block">
          <Card featureImage={<img src="/images/expirements/networks.png" alt="Networks" />}>
            <div className="flex flex-col gap-3">
              <h3 className="text-lg/7 font-semibold text-foreground">Networks</h3>
            </div>
          </Card>
        </Link>
        <Link to="/experiments/locally-built-blocks" className="block">
          <Card featureImage={<img src="/images/expirements/locally-built-blocks.png" alt="Locally Built Blocks" />}>
            <div className="flex flex-col gap-3">
              <h3 className="text-lg/7 font-semibold text-foreground">Locally Built Blocks</h3>
            </div>
          </Card>
        </Link>
        <Link to="/experiments/slot-view" className="block">
          <Card featureImage={<img src="/images/expirements/slot-view.png" alt="Slot View" />}>
            <div className="flex flex-col gap-3">
              <h3 className="text-lg/7 font-semibold text-foreground">Slot View</h3>
            </div>
          </Card>
        </Link>
        <Link to="/experiments/geographical-checklist" className="block">
          <Card>
            <div className="flex flex-col gap-3">
              <h3 className="text-lg/7 font-semibold text-foreground">Geographical Checklist</h3>
            </div>
          </Card>
        </Link>
        <Link to="/experiments/fork-readiness" className="block">
          <Card featureImage={<img src="/images/expirements/fork-readiness.png" alt="Fork Readiness" />}>
            <div className="flex flex-col gap-3">
              <h3 className="text-lg/7 font-semibold text-foreground">Fork Readiness</h3>
            </div>
          </Card>
        </Link>
        <Link to="/experiments/block-production-flow" className="block">
          <Card featureImage={<img src="/images/expirements/block-production-flow.png" alt="Block Production Flow" />}>
            <div className="flex flex-col gap-3">
              <h3 className="text-lg/7 font-semibold text-foreground">Block Production Flow</h3>
            </div>
          </Card>
        </Link>
      </div>
    </Container>
  );
}
