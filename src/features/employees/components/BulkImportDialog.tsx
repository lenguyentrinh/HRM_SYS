import { useState, useRef } from 'react'
import { Upload, Download, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

const CSV_TEMPLATE = `full_name,phone,type,department,position,base_salary,allowance,join_date
John Doe,0912345678,fulltime,Sales,Staff,8000000,500000,2026-01-15
Jane Smith,0987654321,parttime,Warehouse,Guard,4000000,0,2026-02-01`

function downloadTemplate() {
  const bom = '\uFEFF'
  const blob = new Blob([bom + CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'employee_import_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

interface ImportResult {
  success: number
  errors: string[]
}

export function BulkImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const branchId = useAuthStore((s) => s.activeBranchId ?? '')
  const qc = useQueryClient()

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setResult(null)
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    try {
      const text = await file.text()
      const { data, error } = await supabase.functions.invoke('bulk-import', {
        body: { csv_content: text, branch_id: branchId },
      })
      if (error) throw error
      const res = data as ImportResult
      setResult(res)
      if (res.success > 0) {
        qc.invalidateQueries({ queryKey: ['employees'] })
        toast.success(`Imported ${res.success} employees`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = (o: boolean) => {
    if (!o) { setFile(null); setResult(null) }
    onOpenChange(o)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Employees from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium mb-1">CSV Requirements:</p>
              <ul className="text-xs space-y-0.5 text-blue-700">
                <li>Required columns: <code>full_name, phone, type, base_salary, join_date</code></li>
                <li><code>type</code>: fulltime or parttime</li>
                <li><code>join_date</code>: YYYY-MM-DD format</li>
                <li>Phone must start with 0, 10 digits</li>
              </ul>
            </div>
          </div>

          <Button variant="outline" size="sm" className="gap-2 w-full" onClick={downloadTemplate}>
            <Download className="h-4 w-4" />
            Download CSV Template
          </Button>

          <div
            className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-orange-400 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              const dropped = e.dataTransfer.files[0]
              if (dropped) { setFile(dropped); setResult(null) }
            }}
          >
            <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            {file ? (
              <p className="text-sm font-medium text-orange-600">{file.name}</p>
            ) : (
              <>
                <p className="text-sm text-slate-500">Drag & drop or click to select file</p>
                <p className="text-xs text-slate-400 mt-1">Only .csv supported</p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          {result && (
            <div className={`p-3 rounded-lg border text-sm space-y-1.5 ${result.success > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              {result.success > 0 && (
                <div className="flex items-center gap-2 text-green-700 font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Import successful: {result.success} employees
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="text-red-700">
                  <p className="font-medium mb-1">Errors ({result.errors.length}):</p>
                  <ul className="text-xs space-y-0.5 max-h-32 overflow-y-auto">
                    {result.errors.map((e, i) => (
                      <li key={i}>- {e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleClose(false)}>Close</Button>
            <Button
              disabled={!file || loading}
              onClick={handleImport}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {loading ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
