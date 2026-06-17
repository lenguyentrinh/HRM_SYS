import { useState, useMemo } from 'react'
import { Plus, Download, Trash2, Search } from 'lucide-react'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useAttendanceRecords, useAttendanceSummary, useUpsertAttendance, useDeleteAttendance, useActiveEmployees } from '../hooks/useAttendance'
import { useShifts } from '@/features/shifts/hooks/useShifts'
import { useAuthStore } from '@/stores/authStore'
import { formatDate, formatDateTime, minutesToHours } from '@/lib/utils'
import { downloadCSV } from '@/lib/export'
import { supabase } from '@/lib/supabase'
import type { AttendanceRecordJoined, ManualAttendanceValues } from '../types'
import type { AttendanceRecord } from '@/types/database'

function getMonthRange() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
  return {
    date_from: `${y}-${m}-01`,
    date_to: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
  }
}

const statusColors: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  late: 'bg-amber-100 text-amber-700',
  absent: 'bg-red-100 text-red-700',
  leave: 'bg-blue-100 text-blue-700',
  holiday: 'bg-purple-100 text-purple-700',
}

export function AttendanceListPage() {
  const branchId = useAuthStore((s) => s.activeBranchId ?? '')
  const monthRange = useMemo(() => getMonthRange(), [])

  const [dateFrom, setDateFrom] = useState(monthRange.date_from)
  const [dateTo, setDateTo] = useState(monthRange.date_to)
  const [statusFilter, setStatusFilter] = useState('')
  const [shiftFilter, setShiftFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showManualDialog, setShowManualDialog] = useState(false)
  const [deletingRecord, setDeletingRecord] = useState<AttendanceRecord | null>(null)
  const [page, setPage] = useState(0)

  const pageSize = 20

  const { data: records, isLoading } = useAttendanceRecords({
    date_from: dateFrom,
    date_to: dateTo,
    shift_id: shiftFilter,
    status: statusFilter,
  })
  const { data: summary } = useAttendanceSummary({
    date_from: dateFrom,
    date_to: dateTo,
    shift_id: shiftFilter,
  })
  const { data: shifts } = useShifts()
  const { data: employees } = useActiveEmployees()
  const upsert = useUpsertAttendance()
  const remove = useDeleteAttendance()

  const filtered = (records ?? []).filter((r) =>
    r.employees.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.employees.employee_code.toLowerCase().includes(search.toLowerCase()),
  )

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paged = filtered.slice(page * pageSize, page * pageSize + pageSize)

  const calcTotalHours = (r: AttendanceRecordJoined) => {
    if (!r.check_in_at || !r.check_out_at) return null
    const diff = new Date(r.check_out_at).getTime() - new Date(r.check_in_at).getTime()
    return minutesToHours(Math.round(diff / 60000))
  }

  const handleExportCSV = async () => {
    let query = supabase
      .from('attendance_records')
      .select('date, check_in_at, check_out_at, status, late_minutes, early_leave_minutes, overtime_minutes, notes, employees!inner(full_name, employee_code), shifts(name)')
      .eq('employees.branch_id', branchId)
      .order('date', { ascending: false })

    if (dateFrom) query = query.gte('date', dateFrom)
    if (dateTo) query = query.lte('date', dateTo)
    if (shiftFilter) query = query.eq('shift_id', shiftFilter)
    if (statusFilter) query = query.eq('status', statusFilter)

    const { data } = await query
    if (!data?.length) return

    const rows = (data as any[]).map((r) => [
      r.date,
      r.employees.full_name,
      r.employees.employee_code,
      r.shifts?.name ?? '',
      r.check_in_at ? formatDateTime(r.check_in_at) : '',
      r.check_out_at ? formatDateTime(r.check_out_at) : '',
      r.status,
      r.late_minutes != null ? String(r.late_minutes) : '',
      r.early_leave_minutes != null ? String(r.early_leave_minutes) : '',
      r.notes ?? '',
    ])
    const headers = ['Date', 'Employee', 'Code', 'Shift', 'Check In', 'Check Out', 'Status', 'Late (min)', 'Early Leave (min)', 'Notes']
    downloadCSV('attendance.csv', [headers, ...rows])
  }

  const resetFilters = () => {
    setDateFrom(monthRange.date_from)
    setDateTo(monthRange.date_to)
    setStatusFilter('')
    setShiftFilter('')
    setSearch('')
    setPage(0)
  }

  return (
    <div>
      <PageHeader
        title="Attendance Management"
        description={`${summary?.total ?? 0} records`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowManualDialog(true)}
              className="inline-flex items-center gap-2 px-6 py-2 bg-orange-500 text-white text-sm font-semibold tracking-[0.05em] rounded-lg hover:bg-orange-600 transition-all shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Manual Entry
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-600 text-sm font-semibold tracking-[0.05em] rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-slate-900">{summary?.total ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-600 mb-1">Present</p>
          <p className="text-2xl font-bold text-green-700">{summary?.present ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">Late</p>
          <p className="text-2xl font-bold text-amber-700">{summary?.late ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600 mb-1">Absent</p>
          <p className="text-2xl font-bold text-red-700">{summary?.absent ?? 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search employee..."
            className="pl-10 bg-slate-50 border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-500">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(0) }}
              className="w-[150px] bg-slate-50 border-slate-200 focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-500">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(0) }}
              className="w-[150px] bg-slate-50 border-slate-200 focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0) }}>
            <SelectTrigger className="w-[140px] bg-slate-50 border-slate-200 focus:ring-2 focus:ring-orange-500">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="late">Late</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="leave">Leave</SelectItem>
              <SelectItem value="holiday">Holiday</SelectItem>
            </SelectContent>
          </Select>
          <Select value={shiftFilter} onValueChange={(v) => { setShiftFilter(v); setPage(0) }}>
            <SelectTrigger className="w-[160px] bg-slate-50 border-slate-200 focus:ring-2 focus:ring-orange-500">
              <SelectValue placeholder="All Shifts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Shifts</SelectItem>
              {(shifts ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={8} cols={8} />
          </div>
        ) : !filtered.length ? (
          <EmptyState title="No attendance records" description="Try adjusting filters or add a manual entry." />
        ) : (
          <Table>
            <TableHeader className="bg-slate-50 [&_tr]:border-b-0">
              <TableRow>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Employee</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Date</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Shift</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Check In</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Check Out</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Hours</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Status</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Notes</TableHead>
                <TableHead className="w-[60px] px-6 py-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((r) => (
                <TableRow key={r.id} className="even:bg-slate-50 hover:bg-slate-100 transition-colors border-orange-200">
                  <TableCell className="px-6 py-4">
                    <div>
                      <span className="text-base font-medium text-slate-900">{r.employees.full_name}</span>
                      <p className="text-xs text-slate-400 font-mono">{r.employees.employee_code}</p>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-slate-600">{formatDate(r.date)}</TableCell>
                  <TableCell className="px-6 py-4 text-sm text-slate-600">{r.shifts?.name ?? '—'}</TableCell>
                  <TableCell className="px-6 py-4 text-sm text-slate-600 font-mono">
                    {r.check_in_at ? formatDateTime(r.check_in_at) : '—'}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-slate-600 font-mono">
                    {r.check_out_at ? formatDateTime(r.check_out_at) : '—'}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-slate-500">
                    {calcTotalHours(r) ?? '—'}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge className={statusColors[r.status] ?? 'bg-slate-100 text-slate-600'}>
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-slate-500 max-w-[150px] truncate">
                    {r.notes || '—'}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <button
                      onClick={() => setDeletingRecord(r)}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Entry Dialog */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manual Attendance Entry</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              upsert.mutate(
                {
                  employee_id: fd.get('employee_id') as string,
                  shift_id: fd.get('shift_id') as string,
                  date: fd.get('date') as string,
                  check_in_at: (fd.get('check_in_at') as string) || undefined,
                  check_out_at: (fd.get('check_out_at') as string) || undefined,
                  status: (fd.get('status') as ManualAttendanceValues['status']) ?? 'present',
                  notes: (fd.get('notes') as string) || undefined,
                  source: 'manual',
                },
                { onSuccess: () => setShowManualDialog(false) },
              )
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="employee_id">Employee *</Label>
              <select
                id="employee_id"
                name="employee_id"
                required
                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Select employee...</option>
                {(employees ?? []).map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="shift_id">Shift *</Label>
                <select
                  id="shift_id"
                  name="shift_id"
                  required
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Select shift...</option>
                  {(shifts ?? []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.start_time}-{s.end_time})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status *</Label>
                <select
                  id="status"
                  name="status"
                  required
                  className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="leave">Leave</option>
                  <option value="holiday">Holiday</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date *</Label>
              <Input id="date" name="date" type="date" required className="bg-slate-50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="check_in_at">Check In Time</Label>
                <Input id="check_in_at" name="check_in_at" type="datetime-local" className="bg-slate-50" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="check_out_at">Check Out Time</Label>
                <Input id="check_out_at" name="check_out_at" type="datetime-local" className="bg-slate-50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" placeholder="Optional notes..." className="bg-slate-50" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowManualDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending ? 'Saving...' : 'Save Record'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingRecord}
        onOpenChange={(open) => { if (!open) setDeletingRecord(null) }}
        title="Delete Attendance Record"
        description={`Delete attendance record for ${deletingRecord ? formatDate(deletingRecord.date) : ''}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (!deletingRecord) return
          remove.mutate(deletingRecord, { onSuccess: () => setDeletingRecord(null) })
        }}
        isLoading={remove.isPending}
      />
    </div>
  )
}
