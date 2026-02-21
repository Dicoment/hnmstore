import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://hnmstore.id'

  // 1. Ambil data produk dari database VPS lu
  let products = []
  try {
    const res = await fetch(`${baseUrl}/api/vps-db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sql: 'SELECT slug, updated_at FROM public."Product" ORDER BY updated_at DESC' 
      }),
      next: { revalidate: 3600 } // Refresh data tiap 1 jam
    })
    const result = await res.json()
    products = result.data || []
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
  const productPages = products.map((product: any) => ({
    url: `${baseUrl}/produk/${product.slug}`,
    lastModified: new Date(product.updated_at || Date.now()),
  }))

  return [...staticPages, ...productPages]
}