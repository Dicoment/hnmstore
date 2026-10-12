import Image from 'next/image'
import Link from 'next/link'
import PriceTag from './PriceTag'

export type ShopProduct = {
  id: string
  name: string
  slug: string
  price_regular: number | string
  price_promo: number | string | null
  images: string[] | null
  brandName?: string | null
  sizes: string[] | null // daftar ukuran yang stoknya > 0, sudah terurut dari query
}

const MAX_SIZES = 10

export default function ProductCard({ product: p }: { product: ShopProduct }) {
  const sizes = p.sizes ?? []

  return (
    <Link href={`/produk/${p.slug}`} className="group block relative">
      <div className="aspect-4/5 relative rounded-xl overflow-hidden bg-zinc-50 border-2 border-zinc-100 transition-all group-hover:border-black group-hover:shadow-[15px_15px_0px_0px_rgba(0,0,0,0.05)]">
        <Image
          src={p.images?.[0] ? `/uploads/${p.images[0]}` : '/placeholder.png'}
          alt={p.name}
          fill
          className="object-cover transition-all duration-700 group-hover:scale-110"
          unoptimized
        />
        {p.brandName && (
          <div className="absolute top-3 left-3 md:top-4 md:left-4">
            <span className="bg-black text-white text-[7px] md:text-[10px] font-bold px-2 py-1 rounded tracking-widest uppercase shadow-lg">
              {p.brandName}
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-3 px-1 font-bold text-black">
        <h2 className="text-xs md:text-base uppercase tracking-tight truncate group-hover:text-zinc-500 transition-colors">
          {p.name}
        </h2>

        <PriceTag regular={p.price_regular} promo={p.price_promo} />

        <div className="space-y-2 pt-3 border-t-2 border-zinc-50">
          <p className="text-[10px] md:text-[12px] uppercase tracking-widest text-zinc-400">Ready Size</p>
          <div className="flex flex-wrap gap-1">
            {sizes.length === 0 ? (
              <span className="text-[10px] text-red-400 italic">Out of Stock</span>
            ) : (
              sizes.slice(0, MAX_SIZES).map((value) => (
                <span
                  key={value}
                  className="text-[10px] md:text-[12px] bg-white border border-zinc-200 px-1.5 py-1 rounded min-w-7 text-center uppercase"
                >
                  {value}
                </span>
              ))
            )}
            {sizes.length > MAX_SIZES && (
              <span className="text-[10px] text-zinc-400">+{sizes.length - MAX_SIZES}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}