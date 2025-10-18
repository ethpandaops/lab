import { type JSX, type ComponentType, type ReactNode } from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { getExperiment } from './-experiments.config';
import { Standard } from '@/layouts/Standard';
import { Sidebar } from '@/layouts/Sidebar';

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
  const { layout } = experiment;

  // Choose layout based on experiment config
  const LayoutWrapper = getLayoutComponent(layout.type);

  return (
    <LayoutWrapper
      showNavbar={layout.showNavbar}
      showNetworkSelector={layout.showNetworkSelector}
      fullWidth={layout.fullWidth}
      sidebarPosition={layout.sidebarPosition}
    >
      <Component />
    </LayoutWrapper>
  );
}

function NoLayout({ children }: { children: ReactNode }): JSX.Element {
  return <>{children}</>;
}

function getLayoutComponent(type: 'standard' | 'sidebar' | 'none'): ComponentType<{
  children: ReactNode;
  showNavbar?: boolean;
  showNetworkSelector?: boolean;
  fullWidth?: boolean;
  sidebarPosition?: 'left' | 'right';
}> {
  switch (type) {
    case 'standard':
      return Standard;
    case 'sidebar':
      return Sidebar;
    case 'none':
      // Passthrough component - just renders children
      return NoLayout;
    default:
      return Standard;
  }
}
