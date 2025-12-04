import { type JSX, useCallback, useMemo, useState } from 'react';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Alert } from '@/components/Feedback/Alert';
import { Input } from '@/components/Forms/Input';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { UserCard } from './components/UserCard';
import { UserCardSkeleton } from './components/UserCardSkeleton';
import { useContributorsData, getDisplayVersion, type Contributor } from './hooks';

export function IndexPage(): JSX.Element {
  const { publicContributors, corporateContributors, internalContributors, totalCount, isLoading, error } =
    useContributorsData();

  const [searchQuery, setSearchQuery] = useState('');

  // Filter contributors based on search query
  const filteredPublic = useMemo(
    () =>
      searchQuery
        ? publicContributors.filter(c => c.username.toLowerCase().includes(searchQuery.toLowerCase()))
        : publicContributors,
    [publicContributors, searchQuery]
  );

  const filteredCorporate = useMemo(
    () =>
      searchQuery
        ? corporateContributors.filter(c => c.username.toLowerCase().includes(searchQuery.toLowerCase()))
        : corporateContributors,
    [corporateContributors, searchQuery]
  );

  const filteredInternal = useMemo(
    () =>
      searchQuery
        ? internalContributors.filter(c => c.username.toLowerCase().includes(searchQuery.toLowerCase()))
        : internalContributors,
    [internalContributors, searchQuery]
  );

  const filteredCount = filteredPublic.length + filteredCorporate.length + filteredInternal.length;

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
              to={`/xatu/contributors/${contributor.username}`}
            />
          ))}
        </ul>
      </div>
    );
  }, []);

  if (isLoading) {
    return (
      <Container>
        <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          <Header
            title="Contributoors"
            description="Active node operators in the last 24 hours"
            className="lg:flex-1"
          />

          <Alert
            variant="info"
            accentBorder
            icon={null}
            description={
              <div className="flex items-center gap-4">
                <img
                  src="/images/panda-pleading.png"
                  alt="Contributoor Panda"
                  className="hidden h-12 shrink-0 xl:block"
                />
                <p className="flex-1">
                  Help optimize Ethereum! Run{' '}
                  <a
                    href="https://ethpandaops.io/posts/contributoor-beacon-node-companion/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline hover:no-underline"
                  >
                    Contributoor
                  </a>{' '}
                  alongside your beacon node to share valuable network data.{' '}
                  <a
                    href="https://ethpandaops.io/contribute-data/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline hover:no-underline"
                  >
                    Apply to contribute
                  </a>
                  .
                </p>
              </div>
            }
            className="lg:w-[500px] lg:shrink-0 xl:w-[600px]"
          />
        </div>

        <div className="mb-8">
          <div className="h-10 w-full animate-pulse rounded-sm bg-surface" />
        </div>

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
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <Header
          title="Contributoors"
          description={`Active node operators in the last 24 hours (${totalCount})`}
          className="lg:flex-1"
        />

        <Alert
          variant="info"
          accentBorder
          icon={null}
          description={
            <div className="flex items-center gap-4">
              <img
                src="/images/panda-pleading.png"
                alt="Contributoor Panda"
                className="hidden h-12 shrink-0 xl:block"
              />
              <p className="flex-1">
                Help optimize Ethereum! Run{' '}
                <a
                  href="https://ethpandaops.io/posts/contributoor-beacon-node-companion/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline hover:no-underline"
                >
                  Contributoor
                </a>{' '}
                alongside your beacon node to share valuable network data.{' '}
                <a
                  href="https://ethpandaops.io/contribute-data/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline hover:no-underline"
                >
                  Apply to contribute
                </a>
                .
              </p>
            </div>
          }
          className="lg:w-[500px] lg:shrink-0 xl:w-[600px]"
        />
      </div>

      <div className="mb-8">
        <Input size="md">
          <Input.Leading>
            <MagnifyingGlassIcon />
          </Input.Leading>
          <Input.Field
            type="text"
            placeholder="Search contributors..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </Input>
        {searchQuery && (
          <p className="mt-2 text-sm text-muted">
            Showing {filteredCount} of {totalCount} contributors
          </p>
        )}
      </div>

      {renderContributorSection('Public Contributors', filteredPublic)}
      {renderContributorSection('Corporate Contributors', filteredCorporate)}
      {renderContributorSection('Internal (ethPandaOps)', filteredInternal)}

      {searchQuery && filteredCount === 0 && (
        <div className="rounded-sm border border-border bg-surface p-8 text-center text-muted">
          No contributors matching &ldquo;{searchQuery}&rdquo;
        </div>
      )}

      {!searchQuery && totalCount === 0 && (
        <div className="rounded-sm border border-border bg-surface p-8 text-center text-muted">
          No active contributors found in the last 24 hours.
        </div>
      )}
    </Container>
  );
}
