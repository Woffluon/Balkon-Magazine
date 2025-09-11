import { HomePage } from '@/components/HomePage'
import { getPublishedMagazines } from '@/lib/magazines'

export default async function Home() {
  const magazines = await getPublishedMagazines()

  return <HomePage magazines={magazines} />
}
