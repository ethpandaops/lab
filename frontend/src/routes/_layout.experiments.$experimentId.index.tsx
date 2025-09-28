import { createFileRoute } from '@tanstack/react-router';
import { BeaconLive } from '@/pages/beacon/live';
import BlockProductionLivePage from '@/pages/beacon/block-production/live';
import { LocallyBuiltBlocks } from '@/pages/beacon/LocallyBuiltBlocks';
import { SlotStatusBar } from '@/components/slot/SlotStatusBar';

export const Route = createFileRoute('/_layout/experiments/$experimentId/')({
  component: ExperimentRouter,
});

interface ExperimentConfig {
  component: React.ComponentType;
  type?: 'slot';
}

const EXPERIMENTS: Record<string, ExperimentConfig> = {
  'live-slots': {
    component: BeaconLive,
    type: 'slot',
  },

  'block-production-flow': {
    component: BlockProductionLivePage,
    type: 'slot',
  },

  'locally-built-blocks': {
    component: LocallyBuiltBlocks,
  },
};

function ExperimentRouter() {
  const { experimentId } = Route.useParams();
  const config = EXPERIMENTS[experimentId];

  if (!config) {
    return (
      <div>
        <div>
          <h2>Experiment Not Found</h2>
          <p>Experiment "{experimentId}" does not exist.</p>
        </div>
      </div>
    );
  }

  if (config.type === 'slot') {
    return <SlotExperiment config={config} />;
  }

  const Component = config.component;
  return <Component />;
}

function SlotExperiment({ config }: { config: ExperimentConfig }) {
  const Component = config.component;

  return (
    <div>
      <SlotStatusBar />
      <div>
        <Component />
      </div>
    </div>
  );
}
