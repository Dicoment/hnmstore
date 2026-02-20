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

  async function handleSubmit(draft = false) {
    if (!name || !brandId || !modelId || !priceRegular) {
      alert('Nama, Brand, Model, dan Harga Regular WAJIB diisi!')
      return
    }
    setLoading(true)
    try {
      const productQuery = `
        INSERT INTO public."Product" 
        (name, slug, description, "brandId", "modelId", price, price_regular, price_promo, images, draft, "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING id
      `;
      const params = [
        name, createSlug(name), description, brandId, modelId, 
        Number(priceRegular),
        Number(priceRegular),
        pricePromo ? Number(pricePromo) : null, 
        imageUrls, draft
      ]

      const res = await fetch('/api/vps-db', { method: 'POST', body: JSON.stringify({ sql: productQuery, params }) })
      const result = await res.json()
      if (result.error) throw new Error(result.error)

      const productId = result.data[0].id
      if (productId && sizeStocks.length > 0) {
        for (const ss of sizeStocks) {
          if (ss.sizeId && ss.stock !== '') {
            await fetch('/api/vps-db', {
              method: 'POST',
              body: JSON.stringify({
                sql: `INSERT INTO public."ProductSizeStock" ("productId", "sizeId", stock, "createdAt") VALUES ($1, $2, $3, NOW())`,
                params: [productId, ss.sizeId, Number(ss.stock)]
              })
            })
          }
        }
      }
      alert(draft ? 'Draft tersimpan!' : 'Produk Berhasil Terbit!')
      window.location.href = '/admin/produk'
    } catch (err: any) { alert('Gagal Simpan: ' + err.message) } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#FBFBFB] font-sans text-[14px] pb-24 md:pb-10">
      <div className="w-full flex flex-col">
        
        {/* HEADER: RESPONSIVE PADDING & FONT */}
        <div className="w-full bg-white border-b border-gray-100 p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center sticky top-0 md:z-100 gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-black rounded-xl flex items-center justify-center text-white shrink-0">
              <PackagePlus size={20} className="md:size-6" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black uppercase tracking-tighter text-black leading-none">Tambah Produk</h1>
              <p className="text-[10px] md:text-[12px] font-bold text-gray-400 uppercase tracking-widest mt-1">HnM Store Jepara</p>
            </div>
          </div>
          <div className="flex w-full sm:w-auto gap-2 md:gap-3">
            <button type="button" onClick={() => handleSubmit(true)} disabled={loading} className="flex-1 sm:flex-none px-4 md:px-6 py-2.5 md:py-3 bg-white border border-gray-200 rounded-xl font-black text-[10px] md:text-[12px] uppercase tracking-widest hover:bg-gray-50 transition-all">DRAFT</button>
            <button type="button" onClick={() => handleSubmit(false)} disabled={loading} className="flex-2 sm:flex-none px-6 md:px-8 py-2.5 md:py-3 bg-black text-white rounded-xl font-black text-[10px] md:text-[12px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 md:gap-3 shadow-xl hover:bg-zinc-800 active:scale-95 transition-all">
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} TERBITKAN
            </button>
          </div>
        </div>

        {/* MAIN AREA: GRID 12 COL BIAR FLEXIBEL */}
        <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 w-full">
          
          {/* LEFT COLUMN: FORM UTAMA */}
          <div className="lg:col-span-8 space-y-6 md:space-y-8">
            
            {/* GALLERY SECTION */}
            <div className="bg-white p-4 md:p-8 rounded-xl border border-gray-100 shadow-sm space-y-4 md:space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <label className="text-[11px] md:text-[12px] font-black text-gray-400 uppercase tracking-widest">Gallery & Media</label>
                <div className="flex gap-2 w-full sm:w-auto">
                  <label className="flex-1 sm:flex-none cursor-pointer px-3 md:px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg font-black uppercase flex items-center justify-center gap-2 transition-all text-[10px] md:text-[11px]">
                    <Upload size={14} /> Upload
                    <input type="file" multiple className="hidden" onChange={(e) => e.target.files && handleUpload(Array.from(e.target.files))} />
                  </label>
                  <button type="button" onClick={() => setShowMediaModal(true)} className="flex-1 sm:flex-none px-3 md:px-4 py-2 bg-black text-white rounded-lg font-black uppercase flex items-center justify-center gap-2 transition-all shadow-md text-[10px] md:text-[11px]">
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
                {imageUrls.length === 0 && !uploading && (
                   <div className="col-span-full py-10 flex flex-col items-center justify-center text-gray-300">
                      <ImageIcon size={40} strokeWidth={1} />
                      <p className="text-[10px] font-black uppercase mt-2">No Images Selected</p>
                   </div>
                )}
              </div>
            </div>

            {/* PRODUCT DETAILS SECTION */}
            <div className="bg-white p-5 md:p-8 rounded-xl border border-gray-100 shadow-sm space-y-6 md:space-y-8">
              <div className="space-y-2">
                <label className="text-[11px] md:text-[12px] font-black text-gray-400 uppercase tracking-widest">Model Name</label>
                <input type="text" placeholder="NIKE AIR JORDAN 1 LOW..." value={name} onChange={e => setName(e.target.value)} className="w-full bg-transparent border-b-2 border-gray-100 focus:border-black py-2 md:py-4 outline-none font-black text-xl md:text-2xl uppercase transition-all" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-3">
                  <label className="font-black text-gray-400 uppercase tracking-widest text-[11px] md:text-[12px]">Brand</label>
                  <select value={brandId} onChange={e => setBrandId(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3.5 md:py-4 font-black uppercase outline-none appearance-none cursor-pointer hover:bg-gray-100 transition-colors">
                    <option value="">SELECT BRAND</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="font-black text-gray-400 uppercase tracking-widest text-[11px] md:text-[12px]">Model</label>
                  <select value={modelId} onChange={e => setModelId(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3.5 md:py-4 font-black uppercase outline-none appearance-none cursor-pointer hover:bg-gray-100 transition-colors">
                    <option value="">SELECT MODEL</option>
                    {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                <label className="font-black text-gray-400 uppercase tracking-widest text-[11px] md:text-[12px]">Description</label>
                <textarea rows={5} placeholder="Product details..." value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl p-4 md:p-5 outline-none font-medium text-[13px] md:text-[14px] text-gray-700 resize-none hover:bg-gray-100 transition-colors" />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: FINANCIALS & INVENTORY */}
          <div className="lg:col-span-4 space-y-6 md:space-y-8">
            
            {/* FINANCIAL CARD */}
            <div className="bg-black p-6 md:p-8 rounded-xl text-white shadow-2xl space-y-6 md:space-y-8">
              <h3 className="font-black uppercase tracking-[0.2em] border-b border-white/10 pb-4 text-[11px] md:text-[12px]">Financials</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-zinc-500 font-black uppercase tracking-widest text-[10px] md:text-[11px]">Regular Price</label>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-zinc-700 text-[14px]">RP</span>
                    <input type="number" value={priceRegular} onChange={e => setPriceRegular(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-transparent border-b border-zinc-700 focus:border-white py-2 outline-none font-black text-xl md:text-2xl transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-red-500 font-black uppercase tracking-widest text-[10px] md:text-[11px]">Promo Price</label>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-red-900 text-[14px]">RP</span>
                    <input type="number" value={pricePromo} onChange={e => setPricePromo(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-transparent border-b border-zinc-700 focus:border-red-600 py-2 outline-none font-black text-xl md:text-2xl text-red-500 transition-all" />
                  </div>
                </div>
              </div>
            </div>

            {/* INVENTORY CARD */}
            <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-100 shadow-sm space-y-5 md:space-y-6">
              <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                <h3 className="font-black uppercase tracking-widest text-[11px] md:text-[12px]">Inventory Stock</h3>
                <button type="button" onClick={() => setSizeStocks([...sizeStocks, { sizeId: '', stock: '' }])} className="bg-black text-white p-2 rounded-lg hover:scale-110 active:scale-95 transition-all shadow-md"><Plus size={16} /></button>
              </div>
              <div className="space-y-3">
                {sizeStocks.map((ss, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 md:p-3 bg-gray-50 rounded-xl border border-transparent hover:border-gray-200 transition-all">
                    <select value={ss.sizeId} onChange={e => { const n = [...sizeStocks]; n[idx].sizeId = e.target.value; setSizeStocks(n); }} className="flex-1 bg-white border-none rounded-lg px-2 md:px-3 py-2.5 md:py-3 font-black uppercase outline-none text-[11px] md:text-[12px] appearance-none">
                      <option value="">SIZE</option>
                      {sizes.map(s => <option key={s.id} value={s.id}>{s.value}</option>)}
                    </select>
                    <input type="number" placeholder="QTY" value={ss.stock} onChange={e => { const n = [...sizeStocks]; n[idx].stock = e.target.value === '' ? '' : Number(e.target.value); setSizeStocks(n); }} className="w-16 md:w-20 bg-white border-none rounded-lg px-2 md:px-3 py-2.5 md:py-3 font-black text-center outline-none text-[11px] md:text-[12px]" />
                    <button type="button" onClick={() => setSizeStocks(sizeStocks.filter((_, i) => i !== idx))} className="text-zinc-300 hover:text-red-500 p-1 transition-colors"><X size={16}/></button>
                  </div>
                ))}
                {sizeStocks.length === 0 && (
                  <div className="py-4 text-center border-2 border-dashed border-gray-50 rounded-xl">
                    <p className="text-[10px] font-black uppercase text-gray-300 tracking-tighter">No Sizes Added</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MEDIA MODAL: RESPONSIVE HEIGHT & GRID */}
      {showMediaModal && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center p-2 sm:p-6 lg:p-12">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setShowMediaModal(false)} />
          <div className="relative bg-white w-full h-[90vh] sm:h-full rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-5 md:p-8 border-b-2 border-gray-50 flex justify-between items-center bg-white">
              <div>
                <h3 className="font-black uppercase tracking-tighter text-xl md:text-2xl">Media Library</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Select from VPS Storage</p>
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
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center animate-in fade-in zoom-in">
                      <CheckCircle2 className="text-white" size={32} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="p-4 border-t bg-white flex justify-end">
               <button onClick={() => setShowMediaModal(false)} className="bg-black text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[12px] active:scale-95 transition-all">Selesai</button>
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