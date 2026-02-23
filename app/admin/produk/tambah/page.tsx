'use client'

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { 
  Upload, Plus, Trash2, Send, Image as ImageIcon, Loader2, X, CheckCircle2, PackagePlus, FolderOpen
} from "lucide-react"

interface Brand { id: string; name: string }
interface Model { id: string; name: string }
interface Size { id: string; value: string }
interface ProductSizeStock { sizeId: string; stock: number | '' }

export default function TambahProdukPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [sizes, setSizes] = useState<Size[]>([])
  const [existingImages, setExistingImages] = useState<any[]>([]) 

  const [name, setName] = useState('') 
  const [description, setDescription] = useState('')
  const [brandId, setBrandId] = useState('')
  const [modelId, setModelId] = useState('')
  const [priceRegular, setPriceRegular] = useState<number | ''>('')
  const [pricePromo, setPricePromo] = useState<number | ''>('')
  
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [sizeStocks, setSizeStocks] = useState<ProductSizeStock[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showMediaModal, setShowMediaModal] = useState(false)

  const fetchInitialData = useCallback(async () => {
    try {
      const [bRes, mRes, sRes, imgRes] = await Promise.all([
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: `SELECT * FROM public."Brand" ORDER BY name ASC` }) }).then(r => r.json()),
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: `SELECT * FROM public."Model" ORDER BY name ASC` }) }).then(r => r.json()),
        fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: `SELECT * FROM public."Size" ORDER BY value ASC` }) }).then(r => r.json()),
        fetch('/api/media').then(r => r.json())
      ])
      setBrands(bRes.data || [])
      setModels(mRes.data || [])
      setSizes(sRes.data || [])
      setExistingImages(imgRes.data || []) 
    } catch (err) { console.error(err) }
  }, [])

  useEffect(() => { fetchInitialData() }, [fetchInitialData])

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    try {
      const uploadedNames: string[] = []; 
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.url) {
          const fileName = data.url.split('/').pop();
          uploadedNames.push(fileName);
        }
      }
      setImageUrls(prev => [...prev, ...uploadedNames]);
      fetchInitialData();
    } catch (err) { alert("Gagal upload!"); } finally { setUploading(false); }
  }

  function createSlug(text: string) {
    return text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
  }

  // --- SOLUSI FINAL: SINGLE TRANSACTION TANPA KOLOM createdAt DI STOK ---
  async function handleSubmit(draft = false) {
    if (!name || !brandId || !modelId || !priceRegular) {
      alert('Nama, Brand, Model, dan Harga Regular WAJIB diisi!')
      return
    }
    setLoading(true)
    try {
      // Perbaikan: createdAt dihapus dari tabel ProductSizeStock karena memang tidak ada di database
      const combinedQuery = `
        WITH new_product AS (
          INSERT INTO public."Product" 
          (name, slug, description, "brandId", "modelId", price, price_regular, price_promo, images, draft, "createdAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          RETURNING id
        )
        INSERT INTO public."ProductSizeStock" ("productId", "sizeId", stock)
        SELECT (SELECT id FROM new_product), unnest($11::uuid[]), unnest($12::int[]);
      `;

      const validSizeStocks = sizeStocks.filter(s => s.sizeId && s.stock !== '');
      const sizeIds = validSizeStocks.map(s => s.sizeId);
      const stocks = validSizeStocks.map(s => Number(s.stock));

      const params = [
        name, createSlug(name), description, brandId, modelId, 
        Number(priceRegular),
        Number(priceRegular),
        pricePromo ? Number(pricePromo) : null, 
        imageUrls, draft,
        sizeIds, // $11
        stocks   // $12
      ]

      const res = await fetch('/api/vps-db', { 
        method: 'POST', 
        body: JSON.stringify({ sql: combinedQuery, params }) 
      })
      
      const result = await res.json()
      if (result.error) throw new Error(result.error)

      alert(draft ? 'Draft tersimpan!' : 'Produk & Stok Berhasil Diterbitkan!')
      window.location.href = '/admin/produk'
    } catch (err: any) { 
      console.error("Gagal Simpan:", err)
      alert('Gagal Simpan: ' + err.message) 
    } finally { 
      setLoading(false) 
    }
  }

  return (
    <div className="min-h-screen font-sans text-[14px] pb-24 md:pb-10 bg-[#FBFBFB]">
      <div className="w-full flex flex-col">
        
        {/* HEADER - Standar Z-50 */}
        <div className="w-full bg-white border-b border-gray-100 p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center sticky top-0 z-50 gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-black rounded-xl flex items-center justify-center text-white shrink-0">
              <PackagePlus size={20} className="md:size-6" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold uppercase tracking-tighter text-black leading-none">Tambah Produk</h1>
              <p className="text-[14px] md:text-[14px] font-bold text-gray-400 uppercase tracking-widest mt-1">HnM Store Jepara</p>
            </div>
          </div>
          <div className="flex w-full sm:w-auto gap-2 md:gap-3">
            <button type="button" onClick={() => handleSubmit(true)} disabled={loading} className="flex-1 sm:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-white border border-gray-200 rounded-xl font-bold text-[14px] md:text-[14px] uppercase tracking-widest hover:bg-gray-50 transition-all">DRAFT</button>
            <button type="button" onClick={() => handleSubmit(false)} disabled={loading} className="flex-2 sm:flex-none px-6 md:px-8 py-2.5 md:py-3 bg-black text-white rounded-xl font-bold text-[14px] md:text-[14px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 md:gap-3 shadow-xl hover:bg-zinc-800 active:scale-95 transition-all">
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} TERBITKAN
            </button>
          </div>
        </div>

        {/* MAIN AREA */}
        <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 w-full">
          <div className="lg:col-span-8 space-y-6 md:space-y-8">
            <div className="bg-white p-4 md:p-8 rounded-xl border border-gray-100 shadow-sm space-y-4 md:space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <label className="text-[12px] md:text-[14px] font-bold text-gray-400 uppercase tracking-widest">Gallery & Media</label>
                <div className="flex gap-2 w-full sm:w-auto">
                  <label className="flex-1 sm:flex-none cursor-pointer px-3 md:px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg font-bold uppercase flex items-center justify-center gap-2 transition-all text-[14px] md:text-[12px]">
                    <Upload size={14} /> Upload
                    <input type="file" multiple className="hidden" onChange={(e) => e.target.files && handleUpload(Array.from(e.target.files))} />
                  </label>
                  <button type="button" onClick={() => setShowMediaModal(true)} className="flex-1 sm:flex-none px-3 md:px-4 py-2 bg-black text-white rounded-lg font-bold uppercase flex items-center justify-center gap-2 transition-all shadow-md text-[14px] md:text-[12px]">
                    <FolderOpen size={14} /> Browse
                  </button>
                </div>
              </div>
              
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) handleUpload(Array.from(e.dataTransfer.files)) }}
                className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 p-4 md:p-6 border-2 border-dashed rounded-xl transition-all ${isDragging ? 'border-black bg-zinc-50' : 'border-gray-100'}`}
              >
                {imageUrls.map((name, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-200 shadow-sm">
                    <Image src={`/uploads/${name}`} fill className="object-cover" alt="p" unoptimized />
                    <button type="button" onClick={() => setImageUrls(imageUrls.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 bg-red-600 text-white p-1.5 md:p-2 rounded-lg lg:opacity-0 group-hover:opacity-100 transition-all shadow-lg"><Trash2 size={12} /></button>
                  </div>
                ))}
                {uploading && <div className="aspect-square flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"><Loader2 className="animate-spin text-black" size={20} /></div>}
              </div>
            </div>

            <div className="bg-white p-5 md:p-8 rounded-xl border border-gray-100 shadow-sm space-y-6 md:space-y-8">
              <div className="space-y-2">
                <label className="text-[12px] md:text-[14px] font-bold text-gray-400 uppercase tracking-widest">Model Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-transparent border-b-2 border-gray-100 focus:border-black py-2 md:py-4 outline-none font-bold text-xl md:text-2xl uppercase transition-all" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-3">
                  <label className="font-bold text-gray-400 uppercase tracking-widest text-[12px] md:text-[14px]">Brand</label>
                  <select value={brandId} onChange={e => setBrandId(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3.5 md:py-4 font-bold uppercase outline-none cursor-pointer">
                    <option value="">SELECT BRAND</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="font-bold text-gray-400 uppercase tracking-widest text-[12px] md:text-[14px]">Model</label>
                  <select value={modelId} onChange={e => setModelId(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3.5 md:py-4 font-bold uppercase outline-none cursor-pointer">
                    <option value="">SELECT MODEL</option>
                    {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              <textarea rows={5} placeholder="Product details..." value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl p-4 outline-none font-medium text-[13px] text-gray-700 resize-none" />
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6 md:space-y-8">
            <div className="bg-black p-6 md:p-8 rounded-xl text-white shadow-2xl space-y-6 md:space-y-8">
              <h3 className="font-bold uppercase tracking-[0.2em] border-b border-white/10 pb-4 text-[12px] md:text-[14px]">Harga Produk</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-zinc-500 font-bold uppercase tracking-widest text-[14px]">Regular Price</label>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-zinc-700 text-[14px]">RP</span>
                    <input type="number" value={priceRegular} onChange={e => setPriceRegular(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-transparent border-b border-zinc-700 focus:border-white py-2 outline-none font-bold text-xl md:text-2xl transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-red-500 font-bold uppercase tracking-widest text-[14px]">Promo Price</label>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-red-900 text-[14px]">RP</span>
                    <input type="number" value={pricePromo} onChange={e => setPricePromo(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-transparent border-b border-zinc-700 focus:border-red-600 py-2 outline-none font-bold text-xl md:text-2xl text-red-500 transition-all" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-100 shadow-sm space-y-5 md:space-y-6">
              <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                <h3 className="font-bold uppercase tracking-widest text-[11px] md:text-[12px]">Inventory Stock</h3>
                <button type="button" onClick={() => setSizeStocks([...sizeStocks, { sizeId: '', stock: '' }])} className="bg-black text-white p-2 rounded-lg transition-all shadow-md"><Plus size={16} /></button>
              </div>
              <div className="space-y-3">
                {sizeStocks.map((ss, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-transparent hover:border-gray-200 transition-all">
                    <select value={ss.sizeId} onChange={e => { const n = [...sizeStocks]; n[idx].sizeId = e.target.value; setSizeStocks(n); }} className="flex-1 bg-white border-none rounded-lg px-2 py-2.5 font-bold uppercase outline-none text-[12px] appearance-none">
                      <option value="">SIZE</option>
                      {sizes.map(s => <option key={s.id} value={s.id}>{s.value}</option>)}
                    </select>
                    <input type="number" placeholder="QTY" value={ss.stock} onChange={e => { const n = [...sizeStocks]; n[idx].stock = e.target.value === '' ? '' : Number(e.target.value); setSizeStocks(n); }} className="w-16 md:w-20 bg-white border-none rounded-lg px-2 py-2.5 font-bold text-center outline-none text-[12px]" />
                    <button type="button" onClick={() => setSizeStocks(sizeStocks.filter((_, i) => i !== idx))} className="text-zinc-300 hover:text-red-500 p-1 transition-colors"><X size={16}/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MEDIA MODAL - Standar Z-100 */}
      {showMediaModal && (
        <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-6 lg:p-12 z-100">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setShowMediaModal(false)} />
          <div className="relative bg-white w-full h-[90vh] sm:h-full rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 md:p-8 border-b-2 border-gray-50 flex justify-between items-center bg-white">
              <div>
                <h3 className="font-bold uppercase tracking-tighter text-xl md:text-2xl">Media Library</h3>
                <p className="text-[14px] font-bold text-gray-400 uppercase">Pilih dari media yang sudah diupload</p>
              </div>
              <button type="button" onClick={() => setShowMediaModal(false)} className="hover:bg-gray-100 p-2 md:p-3 rounded-full transition-all">
                <X className="size-6 md:size-8" /> 
              </button>
            </div>
            <div className="flex-1 p-4 md:p-8 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-6 bg-gray-50 custom-scrollbar">
              {existingImages.map((file: any, i) => (
                <div key={i} onClick={() => imageUrls.includes(file.name) ? setImageUrls(imageUrls.filter(u => u !== file.name)) : setImageUrls([...imageUrls, file.name])} className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-4 transition-all ${imageUrls.includes(file.name) ? 'border-black scale-95 shadow-xl' : 'border-transparent hover:border-black/10'}`}>
                  <Image src={file.url} fill className="object-cover" alt="media" unoptimized />
                  {imageUrls.includes(file.name) && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <CheckCircle2 className="text-white" size={32} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-4 border-t bg-white flex justify-end">
               <button onClick={() => setShowMediaModal(false)} className="bg-black text-white px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-[14px] active:scale-95 transition-all">Selesai</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; border-radius: 10px; }
      `}</style>
    </div>
  )
}