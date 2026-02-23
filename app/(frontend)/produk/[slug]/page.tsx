import { Metadata } from 'next'
import ProductDetailClient from './ProdukDetail'

// Memaksa halaman untuk selalu mengambil data segar dari VPS (Anti 404/Cache)
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
}

// FUNGSI UNTUK SEO & PREVIEW WHATSAPP (SERVER-SIDE)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  
  // GUNAKAN IP VPS LANGSUNG BIAR GAK UNDEFINED DI SERVER-SIDE
  const VPS_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://103.197.189.71:3000'

  try {
    const res = await fetch(`${VPS_URL}/api/vps-db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        // Nama tabel "Product" case-sensitive sesuai database lu
        sql: 'SELECT name, images, price_regular FROM public."Product" WHERE slug = $1 LIMIT 1', 
        params: [slug] 
      }),
      next: { revalidate: 0 } 
    })

    const result = await res.json()
    const product = result.data?.[0]

    if (!product) return { title: 'Product Not Found | HnM Store' }

    // Memastikan path gambar mengarah ke folder uploads VPS
    const imageUrl = product.images?.[0] 
      ? `${VPS_URL}/uploads/${product.images[0]}` 
      : `${VPS_URL}/og-main.jpg`

    return {
      title: `${product.name} | HnM Store`,
      description: `Beli ${product.name} Authentic. Harga Rp ${Number(product.price_regular).toLocaleString('id-ID')}. 100% Original hanya di HnM Store Jepara.`,
      openGraph: {
        title: `${product.name} | HnM Store`,
        description: `Beli ${product.name} Authentic original hanya di HnM Store.`,
        images: [{ url: imageUrl }],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${product.name} | HnM Store`,
        images: [imageUrl],
      }
    }
  } catch (err) {
    console.error("Metadata fetch error:", err)
    return { title: 'HnM Store | Authentic Sneakers' }
  }
}

// HALAMAN UTAMA (SERVER COMPONENT)
export default async function Page({ params }: Props) {
  // Langsung lempar ke Client Component yang lu buat tadi
  return <ProductDetailClient params={params} />
}