import React from 'react'
import type { Magazine } from '@/types/magazine'
import { AnimatedGridSection } from '@/components/AnimatedGridSection'

type Props = {
  magazines: Magazine[]
  title?: string
  showCount?: boolean
}

export const MagazineGrid = React.memo(function MagazineGrid({ 
  magazines, 
  title = 'Tüm Sayılar', 
  showCount = true 
}: Props) {
  return (
    <AnimatedGridSection 
      magazines={magazines} 
      title={title} 
      showCount={showCount} 
    />
  )
})
