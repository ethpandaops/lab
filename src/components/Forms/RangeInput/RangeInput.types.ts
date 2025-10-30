export interface RangeInputProps {
  /**
   * The unique identifier for the input
   */
  id: string;

  /**
   * The label text displayed above the slider
   */
  label: string;

  /**
   * The current value of the slider
   */
  value: number;

  /**
   * Minimum value for the slider
   * @default 0
   */
  min?: number;

  /**
   * Maximum value for the slider
   * @default 100
   */
  max?: number;

  /**
   * Step increment for the slider
   * @default 1
   */
  step?: number;

  /**
   * Optional suffix to display after the value (e.g., "%", "ms")
   */
  suffix?: string;

  /**
   * Callback fired when the value changes
   */
  onChange: (value: number) => void;

  /**
   * Optional CSS class name for the container
   */
  className?: string;
}
