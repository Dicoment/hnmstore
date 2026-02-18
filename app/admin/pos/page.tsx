'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Search, ShoppingCart, Trash2, Plus, Minus, 
  CheckCircle2, Loader2, User, TicketPercent, Printer, X,
  RefreshCcw, Camera, AlertCircle
} from 'lucide-react'

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

  // STATE UNTUK RETUR
  const [transactions, setTransactions] = useState<any[]>([])
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [selectedTx, setSelectedTx] = useState<any>(null)
  const [returnReason, setReturnReason] = useState('')
  const [returnFile, setReturnFile] = useState<File | null>(null)
  const [isReturning, setIsReturning] = useState(false)

  useEffect(() => {
    fetchProducts()
    fetchRecentTransactions()
  }, [])

  async function fetchRecentTransactions() {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('Transactions')
      .select('*')
      .eq('status', 'SUCCESS')
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false })
    if (data) setTransactions(data)
  }

  async function fetchProducts() {
    try {
      setLoading(true)
      const { data } = await supabase.from('Product').select(`
        id, name, price_regular, images,
        ProductSizeStock!productId(id, sizeId, stock, Size!sizeId(value))
      `)
      
      const productsWithUrls = data?.map(p => ({
        ...p,
        images: p.images?.map((img: string) => 
          img.startsWith('http') ? img : supabase.storage.from('ProductImage').getPublicUrl(`public/${img}`).data.publicUrl
        )
      })) || []
      
      setProducts(productsWithUrls)
    } finally {
      setLoading(false)
    }
  }

  // LOGIKA PROSES RETUR
  async function handleProcessReturn() {
    if (!selectedTx || !returnFile || !returnReason) return alert('Lengkapi data & foto bukti!')
    
    setIsReturning(true)
    try {
      // 1. Upload ke Bucket ReturnImage
      const fileExt = returnFile.name.split('.').pop()
      const fileName = `retur-${selectedTx.id}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('ReturnImage')
        .upload(fileName, returnFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('ReturnImage')
        .getPublicUrl(fileName)

      const { data: authUser } = await supabase.auth.getUser()

      // 2. Kembalikan Stok (RPC increment_stock)
      for (const item of selectedTx.items) {
        await supabase.rpc('increment_stock', {
          row_id: item.stockId,
          amount: item.quantity
        })

        // --- INJECT LOGIC: LOG RETUR ---
        await supabase.from('StockLog').insert([{
          stock_id: item.stockId,
          product_name: item.name,
          size_value: item.size,
          old_stock: item.maxStock || 0,
          new_stock: (item.maxStock || 0) + item.quantity,
          type: 'RETUR',
          notes: `Retur: ${returnReason}`,
          created_by: authUser.user?.id
        }])
      }

      // 3. Update Status Transaksi
      const { error: updateError } = await supabase
        .from('Transactions')
        .update({ 
          status: 'RETURNED',
          return_proof_url: publicUrl,
          return_reason: returnReason
        })
        .eq('id', selectedTx.id)

      if (updateError) throw updateError

      alert('Retur Berhasil! Stok telah dikembalikan.')
      setShowReturnModal(false)
      setSelectedTx(null); setReturnFile(null); setReturnReason('')
      fetchProducts(); fetchRecentTransactions()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsReturning(false)
    }
  }

  const addToCart = (product: any, sizeStock: any) => {
    if (sizeStock.stock <= 0) return alert('Stok Habis!')
    const existing = cart.find(item => item.stockId === sizeStock.id)
    if (existing) {
      if (existing.quantity >= sizeStock.stock) return alert('Stok tidak cukup!')
      setCart(cart.map(item => item.stockId === sizeStock.id ? { ...item, quantity: item.quantity + 1 } : item))
    } else {
      setCart([...cart, {
        productId: product.id,
        stockId: sizeStock.id,
        name: product.name,
        size: sizeStock.Size.value,
        price: product.price_regular,
        quantity: 1,
        maxStock: sizeStock.stock
      }])
    }
  }

  const updateQty = (stockId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.stockId === stockId) {
        const newQty = item.quantity + delta
        if (newQty > 0 && newQty <= item.maxStock) return { ...item, quantity: newQty }
      }
      return item
    }))
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const total = Math.max(0, subtotal - discount)

  const handlePrint = () => {
    const printContents = document.getElementById('printable-receipt-pos')?.innerHTML;
    if (!printContents) return;

    const printWindow = window.open('', '_blank', 'width=450,height=700');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cetak Struk - HnM Store</title>
            <style>
              @page { margin: 0; }
              body { 
                font-family: 'Courier New', Courier, monospace; 
                padding: 10mm; 
                width: 72mm; 
                margin: auto;
                color: black;
              }
              .text-center { text-align: center; }
              .flex { display: flex; justify-content: space-between; }
              .border-b { border-bottom: 1px dashed #000; margin: 10px 0; }
              .text-lg { font-size: 18px; font-weight: bold; }
              .text-xs { font-size: 11px; }
              .font-bold { font-weight: bold; }
              .uppercase { text-transform: uppercase; }
              .mt-4 { margin-top: 15px; }
            </style>
          </head>
          <body>
            ${printContents}
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  async function handleCheckout() {
    if (cart.length === 0) return
    setIsProcessing(true)
    
    try {
      const { data: authUser } = await supabase.auth.getUser()

      for (const item of cart) {
        const { error: stockError } = await supabase.rpc('decrement_stock', {
          row_id: item.stockId,
          amount: item.quantity
        })
        if (stockError) throw stockError

        // --- INJECT LOGIC: LOG PENJUALAN ---
        await supabase.from('StockLog').insert([{
          stock_id: item.stockId,
          product_name: item.name,
          size_value: item.size,
          old_stock: item.maxStock,
          new_stock: item.maxStock - item.quantity,
          type: 'TERJUAL',
          notes: `Penjualan Kasir - Customer: ${customerName || 'PELANGGAN UMUM'}`,
          created_by: authUser.user?.id
        }])
      }

      const { data: newTx, error: dbError } = await supabase
        .from('Transactions')
        .insert([
          {
            customer: customerName || 'PELANGGAN UMUM',
            subtotal: subtotal,
            discount: discount,
            total: total,
            items: cart,
            items_count: cart.reduce((sum, item) => sum + item.quantity, 0),
            created_by: authUser.user?.id,
            status: 'SUCCESS'
          }
        ]).select().single()

      if (dbError) throw dbError

      setLastTransaction({ ...newTx, date: new Date().toLocaleString('id-ID') })
      setShowReceipt(true)
      
      setCart([]); setCustomerName(''); setDiscount(0);
      fetchProducts(); fetchRecentTransactions();
      
    } catch (err: any) {
      alert('Gagal Simpan Transaksi: ' + err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-screen gap-3 text-black font-sans relative p-2 md:p-4 bg-gray-50">
      
      {/* 1. AREA KATALOG & RIWAYAT */}
      <div className="flex-1 flex flex-col gap-3 min-h-[500px] lg:min-h-0">
        
        {/* KATALOG */}
        <div className="flex-1 border border-gray-200 rounded-2xl flex flex-col overflow-hidden bg-white shadow-sm">
            <div className="p-3 md:p-4 border-b border-gray-100 flex justify-between items-center">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="CARI SEPATU..." 
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-black border-none"
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Link href="/admin/pos/laporan-shift" className="text-[10px] font-black uppercase bg-gray-100 px-4 py-2 rounded-lg hover:bg-black hover:text-white transition-all">
                   Cek Laporan Shift
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 custom-scrollbar">
              {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(product => (
                <div key={product.id} className="border border-gray-100 rounded-2xl p-2 flex flex-col gap-2 hover:border-black transition-all bg-white group h-fit shadow-sm">
                    <div className="aspect-square relative rounded-xl overflow-hidden bg-gray-50">
                        <Image src={product.images?.[0] || '/placeholder.png'} alt={product.name} fill className="object-cover" unoptimized />
                    </div>
                    <div className="px-1">
                        <h3 className="text-[12px] font-black uppercase truncate leading-tight">{product.name}</h3>
                        <p className="text-[14px] font-bold italic mt-0.5 text-zinc-600">Rp {product.price_regular.toLocaleString()}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1 mt-1">
  {product.ProductSizeStock.map((ss: any) => (
    <button 
      key={ss.id}
      disabled={ss.stock <= 0}
      onClick={() => addToCart(product, ss)}
      className={`relative text-[10px] font-black py-2 rounded-lg border transition-all flex flex-col items-center ${
        ss.stock > 0 
          ? ss.stock <= 3 
            ? 'border-red-500 bg-red-50 text-red-600' // Tanda Merah kalau stok sisa 1-3
            : 'border-gray-100 bg-gray-50 hover:bg-black hover:text-white' 
          : 'bg-gray-100 text-gray-300 opacity-50 cursor-not-allowed' // Stok Habis
      }`}
    >
      {/* Tambahkan Bulatan Kedip-kedip (Pulse) jika stok kritis */}
      {ss.stock > 0 && ss.stock <= 3 && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      )}

      <span>SZ {ss.Size.value}</span>
      <span className={`text-[8px] uppercase ${ss.stock <= 3 ? 'font-black' : 'opacity-60'}`}>
        {ss.stock <= 0 ? 'HABIS' : `S: ${ss.stock}`}
      </span>
    </button>
  ))}
</div>
                </div>
              ))}
            </div>
            
            <span className="p-2  text-xs font-regular italic text-gray-500">*Klik ukuran untuk tambah ke keranjang</span>
            <span className="p-2  text-xs font-regular italic text-gray-500">*Kelip-Kelip = Stok Tipis</span></div>
    
        {/* RIWAYAT TRANSAKSI HARI INI (UNTUK RETUR) */}
        <div className="h-[200px] border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><RefreshCcw size={14}/> Transaksi Hari Ini (Bisa Retur)</p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:border-red-200 transition-all">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-tighter">#{tx.id.slice(0,8)} • {tx.customer}</p>
                            <p className="text-[9px] font-bold text-gray-400">Rp {tx.total.toLocaleString()} • {tx.items_count} Barang</p>
                        </div>
                        <button 
                            onClick={() => { setSelectedTx(tx); setShowReturnModal(true); }}
                            className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-all"
                        >
                            Retur Barang
                        </button>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* 2. AREA KERANJANG (Sama seperti kodemu) */}
      <div className="w-full lg:w-[400px] border border-gray-200 rounded-2xl flex flex-col overflow-hidden bg-white shadow-xl h-[600px] lg:h-auto">
        <div className="p-4 md:p-5 border-b border-gray-100 bg-black text-white">
          <h2 className="text-[14px] font-black uppercase tracking-widest flex items-center gap-2">
            <ShoppingCart size={16} /> KERANJANG BELANJA
          </h2>
        </div>

        <div className="p-4 border-b border-gray-50 space-y-2 bg-gray-50/50">
          <input 
            type="text" 
            placeholder="NAMA PEMBELI..." 
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full p-3 bg-white border border-gray-200 rounded-xl text-[11px] font-black uppercase outline-none focus:border-black"
          />
          <input 
            type="number" 
            placeholder="DISKON (RP)..." 
            value={discount || ''}
            onChange={(e) => setDiscount(Number(e.target.value))}
            className="w-full p-3 bg-white border border-gray-200 rounded-xl text-[11px] font-black uppercase outline-none focus:border-black"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale">
               <ShoppingCart size={48} />
               <p className="text-[10px] font-black mt-2">KERANJANG KOSONG</p>
            </div>
          ) : cart.map(item => (
            <div key={item.stockId} className="flex gap-3 bg-white p-3 rounded-xl border border-gray-100 items-center">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase truncate">{item.name}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase">SZ {item.size} • Rp {item.price.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(item.stockId, -1)} className="p-2 border rounded-lg bg-gray-50"><Minus size={10}/></button>
                <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                <button onClick={() => updateQty(item.stockId, 1)} className="p-2 border rounded-lg bg-gray-50"><Plus size={10}/></button>
                <button onClick={() => setCart(cart.filter(i => i.stockId !== item.stockId))} className="text-red-500 ml-1 p-1"><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 md:p-6 border-t border-gray-100 bg-gray-50 space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-[12px] font-black uppercase">Total Bayar</span>
            <span className="text-xl font-black italic">Rp {total.toLocaleString()}</span>
          </div>
          <button 
            disabled={cart.length === 0 || isProcessing}
            onClick={handleCheckout}
            className="w-full cursor-pointer bg-black hover:bg-gray-600 text-white py-4 rounded-xl font-black text-[11px] uppercase tracking-[2px] shadow-xl active:scale-95 disabled:bg-gray-200 transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
            BAYAR SEKARANG
          </button>
        </div>
      </div>

      {/* 3. MODAL RETUR DENGAN FOTO */}
      {showReturnModal && selectedTx && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-black italic uppercase flex items-center gap-2 text-red-600"><RefreshCcw size={20}/> Proses Retur</h2>
                    <button onClick={() => setShowReturnModal(false)}><X size={24}/></button>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl mb-6 border border-gray-100">
                    <p className="text-[10px] font-black uppercase text-gray-400">Detail Transaksi</p>
                    <p className="text-[12px] font-black italic tracking-tighter">ID: #{selectedTx.id.slice(0,10)}</p>
                    <div className="mt-2 space-y-1">
                        {selectedTx.items.map((it: any, i: number) => (
                            <p key={i} className="text-[10px] font-bold text-gray-500 uppercase">{it.name} (SZ {it.size}) x{it.quantity}</p>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Alasan Retur</label>
                        <input 
                            type="text" 
                            placeholder="Contoh: Ukuran tidak pas / Cacat produksi"
                            className="w-full p-4 bg-gray-50 rounded-xl text-[11px] font-bold outline-none border-2 border-transparent focus:border-black"
                            value={returnReason}
                            onChange={(e) => setReturnReason(e.target.value)}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Foto Bukti Fisik Sepatu</label>
                        <div className="relative group overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl h-32 flex flex-col items-center justify-center gap-2 transition-all hover:border-black">
                            {returnFile ? (
                                <div className="absolute inset-0">
                                    <img src={URL.createObjectURL(returnFile)} className="w-full h-full object-cover" />
                                    <button onClick={() => setReturnFile(null)} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"><X size={14}/></button>
                                </div>
                            ) : (
                                <>
                                    <Camera size={24} className="text-gray-300" />
                                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Klik untuk Ambil Foto</span>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment" // Langsung buka kamera di HP
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={(e) => setReturnFile(e.target.files?.[0] || null)}
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    <button 
                        disabled={isReturning || !returnFile || !returnReason}
                        onClick={handleProcessReturn}
                        className="w-full bg-red-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 disabled:bg-gray-200"
                    >
                        {isReturning ? <Loader2 className="animate-spin" size={16}/> : <AlertCircle size={16}/>}
                        KONFIRMASI RETUR (STOK KEMBALI)
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* 4. MODAL STRUK (RECEIPT) - Sama seperti kodemu */}
      {showReceipt && lastTransaction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 md:p-4">
          <div className="max-w-5xl  bg-white rounded-3xl p-4 md:p-6 w-full max-sm shadow-2xl animate-in zoom-in-95 duration-300">
            <div id="printable-receipt-pos" className="bg-white p-4 md:p-6 font-mono text-black border-2 border-dashed border-gray-100 rounded-xl leading-tight">
              <div className="text-center border-b-2 border-dashed border-gray-200 pb-4 mb-4">
                <div className="text-lg font-black italic uppercase">HnM Store</div>
                <div className="text-[10px] font-bold">Jepara - Indonesia</div>
                <div className="text-[9px] text-gray-400 mt-1 uppercase">#{lastTransaction.id.slice(0,10)}</div>
              </div>

              <div className="space-y-1 text-[10px] uppercase font-bold mb-4">
                <div className="flex justify-between"><span>Customer:</span><span>{lastTransaction.customer}</span></div>
                <div className="flex justify-between"><span>Waktu:</span><span>{lastTransaction.date}</span></div>
              </div>

              <div className="space-y-3 border-b-2 border-dashed border-gray-200 pb-4 mb-4">
                {lastTransaction.items.map((item: any, i: number) => (
                  <div key={i} className="text-[10px] uppercase font-bold">
                    <div className="flex justify-between"><span>{item.name}</span><span>x{item.quantity}</span></div>
                    <div className="flex justify-between text-gray-400 text-[9px]">
                      <span>Size {item.size}</span>
                      <span>Rp {(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-[10px] font-black uppercase">
                <div className="flex justify-between font-bold text-gray-400"><span>Subtotal:</span><span>Rp {lastTransaction.subtotal.toLocaleString()}</span></div>
                {lastTransaction.discount > 0 && (
                  <div className="flex justify-between text-red-500"><span>Diskon:</span><span>-Rp {lastTransaction.discount.toLocaleString()}</span></div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t mt-2 font-black italic"><span>TOTAL:</span><span>Rp {lastTransaction.total.toLocaleString()}</span></div>
              </div>

              <div className="mt-8 text-center text-[9px] font-bold text-gray-400 uppercase leading-relaxed">
                Terima Kasih Atas Kunjungan Anda!
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 mt-6">
              <button 
                onClick={handlePrint} 
                className="flex items-center justify-center gap-2 bg-black text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl active:scale-95"
              >
                <Printer size={16}/> CETAK STRUK / SIMPAN PDF
              </button>
              <button 
                onClick={() => setShowReceipt(false)} 
                className="w-full py-2 text-[9px] font-black text-gray-400 uppercase text-center hover:text-black transition-colors"
              >
                Kembali ke Kasir
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 10px; }
      `}</style>
    </div>
  )
}