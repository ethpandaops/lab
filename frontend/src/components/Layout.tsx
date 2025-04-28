import { useEffect, useState } from 'react'

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const [glitchActive, setGlitchActive] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchActive(true)
      setTimeout(() => setGlitchActive(false), 200)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative min-h-screen bg-black">

      {/* Content */}
      <div className={`relative z-10`}>
        {children}
      </div>
    </div>
  )
} 