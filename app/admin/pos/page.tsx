'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, 
  CheckCircle2, Loader2, Printer, X,
  RefreshCcw, Camera, AlertCircle, LayoutGrid
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

export default function POSPage() {
  const [products, setProducts] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [cart, setCart] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const [customerName, setCustomerName] = useState('')
  const [discount, setDiscount] = useState(0)
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastTransaction, setLastTransaction] = useState<any>(null)

  const [transactions, setTransactions] = useState<any[]>([])
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [returnReason, setReturnReason] = useState('')
  const [returnFile, setReturnFile] = useState<File | null>(null)
  const [isReturning, setIsReturning] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const total = Math.max(0, subtotal - discount)

  useEffect(() => {
    fetchProducts()
    fetchRecentTransactions()
  }, [])

  async function fetchRecentTransactions() {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const res = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({
          sql: `SELECT * FROM public."Transactions" WHERE status = 'SUCCESS' AND created_at >= $1 ORDER BY created_at DESC`,
          params: [today.toISOString()]
        })
      })
      const result = await res.json()
      if (result.data) setTransactions(result.data)
    } catch (err) { console.error(err) }
  }

  async function fetchProducts() {
    try {
      setLoading(true)
      const sql = `
        SELECT p.id, p.name, p.price_regular, p.images,
        json_agg(json_build_object(
          'id', pss.id, 'stock', pss.stock, 'sizeId', pss."sizeId",
          'Size', json_build_object('value', s.value)
        ) ORDER BY s.value ASC) as "ProductSizeStock"
        FROM public."Product" p
        JOIN public."ProductSizeStock" pss ON p.id = pss."productId"
        JOIN public."Size" s ON s.id = pss."sizeId"
        GROUP BY p.id ORDER BY p.name ASC
      `
      const res = await fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql }) })
      const result = await res.json()
      if (result.data) setProducts(result.data)
    } finally { setLoading(false) }
  }

  async function handleCheckout() {
    if (cart.length === 0) return
    setIsProcessing(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const adminEmail = localStorage.getItem('user_email') || user?.email || 'Kasir'

      for (const item of cart) {
        const checkRes = await fetch('/api/vps-db', {
          method: 'POST',
          body: JSON.stringify({ sql: `SELECT stock FROM public."ProductSizeStock" WHERE id = $1`, params: [item.stockId] })
        })
        const currentStock = (await checkRes.json()).data?.[0]?.stock || 0

        await fetch('/api/vps-db', {
          method: 'POST',
          body: JSON.stringify({
            sql: `UPDATE public."ProductSizeStock" SET stock = stock - $1 WHERE id = $2`,
            params: [item.quantity, item.stockId]
          })
        })

        await fetch('/api/vps-db', {
          method: 'POST',
          body: JSON.stringify({
            sql: `INSERT INTO public."StockLog" (product_name, size_value, old_stock, new_stock, type, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            params: [item.name, item.size, currentStock, currentStock - item.quantity, 'TERJUAL', `Kasir: ${adminEmail}`, user?.id]
          })
        })
      }

      const txRes = await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({
          sql: `INSERT INTO public."Transactions" (customer, subtotal, discount, total, items, items_count, created_by, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          params: [customerName || 'UMUM', subtotal, discount, total, JSON.stringify(cart), cart.length, user?.id, 'SUCCESS']
        })
      })
      const txData = await txRes.json()
      setLastTransaction({ ...txData.data[0], date: new Date().toLocaleString('id-ID') })
      setShowReceipt(true); setCart([]); setCustomerName(''); setDiscount(0);
      fetchProducts(); fetchRecentTransactions()
    } catch (err: any) { alert(err.message) } finally { setIsProcessing(false) }
  }

  async function handleProcessReturn() {
    if (!selectedTx || !returnReason) return alert('Alasan wajib diisi!')
    setIsReturning(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const adminEmail = localStorage.getItem('user_email') || user?.email || 'Admin'

      for (const item of selectedTx.items) {
        const checkRes = await fetch('/api/vps-db', {
          method: 'POST',
          body: JSON.stringify({ sql: `SELECT stock FROM public."ProductSizeStock" WHERE id = $1`, params: [item.stockId] })
        })
        const currentStock = (await checkRes.json()).data?.[0]?.stock || 0

        await fetch('/api/vps-db', {
          method: 'POST',
          body: JSON.stringify({ sql: `UPDATE public."ProductSizeStock" SET stock = stock + $1 WHERE id = $2`, params: [item.quantity, item.stockId] })
        })

        await fetch('/api/vps-db', {
          method: 'POST',
          body: JSON.stringify({
            sql: `INSERT INTO public."StockLog" (product_name, size_value, old_stock, new_stock, type, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            params: [item.name, item.size, currentStock, currentStock + item.quantity, 'RETUR', `Retur: ${returnReason} (Oleh: ${adminEmail})`, user?.id]
          })
        })
      }

      await fetch('/api/vps-db', {
        method: 'POST',
        body: JSON.stringify({ sql: `UPDATE public."Transactions" SET status = 'RETURNED' WHERE id = $1`, params: [selectedTx.id] })
      })

      alert('Retur Sukses!'); setShowReturnModal(false); fetchProducts(); fetchRecentTransactions()
    } finally { setIsReturning(false) }
  }

  const addToCart = (product: any, ss: any) => {
    if (ss.stock <= 0) return alert('Stok Habis!')
    const ex = cart.find(i => i.stockId === ss.id)
    if (ex) {
      if (ex.quantity >= ss.stock) return alert('Stok Mentok!')
      setCart(cart.map(i => i.stockId === ss.id ? { ...i, quantity: i.quantity + 1 } : i))
    } else {
      setCart([...cart, { productId: product.id, stockId: ss.id, name: product.name, size: ss.Size.value, price: product.price_regular, quantity: 1, maxStock: ss.stock }])
    }
  }

  const updateQty = (sid: string, d: number) => {
    setCart(cart.map(i => (i.stockId === sid && i.quantity + d > 0 && i.quantity + d <= i.maxStock) ? { ...i, quantity: i.quantity + d } : i))
  }

  const handlePrint = () => {
    const content = document.getElementById('printable-receipt-pos')?.innerHTML;
    const win = window.open('', '_blank', 'width=450,height=700');
    if (win && content) {
      win.document.write(`<html><body style="font-family:monospace;padding:10mm;text-transform:uppercase;">${content}</body></html>`);
      win.document.close(); win.focus(); win.print(); win.close();
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white">
      <Loader2 className="animate-spin text-black" size={40} />
      <p className="text-[10px] font-black uppercase tracking-widest mt-4">Loading POS System...</p>
    </div>
  )

  return (
    <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen gap-4 p-3 md:p-5 bg-white text-black font-sans overflow-x-hidden">
      
      {/* 1. KATALOG SECTION */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden order-2 lg:order-1">
        {/* Search & Action Header */}
        <div className="border-2 border-gray-100 rounded-xl p-3 md:p-4 flex flex-col sm:flex-row justify-between items-center bg-white shadow-sm gap-3">
          <div className="relative w-full sm:flex-1 sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="CARI SEPATU..." 
              className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-xl text-[10px] md:text-xs font-black uppercase outline-none focus:ring-2 focus:ring-black border-none" 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <Link href="/admin/pos/laporan-shift" className="w-full sm:w-auto text-center text-[10px] font-black uppercase border-2 border-black px-6 py-3 rounded-xl hover:bg-black hover:text-white transition-all">
            LAPORAN SHIFT
          </Link>
        </div>

        {/* Product Grid */}
        <div className="flex-1 lg:overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 custom-scrollbar pb-20 lg:pb-4">
          {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
            <div key={product.id} className="border-2 border-gray-100 rounded-xl p-2 md:p-3 flex flex-col gap-2 md:gap-3 hover:border-black transition-all bg-white group shadow-sm">
              <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
                <Image 
                  src={product.images?.[0] || '/placeholder.png'} 
                  alt={product.name} 
                  fill 
                  className="object-cover group-hover:scale-110 transition-transform duration-500" 
                  unoptimized 
                />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-[9px] md:text-[10px] font-black uppercase truncate text-black">{product.name}</h3>
                <p className="text-xs font-bold text-gray-500 tracking-tighter">RP {product.price_regular.toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-1 mt-auto">
                {product.ProductSizeStock?.map((ss: any) => (
                  <button 
                    key={ss.id} 
                    disabled={ss.stock <= 0} 
                    onClick={() => addToCart(product, ss)} 
                    className={`relative py-1.5 md:py-2 rounded-lg border-2 transition-all flex flex-col items-center ${ss.stock > 0 ? (ss.stock <= 3 ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-50 bg-gray-50 hover:border-black hover:bg-white') : 'bg-gray-50 text-gray-300 opacity-40 cursor-not-allowed'}`}
                  >
                    <span className="text-[9px] md:text-[10px] font-black uppercase">SZ {ss.Size.value}</span>
                    <span className="text-[7px] md:text-[8px] font-bold opacity-60">S: {ss.stock}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Transactions Horizontal Scroll */}
        <div className="shrink-0 h-36 md:h-40 border-2 border-gray-100 rounded-xl p-3 md:p-4 flex flex-col bg-white overflow-hidden shadow-sm">
          <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 md:mb-3 flex items-center gap-2">
            <RefreshCcw size={14}/> TRANSAKSI HARI INI
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
            {transactions.map(tx => (
              <div key={tx.id} className="min-w-45 md:min-w-50 border-2 border-gray-100 p-3 rounded-xl flex flex-col justify-between hover:border-red-500 transition-all bg-white group">
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-tight truncate text-black">#{tx.id.slice(0,10)} - {tx.customer}</p>
                <button 
                  onClick={() => { setSelectedTx(tx); setShowReturnModal(true); }} 
                  className="mt-2 w-full border-2 border-red-500 text-red-500 py-1.5 rounded-lg text-[8px] md:text-[9px] font-black uppercase hover:bg-red-500 hover:text-white transition-all"
                >
                  RETUR
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. SIDEBAR CHECKOUT SECTION */}
      <div className="w-full lg:w-96 flex flex-col border-2 border-gray-100 rounded-xl bg-white shadow-2xl overflow-hidden order-1 lg:order-2 h-fit lg:h-full">
        <div className="p-4 md:p-5 border-b-2 border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xs md:text-sm font-black uppercase tracking-widest flex items-center gap-3"><ShoppingCart size={20} /> CHECKOUT</h2>
          <span className="bg-black text-white px-2.5 py-1 rounded-lg text-xs font-black">{cart.length}</span>
        </div>
        
        <div className="p-3 md:p-4 space-y-2 md:space-y-3 border-b-2 border-gray-100">
          <input type="text" placeholder="NAMA PELANGGAN..." value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-black rounded-xl text-[10px] md:text-xs font-black uppercase outline-none transition-all" />
          <input type="number" placeholder="DISKON (RP)..." value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value))} className="w-full p-3 bg-gray-50 border-2 border-transparent focus:border-black rounded-xl text-[10px] md:text-xs font-black uppercase outline-none transition-all" />
        </div>

        <div className="flex-1 min-h-37 lg:min-h-0 overflow-y-auto p-3 md:p-4 space-y-2 custom-scrollbar">
          {cart.length === 0 ? ( 
            <div className="h-full flex flex-col items-center justify-center opacity-5 py-10"><ShoppingCart size={60} /></div> 
          ) : cart.map(item => (
            <div key={item.stockId} className="flex gap-3 bg-white p-2 md:p-3 rounded-xl border-2 border-gray-50 items-center">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] md:text-[10px] font-black uppercase truncate text-black">{item.name}</p>
                <p className="text-[8px] md:text-[9px] font-bold text-gray-400 mt-0.5 uppercase">SZ {item.size} • RP {item.price.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <button onClick={() => updateQty(item.stockId, -1)} className="p-1 md:p-1.5 bg-gray-50 rounded-lg hover:bg-black hover:text-white transition-all text-black"><Minus size={10}/></button>
                <span className="text-[10px] md:text-xs font-black w-4 text-center text-black">{item.quantity}</span>
                <button onClick={() => updateQty(item.stockId, 1)} className="p-1 md:p-1.5 bg-gray-50 rounded-lg hover:bg-black hover:text-white transition-all text-black"><Plus size={10}/></button>
                <button onClick={() => setCart(cart.filter(i => i.stockId !== item.stockId))} className="text-red-400 p-1.5"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 md:p-5 border-t-2 border-gray-100 bg-white space-y-3 md:space-y-4">
          <div className="flex justify-between items-center text-black">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Total Bayar</span>
            <span className="text-2xl md:text-3xl font-black tracking-tighter uppercase">RP {total.toLocaleString()}</span>
          </div>
          <button 
            disabled={cart.length === 0 || isProcessing} 
            onClick={handleCheckout} 
            className="w-full bg-black text-white py-4 md:py-5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 disabled:bg-gray-200 transition-all flex items-center justify-center gap-3"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} BAYAR & CETAK
          </button>
        </div>
      </div>

      {/* 3. MODAL RETUR */}
      {showReturnModal && selectedTx && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-md my-auto shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden border border-gray-100 text-black">
            <div className="p-5 md:p-6 border-b-4 border-red-600 bg-white flex justify-between items-center">
              <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter flex items-center gap-3 text-red-600"><RefreshCcw size={22} strokeWidth={3} /> RETUR</h2>
              <button onClick={() => setShowReturnModal(false)} className="text-gray-400 hover:text-red-600 transition-all"><X size={24} strokeWidth={3}/></button>
            </div>
            <div className="p-5 md:p-8 space-y-5 md:space-y-6">
              <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-100 space-y-2">
                {selectedTx.items.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between text-[10px] md:text-[11px] font-bold uppercase">
                    <span className="text-zinc-500">{it.name} <span className="text-red-600 ml-1">SZ{it.size}</span></span>
                    <span className="bg-zinc-100 px-2 py-0.5 rounded text-black font-black">X{it.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-black">ALASAN</label>
                  <textarea placeholder="TULIS ALASAN..." className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-black rounded-xl text-xs font-black uppercase outline-none h-24 resize-none transition-all" onChange={(e) => setReturnReason(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-black">FOTO BUKTI</label>
                  <div className="relative group overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl h-32 md:h-40 flex flex-col items-center justify-center gap-2 transition-all hover:border-black">
                    {returnFile ? (
                      <div className="absolute inset-0">
                        <img src={URL.createObjectURL(returnFile)} className="w-full h-full object-cover" />
                        <button onClick={() => setReturnFile(null)} className="absolute top-2 right-2 bg-black text-white p-1.5 rounded-lg"><X size={14} /></button>
                      </div>
                    ) : (
                      <>
                        <Camera size={24} className="text-gray-400" />
                        <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">AMBIL FOTO</span>
                        <input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setReturnFile(e.target.files?.[0] || null)} />
                      </>
                    )}
                  </div>
                </div>
                <button disabled={isReturning || !returnReason} onClick={handleProcessReturn} className="w-full bg-red-600 text-white py-4 md:py-5 rounded-xl font-black text-xs md:text-sm uppercase tracking-[0.2em] shadow-xl active:scale-95 disabled:bg-gray-100 transition-all flex items-center justify-center gap-3">
                  {isReturning ? <Loader2 className="animate-spin" size={20} /> : <AlertCircle size={20} />} KONFIRMASI
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL RECEIPT */}
      {showReceipt && lastTransaction && (
        <div className="fixed inset-0 z-150 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 text-black overflow-y-auto">
          <div className="bg-white rounded-xl p-6 md:p-8 w-full max-w-sm my-auto shadow-2xl animate-in zoom-in-95 duration-300">
            <div id="printable-receipt-pos" className="bg-white p-5 font-mono text-black border-2 border-dashed border-gray-200 rounded-xl leading-tight text-[10px] uppercase">
              <div className="text-center border-b-2 border-dashed border-gray-200 pb-4 mb-5">
                <div className="text-xl font-black tracking-tighter uppercase">HnM Store</div>
                <div className="text-[8px] mt-1 opacity-50 tracking-widest">TX: #{lastTransaction.id.slice(0, 10)}</div>
              </div>
              <div className="space-y-1 mb-5 font-bold text-[9px]">
                <div className="flex justify-between"><span>CUST:</span><span>{lastTransaction.customer}</span></div>
                <div className="flex justify-between"><span>DATE:</span><span>{lastTransaction.date}</span></div>
              </div>
              <div className="space-y-3 border-b-2 border-dashed border-gray-200 pb-5 mb-5">
                {lastTransaction.items.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between font-bold">
                    <span className="max-w-30 truncate">{it.name} SZ{it.size} x{it.quantity}</span>
                    <span>RP {(it.price * it.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1 font-black uppercase">
                <div className="flex justify-between opacity-40 text-[9px]"><span>SUBTOTAL</span><span>RP {lastTransaction.subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-red-600 text-[9px]"><span>DISCOUNT</span><span>-RP {lastTransaction.discount.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm pt-3 border-t-2 border-black mt-2 tracking-tighter"><span>TOTAL</span><span>RP {lastTransaction.total.toLocaleString()}</span></div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 mt-6">
              <button onClick={handlePrint} className="flex items-center justify-center gap-3 bg-black text-white py-4 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-zinc-800 active:scale-95 transition-all"><Printer size={18} /> CETAK STRUK</button>
              <button onClick={() => setShowReceipt(false)} className="w-full py-2 text-[9px] font-black text-gray-400 uppercase text-center hover:text-black transition-colors tracking-widest">TUTUP</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 10px; }
        input[type="number"]::-webkit-inner-spin-button, input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        @media print {
          body * { visibility: hidden; }
          #printable-receipt-pos, #printable-receipt-pos * { visibility: visible; }
          #printable-receipt-pos { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  )
}