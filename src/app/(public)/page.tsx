import { HomePage } from '@/components/HomePage'
import { ErrorDisplay } from '@/components/ui/ErrorDisplay'
import { getPublishedMagazines } from '@/lib/magazines'

// Revalidate every hour (ISR)
// Requirements: 10.1
export const revalidate = 3600

export default async function Home() {
  const result = await getPublishedMagazines()

  // Handle error case
  if (!result.success) {
    return <ErrorDisplay message={result.error.userMessage} />
  }

  return <HomePage magazines={result.data} />
}
