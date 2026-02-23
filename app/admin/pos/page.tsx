'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, 
  CheckCircle2, Loader2, Printer, X,
  RefreshCcw, Camera, AlertCircle, ArrowLeft, ChevronUp
} from 'lucide-react'

export const dynamic = 'force-dynamic'

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

  const [showMobileCart, setShowMobileCart] = useState(false)

  const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0)
  const total = Math.max(0, subtotal - (discount || 0))

  const fetchRecentTransactions = useCallback(async () => {
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const res = await fetch(`/api/vps-db?t=${Date.now()}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: `SELECT * FROM public."Transactions" WHERE status = 'SUCCESS' AND created_at >= $1 ORDER BY created_at DESC`,
          params: [today.toISOString()]
        })
      })
      const result = await res.json()
      if (result.data) setTransactions(result.data)
    } catch (err) { console.error(err) }
  }, [])

  const fetchProducts = useCallback(async () => {
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
      const res = await fetch(`/api/vps-db?t=${Date.now()}`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql }) 
      })
      const result = await res.json()
      if (result.data) setProducts(result.data)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchProducts()
    fetchRecentTransactions()
  }, [fetchProducts, fetchRecentTransactions])

  // --- LOGIC ASLI LU (TETAP SAMA) ---
  async function handleCheckout() {
    if (cart.length === 0) return;
    setIsProcessing(true);
    try {
      const adminId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
      for (const item of cart) {
        const checkRes = await fetch('/api/vps-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: `SELECT stock FROM public."ProductSizeStock" WHERE id = $1`, params: [item.stockId] })
        });
        const checkData = await checkRes.json();
        const currentStock = checkData.data?.[0]?.stock || 0;

        await fetch('/api/vps-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sql: `UPDATE public."ProductSizeStock" SET stock = stock - $1 WHERE id = $2`,
            params: [item.quantity, item.stockId]
          })
        });

        await fetch('/api/vps-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sql: `INSERT INTO public."StockLog" (product_name, size_value, old_stock, new_stock, type, created_by) VALUES ($1, $2, $3, $4, $5, $6)`,
            params: [item.name, item.size, currentStock, currentStock - item.quantity, 'TERJUAL', adminId]
          })
        });
      }

      const txRes = await fetch('/api/vps-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: `INSERT INTO public."Transactions" (customer, subtotal, discount, total, items, items_count, created_by, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          params: [customerName || 'PELANGGAN UMUM', subtotal, discount, total, JSON.stringify(cart), cart.length, adminId, 'SUCCESS']
        })
      });
      
      const txResult = await txRes.json();
      if (txResult.data && txResult.data.length > 0) {
        const dataBaru = txResult.data[0];
        setLastTransaction({ ...dataBaru, date: new Date().toLocaleString('id-ID') });
        setShowReceipt(true); 
        setCart([]); setCustomerName(''); setDiscount(0);
        setTimeout(() => { fetchRecentTransactions(); fetchProducts(); }, 500);
        await fetch('/api/revalidate?secret=tri_rahasia_123');
      }
    } catch (err: any) { alert("Gagal Checkout: " + err.message); } finally { setIsProcessing(false); }
  }

  async function handleProcessReturn() {
    if (!selectedTx || !returnReason) return alert('Alasan wajib diisi!');
    setIsReturning(true);
    try {
      const adminId = typeof window !== 'undefined' ? localStorage.getItem('user_id') : null;
      let finalProofUrl = null;
      if (returnFile) {
        const formData = new FormData();
        formData.append('file', returnFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (uploadData.url) finalProofUrl = uploadData.url;
      }
      let itemsToReturn = [];
      try { itemsToReturn = Array.isArray(selectedTx.items) ? selectedTx.items : JSON.parse(selectedTx.items || '[]'); } catch (e) { return alert("Data tidak valid."); }
      for (const item of itemsToReturn) {
        const checkRes = await fetch('/api/vps-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: `SELECT stock FROM public."ProductSizeStock" WHERE id = $1`, params: [item.stockId] })
        });
        const checkData = await checkRes.json();
        const currentStock = checkData.data?.[0]?.stock || 0;
        await fetch('/api/vps-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql: `UPDATE public."ProductSizeStock" SET stock = stock + $1 WHERE id = $2`, params: [item.quantity, item.stockId] })
        });
        await fetch('/api/vps-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sql: `INSERT INTO public."StockLog" (product_name, size_value, old_stock, new_stock, type, notes, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            params: [item.name, item.size, currentStock, currentStock + item.quantity, 'RETUR', returnReason, adminId]
          })
        });
      }
      await fetch('/api/vps-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sql: `UPDATE public."Transactions" SET status = 'RETURNED', return_reason = $1, return_proof_url = $2 WHERE id = $3`, 
          params: [returnReason, finalProofUrl, selectedTx.id] 
        })
      });
      await fetch('/api/revalidate?secret=tri_rahasia_123');
      alert('Retur Berhasil!');
      setShowReturnModal(false); setReturnReason(''); setReturnFile(null);
      fetchProducts(); fetchRecentTransactions();
    } catch (err: any) { alert("Gagal Retur: " + err.message); } finally { setIsReturning(false); }
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
      win.document.write(`
        <html>
          <head>
            <title>HNM STORE RECEIPT</title>
            <style>
              @media print { @page { size: 80mm auto; margin: 0; } body { margin: 0; padding: 5mm; width: 70mm; } }
              body { font-family: monospace; font-size: 13px; line-height: 1.2; text-transform: uppercase; color: black; background: white; }
              table { width: 100%; border-collapse: collapse; }
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .font-bold { font-weight: bold; }
              .border-dash { border-top: 1px dashed black; margin: 8px 0; }
              .py-1 { padding: 4px 0; }
            </style>
          </head>
          <body onload="window.print(); window.close();">${content}</body>
        </html>
      `);
      win.document.close();
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-white text-black text-xs font-bold uppercase tracking-widest"><Loader2 className="animate-spin mr-3" size={24} /> Syncing...</div>

  return (
    <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen bg-white text-black font-sans overflow-x-hidden">
      
      <div className="flex-1 flex flex-col gap-3 p-2 lg:p-10 overflow-hidden order-2 lg:order-1">
        <div className="border border-gray-100 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-center bg-white shadow-sm gap-4">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="CARI SEPATU..." className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-xl text-xs font-bold uppercase outline-none focus:ring-1 focus:ring-black border-none" onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Link href="/admin/pos/laporan-shift" className="w-full sm:w-auto text-center text-xs font-bold uppercase border border-black px-8 py-4 rounded-xl hover:bg-black hover:text-white transition-all tracking-widest">LAPORAN SHIFT</Link>
        </div>

        <div className="flex-1 lg:overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-6 pb-24 lg:pb-4 text-black">
          {products.filter(p => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
            <div key={product.id} className="border border-gray-100 rounded-2xl p-4 flex flex-col gap-4 hover:border-black transition-all bg-white shadow-sm">
              <div className="aspect-square relative rounded-xl overflow-hidden bg-gray-50">
                <Image src={product.images?.[0] ? `/uploads/${product.images[0]}` : '/placeholder.png'} alt={product.name} fill className="object-cover" unoptimized />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold uppercase truncate">{product.name}</h3>
                <p className="text-xs font-bold text-gray-400 uppercase mt-1">RP {(product.price_regular || 0).toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-auto">
                {product.ProductSizeStock?.map((ss: any) => (
                  <button key={ss.id} disabled={ss.stock <= 0} onClick={() => addToCart(product, ss)} className={`py-3 rounded-xl border text-center transition-all ${ss.stock > 0 ? 'border-gray-100 bg-gray-50 hover:bg-black hover:text-white' : 'opacity-30 cursor-not-allowed bg-gray-50'}`}>
                    <span className="text-xs font-bold uppercase block text-black">SZ {ss.Size?.value}</span>
                    <span className="text-xs font-bold opacity-50 text-black">S: {ss.stock}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 h-48 border border-gray-100 rounded-2xl p-8 flex flex-col bg-white overflow-hidden shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><RefreshCcw size={14}/> TRANSAKSI HARI INI</p>
          <div className="flex gap-4 overflow-x-auto pb-4 text-black custom-scrollbar">
            {transactions.length === 0 ? <p className="text-xs font-bold text-gray-300 uppercase py-6">BELUM ADA TRANSAKSI</p> : transactions.map(tx => (
              <div key={tx.id} className="min-w-64 border border-gray-100 p-5 rounded-xl flex flex-col justify-between hover:border-red-500 transition-all bg-white shadow-sm">
                <p className="text-xs font-bold uppercase truncate">#{tx.id?.slice(0,8)} - {tx.customer}</p>
                <button onClick={() => { setSelectedTx(tx); setShowReturnModal(true); }} className="mt-4 w-full border border-red-500 text-red-500 py-3 rounded-lg text-xs font-bold uppercase hover:bg-red-500 hover:text-white transition-all">RETUR</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`fixed inset-x-0 bottom-0 z-40 bg-white border-t border-gray-100 transition-transform duration-500 lg:static lg:w-100 lg:h-full lg:border-l lg:border-t-0 lg:translate-y-0 ${showMobileCart ? 'translate-y-0 h-[85vh]' : 'translate-y-full lg:translate-y-0'}`}>
        <div className="flex flex-col h-full text-black">
          <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50 lg:rounded-none rounded-t-3xl">
            <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-3"><ShoppingCart size={24} /> CHECKOUT</h2>
            <button onClick={() => setShowMobileCart(false)} className="lg:hidden p-3 bg-black text-white rounded-full shadow-lg"><X size={20}/></button>
            <span className="hidden lg:block bg-black text-white px-4 py-1 rounded-xl text-xs font-bold">{cart.length}</span>
          </div>
          <div className="p-8 space-y-4 border-b border-gray-100">
            <input type="text" placeholder="NAMA PELANGGAN..." value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl text-xs font-bold uppercase outline-none focus:ring-1 focus:ring-black border-none" />
            <input type="number" placeholder="DISKON (RP)..." value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value))} className="w-full p-4 bg-gray-50 rounded-xl text-xs font-bold uppercase outline-none focus:ring-1 focus:ring-black border-none" />
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-4 text-black custom-scrollbar">
            {cart.length === 0 ? <div className="h-full flex flex-col items-center justify-center opacity-5 py-24"><ShoppingCart size={100} /></div> : cart.map(item => (
              <div key={item.stockId} className="flex gap-4 bg-white p-5 rounded-2xl border border-gray-50 items-center shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold uppercase truncate">{item.name}</p>
                  <p className="text-xs font-bold text-gray-400 mt-1 uppercase">SZ {item.size} • RP {item.price?.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-4 text-black">
                  <button onClick={() => updateQty(item.stockId, -1)} className="p-2.5 bg-gray-100 rounded-xl hover:bg-black hover:text-white transition-all"><Minus size={14}/></button>
                  <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(item.stockId, 1)} className="p-2.5 bg-gray-100 rounded-xl hover:bg-black hover:text-white transition-all"><Plus size={14}/></button>
                  <button onClick={() => setCart(cart.filter(i => i.stockId !== item.stockId))} className="text-red-400 p-2 ml-2"><Trash2 size={20}/></button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-10 border-t border-gray-100 bg-white space-y-6 pb-12 lg:pb-10">
            <div className="flex justify-between items-center text-black">
              <span className="text-xs font-bold uppercase text-gray-400 tracking-widest">Total Bayar</span>
              <span className="text-3xl font-bold tracking-tighter">RP {(total || 0).toLocaleString()}</span>
            </div>
            <button disabled={cart.length === 0 || isProcessing} onClick={handleCheckout} className="w-full bg-black text-white py-6 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl active:scale-95 disabled:bg-gray-200 transition-all flex items-center justify-center gap-4">
              {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />} BAYAR & CETAK
            </button>
          </div>
        </div>
      </div>

      {!showMobileCart && cart.length > 0 && (
        <div className="fixed bottom-10 inset-x-10 z-30 lg:hidden animate-in slide-in-from-bottom-10">
          <button onClick={() => setShowMobileCart(true)} className="w-full bg-black text-white p-6 rounded-2xl flex items-center justify-between shadow-2xl active:scale-95 transition-all">
            <div className="flex items-center gap-4">
              <div className="relative">
                <ShoppingCart size={24} />
                <span className="absolute -top-3 -right-3 bg-red-600 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-black">{cart.length}</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">Keranjang</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold tracking-tight">RP {total.toLocaleString()}</span>
              <ChevronUp size={24} />
            </div>
          </button>
        </div>
      )}

      {showReturnModal && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md my-auto shadow-2xl overflow-hidden border border-gray-100 text-black">
            <div className="p-8 border-b-2 border-red-600 bg-white flex justify-between items-center">
              <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3 text-red-600"><RefreshCcw size={26} /> RETUR</h2>
              <button onClick={() => setShowReturnModal(false)} className="text-gray-400 hover:text-red-600 transition-all"><X size={28}/></button>
            </div>
            <div className="p-10 space-y-8">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-3">
                {(() => {
                  let items = []; try { items = Array.isArray(selectedTx.items) ? selectedTx.items : JSON.parse(selectedTx.items || '[]') } catch(e) { items = [] }
                  return items.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs font-bold uppercase">
                      <span className="text-gray-400">{it.name} <span className="text-red-600 ml-1">SZ{it.size}</span></span>
                      <span className="bg-gray-200 px-4 py-1 rounded-xl text-black">X{it.quantity}</span>
                    </div>
                  ))
                })()}
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest">ALASAN</label>
                  <textarea placeholder="TULIS ALASAN..." className="w-full p-5 bg-gray-50 border border-transparent focus:border-black rounded-2xl text-xs font-bold uppercase outline-none h-32 resize-none transition-all" onChange={(e) => setReturnReason(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest">FOTO BUKTI</label>
                  <div className="relative group overflow-hidden bg-white border-2 border-dashed border-gray-300 rounded-2xl h-44 flex flex-col items-center justify-center gap-3 transition-all hover:border-black">
                    {returnFile ? (
                      <div className="absolute inset-0">
                        <img src={URL.createObjectURL(returnFile)} className="w-full h-full object-cover" alt="retur proof" />
                        <button onClick={() => setReturnFile(null)} className="absolute top-3 right-3 bg-black text-white p-2.5 rounded-xl"><X size={16} /></button>
                      </div>
                    ) : (
                      <>
                        <Camera size={28} className="text-gray-400" />
                        <span className="text-xs font-bold uppercase tracking-widest">AMBIL FOTO</span>
                        <input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setReturnFile(e.target.files?.[0] || null)} />
                      </>
                    )}
                  </div>
                </div>
                <button disabled={isReturning || !returnReason} onClick={handleProcessReturn} className="w-full bg-black text-white py-6 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl active:scale-95 disabled:bg-gray-200 transition-all flex items-center justify-center gap-4">
                  {isReturning ? <Loader2 className="animate-spin" size={24} /> : <AlertCircle size={24} />} KONFIRMASI RETUR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReceipt && lastTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-8 text-black overflow-y-auto">
          <div className="bg-white rounded-3xl p-10 w-full max-w-sm my-auto shadow-2xl text-black font-bold">
            <div id="printable-receipt-pos" className="bg-white font-mono text-black">
              <div className="text-center py-4">
                <div className="text-2xl font-bold">HnM Store</div>
                <div className="text-xs opacity-50">#{lastTransaction.id?.slice(0, 10)}</div>
              </div>
              <div className="border-dash" />
              <div className="py-2 text-xs">
                <div className="flex justify-between"><span>CUST:</span><span>{lastTransaction.customer}</span></div>
                <div className="flex justify-between"><span>DATE:</span><span>{lastTransaction.date}</span></div>
              </div>
              <div className="border-dash" />
              <table className="text-xs w-full">
                <tbody>
                  {(() => {
                    let items = []; try { items = Array.isArray(lastTransaction.items) ? lastTransaction.items : JSON.parse(lastTransaction.items || '[]') } catch(e) { items = [] }
                    return items.map((it: any, i: number) => (
                      <tr key={i} className="py-1">
                        <td className="py-1">{it.name} SZ{it.size} x{it.quantity}</td>
                        <td className="text-right py-1">{(it.price * it.quantity).toLocaleString()}</td>
                      </tr>
                    ))
                  })()}
                </tbody>
              </table>
              <div className="border-dash" />
              <div className="space-y-1 text-xs font-bold">
                <div className="flex justify-between"><span>SUBTOTAL</span><span>{lastTransaction.subtotal?.toLocaleString()}</span></div>
                <div className="flex justify-between text-red-600"><span>DISCOUNT</span><span>-{lastTransaction.discount?.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm py-2"><span>TOTAL</span><span>RP {lastTransaction.total?.toLocaleString()}</span></div>
              </div>
              <div className="border-dash" />
              <div className="text-center text-xs py-4">TERIMA KASIH TELAH BERBELANJA</div>
            </div>
            <div className="grid grid-cols-1 gap-4 mt-8">
              <button onClick={handlePrint} className="flex items-center justify-center gap-4 bg-black text-white py-5 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl hover:bg-gray-800 active:scale-95 transition-all"><Printer size={22} /> CETAK STRUK</button>
              <button onClick={() => setShowReceipt(false)} className="w-full py-4 text-xs font-bold text-gray-400 uppercase text-center hover:text-black transition-colors tracking-widest">KEMBALI KE KASIR</button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx global>{`
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 20px; }
      `}</style>
    </div>
  )
}