export interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 country code, in either case */
  code?: string | null;
  /** Accessible name, e.g. the country's name; the flag is decorative without one */
  title?: string;
  /** Draw a globe when the code has no flag, instead of nothing */
  showUnknown?: boolean;
  /** Size and shape, replacing the default 18 × 12 px box with slightly rounded corners */
  className?: string;
}
