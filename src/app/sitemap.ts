import { getPublishedMagazines } from '@/lib/magazines'
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  
  const magazines = await getPublishedMagazines()
  
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/admin`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]
  
  const magazineRoutes: MetadataRoute.Sitemap = magazines.map((magazine) => ({
    url: `${baseUrl}/dergi/${magazine.issue_number}`,
    lastModified: new Date(magazine.updated_at || magazine.created_at || new Date()),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))
  
  return [...staticRoutes, ...magazineRoutes]
}