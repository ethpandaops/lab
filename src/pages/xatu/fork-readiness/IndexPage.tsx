import type { JSX } from 'react';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Alert } from '@/components/Feedback/Alert';
import { Disclosure } from '@/components/Layout/Disclosure';
import { useForkReadiness } from './hooks';
import { ForkSection, ForkReadinessLoading } from './components';

const DESCRIPTION =
  'Consensus client versions of Xatu nodes seen in the last 24h, against each fork’s minimum versions';

export function IndexPage(): JSX.Element {
  const { upcomingForks, isLoading, error } = useForkReadiness();

  if (isLoading) {
    return (
      <Container>
        <Header title="Fork Readiness" description={DESCRIPTION} />
        <ForkReadinessLoading />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header title="Fork Readiness" description={DESCRIPTION} />
        <Alert
          variant="error"
          title="Failed to load fork readiness data"
          description={error.message ?? 'Unable to fetch data'}
        />
      </Container>
    );
  }

  return (
    <Container>
      <Header title="Fork Readiness" description={DESCRIPTION} />

      <div className="space-y-4">
        {upcomingForks.length > 0 ? (
          <Disclosure title="Upcoming forks" defaultOpen>
            <div className="space-y-8">
              {upcomingForks.map(fork => (
                <ForkSection key={fork.forkName} fork={fork} />
              ))}
            </div>
          </Disclosure>
        ) : (
          <Alert variant="info" title="No upcoming forks" />
        )}
      </div>
    </Container>
  );
}
