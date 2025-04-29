import { Link } from 'react-router-dom'

export function Logo(): JSX.Element {
  return (
    <Link to="/" className="flex items-center gap-3">
      <img src="/lab.png" alt="Logo" className="h-10 w-10 object-contain" />
      <div className="flex flex-col justify-center">
        <span className="font-sans text-2xl font-black bg-gradient-to-r from-accent via-accent-muted to-accent bg-clip-text text-transparent">The Lab</span>
        <div className="flex flex-col -mt-1 font-mono">
          <span className="text-[12px] text-tertiary">lab.ethpandaops.io</span>
        </div>
      </div>
    </Link>
  )
} 