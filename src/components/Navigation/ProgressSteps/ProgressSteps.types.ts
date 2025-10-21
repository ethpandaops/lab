export type ProgressStepStatus = 'complete' | 'current' | 'upcoming';

export interface ProgressStep {
  /** Unique identifier for the step */
  id?: string;
  /** Display name of the step */
  name: string;
  /** Optional route path for the step (if clickable) */
  to?: string;
  /** Current status of the step */
  status: ProgressStepStatus;
  /** Optional description for variants that support it */
  description?: string;
}

export type ProgressStepsVariant = 'simple' | 'panels' | 'bullets' | 'circles' | 'bullets-text' | 'circles-text';

export interface ProgressStepsProps {
  /** The variant style to render */
  variant: ProgressStepsVariant;
  /** Steps to display */
  steps: ProgressStep[];
  /** Optional aria-label for the navigation */
  ariaLabel?: string;
}
