import type { JSX } from 'react';
import { CheckCircleIcon, CheckIcon } from '@heroicons/react/20/solid';
import { Link } from '@tanstack/react-router';
import type { ProgressStepsProps, ProgressStep } from './ProgressSteps.types';

function classNames(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

function SimpleVariant({ steps }: { steps: ProgressStep[] }): JSX.Element {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="space-y-4 md:flex md:space-y-0 md:space-x-8">
        {steps.map(step => (
          <li key={step.name} className="md:flex-1">
            {step.status === 'complete' ? (
              <Link
                to={step.to || '#'}
                className="group flex flex-col border-l-4 border-primary py-2 pl-4 hover:border-primary/80 md:border-t-4 md:border-l-0 md:pt-4 md:pb-0 md:pl-0"
              >
                <span className="text-sm/6 font-medium text-primary group-hover:text-primary/80">{step.id}</span>
                <span className="text-sm/6 font-medium text-foreground">{step.name}</span>
              </Link>
            ) : step.status === 'current' ? (
              <Link
                to={step.to || '#'}
                aria-current="step"
                className="flex flex-col border-l-4 border-primary py-2 pl-4 md:border-t-4 md:border-l-0 md:pt-4 md:pb-0 md:pl-0"
              >
                <span className="text-sm/6 font-medium text-primary">{step.id}</span>
                <span className="text-sm/6 font-medium text-foreground">{step.name}</span>
              </Link>
            ) : (
              <Link
                to={step.to || '#'}
                className="group flex flex-col border-l-4 border-border py-2 pl-4 hover:border-muted md:border-t-4 md:border-l-0 md:pt-4 md:pb-0 md:pl-0"
              >
                <span className="text-sm/6 font-medium text-muted group-hover:text-foreground/70">{step.id}</span>
                <span className="text-sm/6 font-medium text-foreground">{step.name}</span>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function PanelsVariant({ steps }: { steps: ProgressStep[] }): JSX.Element {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="divide-y divide-border rounded-md border border-border md:flex md:divide-y-0">
        {steps.map((step, stepIdx) => (
          <li key={step.name} className="relative md:flex md:flex-1">
            {step.status === 'complete' ? (
              <Link to={step.to || '#'} className="group flex w-full items-center">
                <span className="flex items-center px-6 py-4 text-sm/6 font-medium">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary group-hover:bg-primary/80">
                    <CheckIcon aria-hidden="true" className="size-6 text-white" />
                  </span>
                  <span className="ml-4 text-sm/6 font-medium text-foreground">{step.name}</span>
                </span>
              </Link>
            ) : step.status === 'current' ? (
              <Link
                to={step.to || '#'}
                aria-current="step"
                className="flex items-center px-6 py-4 text-sm/6 font-medium"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-primary">
                  <span className="text-primary">{step.id}</span>
                </span>
                <span className="ml-4 text-sm/6 font-medium text-primary">{step.name}</span>
              </Link>
            ) : (
              <Link to={step.to || '#'} className="group flex items-center">
                <span className="flex items-center px-6 py-4 text-sm/6 font-medium">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-border group-hover:border-muted">
                    <span className="text-muted group-hover:text-foreground">{step.id}</span>
                  </span>
                  <span className="ml-4 text-sm/6 font-medium text-muted group-hover:text-foreground">{step.name}</span>
                </span>
              </Link>
            )}

            {stepIdx !== steps.length - 1 ? (
              <div aria-hidden="true" className="absolute top-0 right-0 hidden h-full w-5 md:block">
                <svg fill="none" viewBox="0 0 22 80" preserveAspectRatio="none" className="size-full text-border">
                  <path
                    d="M0 -2L20 40L0 82"
                    stroke="currentcolor"
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function BulletsVariant({ steps }: { steps: ProgressStep[] }): JSX.Element {
  return (
    <nav aria-label="Progress" className="flex items-center justify-center">
      <p className="text-sm font-medium text-foreground">
        Step {steps.findIndex(step => step.status === 'current') + 1} of {steps.length}
      </p>
      <ol role="list" className="ml-8 flex items-center space-x-5">
        {steps.map(step => (
          <li key={step.name}>
            {step.status === 'complete' ? (
              <Link to={step.to || '#'} className="block size-2.5 rounded-full bg-primary hover:bg-primary/80">
                <span className="sr-only">{step.name}</span>
              </Link>
            ) : step.status === 'current' ? (
              <Link to={step.to || '#'} aria-current="step" className="relative flex items-center justify-center">
                <span aria-hidden="true" className="absolute flex size-5 p-px">
                  <span className="size-full rounded-full bg-primary/20" />
                </span>
                <span aria-hidden="true" className="relative block size-2.5 rounded-full bg-primary" />
                <span className="sr-only">{step.name}</span>
              </Link>
            ) : (
              <Link to={step.to || '#'} className="block size-2.5 rounded-full bg-border hover:bg-muted">
                <span className="sr-only">{step.name}</span>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function CirclesVariant({ steps }: { steps: ProgressStep[] }): JSX.Element {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li key={step.name} className={classNames(stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : '', 'relative')}>
            {step.status === 'complete' ? (
              <>
                <div aria-hidden="true" className="absolute inset-0 flex items-center">
                  <div className="h-0.5 w-full bg-primary" />
                </div>
                <Link
                  to={step.to || '#'}
                  className="relative flex size-8 items-center justify-center rounded-full bg-primary transition-transform hover:scale-110"
                >
                  <CheckIcon aria-hidden="true" className="size-5 text-white" />
                  <span className="sr-only">{step.name}</span>
                </Link>
              </>
            ) : step.status === 'current' ? (
              <>
                <div aria-hidden="true" className="absolute inset-0 flex items-center">
                  <div className="h-0.5 w-full bg-border" />
                </div>
                <Link
                  to={step.to || '#'}
                  aria-current="step"
                  className="relative flex size-8 items-center justify-center rounded-full border-2 border-primary bg-background"
                >
                  <span aria-hidden="true" className="size-2.5 rounded-full bg-primary" />
                  <span className="sr-only">{step.name}</span>
                </Link>
              </>
            ) : (
              <>
                <div aria-hidden="true" className="absolute inset-0 flex items-center">
                  <div className="h-0.5 w-full bg-border" />
                </div>
                <Link
                  to={step.to || '#'}
                  className="group relative flex size-8 items-center justify-center rounded-full border-2 border-border bg-background hover:border-muted"
                >
                  <span aria-hidden="true" className="size-2.5 rounded-full bg-transparent group-hover:bg-border" />
                  <span className="sr-only">{step.name}</span>
                </Link>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function BulletsTextVariant({ steps }: { steps: ProgressStep[] }): JSX.Element {
  return (
    <nav aria-label="Progress" className="flex justify-center">
      <ol role="list" className="space-y-6">
        {steps.map(step => (
          <li key={step.name}>
            {step.status === 'complete' ? (
              <Link to={step.to || '#'} className="group">
                <span className="flex items-start">
                  <span className="relative flex size-5 shrink-0 items-center justify-center">
                    <CheckCircleIcon
                      aria-hidden="true"
                      className="size-full text-primary group-hover:text-primary/80"
                    />
                  </span>
                  <span className="ml-3 text-sm/6 font-medium text-muted group-hover:text-foreground">{step.name}</span>
                </span>
              </Link>
            ) : step.status === 'current' ? (
              <Link to={step.to || '#'} aria-current="step" className="flex items-start">
                <span aria-hidden="true" className="relative flex size-5 shrink-0 items-center justify-center">
                  <span className="absolute size-4 rounded-full bg-primary/20" />
                  <span className="relative block size-2 rounded-full bg-primary" />
                </span>
                <span className="ml-3 text-sm/6 font-medium text-primary">{step.name}</span>
              </Link>
            ) : (
              <Link to={step.to || '#'} className="group">
                <div className="flex items-start">
                  <div aria-hidden="true" className="relative flex size-5 shrink-0 items-center justify-center">
                    <div className="size-2 rounded-full bg-border group-hover:bg-muted" />
                  </div>
                  <p className="ml-3 text-sm/6 font-medium text-muted group-hover:text-foreground">{step.name}</p>
                </div>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function CirclesTextVariant({ steps }: { steps: ProgressStep[] }): JSX.Element {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="overflow-hidden">
        {steps.map((step, stepIdx) => (
          <li key={step.name} className={classNames(stepIdx !== steps.length - 1 ? 'pb-10' : '', 'relative')}>
            {step.status === 'complete' ? (
              <>
                {stepIdx !== steps.length - 1 ? (
                  <div aria-hidden="true" className="absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-primary" />
                ) : null}
                <Link to={step.to || '#'} className="group relative flex items-start">
                  <span className="flex h-9 items-center">
                    <span className="relative z-10 flex size-8 items-center justify-center rounded-full bg-primary transition-transform group-hover:scale-110">
                      <CheckIcon aria-hidden="true" className="size-5 text-white" />
                    </span>
                  </span>
                  <span className="ml-4 flex min-w-0 flex-col">
                    <span className="text-sm/6 font-medium text-foreground">{step.name}</span>
                    <span className="text-sm/6 text-muted">{step.description}</span>
                  </span>
                </Link>
              </>
            ) : step.status === 'current' ? (
              <>
                {stepIdx !== steps.length - 1 ? (
                  <div aria-hidden="true" className="absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-border" />
                ) : null}
                <Link to={step.to || '#'} aria-current="step" className="group relative flex items-start">
                  <span aria-hidden="true" className="flex h-9 items-center">
                    <span className="relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-primary bg-background">
                      <span className="size-2.5 rounded-full bg-primary" />
                    </span>
                  </span>
                  <span className="ml-4 flex min-w-0 flex-col">
                    <span className="text-sm/6 font-medium text-primary">{step.name}</span>
                    <span className="text-sm/6 text-muted">{step.description}</span>
                  </span>
                </Link>
              </>
            ) : (
              <>
                {stepIdx !== steps.length - 1 ? (
                  <div aria-hidden="true" className="absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-border" />
                ) : null}
                <Link to={step.to || '#'} className="group relative flex items-start">
                  <span aria-hidden="true" className="flex h-9 items-center">
                    <span className="relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-border bg-background group-hover:border-muted">
                      <span className="size-2.5 rounded-full bg-transparent group-hover:bg-border" />
                    </span>
                  </span>
                  <span className="ml-4 flex min-w-0 flex-col">
                    <span className="text-sm/6 font-medium text-muted">{step.name}</span>
                    <span className="text-sm/6 text-muted">{step.description}</span>
                  </span>
                </Link>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ProgressSteps({
  variant,
  steps,
  ariaLabel: _ariaLabel = 'Progress',
}: ProgressStepsProps): JSX.Element | null {
  if (!steps || steps.length === 0) {
    console.warn('ProgressSteps: steps array is required');
    return null;
  }

  switch (variant) {
    case 'simple':
      return <SimpleVariant steps={steps} />;
    case 'panels':
      return <PanelsVariant steps={steps} />;
    case 'bullets':
      return <BulletsVariant steps={steps} />;
    case 'circles':
      return <CirclesVariant steps={steps} />;
    case 'bullets-text':
      return <BulletsTextVariant steps={steps} />;
    case 'circles-text':
      return <CirclesTextVariant steps={steps} />;
    default:
      return <SimpleVariant steps={steps} />;
  }
}
