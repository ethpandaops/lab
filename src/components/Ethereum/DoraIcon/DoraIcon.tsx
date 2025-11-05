/**
 * DoraIcon component displays the Dora block explorer logo (3D cube/package icon)
 */
export function DoraIcon({ className = 'h-5 w-5' }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Dora">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M256 6.3l8.5 3.2 232 88 15.5 5.9V120 384v16l-14.8 6.1-232 96L256 506l-9.2-3.8-232-96L0 400V384 120 103.4l15.5-5.9 232-88L256 6.3zM48 368l184 76.1V240.4L48 168.1V368zm232 76.1L464 368V168.1L280 240.4V444.1zM256 57.7l-182 69 182 71.5 182-71.5-182-69z"
        fill="currentColor"
      />
    </svg>
  );
}
