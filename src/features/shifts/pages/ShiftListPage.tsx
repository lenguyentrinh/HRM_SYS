import { useState, useMemo } from 'react'
import {
  Plus, Search, Pencil, Trash2, Sun, SunMedium, Moon, Clock,
  TrendingUp, Filter, Download, Lightbulb, ArrowRight,
  ChevronLeft, ChevronRight, Play,
} from 'lucide-react'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ShiftForm } from '../components/ShiftForm'
import { useShifts, useUpsertShift, useDeleteShift } from '../hooks/useShifts'
import { useAuthStore } from '@/stores/authStore'
import type { ShiftFormValues } from '../types'
import type { Shift } from '@/types/database'

function generatePaginationPages(current: number, total: number): number[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i)
  const pages: number[] = []
  if (current <= 2) {
    for (let i = 0; i < Math.min(3, total); i++) pages.push(i)
    if (total > 3) { pages.push(-1); pages.push(total - 1) }
  } else if (current >= total - 3) {
    pages.push(0); pages.push(-1)
    for (let i = total - 3; i < total; i++) pages.push(i)
  } else {
    pages.push(0); pages.push(-1)
    for (let i = current - 1; i <= current + 1; i++) pages.push(i)
    pages.push(-1); pages.push(total - 1)
  }
  return pages
}

