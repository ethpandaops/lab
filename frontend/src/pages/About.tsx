import { Github, ExternalLink } from 'lucide-react';

export const About = () => {
  return (
    <div className="space-y-12">
      {/* The Lab Section */}
      <section className="mb-16">
        <h2 className="text-2xl font-sans font-bold text-primary mb-6">The Lab</h2>
        <div className="space-y-4">
          <p className="text-base font-mono text-secondary">
            The Lab is an experimental platform that provides insights into Ethereum. Here we
            present data and visualizations that we've collected. All of our data is public and open
            source.
          </p>
        </div>
      </section>

      {/* ethPandaOps Section */}
      <section>
        <h2 className="text-2xl font-sans font-bold text-primary mb-6">ethPandaOps</h2>
        <div className="space-y-6">
          <p className="text-base font-mono text-secondary">
            Check out our main website for more information:
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="https://ethpandaops.io"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center px-6 py-3 font-mono text-primary backdrop-blur-sm  -subtle hover:-prominent hover:bg-hover  transition-all duration-300"
            >
              <ExternalLink className="h-5 w-5 mr-2 text-tertiary group-hover:text-primary transition-colors" />
              Visit ethPandaOps
            </a>
            <a
              href="https://github.com/ethpandaops"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center px-6 py-3 font-mono text-primary backdrop-blur-sm  -subtle hover:-prominent hover:bg-hover  transition-all duration-300"
            >
              <Github className="h-5 w-5 mr-2 text-tertiary group-hover:text-primary transition-colors" />
              View Our Projects
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
