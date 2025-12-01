import { HomePage } from '@/components/HomePage'
import { getPublishedMagazines } from '@/lib/magazines'

// Revalidate every hour (ISR)
// Requirements: 10.1
export const revalidate = 3600

export default async function Home() {
  const result = await getPublishedMagazines()

  // Handle error case
  if (!result.success) {
    return (
      <main className="w-full min-h-screen bg-[#f9f9f9] pt-4">
        <div className="responsive-container py-6 sm:py-8">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
            <div className="mb-2 text-xl font-semibold text-red-900">
              {result.error.userMessage}
            </div>
            <p className="mb-6 max-w-md text-sm text-red-700">
              Dergi listesi yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Sayfayı Yenile
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return <HomePage magazines={result.data} />
}
