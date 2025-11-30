import { HomePage } from '@/components/HomePage'
import { getPublishedMagazines } from '@/lib/magazines'

// Revalidate every hour (ISR)
// Requirements: 10.1
export const revalidate = 3600

export default async function Home() {
  const magazines = await getPublishedMagazines()

  return <HomePage magazines={magazines} />
}
