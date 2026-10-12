import { MetadataRoute } from 'next'
import { getSitemapProducts } from '@/lib/shop-server'

// Dibuat saat diminta (bukan saat build), datanya di-cache 1 jam di server
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://hnmstore.id'

  // 1. Ambil data produk langsung dari database
  let products: { slug: string; modified: string | null }[] = []
  try {
    products = await getSitemapProducts()
  } catch (error) {
    console.error("Sitemap fetch error:", error)
  }

  // 2. Daftar halaman statis
  const staticPages = [
    { url: baseUrl, lastModified: new Date() },
    { url: `${baseUrl}/new-arrival`, lastModified: new Date() },
    { url: `${baseUrl}/brands`, lastModified: new Date() },
    { url: `${baseUrl}/kebijakan-retur`, lastModified: new Date() },
  ]

  // 3. Gabungkan dengan halaman dinamis dari database
  const productPages = products.map((product) => ({
    url: `${baseUrl}/produk/${product.slug}`,
    lastModified: new Date(product.modified || Date.now()),
  }))

  return [...staticPages, ...productPages]
}