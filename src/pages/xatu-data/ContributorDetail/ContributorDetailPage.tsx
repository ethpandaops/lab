import { type JSX } from 'react';
import { useParams } from '@tanstack/react-router';

export function ContributorDetailPage(): JSX.Element {
  const { id } = useParams({ from: '/xatu-data/contributors/$id' });

  return (
    <div className="card-primary p-8">
      <h1 className="mb-6 text-3xl font-bold text-primary">Contributor: {id}</h1>
      <p className="text-secondary">TODO: Add contributor detail content for ID: {id}</p>
    </div>
  );
}
