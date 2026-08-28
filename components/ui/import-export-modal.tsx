'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  HelpCircle,
  RefreshCw,
  Layers,
  ArrowRight
} from 'lucide-react'
import {
  exportApplicationsData,
  importApplicationsData,
  ImportPayloadRecord
} from '@/app/actions'
import {
  exportToCSV,
  exportToJSON,
  parseApplicationsFromCSV,
  parseApplicationsFromJSON,
  getSampleCSVTemplate,
  ParsedImportRecord,
  ExportableApplication
} from '@/lib/import-export'
import { ApplicationStatus } from '@prisma/client'

interface ImportExportModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: 'export' | 'import'
}

type TabType = 'export' | 'import'
type DuplicateStrategy = 'skip' | 'update' | 'create_new'

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All Applications', value: 'ALL' },
  { label: 'Active Pipeline Only', value: 'ACTIVE' },
  { label: 'Drafts / Saved', value: 'SAVED' },
  { label: 'Applied', value: 'APPLIED' },
  { label: 'Interviews & Screenings', value: 'INTERVIEW_STAGE' },
  { label: 'Offers', value: 'OFFER' },
  { label: 'Archived (Rejected / Ghosted / Withdrawn)', value: 'ARCHIVED' },
]

export function ImportExportModal({
  isOpen,
  onClose,
  initialTab = 'export'
}: ImportExportModalProps) {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)

  useEffect(() => {
    setMounted(true)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Export State
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv')
  const [exportFilter, setExportFilter] = useState('ALL')
  const [isExporting, setIsExporting] = useState(false)
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null)

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null)
  const [parsedRecords, setParsedRecords] = useState<ParsedImportRecord[]>([])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('skip')
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{
    total: number
    imported: number
    updated: number
    skipped: number
    errors: string[]
  } | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [pasteMode, setPasteMode] = useState(false)
  const [pastedText, setPastedText] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  // --------------------------------------------------------------------
  // Export Handlers
  // --------------------------------------------------------------------
  async function handleExport() {
    setIsExporting(true)
    setExportSuccessMsg(null)
    try {
      const data = await exportApplicationsData()

      // Filter applications if requested
      let filtered = data as ExportableApplication[]
      if (exportFilter === 'ACTIVE') {
        const activeStatuses: ApplicationStatus[] = ['APPLIED', 'CONTACTED', 'SCREENING', 'INTERVIEW', 'ASSIGNMENT', 'OFFER']
        filtered = filtered.filter(app => activeStatuses.includes(app.status))
      } else if (exportFilter === 'SAVED') {
        filtered = filtered.filter(app => app.status === 'SAVED')
      } else if (exportFilter === 'APPLIED') {
        filtered = filtered.filter(app => app.status === 'APPLIED')
      } else if (exportFilter === 'INTERVIEW_STAGE') {
        filtered = filtered.filter(app => ['SCREENING', 'INTERVIEW', 'ASSIGNMENT'].includes(app.status))
      } else if (exportFilter === 'OFFER') {
        filtered = filtered.filter(app => ['OFFER', 'ACCEPTED'].includes(app.status))
      } else if (exportFilter === 'ARCHIVED') {
        filtered = filtered.filter(app => ['REJECTED', 'GHOSTED', 'WITHDRAWN'].includes(app.status))
      }

      if (filtered.length === 0) {
        alert('No applications matched the selected filter to export.')
        setIsExporting(false)
        return
      }

      const today = new Date().toISOString().split('T')[0]
      let blob: Blob
      let filename: string

      if (exportFormat === 'csv') {
        const csvContent = exportToCSV(filtered)
        blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        filename = `jobhunt-applications-${today}.csv`
      } else {
        const jsonContent = exportToJSON(filtered)
        blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
        filename = `jobhunt-backup-${today}.json`
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setExportSuccessMsg(`Successfully exported ${filtered.length} applications to ${filename}`)
    } catch (err) {
      console.error(err)
      alert('Failed to export applications data.')
    } finally {
      setIsExporting(false)
    }
  }

  // --------------------------------------------------------------------
  // Import Handlers
  // --------------------------------------------------------------------
  function handleDownloadTemplate() {
    const templateCSV = getSampleCSVTemplate()
    const blob = new Blob([templateCSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'jobhunt-sample-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleFileSelected(file: File) {
    setImportFile(file)
    setParseError(null)
    setImportResult(null)
    setIsParsing(true)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      processImportContent(text, file.name.endsWith('.json'))
    }
    reader.onerror = () => {
      setParseError('Failed to read file.')
      setIsParsing(false)
    }
    reader.readAsText(file)
  }

  function processImportContent(content: string, isJson: boolean) {
    try {
      let records: ParsedImportRecord[] = []
      if (isJson || content.trim().startsWith('{') || content.trim().startsWith('[')) {
        records = parseApplicationsFromJSON(content)
      } else {
        records = parseApplicationsFromCSV(content)
      }

      if (records.length === 0) {
        setParseError('No application records found in the provided file/text.')
        setParsedRecords([])
        setSelectedIndices(new Set())
      } else {
        setParsedRecords(records)
        // Select all valid records by default
        const validIndices = new Set<number>()
        records.forEach((r, idx) => {
          if (r.isValid) validIndices.add(idx)
        })
        setSelectedIndices(validIndices)
        setParseError(null)
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse import content.')
      setParsedRecords([])
      setSelectedIndices(new Set())
    } finally {
      setIsParsing(false)
    }
  }

  function toggleSelectAll() {
    if (selectedIndices.size === parsedRecords.filter(r => r.isValid).length) {
      setSelectedIndices(new Set())
    } else {
      const allValid = new Set<number>()
      parsedRecords.forEach((r, idx) => {
        if (r.isValid) allValid.add(idx)
      })
      setSelectedIndices(allValid)
    }
  }

  function toggleSelectRow(index: number) {
    const next = new Set(selectedIndices)
    if (next.has(index)) {
      next.delete(index)
    } else {
      next.add(index)
    }
    setSelectedIndices(next)
  }

  async function handleExecuteImport() {
    if (selectedIndices.size === 0) {
      alert('Please select at least one valid record to import.')
      return
    }

    setIsImporting(true)
    try {
      const recordsToImport: ImportPayloadRecord[] = Array.from(selectedIndices).map(idx => {
        const r = parsedRecords[idx]
        return {
          companyName: r.companyName,
          roleTitle: r.roleTitle,
          status: r.status,
          dateApplied: r.dateApplied,
          jobType: r.jobType,
          workplaceType: r.workplaceType,
          location: r.location,
          salary: r.salary,
          applicationUrl: r.applicationUrl,
          jobDescriptionUrl: r.jobDescriptionUrl,
          contactName: r.contactName,
          contactRole: r.contactRole,
          contactEmail: r.contactEmail,
          contactUrl: r.contactUrl,
          nextFollowUpDate: r.nextFollowUpDate,
          notes: r.notes,
          resumeVersion: r.resumeVersion,
          portfolioVersion: r.portfolioVersion,
          timelineEvents: r.timelineEvents,
        }
      })

      const res = await importApplicationsData(recordsToImport, duplicateStrategy)
      setImportResult(res)
    } catch (err) {
      console.error(err)
      alert('Error during import execution.')
    } finally {
      setIsImporting(false)
    }
  }

  function resetImport() {
    setImportFile(null)
    setParsedRecords([])
    setSelectedIndices(new Set())
    setImportResult(null)
    setParseError(null)
    setPastedText('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/85 backdrop-blur-md animate-fade-in transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container with Solid Background */}
      <div 
        className="relative z-10 w-full max-w-2xl bg-[#0c0c0e] border border-zinc-800 rounded-2xl shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        style={{ backgroundColor: '#0c0c0e' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#0c0c0e]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Data Management</h2>
              <p className="text-xs text-zinc-500">Import and export your job applications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-850 bg-[#09090b] px-6 pt-2">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'export'
                ? 'border-zinc-200 text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-zinc-200 text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#09090b]">
          {/* ======================= EXPORT TAB ======================= */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              {/* Format selection cards */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-3">
                  1. Choose Export Format
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => setExportFormat('csv')}
                    className={`cursor-pointer rounded-xl border p-4 transition-all flex items-start gap-4 ${
                      exportFormat === 'csv'
                        ? 'border-zinc-400 bg-zinc-900 ring-1 ring-zinc-500/30'
                        : 'border-zinc-800 bg-[#121215] hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <div className="p-2.5 rounded-lg bg-emerald-950 border border-emerald-800/60 text-emerald-400">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-zinc-100">CSV Spreadsheet</span>
                        {exportFormat === 'csv' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Best for Excel, Google Sheets, Notion table imports, or data analysis.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setExportFormat('json')}
                    className={`cursor-pointer rounded-xl border p-4 transition-all flex items-start gap-4 ${
                      exportFormat === 'json'
                        ? 'border-zinc-400 bg-zinc-900 ring-1 ring-zinc-500/30'
                        : 'border-zinc-800 bg-[#121215] hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <div className="p-2.5 rounded-lg bg-blue-950 border border-blue-800/60 text-blue-400">
                      <FileCode className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-zinc-100">JSON Archive</span>
                        {exportFormat === 'json' && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        Full-fidelity backup including nested timeline events, recruiters, and version tags.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scope filter */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-2">
                  2. Select Filter / Scope
                </label>
                <select
                  value={exportFilter}
                  onChange={(e) => setExportFilter(e.target.value)}
                  className="w-full bg-[#121215] border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-zinc-600 transition-colors"
                >
                  {STATUS_FILTERS.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>

              {/* Success notification */}
              {exportSuccessMsg && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                  <span>{exportSuccessMsg}</span>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-black py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 shadow-lg shadow-black/40 cursor-pointer"
                >
                  {isExporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> Download {exportFormat.toUpperCase()} File
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ======================= IMPORT TAB ======================= */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              {/* If import result is available, show success report */}
              {importResult ? (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="text-center py-4 space-y-2">
                    <div className="inline-flex p-3 rounded-full bg-emerald-950/60 border border-emerald-700/50 text-emerald-400 mb-2">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-100">Import Complete!</h3>
                    <p className="text-sm text-zinc-400">
                      Successfully processed {importResult.total} records.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
                      <span className="block text-2xl font-bold text-emerald-400">{importResult.imported}</span>
                      <span className="text-xs text-zinc-500">Created New</span>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
                      <span className="block text-2xl font-bold text-blue-400">{importResult.updated}</span>
                      <span className="text-xs text-zinc-500">Updated</span>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
                      <span className="block text-2xl font-bold text-zinc-400">{importResult.skipped}</span>
                      <span className="text-xs text-zinc-500">Skipped</span>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200 space-y-1">
                      <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                        <AlertCircle className="w-4 h-4" /> Warnings & Skipped Items:
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-zinc-400">
                        {importResult.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>...and {importResult.errors.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={resetImport}
                      className="flex-1 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-sm font-medium transition-colors"
                    >
                      Import Another File
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-white text-black rounded-xl text-sm font-medium transition-colors"
                    >
                      Done & View Applications
                    </button>
                  </div>
                </div>
              ) : parsedRecords.length === 0 ? (
                /* Step 1: Upload / Input */
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs uppercase tracking-wider font-semibold text-zinc-500">
                      Upload File (.CSV or .JSON)
                    </label>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 underline transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Sample CSV Template
                    </button>
                  </div>

                  {!pasteMode ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault() }}
                      onDrop={(e) => {
                        e.preventDefault()
                        if (e.dataTransfer.files?.[0]) {
                          handleFileSelected(e.dataTransfer.files[0])
                        }
                      }}
                      className="border-2 border-dashed border-zinc-800 hover:border-zinc-600 bg-zinc-900/30 hover:bg-zinc-900/50 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.json,text/csv,application/json"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleFileSelected(e.target.files[0])
                        }}
                      />
                      <div className="p-3.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-zinc-200 group-hover:scale-105 transition-all">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">
                          Click to browse or drag and drop
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Compatible with CSV files from Excel, Notion, LinkedIn, Simplify, Huntr, or JSON backups
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        rows={8}
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder="Paste CSV rows or JSON array here..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-300 focus:outline-none focus:border-zinc-600"
                      />
                      <button
                        type="button"
                        onClick={() => processImportContent(pastedText, pastedText.trim().startsWith('{') || pastedText.trim().startsWith('['))}
                        disabled={!pastedText.trim()}
                        className="w-full py-2 bg-zinc-200 hover:bg-white text-black text-xs font-semibold rounded-lg transition-colors disabled:opacity-40"
                      >
                        Parse Pasted Data
                      </button>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs text-zinc-500 pt-1">
                    <button
                      type="button"
                      onClick={() => setPasteMode(!pasteMode)}
                      className="hover:text-zinc-300 transition-colors"
                    >
                      {pasteMode ? '← Back to file upload' : 'Or paste raw text / CSV data directly'}
                    </button>
                  </div>

                  {parseError && (
                    <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 text-sm flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                      <span>{parseError}</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Step 2: Preview & Validation Table */
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between bg-[#121215] p-3 rounded-xl border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-zinc-400" />
                      <div>
                        <span className="text-sm font-medium text-zinc-200">
                          {importFile ? importFile.name : 'Pasted Data'}
                        </span>
                        <div className="text-xs text-zinc-500 flex items-center gap-2">
                          <span>{parsedRecords.length} records detected</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-medium">
                            {selectedIndices.size} selected for import
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={resetImport}
                      className="text-xs text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                    >
                      Choose Different File
                    </button>
                  </div>

                  {/* Duplicate Strategy Option */}
                  <div className="space-y-2">
                    <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-500">
                      If duplicate application exists (Same Company & Role):
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setDuplicateStrategy('skip')}
                        className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all cursor-pointer ${
                          duplicateStrategy === 'skip'
                            ? 'border-zinc-400 bg-zinc-800 text-white'
                            : 'border-zinc-800 bg-[#121215] text-zinc-400 hover:text-zinc-300'
                        }`}
                      >
                        <span className="font-semibold block">Skip duplicates</span>
                        <span className="text-[10px] text-zinc-500">Keep existing entry</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDuplicateStrategy('update')}
                        className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all cursor-pointer ${
                          duplicateStrategy === 'update'
                            ? 'border-zinc-400 bg-zinc-800 text-white'
                            : 'border-zinc-800 bg-[#121215] text-zinc-400 hover:text-zinc-300'
                        }`}
                      >
                        <span className="font-semibold block">Update existing</span>
                        <span className="text-[10px] text-zinc-500">Overwrite with new data</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDuplicateStrategy('create_new')}
                        className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-all cursor-pointer ${
                          duplicateStrategy === 'create_new'
                            ? 'border-zinc-400 bg-zinc-800 text-white'
                            : 'border-zinc-800 bg-[#121215] text-zinc-400 hover:text-zinc-300'
                        }`}
                      >
                        <span className="font-semibold block">Import all as new</span>
                        <span className="text-[10px] text-zinc-500">Create separate entries</span>
                      </button>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-zinc-800 rounded-xl overflow-hidden bg-[#121215] max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-900 text-zinc-400 sticky top-0 border-b border-zinc-800">
                        <tr>
                          <th className="p-2.5 w-8 text-center">
                            <input
                              type="checkbox"
                              checked={selectedIndices.size > 0 && selectedIndices.size === parsedRecords.filter(r => r.isValid).length}
                              onChange={toggleSelectAll}
                              className="rounded border-zinc-700 bg-zinc-900"
                            />
                          </th>
                          <th className="p-2.5 font-medium">Company</th>
                          <th className="p-2.5 font-medium">Role</th>
                          <th className="p-2.5 font-medium">Status</th>
                          <th className="p-2.5 font-medium">Location / Comp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {parsedRecords.map((record, index) => {
                          const isSelected = selectedIndices.has(index)
                          return (
                            <tr
                              key={index}
                              onClick={() => record.isValid && toggleSelectRow(index)}
                              className={`cursor-pointer transition-colors ${
                                !record.isValid
                                  ? 'bg-red-950/20 opacity-60'
                                  : isSelected
                                  ? 'bg-zinc-900 hover:bg-zinc-850'
                                  : 'hover:bg-zinc-900/50 opacity-80'
                              }`}
                            >
                              <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  disabled={!record.isValid}
                                  checked={isSelected}
                                  onChange={() => toggleSelectRow(index)}
                                  className="rounded border-zinc-700 bg-zinc-900"
                                />
                              </td>
                              <td className="p-2.5 font-medium text-zinc-200">
                                {record.companyName}
                                {record.error && (
                                  <span className="block text-[10px] text-red-400 font-normal">{record.error}</span>
                                )}
                              </td>
                              <td className="p-2.5 text-zinc-300">{record.roleTitle}</td>
                              <td className="p-2.5">
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-300">
                                  {record.status}
                                </span>
                              </td>
                              <td className="p-2.5 text-zinc-400">
                                {record.location || record.salary ? (
                                  <span>{[record.location, record.salary].filter(Boolean).join(' • ')}</span>
                                ) : (
                                  <span className="text-zinc-600">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={resetImport}
                      className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleExecuteImport}
                      disabled={isImporting || selectedIndices.size === 0}
                      className="flex items-center gap-2 px-6 py-2.5 bg-zinc-100 hover:bg-white text-black rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-lg shadow-black/40"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Importing...
                        </>
                      ) : (
                        <>
                          Import {selectedIndices.size} Applications <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

