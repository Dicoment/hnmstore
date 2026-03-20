'use client'
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, X } from 'lucide-react'

interface PanelKeranjangProps {
  cart: any[];
  subtotal: number;
  updateQty: (sid: string, d: number) => void;
  removeFromCart: (sid: string) => void;
  handleCheckout: () => void;
  showMobileCart: boolean;
  setShowMobileCart: (val: boolean) => void;
}

export default function PanelKeranjang({ 
  cart, subtotal, updateQty, removeFromCart, handleCheckout,
  showMobileCart, setShowMobileCart 
}: PanelKeranjangProps) {
  
  return (
    <div className={`fixed inset-y-0 left-0 z-100 bg-white transition-transform duration-500 lg:static lg:w-full lg:h-screen lg:translate-y-0 ${showMobileCart ? 'translate-y-0 h-screen' : 'translate-y-full lg:translate-y-0'}`}>
      <div className="flex flex-col h-full text-black overflow-hidden bg-white border-r border-gray-100">
        
        {/* HEADER - FIXED */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-3 text-black">
            <ShoppingCart size={20} /> LIST ORDER
          </h2>
          <button onClick={() => setShowMobileCart(false)} className="lg:hidden p-2 bg-black text-white rounded-xl">
            <X size={18}/>
          </button>
          <span className="hidden lg:block bg-black text-white px-4 py-1.5 rounded-xl text-xs font-bold uppercase">
            {cart.length} Item
          </span>
        </div>

        {/* LIST ITEMS - AREA SCROLL */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30">
              <ShoppingCart size={40} className="mb-3 text-gray-400" />
              <p className="text-xs font-bold uppercase tracking-widest text-center text-gray-400 leading-relaxed">
                Belum Ada Barang<br/>Di Keranjang
              </p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.stockId} className="flex gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 items-center">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase truncate text-black leading-none mb-1">{item.name}</p>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">
                    Size {item.size} • RP {item.price?.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white rounded-xl border border-gray-200">
                    <button onClick={() => updateQty(item.stockId, -1)} className="p-2 hover:text-red-600 transition-all font-bold text-xs"><Minus size={14}/></button>
                    <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.stockId, 1)} className="p-2 hover:text-green-600 transition-all font-bold text-xs"><Plus size={14}/></button>
                  </div>
                  <button onClick={() => removeFromCart(item.stockId)} className="text-gray-300 hover:text-red-500 p-1.5 transition-colors">
                    <Trash2 size={18}/>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* FOOTER - FIXED (ANTI SCROLL) */}
        <div className="p-8 border-t border-gray-100 bg-white shadow-[0_-15px_40px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-end text-black mb-6">
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase text-gray-400 leading-none mb-3 tracking-widest">Subtotal Pesanan</span>
              <span className="text-3xl lg:text-4xl font-bold tracking-tighter leading-none text-black">RP {subtotal.toLocaleString()}</span>
            </div>
          </div>
          
          <button 
            disabled={cart.length === 0} 
            onClick={handleCheckout} 
            className="w-full py-6 bg-black text-white rounded-sm font-bold text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 disabled:bg-gray-100 disabled:text-gray-300 transition-all flex items-center justify-center gap-4"
          >
            Lanjut Bayar <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}