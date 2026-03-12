'use client'
import { RefreshCcw, X, Camera, AlertCircle, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface ModalReturProps {
  show: boolean;
  onClose: () => void;
  selectedTx: any; // Karena struktur transaksi kamu kompleks, kita bisa pertajam interface ini nanti
  returnReason: string;
  setReturnReason: (val: string) => void;
  returnFile: File | null;
  setReturnFile: (file: File | null) => void;
  isReturning: boolean;
  handleProcessReturn: () => void;
}

export default function ModalRetur({
  show, onClose, selectedTx, returnReason, 
  setReturnReason, returnFile, setReturnFile, 
  isReturning, handleProcessReturn
}: ModalReturProps) {
  
  if (!show || !selectedTx) return null;

  // Helper untuk parse items
  let items = [];
  try {
    items = Array.isArray(selectedTx.items) 
      ? selectedTx.items 
      : JSON.parse(selectedTx.items || '[]');
  } catch (e) {
    items = [];
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-md my-auto shadow-2xl overflow-hidden border border-gray-100 text-black">
        
        {/* Header */}
        <div className="p-8 border-b-2 border-red-600 bg-white flex justify-between items-center">
          <h2 className="text-xl font-bold uppercase tracking-tight flex items-center gap-3 text-red-600">
            <RefreshCcw size={26} /> RETUR BARANG
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-600 transition-all">
            <X size={28}/>
          </button>
        </div>

        <div className="p-10 space-y-8">
          {/* Ringkasan Item */}
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-3">
            {items.map((it: any, i: number) => (
              <div key={i} className="flex justify-between text-xs font-bold uppercase">
                <span className="text-gray-400">{it.name} <span className="text-red-600 ml-1">SZ{it.size}</span></span>
                <span className="bg-gray-200 px-4 py-1 rounded-xl text-black">X{it.quantity}</span>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            {/* Input Alasan */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">ALASAN RETUR</label>
              <textarea 
                placeholder="TULIS ALASAN..." 
                className="w-full p-5 bg-gray-50 border border-transparent focus:border-black rounded-2xl text-xs font-bold uppercase outline-none h-32 resize-none transition-all" 
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)} 
              />
            </div>

            {/* Upload Foto */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-400">FOTO BUKTI</label>
              <div className="relative group overflow-hidden bg-white border-2 border-dashed border-gray-300 rounded-2xl h-44 flex flex-col items-center justify-center gap-3 transition-all hover:border-black">
                {returnFile ? (
                  <div className="absolute inset-0">
                    <img 
                      src={URL.createObjectURL(returnFile)} 
                      className="w-full h-full object-cover" 
                      alt="bukti retur" 
                    />
                    <button 
                      onClick={() => setReturnFile(null)} 
                      className="absolute top-3 right-3 bg-black text-white p-2.5 rounded-xl shadow-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Camera size={28} className="text-gray-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">AMBIL FOTO</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={(e) => setReturnFile(e.target.files?.[0] || null)} 
                    />
                  </>
                )}
              </div>
            </div>

            {/* Tombol Aksi */}
            <button 
              disabled={isReturning || !returnReason} 
              onClick={handleProcessReturn} 
              className="w-full bg-black text-white py-6 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl active:scale-95 disabled:bg-gray-200 transition-all flex items-center justify-center gap-4"
            >
              {isReturning ? <Loader2 className="animate-spin" size={24} /> : <AlertCircle size={24} />} KONFIRMASI RETUR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}