export function ShiftListPage() {
  const branchId = useAuthStore((s) => s.activeBranchId ?? '')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [showDialog, setShowDialog] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [deletingShift, setDeletingShift] = useState<Shift | null>(null)

  const { data: shifts, isLoading } = useShifts()
  const upsert = useUpsertShift()
  const remove = useDeleteShift()

  const filtered = useMemo(
    () => (shifts ?? []).filter((s) => s.name.toLowerCase().includes(search.toLowerCase())),
    [shifts, search],
  )

  const pageSize = 10
  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginatedShifts = filtered.slice(page * pageSize, (page + 1) * pageSize)

  const morningCount = useMemo(
    () => (shifts ?? []).filter((s) => {
      const h = parseInt(s.start_time.split(':')[0])
      return h >= 5 && h < 12
    }).length,
    [shifts],
  )
  const eveningCount = useMemo(
    () => (shifts ?? []).filter((s) => {
      const h = parseInt(s.start_time.split(':')[0])
      return h >= 12 && h < 18
    }).length,
    [shifts],
  )
  const nightCount = useMemo(
    () => (shifts ?? []).filter((s) => {
      const h = parseInt(s.start_time.split(':')[0])
      return h >= 18 || h < 5
    }).length,
    [shifts],
  )
  const activeCount = useMemo(
    () => (shifts ?? []).filter((s) => s.is_active).length,
    [shifts],
  )
  const totalCount = shifts?.length ?? 0
  const coveragePct = totalCount > 0 ? Math.round((activeCount / totalCount) * 1000) / 10 : 0
  const morningPct = totalCount > 0 ? Math.round((morningCount / totalCount) * 100) : 0
  const eveningPct = totalCount > 0 ? Math.round((eveningCount / totalCount) * 100) : 0
  const nightPct = totalCount > 0 ? Math.round((nightCount / totalCount) * 100) : 0

  const handleOpenCreate = () => {
    setEditingShift(null)
    setShowDialog(true)
  }

  const handleOpenEdit = (shift: Shift) => {
    setEditingShift(shift)
    setShowDialog(true)
  }

  const handleSubmit = (values: ShiftFormValues) => {
    upsert.mutate(
      { ...values, id: editingShift?.id, branch_id: branchId },
      { onSuccess: () => { setShowDialog(false); setEditingShift(null) } },
    )
  }

  const handleConfirmDelete = () => {
    if (!deletingShift) return
    remove.mutate(deletingShift, {
      onSuccess: () => setDeletingShift(null),
    })
  }

  return (
    <div>
      <PageHeader
        title="Shifts"
        description={`${activeCount} Active Shifts`}
        actions={
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-6 py-2 bg-orange-500 text-white text-sm font-semibold tracking-[0.05em] rounded-lg hover:bg-orange-600 transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Create Shift
          </button>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <Sun className="h-5 w-5 text-orange-500" />
              <span className="text-xs font-medium text-green-600">{morningPct}%</span>
            </div>
            <p className="text-sm text-slate-500">Morning Shifts</p>
            <p className="text-2xl font-bold text-slate-900">{morningCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <SunMedium className="h-5 w-5 text-slate-400" />
              <span className="text-xs font-medium text-slate-500">{eveningPct}%</span>
            </div>
            <p className="text-sm text-slate-500">Evening Shifts</p>
            <p className="text-2xl font-bold text-slate-900">{eveningCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <Moon className="h-5 w-5 text-indigo-500" />
              <span className="text-xs font-medium text-red-600">{nightPct}%</span>
            </div>
            <p className="text-sm text-slate-500">Night Shifts</p>
            <p className="text-2xl font-bold text-slate-900">{nightCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-1">
              <Clock className="h-5 w-5 text-slate-500" />
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-sm text-slate-500">Avg. Coverage</p>
            <p className="text-2xl font-bold text-slate-900">{coveragePct}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search by name..."
            className="pl-10 bg-slate-50 border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        <button className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors">
          <Filter className="h-4 w-4" />
        </button>
        <button className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors">
          <Download className="h-4 w-4" />
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={7} />
          </div>
        ) : !filtered.length ? (
          <EmptyState title="No shifts" description="Click 'Create Shift' to set up working shifts." />
        ) : (
          <Table>
            <TableHeader className="bg-slate-50 [&_tr]:border-b-0">
              <TableRow>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Shift Name</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Start Time</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">End Time</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Grace Period</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Special Status</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Status</TableHead>
                <TableHead className="w-[100px] px-6 py-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedShifts.map((shift) => (
                <TableRow key={shift.id} className="even:bg-slate-50 hover:bg-slate-100 transition-colors border-orange-200">
                  <TableCell className="px-6 py-4">
                    <span className="text-base font-medium text-slate-900">{shift.name}</span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-slate-600 font-mono">{shift.start_time}</TableCell>
                  <TableCell className="px-6 py-4 text-sm text-slate-600 font-mono">{shift.end_time}</TableCell>
                  <TableCell className="px-6 py-4 text-sm text-slate-500">{shift.grace_period_minutes} min</TableCell>
                  <TableCell className="px-6 py-4">
                    {shift.is_overnight && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                        <Moon className="h-3 w-3" />
                        Overnight
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {shift.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        <Play className="h-3 w-3" />
                        Paused
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(shift)}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingShift(shift)}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length} shifts
            </p>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {generatePaginationPages(page, totalPages).map((p, i) =>
                p === -1 ? (
                  <span key={`ellipsis-${i}`} className="inline-flex items-center justify-center h-9 w-9 text-sm text-slate-400">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`inline-flex items-center justify-center h-9 min-w-[36px] px-2 rounded-lg text-sm font-medium transition-colors ${
                      p === page
                        ? 'bg-orange-500 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {p + 1}
                  </button>
                )
              )}
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Contextual Help / Tips Grid */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-orange-500/10 to-transparent p-6 rounded-2xl border border-orange-500/20">
          <div className="flex items-center gap-3 mb-3">
            <Lightbulb className="h-5 w-5 text-orange-600 shrink-0" />
            <h4 className="font-bold text-slate-900">Pro-Tip: Grace Periods</h4>
          </div>
          <p className="text-sm text-slate-600">
            Setting a grace period helps automate late-markings. For example, a 15-minute grace period on an 08:00 AM shift won't flag attendance as "Late" until 08:16 AM.
          </p>
        </div>
        <a
          href="/admin/roster"
          className="flex items-center justify-between p-6 bg-slate-100 border border-slate-200 rounded-2xl hover:bg-slate-200/50 transition-colors group"
        >
          <div>
            <p className="font-bold text-slate-900">Manage Roster Rules</p>
            <p className="text-sm text-slate-500 mt-1">
              Review global rotation settings for automated shift assignment.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-orange-500 transition-colors shrink-0 ml-4" />
        </a>
      </div>

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) { setShowDialog(false); setEditingShift(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingShift ? 'Edit Shift' : 'Create Shift'}</DialogTitle>
          </DialogHeader>
          <ShiftForm
            defaultValues={editingShift ?? undefined}
            onSubmit={handleSubmit}
            isLoading={upsert.isPending}
            onCancel={() => { setShowDialog(false); setEditingShift(null) }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingShift}
        onOpenChange={(open) => { if (!open) setDeletingShift(null) }}
        title="Delete Shift"
        description={`Are you sure you want to delete "${deletingShift?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        isLoading={remove.isPending}
      />
    </div>
  )
}
