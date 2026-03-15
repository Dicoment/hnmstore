'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, User, Smartphone, Calendar, CheckCircle2, Loader2, ShoppingBag } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function CheckoutPage() {
  const router = useRouter()
  const [cart, setCart] = useState<any[]>([])
  const [customerName, setCustomerName] = useState('')
  const [whatsapp, setWhatsapp] = useState('') 
  const [discount, setDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [isDebt, setIsDebt] = useState(false)
  const [dueDate, setDueDate] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('hnm_temp_cart')
    if (saved) setCart(JSON.parse(saved))
    else router.push('/admin/pos')
  }, [router])

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const total = Math.max(0, subtotal - discount)

  const handleFinish = async () => {
    if (!customerName) return alert("Nama Seller/Pelanggan wajib diisi!")
    if (isDebt && !dueDate) return alert("Pilih tanggal jatuh tempo!")
    if (!isDebt && !paymentMethod) return alert("Pilih metode pembayaran!")

    setIsProcessing(true)
    try {
      // Pastikan user_id yang diambil adalah UUID Profile
      const adminId = localStorage.getItem('user_id') 
      
      for (const item of cart) {
        // 1. Ambil stok lama untuk audit log
        const oldStockRes = await fetch('/api/vps-db', {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sql: `SELECT stock FROM public."ProductSizeStock" WHERE id = $1`, 
            params: [item.stockId] 
          })
        });
        const oldStockData = await oldStockRes.json();
        const oldStock = oldStockData.data?.[0]?.stock || 0;

        // 2. Potong Stok
        await fetch('/api/vps-db', {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sql: `UPDATE public."ProductSizeStock" SET stock = stock - $1 WHERE id = $2`,
            params: [item.quantity, item.stockId]
          })
        })

        // 3. Catat Mutasi (Gunakan 'TERJUAL' agar warna di UI sesuai)
        await fetch('/api/vps-db', {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sql: `INSERT INTO public."StockLog" (product_name, size_value, old_stock, new_stock, type, notes, created_by, created_at) 
                  VALUES ($1, $2, $3, $4, 'TERJUAL', $5, $6, NOW())`,
            params: [
              item.name, 
              item.size, 
              oldStock, 
              oldStock - item.quantity, 
              `Penjualan ke ${customerName}`, 
              adminId
            ]
          })
        })
      }

      // 4. Simpan Transaksi Utama
      await fetch('/api/vps-db', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: `INSERT INTO public."Transactions" (customer, whatsapp, subtotal, discount, total, items, items_count, created_by, status, payment_status, due_date, payment_method) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'SUCCESS', $9, $10, $11)`,
          params: [
            customerName, 
            whatsapp, 
            subtotal, 
            discount, 
            total, 
            JSON.stringify(cart), 
            cart.length, 
            adminId, 
            isDebt ? 'HUTANG' : 'LUNAS', 
            dueDate || null, 
            isDebt ? 'HUTANG' : paymentMethod
          ]
        })
      })

      alert("Transaksi Sukses & Mutasi Tercatat!")
      localStorage.removeItem('hnm_temp_cart')
      router.push(isDebt ? '/admin/pos/hutang' : '/admin/pos/riwayat')
    } catch (e) { 
      console.error(e)
      alert("Checkout Gagal") 
    } finally { 
      setIsProcessing(false) 
    }
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans relative">
      <div className="max-w-7xl mx-auto p-5 lg:p-12 pb-32 lg:pb-12">
        
        {/* HEADER */}
        <div className="flex flex-col gap-4 mb-8">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 font-bold uppercase text-xs">
            <ArrowLeft size={18}/> Kembali
          </button>
          <h1 className="text-3xl lg:text-4xl font-bold uppercase tracking-tighter">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* FORM INPUT */}
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">Nama Seller</label>
                <input type="text" value={customerName} onChange={(e)=>setCustomerName(e.target.value)} placeholder="NAMA..." className="w-full px-5 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none border-none shadow-sm"/>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">WhatsApp</label>
                <input type="text" value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} placeholder="6281..." className="w-full px-5 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none border-none shadow-sm"/>
              </div>
            </div>

            <div onClick={() => setIsDebt(!isDebt)} className={`p-6 border rounded-3xl cursor-pointer transition-all ${isDebt ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-7 rounded-full relative transition-colors ${isDebt ? 'bg-red-600' : 'bg-gray-200'}`}>
                    <div className={`absolute top-1 left-1 bg-white rounded-full h-5 w-5 transition-transform ${isDebt ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </div>
                  <span className={`text-sm font-bold uppercase ${isDebt ? 'text-red-600' : 'text-gray-400'}`}>Hutang Seller</span>
                </div>
                {isDebt && <input type="date" value={dueDate} onClick={(e)=>e.stopPropagation()} onChange={(e)=>setDueDate(e.target.value)} className="bg-white px-3 py-2 rounded-xl text-xs font-bold outline-none border border-red-100 uppercase"/>}
              </div>
            </div>

            {!isDebt && (
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">Metode Bayar</label>
                <div className="grid grid-cols-3 gap-3">
                  {['CASH', 'QRIS', 'TRANSFER', 'DANA', 'GOPAY', 'SHOPEEPAY'].map(m => (
                    <button key={m} onClick={()=>setPaymentMethod(m)} className={`py-4 rounded-xl text-[10px] font-bold border transition-all ${paymentMethod === m ? 'bg-black text-white border-black shadow-md' : 'bg-white border-gray-100'}`}>{m}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase text-gray-400 tracking-widest">Diskon (Rp)</label>
              <input type="number" value={discount} onChange={(e)=>setDiscount(Number(e.target.value))} className="w-full px-5 py-4 bg-gray-50 rounded-2xl text-sm font-bold outline-none border-none shadow-sm text-red-600"/>
            </div>

            <div className="space-y-4">
               <label className="text-xs font-bold uppercase text-gray-400 tracking-widest flex justify-between">
                 <span>Ringkasan Barang</span>
                 <span>{cart.length} Item</span>
               </label>
               <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
                  {cart.map((it, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-gray-200/50 pb-2">
                      <p className="text-xs font-bold uppercase truncate max-w-50">{it.name} <span className="ml-2 text-gray-400 text-[10px]">SZ {it.size}</span></p>
                      <p className="text-xs font-bold">RP {(it.price * it.quantity).toLocaleString()}</p>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          {/* SIDEBAR TOTAL */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-10 bg-gray-50 p-8 rounded-xl border border-gray-100 shadow-sm space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-3">
                <ShoppingBag size={18}/> Total Pembayaran
              </h2>
              <div className="space-y-4 border-b border-gray-200 pb-6">
                <div className="flex justify-between text-sm font-bold text-gray-500 uppercase"><span>Subtotal</span><span>RP {subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm font-bold text-red-500 uppercase"><span>Diskon</span><span>-RP {discount.toLocaleString()}</span></div>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold uppercase">Total Akhir</span>
                <span className="text-3xl font-bold tracking-tighter">RP {total.toLocaleString()}</span>
              </div>
              <button 
                disabled={isProcessing} onClick={handleFinish} 
                className={`w-full py-6 rounded-3xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl ${isDebt ? 'bg-red-600 text-white shadow-red-100' : 'bg-black text-white'}`}
              >
                {isProcessing ? <Loader2 className="animate-spin mx-auto" size={20}/> : (isDebt ? 'SIMPAN PIUTANG' : 'SELESAIKAN ORDER')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-50 lg:hidden shadow-[0_-8px_30px_rgb(0,0,0,0.08)]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Akhir</span>
            <span className="text-lg font-bold tracking-tighter">RP {total.toLocaleString()}</span>
          </div>
          <button 
            disabled={isProcessing} onClick={handleFinish} 
            className={`flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 ${isDebt ? 'bg-red-600 text-white' : 'bg-black text-white'}`}
          >
            {isProcessing ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>}
            {isDebt ? 'SIMPAN' : 'KONFIRMASI'}
          </button>
        </div>
      </div>
    </div>
  )
}