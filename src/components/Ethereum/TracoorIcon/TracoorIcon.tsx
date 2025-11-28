/**
 * TracoorIcon component displays the Tracoor logo
 */
export function TracoorIcon({ className = 'h-5 w-5' }: { className?: string }): React.JSX.Element {
  return <img src="/images/tracoor-logo.png" alt="Tracoor" className={className} />;
}
