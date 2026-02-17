'use client'
import { useState, useEffect, ChangeEvent } from "react"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { 
  Upload, Plus, Trash2, Save, Send, Image as ImageIcon, Loader2, X 
} from "lucide-react"

interface Brand { id: string; name: string }
interface Model { id: string; name: string }
interface Size { id: string; value: string }
interface ProductSizeStock { sizeId: string; stock: number | '' }

export default function TambahProdukPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [sizes, setSizes] = useState<Size[]>([])

  const [name, setName] = useState('') 
  const [description, setDescription] = useState('')
  const [brandId, setBrandId] = useState('')
  const [modelId, setModelId] = useState('')
  const [priceRegular, setPriceRegular] = useState<number | ''>('')
  const [pricePromo, setPricePromo] = useState<number | ''>('')
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [sizeStocks, setSizeStocks] = useState<ProductSizeStock[]>([])
  const [loading, setLoading] = useState(false)
  
  // State tambahan hanya untuk visual drag & drop
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    fetchBrands(); fetchModels(); fetchSizes()
  }, [])

  async function fetchBrands() {
    const { data } = await supabase.from('Brand').select('*')
    if (data) setBrands(data)
  }

  async function fetchModels() {
    const { data } = await supabase.from('Model').select('*')
    if (data) setModels(data)
  }

  async function fetchSizes() {
    const { data } = await supabase.from('Size').select('*')
    if (data) setSizes(data)
  }

  // --- LOGIC IMAGE BAWAAN LO ---
  const processFiles = (filesArray: File[]) => {
    const validFiles = filesArray.filter(file => {
      if (file.size > 1048576) {
        alert(`File ${file.name} kegedean! Harus di bawah 1 MB.`)
        return false
      }
      return true
    })
    setImages(prev => [...prev, ...validFiles])
    setImagePreviews(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))])
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    processFiles(Array.from(e.target.files))
  }

  // UI Helper Drag & Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    if (e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files))
  }

  function removeImage(index: number) {
    setImages(images.filter((_, i) => i !== index))
    setImagePreviews(imagePreviews.filter((_, i) => i !== index))
  }

  function handleAddSizeStock() {
    setSizeStocks([...sizeStocks, { sizeId: '', stock: '' }])
  }

  function handleSizeChange(index: number, field: 'sizeId' | 'stock', value: string | number) {
    const newStocks = [...sizeStocks]
    if (field === 'stock') {
      newStocks[index] = { ...newStocks[index], stock: value === '' ? '' : Number(value) }
    } else {
      newStocks[index] = { ...newStocks[index], sizeId: value as string }
    }
    setSizeStocks(newStocks)
  }

  function createSlug(text: string) {
    return text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '')
  }

  // LOGIKA ASLI 100% - TIDAK ADA PERUBAHAN NAMA KEY PAYLOAD
  async function handleSubmit(draft = false) {
    if (!name || !brandId || !modelId || !priceRegular) {
      alert('Mohon lengkapi Nama Produk, Brand, Model, dan Harga')
      return
    }
    setLoading(true)

    try {
      const uploadedUrls: string[] = []
      for (const file of images) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const { error } = await supabase.storage.from('ProductImage').upload(fileName, file)
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from('ProductImage').getPublicUrl(fileName)
        uploadedUrls.push(publicUrl)
      }

      const payload = {
        name, 
        slug: createSlug(name) || `p-${Date.now()}`,
        description,
        brandId: brandId, brand_id: brandId,     
        modelId: modelId, model_id: modelId,     
        price: Number(priceRegular), price_regular: Number(priceRegular),
        price_promo: pricePromo ? Number(pricePromo) : null,
        images: uploadedUrls,
        draft: draft
      }

      const { data: productData, error: productError } = await supabase.from('Product').insert([payload]).select()
      if (productError) throw productError

      const productId = productData?.[0]?.id
      if (productId && sizeStocks.length) {
        const stocksToInsert = sizeStocks
          .filter(ss => ss.sizeId && ss.stock !== '')
          .map(ss => ({
            productId: productId, sizeId: ss.sizeId, stock: Number(ss.stock)
          }))
        if (stocksToInsert.length > 0) {
          const { error: stockError } = await supabase.from('ProductSizeStock').insert(stocksToInsert)
          if (stockError) throw stockError
        }
      }

      alert(draft ? 'Draft berhasil disimpan!' : 'Produk berhasil diterbitkan!')
      resetForm()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      alert('Error: ' + message)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setName(''); setDescription(''); setBrandId(''); setModelId('')
    setPriceRegular(''); setPricePromo(''); setImages([]); setImagePreviews([])
    setSizeStocks([])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] font-sans text-black">
      <div className="flex flex-col flex-1 bg-white border border-gray-200 overflow-hidden rounded-lg mx-4 my-2 shadow-sm">
        
        {/* HEADER */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20">
          <div>
            <h1 className="text-xl font-black italic tracking-tighter uppercase flex items-center gap-2 text-black">
              <ImageIcon size={20} /> Tambah Produk
            </h1>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Inventory Management</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleSubmit(true)} disabled={loading} className="px-5 py-2.5 bg-gray-50 text-gray-600 rounded-md font-black text-[10px] uppercase tracking-widest hover:bg-gray-100">
              Draft
            </button>
            <button onClick={() => handleSubmit(false)} disabled={loading} className="px-8 py-2.5 bg-black text-white rounded-md font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl active:scale-95 transition-all">
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />} Terbitkan
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar bg-white">
          <div className="max-w-full mx-auto flex flex-col lg:flex-row gap-8 pb-10">
            
            <div className="flex-1 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Galeri Foto Produk</label>
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-2 border-dashed rounded-lg transition-all ${isDragging ? 'border-black bg-gray-50' : 'border-gray-200 bg-white'}`}
                >
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative aspect-square rounded-md overflow-hidden border border-gray-100 bg-white">
                      <Image src={src} fill className="object-cover" alt="preview" unoptimized />
                      <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black text-white p-1 rounded-md active:scale-90 shadow-md"><Trash2 size={12} /></button>
                    </div>
                  ))}
                  <label className="aspect-square flex flex-col items-center justify-center border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50 transition-all group bg-white">
                    <Upload size={18} className="text-gray-400 group-hover:text-black" />
                    <span className="text-[8px] text-gray-400 font-black uppercase mt-2 group-hover:text-black">Upload</span>
                    <input type="file" multiple onChange={handleImageChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Nama Produk</label>
                  <input type="text" placeholder="Nama Produk .." value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-200 rounded-md px-4 py-3 outline-none focus:border-black font-medium text-black bg-white" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Deskripsi</label>
                  <textarea rows={4} placeholder="Detail produk..." value={description} onChange={e => setDescription(e.target.value)} className="w-full border border-gray-200 rounded-md px-4 py-3 outline-none focus:border-black font-medium text-black bg-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Brand</label>
                    <select value={brandId} onChange={e => setBrandId(e.target.value)} className="w-full border border-gray-200 rounded-md px-3 py-3 outline-none font-black uppercase text-[11px] bg-white text-black cursor-pointer">
                      <option value="">Pilih Brand</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Model</label>
                    <select value={modelId} onChange={e => setModelId(e.target.value)} className="w-full border border-gray-200 rounded-md px-3 py-3 outline-none font-black uppercase text-[11px] bg-white text-black cursor-pointer">
                      <option value="">Pilih Model</option>
                      {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:w-80 space-y-6">
              <div className="p-6 border-2 border-black rounded-xl bg-white shadow-sm">
                <h3 className="text-[10px] font-black uppercase mb-4 tracking-widest">Penetapan Harga</h3>
                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-[10px] font-black text-gray-400">Rp</span>
                    <input type="number" value={priceRegular} onChange={e => setPriceRegular(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border border-gray-200 rounded-md pl-9 pr-4 py-3 outline-none focus:border-black font-black text-lg text-black bg-white" placeholder="Harga Jual" />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-[10px] font-black text-gray-400">Rp</span>
                    <input type="number" value={pricePromo} onChange={e => setPricePromo(e.target.value === '' ? '' : Number(e.target.value))} className="w-full border border-gray-200 rounded-md pl-9 pr-4 py-3 outline-none focus:border-black font-black text-lg text-red-600 bg-white" placeholder="Promo" />
                  </div>
                </div>
              </div>

              <div className="p-6 border border-gray-200 rounded-xl bg-white space-y-5 shadow-sm">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Size & Stock</h3>
                  <button type="button" onClick={handleAddSizeStock} className="text-black border border-black p-1 rounded-md hover:bg-black hover:text-white transition-all active:scale-90">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="space-y-2.5">
                  {sizeStocks.map((ss, idx) => (
                    <div key={idx} className="flex items-center gap-2 animate-in slide-in-from-right duration-300">
                      <select value={ss.sizeId} onChange={e => handleSizeChange(idx, 'sizeId', e.target.value)} className="flex-1 border border-gray-200 rounded-md px-2 py-2 font-black text-[10px] bg-white text-black cursor-pointer">
                        <option value="">Size</option>
                        {sizes.map(s => <option key={s.id} value={s.id}>{s.value}</option>)}
                      </select>
                      <input type="number" placeholder="0" value={ss.stock} onChange={e => handleSizeChange(idx, 'stock', e.target.value)} className="w-16 border border-gray-200 rounded-md px-2 py-2 font-black text-[10px] bg-white text-black" />
                      <button type="button" onClick={() => setSizeStocks(sizeStocks.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 transition-colors"><X size={14} /></button>
                    </div>
                  ))}
                  {sizeStocks.length === 0 && <p className="text-[10px] text-gray-300 italic text-center py-2 uppercase font-black">Tambah Size Dulu</p>}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}