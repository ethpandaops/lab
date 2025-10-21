import { type JSX, useCallback } from 'react';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { UserCard } from './components/UserCard';
import { UserCardSkeleton } from './components/UserCardSkeleton';
import { useContributorsData, getDisplayVersion, type Contributor } from './hooks';

export function IndexPage(): JSX.Element {
  const { publicContributors, corporateContributors, internalContributors, totalCount, isLoading, error } =
    useContributorsData();

  // Memoize render function to avoid recreation on every render
  const renderContributorSection = useCallback((title: string, contributors: Contributor[]): JSX.Element | null => {
    if (contributors.length === 0) return null;

    return (
      <div className="mb-12">
        <h2 className="mb-6 text-xl/7 font-semibold text-foreground">{title}</h2>
        <ul role="list" className="md: grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {contributors.map(contributor => (
            <UserCard
              key={contributor.clientName}
              username={contributor.username}
              classification={contributor.classification}
              nodeCount={contributor.nodeCount}
              locationCount={contributor.locations.size}
              lastSeen={contributor.lastSeen}
              primaryCountry={contributor.primaryCountryCode || undefined}
              primaryCity={contributor.primaryCity || undefined}
              clientVersion={getDisplayVersion(contributor.versions)}
              consensusImplementations={Array.from(contributor.consensusImplementations)}
              to={`/contributors/${contributor.username}`}
            />
          ))}
        </ul>
      </div>
    );
  }, []);

  if (isLoading) {
    return (
      <Container>
        <Header title="Contributoors" description="Active node operators in the last 24 hours" />
        <div className="mb-12">
          <h2 className="mb-6 text-xl/7 font-semibold text-foreground">Public Contributors</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <UserCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <div className="rounded-sm border border-danger/20 bg-danger/10 p-4 text-danger">
          Error loading contributors: {error.message}
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <Header title="Contributoors" description={`Active node operators in the last 24 hours (${totalCount})`} />

      {renderContributorSection('Public Contributors', publicContributors)}
      {renderContributorSection('Corporate Contributors', corporateContributors)}
      {renderContributorSection('Internal (ethPandaOps)', internalContributors)}

      {totalCount === 0 && (
        <div className="rounded-sm border border-border bg-surface p-8 text-center text-muted">
          No active contributors found in the last 24 hours.
        </div>
      )}
    </Container>
  );
}
