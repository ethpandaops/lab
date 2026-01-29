/**
 * TenderlyIcon component displays the Tenderly logo icon (unicorn)
 */
export function TenderlyIcon({ className = 'h-5 w-5' }: { className?: string }): React.JSX.Element {
  return (
    <svg viewBox="0 0 41 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Tenderly">
      <path
        d="M20.2883 27.6029V40L10.0179 34.3085V24.7052C10.0144 18.1544 7.95523 14.1364 5.35274 11.1659C2.75141 8.19657 0 5.91211 0 5.91211L10.8881 12.1534C13.9955 13.9216 20.2848 19.21 20.2883 27.6041V27.6029Z"
        fill="currentColor"
      />
      <path
        d="M10.8881 12.1534L0 5.91211L10.1424 0L18.5153 4.8438C24.2275 8.1446 28.7705 8.41139 32.6725 7.68378C36.5734 6.95617 40.2939 5.8174 40.2939 5.8174L29.3406 11.9282C26.232 13.6941 18.2082 16.3851 10.8881 12.1545V12.1534Z"
        fill="currentColor"
        opacity="0.5"
      />
      <path
        d="M29.3414 11.9257L40.2946 5.81494V17.4705L31.8578 22.2046C26.1048 25.4361 23.5896 29.192 22.2633 32.8982C20.9371 36.6032 20.2891 39.9998 20.2891 39.9998V27.6028C20.31 24.0537 21.969 16.0673 29.3414 11.9257Z"
        fill="currentColor"
        opacity="0.75"
      />
    </svg>
  );
}
