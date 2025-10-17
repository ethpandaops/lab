import { type JSX } from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { getExperiment } from './-experiments.config';

export const Route = createFileRoute('/experiments/$id')({
  beforeLoad: ({ params }) => {
    const experiment = getExperiment(params.id);

    // If experiment doesn't exist, show 404
    if (!experiment) {
      throw notFound();
    }

    return { experiment };
  },
  component: ExperimentComponent,
});

function ExperimentComponent(): JSX.Element {
  const { experiment } = Route.useRouteContext();
  const Component = experiment.component;

  return <Component />;
}
