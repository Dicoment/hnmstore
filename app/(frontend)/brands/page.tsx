'use client'
import { Suspense } from 'react'
import { BrandsList } from './BrandList'
import { Loader2 } from 'lucide-react'

export default function BrandsPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    }>
      <BrandsList />
    </Suspense>
  )
}