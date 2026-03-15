'use client'

import { X, ShoppingBag, User, Smartphone, ImageIcon } from 'lucide-react'
import Image from 'next/image'

interface ModalDetailOrderProps {
  show: boolean
  onClose: () => void
  selectedTx: any
}

export default function ModalDetailOrder({ show, onClose, selectedTx }: ModalDetailOrderProps) {
  if (!show || !selectedTx) return null

  // Parsing items dari JSON string ke array object
  const items = typeof selectedTx.items === 'string' ? JSON.parse(selectedTx.items) : selectedTx.items

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-200 text-black font-bold">
        
        {/* HEADER */}
        <div className="p-6 lg:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-xs font-bold uppercase tracking-widest flex items-center gap-3 text-black">
            <ShoppingBag size={18} /> Detail Order
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-red-500 hover:text-white rounded-xl transition-all"
          >
            <X size={22} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6 lg:p-8 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* INFO CUSTOMER */}
          <div className="p-5 bg-blue-50 rounded-xl border border-blue-100 space-y-2 font-bold text-xs uppercase text-blue-700">
            <div className="flex items-center gap-3">
              <User size={16} /> {selectedTx.customer}
            </div>
            <div className="flex items-center gap-3 text-blue-300">
              <Smartphone size={16} /> {selectedTx.whatsapp || 'No WhatsApp'}
            </div>
            <div className="text-blue-300 leading-none mt-1 text-[10px]">
              INV-{selectedTx.id.toString()}
            </div>
          </div>

          {/* LIST ITEMS */}
          <div className="space-y-3">
            {items.map((item: any, i: number) => {
              // LOGIC FIX: Pastikan ambil nama file gambar yang bener dari JSON
              const imgFile = item.image || (item.images && item.images[0]);

              return (
                <div key={i} className="flex gap-4 p-3 border border-gray-100 rounded-xl bg-white items-center shadow-sm">
                  <div className="w-14 h-14 relative rounded-xl overflow-hidden shrink-0 border border-gray-100 bg-gray-50">
                    {imgFile ? (
                      <Image 
                        src={`/api/media/view?bucket=ProductImage&name=${imgFile}`} 
                        alt={item.name} 
                        fill 
                        className="object-cover" 
                        unoptimized 
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-300">
                        <ImageIcon size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase truncate text-black">{item.name}</p>
                    <p className="text-[10px] text-gray-400 uppercase mt-1 leading-none font-bold">
                      SZ: {item.size} | {item.quantity} Ps
                    </p>
                  </div>
                  <p className="text-xs font-bold text-black">
                    Rp {(item.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER TOTAL */}
        <div className="p-6 lg:p-8 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
          <span className="text-xs uppercase text-gray-400 tracking-widest leading-none font-bold">Total Nota</span>
          <span className="text-xl lg:text-2xl text-red-600 tracking-tighter leading-none font-bold">
            Rp {Number(selectedTx.total).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}