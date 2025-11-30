import { getPublishedMagazines } from '@/lib/magazines'
import { env } from '@/lib/env'
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
  ]
  
  try {
    const magazines = await getPublishedMagazines()
    
    const magazineRoutes: MetadataRoute.Sitemap = magazines.map((magazine) => ({
      url: `${baseUrl}/dergi/${magazine.issue_number}`,
      lastModified: new Date(magazine.updated_at || magazine.created_at || new Date()),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }))
    
    return [...staticRoutes, ...magazineRoutes]
  } catch (error) {
    // If database is unavailable during build, return static routes only
    console.error('Failed to fetch magazines for sitemap:', error)
    return staticRoutes
  }
}