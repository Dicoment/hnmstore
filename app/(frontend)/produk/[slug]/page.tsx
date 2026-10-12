import { Metadata } from 'next'
import ProductDetailClient from './ProdukDetail'
import { getProductMeta } from '@/lib/shop-server'

// Memaksa halaman untuk selalu mengambil data segar dari VPS (Anti 404/Cache)
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ slug: string }>
}

// FUNGSI UNTUK SEO & PREVIEW WHATSAPP (SERVER-SIDE)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  
  const VPS_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://103.197.189.71:3000'

  try {
    // Langsung ke database dari server (tanpa lewat HTTP)
    const product = await getProductMeta(slug)

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