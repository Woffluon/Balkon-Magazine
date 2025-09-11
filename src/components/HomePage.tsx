import { Hero } from '@/components/Hero'
import { MagazineGrid } from '@/components/MagazineGrid'
import type { Magazine } from '@/types/magazine'

type HomePageProps = {
  magazines: Magazine[]
}

export function HomePage({ magazines }: HomePageProps) {
  return (
    <main className="w-full min-h-screen">
      <div className="responsive-container py-6 sm:py-8 lg:py-10">
        {/* Hero Section */}
        <Hero />

        {/* Magazine Grid Section */}
        <div className="mt-24 sm:mt-36 lg:mt-48 xl:mt-56 pb-8 sm:pb-12 lg:pb-16">
          <MagazineGrid magazines={magazines} />
        </div>
      </div>
    </main>
  )
}