'use client'

interface ScrollButtonProps {
  children: React.ReactNode
  className?: string
}

export function ScrollButton({ children, className }: ScrollButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    const magazineSection = document.querySelector('[data-magazine-grid]')
    magazineSection?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const magazineSection = document.querySelector('[data-magazine-grid]')
      magazineSection?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={className}
    >
      {children}
    </button>
  )
}
