import { useState } from 'react'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ShiftForm } from '../components/ShiftForm'
import { useShifts, useUpsertShift, useDeleteShift } from '../hooks/useShifts'
import { useAuthStore } from '@/stores/authStore'
import type { ShiftFormValues } from '../types'
import type { Shift } from '@/types/database'

export function ShiftListPage() {
  const branchId = useAuthStore((s) => s.activeBranchId ?? '')
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [deletingShift, setDeletingShift] = useState<Shift | null>(null)

  const { data: shifts, isLoading } = useShifts()
  const upsert = useUpsertShift()
  const remove = useDeleteShift()

  const filtered = (shifts ?? []).filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase()),
  )

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
        title="Shift Management"
        description={`${shifts?.length ?? 0} shifts`}
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

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="pl-10 bg-slate-50 border-slate-200 max-w-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : !filtered.length ? (
          <EmptyState title="No shifts" description="Click 'Create Shift' to set up working shifts." />
        ) : (
          <Table>
            <TableHeader className="bg-slate-50 [&_tr]:border-b-0">
              <TableRow>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Name</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Start Time</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">End Time</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Grace Period</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Status</TableHead>
                <TableHead className="w-[100px] px-6 py-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((shift) => (
                <TableRow key={shift.id} className="even:bg-slate-50 hover:bg-slate-100 transition-colors border-orange-200">
                  <TableCell className="px-6 py-4">
                    <span className="text-base font-medium text-slate-900">{shift.name}</span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-slate-600 font-mono">{shift.start_time}</TableCell>
                  <TableCell className="px-6 py-4 text-sm text-slate-600 font-mono">
                    {shift.is_overnight && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 mr-2">
                        Overnight
                      </span>
                    )}
                    {shift.end_time}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-slate-500">{shift.grace_period_minutes} min</TableCell>
                  <TableCell className="px-6 py-4">
                    {shift.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        Inactive
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
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
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
