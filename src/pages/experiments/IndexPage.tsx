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
        <Link to="/ethereum/slot-view" className="block">
          <Card featureImage={<img src="/images/expirements/slot-view.png" alt="Slot View" />}>
            <div className="flex flex-col gap-3">
              <h3 className="text-lg/7 font-semibold text-foreground">Slot View</h3>
            </div>
          </Card>
        </Link>
        <Link to="/xatu/contributors" className="block">
          <Card featureImage={<img src="/images/expirements/contributors.png" alt="Contributors" />}>
            <div className="flex flex-col gap-3">
              <h3 className="text-lg/7 font-semibold text-foreground">Contributors</h3>
            </div>
          </Card>
        </Link>
        <Link to="/xatu/geographical-checklist" className="block">
          <Card
            featureImage={<img src="/images/expirements/geographical-checklist.png" alt="Geographical Checklist" />}
          >
            <div className="flex flex-col gap-3">
              <h3 className="text-lg/7 font-semibold text-foreground">Geographical Checklist</h3>
            </div>
          </Card>
        </Link>
        <Link to="/xatu/locally-built-blocks" className="block">
          <Card featureImage={<img src="/images/expirements/locally-built-blocks.png" alt="Locally Built Blocks" />}>
            <div className="flex flex-col gap-3">
              <h3 className="text-lg/7 font-semibold text-foreground">Locally Built Blocks</h3>
            </div>
          </Card>
        </Link>
        <Link to="/xatu/fork-readiness" className="block">
          <Card featureImage={<img src="/images/expirements/fork-readiness.png" alt="Fork Readiness" />}>
            <div className="flex flex-col gap-3">
              <h3 className="text-lg/7 font-semibold text-foreground">Fork Readiness</h3>
            </div>
          </Card>
        </Link>
      </div>
    </Container>
  );
}
