import type { JSX } from 'react';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Alert } from '@/components/Feedback/Alert';
import { Disclosure } from '@/components/Layout/Disclosure';
import { useForkReadiness } from './hooks';
import { ForkSection, ForkReadinessLoading } from './components';

export function IndexPage(): JSX.Element {
  const { upcomingForks, pastForks, isLoading, error } = useForkReadiness();

  if (isLoading) {
    return (
      <Container>
        <Header title="Fork Readiness" description="Track node readiness for upcoming Ethereum consensus layer forks" />
        <ForkReadinessLoading />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header title="Fork Readiness" />
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
      <Header title="Fork Readiness" description="Track node readiness for upcoming Ethereum consensus layer forks" />

      <div className="space-y-4">
        {upcomingForks.length > 0 ? (
          <Disclosure title={`Upcoming Forks (${upcomingForks.length})`} defaultOpen>
            <div className="space-y-8">
              {upcomingForks.map(fork => (
                <ForkSection key={fork.forkName} fork={fork} />
              ))}
            </div>
          </Disclosure>
        ) : (
          <Alert
            variant="info"
            title="No upcoming forks"
            description="There are no upcoming forks configured at this time."
          />
        )}

        {pastForks.map(fork => (
          <Disclosure
            key={fork.forkName}
            title={`Past: ${fork.forkName.charAt(0).toUpperCase()}${fork.forkName.slice(1)}`}
          >
            <ForkSection fork={fork} />
          </Disclosure>
        ))}
      </div>
    </Container>
  );
}
