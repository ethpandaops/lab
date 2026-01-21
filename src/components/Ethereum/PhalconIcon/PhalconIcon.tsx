/**
 * PhalconIcon component displays the BlockSec Phalcon logo icon
 */
export function PhalconIcon({ className = 'h-5 w-5' }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 32 34" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Phalcon">
      <path d="M8.66446 0.436523L7.268 6.6651L0.728588 20.3794L0 10.8794L8.66446 0.436523Z" fill="currentColor" />
      <path
        d="M9.87513 0.158203L25.154 12.0154L19.3396 24.6189L8.79297 6.72606L9.87513 0.158203Z"
        fill="currentColor"
      />
      <path d="M31.9723 11.2783L29.9865 25.2962L20.7363 24.8676L26.94 12.6105L31.9723 11.2783Z" fill="currentColor" />
      <path d="M7.84448 9.53906L1.70508 21.9069L17.8447 24.8891L7.84448 9.53906Z" fill="currentColor" />
      <path d="M29.7679 26.9174L19.807 26.8066L13.6426 33.1352L29.7679 26.9174Z" fill="currentColor" />
      <path d="M1.51465 23.4189L17.7114 26.4189L9.93267 33.8404L1.51465 23.4189Z" fill="currentColor" />
      <path d="M12.1328 0.158203L26.7474 10.5832L31.5832 9.67607L12.1328 0.158203Z" fill="currentColor" />
    </svg>
  );
}
