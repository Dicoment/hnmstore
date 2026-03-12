'use client'

import { ReactNode } from 'react'

interface TableCustomProps {
  headers: string[];
  children: ReactNode;
  loading?: boolean;
}

export default function TableCustom({ headers, children, loading }: TableCustomProps) {
  return (
    <div className="w-full bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50/50 border-b border-gray-100">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50 text-black">
            {loading ? (
              <tr>
                <td colSpan={headers.length} className="p-24 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-300">
                      Syncing Database...
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}