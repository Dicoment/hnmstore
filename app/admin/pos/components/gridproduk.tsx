'use client'
import Image from 'next/image'
import { Search, PlusCircle } from 'lucide-react'

// UPDATE INTERFACE INI BIAR GAK ERROR 2322
interface GridProdukProps {
  products: any[];
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  addToCart: (product: any, ss: any) => void;
  hasMore: boolean;     // <--- Tambahin ini
  onLoadMore: () => void; // <--- Tambahin ini
}

export default function GridProduk({ 
  products, 
  searchTerm, 
  setSearchTerm, 
  addToCart,
  hasMore,     // <--- Terima props-nya di sini
  onLoadMore   // <--- Terima props-nya di sini
}: GridProdukProps) {
  
  return (
    <div className="flex flex-col gap-6">
      

      {/* Grid List */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 text-black">
        {products.filter(p => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
          <div key={product.id} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-4 bg-white shadow-sm hover:border-black transition-all">
            <div className="aspect-square relative rounded-xl overflow-hidden bg-gray-50">
              <Image 
                src={product.images?.[0] ? `/uploads/${product.images[0]}` : '/placeholder.png'} 
                alt={product.name} 
                fill 
                className="object-cover" 
                unoptimized 
              />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold uppercase truncate">{product.name}</h3>
              <p className="text-xs font-bold text-red-600">RP {Number(product.price_regular).toLocaleString()}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-auto">
              {product.ProductSizeStock?.map((ss: any) => (
                <button 
                  key={ss.id} 
                  disabled={ss.stock <= 0}
                  onClick={() => addToCart(product, ss)} 
                  className={`py-2 rounded-lg border text-[10px] font-bold uppercase transition-all ${
                    ss.stock > 0 ? 'border-gray-100 hover:bg-black hover:text-white' : 'opacity-30'
                  }`}
                >
                  {ss.Size?.value} (S:{ss.stock})
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* --- TOMBOL LOAD MORE PRODUK --- */}
      {hasMore && (
        <div className="flex justify-center mt-8 pb-10">
          <button 
            onClick={onLoadMore}
            className="flex items-center gap-3 bg-white border-2 border-black text-black px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-xl active:scale-95"
          >
            <PlusCircle size={18} /> Lihat Produk Lainnya
          </button>
        </div>
      )}
    </div>
  )
}