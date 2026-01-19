import { type JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/**
 * Loading skeleton for user detail page
 * Mirrors the structure of the DetailPage component
 */
export function UserDetailsSkeleton(): JSX.Element {
  return (
    <>
      {/* Back link */}
      <LoadingContainer className="mb-6 h-5 w-48 rounded-xs" />

      {/* Profile Header Card */}
      <Card className="mb-6">
        <div className="flex-1 space-y-2">
          <LoadingContainer className="h-9 w-64 rounded-sm" />
          <LoadingContainer className="h-7 w-32 rounded-xs" />
        </div>
      </Card>

      {/* Statistics Grid */}
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <div className="space-y-2">
              <LoadingContainer className="h-4 w-24 rounded-xs" />
              <LoadingContainer className="h-8 w-16 rounded-sm" />
            </div>
          </Card>
        ))}
      </div>

      {/* Consensus Clients Card */}
      <Card className="mb-6">
        <div className="space-y-3">
          <LoadingContainer className="h-4 w-48 rounded-xs" />
          <div className="flex flex-wrap gap-3">
            <LoadingContainer className="size-8 rounded-xs" />
            <LoadingContainer className="size-8 rounded-xs" />
            <LoadingContainer className="size-8 rounded-xs" />
          </div>
        </div>
      </Card>

      {/* All Nodes Table Card */}
      <Card>
        <div className="space-y-4">
          <LoadingContainer className="h-7 w-32 rounded-sm" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <LoadingContainer key={index} className="h-12 w-full rounded-xs" />
            ))}
          </div>
        </div>
      </Card>
    </>
  );
}
