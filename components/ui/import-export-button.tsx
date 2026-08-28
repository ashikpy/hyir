'use client'

import { useState } from 'react'
import { Download, Upload, ArrowUpDown } from 'lucide-react'
import { ImportExportModal } from './import-export-modal'

interface ImportExportButtonsProps {
  className?: string
}

export function ImportExportButtons({ className = '' }: ImportExportButtonsProps) {
  const [modalState, setModalState] = useState<{ isOpen: boolean; tab: 'export' | 'import' }>({
    isOpen: false,
    tab: 'export'
  })

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={() => setModalState({ isOpen: true, tab: 'import' })}
          className="flex items-center gap-1.5 border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900 text-zinc-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          title="Import jobs from CSV or JSON"
        >
          <Upload className="w-4 h-4 text-zinc-400" />
          <span>Import</span>
        </button>

        <button
          onClick={() => setModalState({ isOpen: true, tab: 'export' })}
          className="flex items-center gap-1.5 border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900 text-zinc-300 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          title="Export applications to CSV or JSON"
        >
          <Download className="w-4 h-4 text-zinc-400" />
          <span>Export</span>
        </button>
      </div>

      {modalState.isOpen && (
        <ImportExportModal
          isOpen={modalState.isOpen}
          initialTab={modalState.tab}
          onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        />
      )}
    </>
  )
}
