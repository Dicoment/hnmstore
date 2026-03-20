'use client'

import { useState, useEffect, useCallback } from 'react'
import { Menu, Search as SearchIcon, ShoppingCart } from 'lucide-react'
import { useRouter } from 'next/navigation'

import GridProduk from './components/gridproduk'
import PanelKeranjang from './components/panelkeranjang'

export default function POSPage() {
  const router = useRouter()
  const [products, setProducts] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [productLimit, setProductLimit] = useState(8)
  const [hasMoreProducts, setHasMoreProducts] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false) 

  const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0)

  const fetchProducts = useCallback(async (currentLimit: number, search: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/vps-db`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: `SELECT p.id, p.name, p.price_regular, p.price_promo, p.images, 
                json_agg(json_build_object('id', pss.id, 'stock', pss.stock, 'sizeId', pss."sizeId", 'Size', json_build_object('value', s.value)) ORDER BY s.value ASC) as "ProductSizeStock" 
                FROM public."Product" p 
                JOIN public."ProductSizeStock" pss ON p.id = pss."productId" 
                JOIN public."Size" s ON s.id = pss."sizeId" 
                WHERE p.name ILIKE $2
                GROUP BY p.id, p.name, p.price_regular, p.price_promo, p.images 
                ORDER BY p.name ASC LIMIT $1`,
          params: [currentLimit + 1, `%${search}%`]
        })
      })
      const result = await res.json()
      if (result.data) {
        setProducts(result.data.length > currentLimit ? result.data.slice(0, currentLimit) : result.data)
        setHasMoreProducts(result.data.length > currentLimit)
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => fetchProducts(productLimit, searchTerm), 300)
    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, productLimit, fetchProducts])

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth > 1024) setIsSidebarOpen(true)
  }, [])

  const addToCart = (product: any, ss: any) => {
    if (ss.stock <= 0) return alert('Stok Habis!')
    const finalPrice = product.price_promo && Number(product.price_promo) > 0 
      ? Number(product.price_regular) - Number(product.price_promo)
      : Number(product.price_regular);

    const existing = cart.find(i => i.stockId === ss.id)
    if (existing) {
      if (existing.quantity >= ss.stock) return alert('Stok Mentok!')
      setCart(cart.map(i => i.stockId === ss.id ? { ...i, quantity: i.quantity + 1 } : i))
    } else {
      setCart([...cart, { 
        productId: product.id, stockId: ss.id, name: product.name, 
        size: ss.Size.value, price: finalPrice, quantity: 1, 
        maxStock: ss.stock, image: product.images?.[0] 
      }])
    }
  }

  const handleProceedToCheckout = () => {
    if (cart.length === 0) return alert("Pilih produk dulu!")
    localStorage.setItem('hnm_temp_cart', JSON.stringify(cart))
    router.push('/admin/pos/checkout')
  }

  return (
    <div className="flex h-screen w-full bg-white text-black overflow-hidden font-sans">
      
      {/* 1. PANEL KERANJANG DI KIRI (RESPONSIVE FIXED) */}
      <aside className={`
        lg:block lg:w-100 transition-all duration-300
        ${isSidebarOpen ? 'lg:flex' : 'lg:hidden'}
      `}>
        <PanelKeranjang 
          cart={cart}
          subtotal={subtotal}
          handleCheckout={handleProceedToCheckout}
          updateQty={(sid, delta) => {
            setCart(prev => prev.map(i => i.stockId === sid ? {...i, quantity: Math.min(i.maxStock, Math.max(1, i.quantity + delta))} : i))
          }}
          removeFromCart={(sid) => setCart(prev => prev.filter(i => i.stockId !== sid))}
          showMobileCart={isSidebarOpen}
          setShowMobileCart={setIsSidebarOpen}
        />
      </aside>

      {/* 2. AREA UTAMA */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50/30">
        <header className="flex items-center gap-2 p-2 lg:px-8 border-b border-gray-100 bg-white sticky top-0 z-10">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 bg-black text-white rounded-xl shadow-lg">
            <Menu size={20}/>
          </button>
          <div className="flex-1 max-w-xl relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="CARI SEPATU..." 
              className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl text-xs font-bold uppercase outline-none border-none" 
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <GridProduk 
            products={products} 
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            addToCart={addToCart} 
            hasMore={hasMoreProducts} 
            onLoadMore={() => setProductLimit(prev => prev + 8)} 
          />
        </div>

        {/* FLOATING CART BUTTON (MOBILE ONLY) */}
        {!isSidebarOpen && cart.length > 0 && (
          <div className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="w-full bg-black text-white p-5 shadow-2xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <ShoppingCart size={20}/>
                <p className="text-sm font-bold tracking-tight">RP {subtotal.toLocaleString()}</p>
              </div>
              <span className="text-xs font-bold bg-white text-black px-2 py-1 rounded-md">{cart.length} ITEM</span>
            </button>
          </div>
        )}
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 10px; }
      `}</style>
    </div>
  )
}