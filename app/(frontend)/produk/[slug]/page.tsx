import { Metadata } from 'next'
import ProductDetailClient from './ProdukDetail'

type Props = {
  params: Promise<{ slug: string }>
}

// FUNGSI UNTUK SEO (JALAN DI SERVER)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  
  // GUNAKAN IP VPS LANGSUNG BIAR GAK UNDEFINED
  const VPS_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://103.197.189.71:3000'

  try {
    const res = await fetch(`${VPS_URL}/api/vps-db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sql: 'SELECT name, images, price_regular FROM public."Product" WHERE slug = $1 LIMIT 1', 
        params: [slug] 
      }),
      next: { revalidate: 3600 } // Cache metadata 1 jam
    })

    const result = await res.json()
    const product = result.data?.[0]

    if (!product) return { title: 'Product Not Found | HnM Store' }

    const imageUrl = product.images?.[0] 
      ? `${VPS_URL}/uploads/${product.images[0]}` 
      : `${VPS_URL}/og-main.jpg`

    return {
      title: product.name,
      description: `Beli ${product.name} Authentic. Harga Rp ${product.price_regular.toLocaleString('id-ID')}. 100% Original hanya di HnM Store Jepara.`,
      openGraph: {
        title: `${product.name} | HnM Store`,
        images: [{ url: imageUrl }],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        images: [imageUrl],
      }
    }
  } catch (err) {
    return { title: 'HnM Store | Authentic Sneakers' }
  }
}

// HALAMAN UTAMA (SERVER COMPONENT)
export default async function Page({ params }: Props) {
  // Langsung lempar ke Client Component buat tampilannya
  return <ProductDetailClient params={params} />
}