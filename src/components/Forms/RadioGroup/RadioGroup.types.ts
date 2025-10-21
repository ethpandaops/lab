export type RadioGroupVariant =
  | 'simple-list'
  | 'simple-inline'
  | 'description-list'
  | 'inline-description-list'
  | 'right-radio-list'
  | 'simple-right-radio-list'
  | 'table'
  | 'panel'
  | 'picker'
  | 'cards'
  | 'small-cards'
  | 'stacked-cards';

export interface RadioGroupOption {
  id: string;
  name: string;
  title?: string;
  description?: string;
  value?: string;
  disabled?: boolean;
  classes?: string; // For picker variant (e.g., 'bg-pink-500 checked:outline-pink-500')
  extraInfo?: string; // For table/stacked-cards variants (e.g., pricing)
  additionalInfo?: string; // For table/stacked-cards variants (e.g., limits)
}

export interface RadioGroupProps {
  name: string;
  options: RadioGroupOption[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  variant?: RadioGroupVariant;
  legend?: string;
  description?: string;
  'aria-label'?: string;
  disabled?: boolean;
  className?: string;
}
