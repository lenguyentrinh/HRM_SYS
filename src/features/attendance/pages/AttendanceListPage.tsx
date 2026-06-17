import { useState, useMemo } from 'react'
import { Download, Trash2, Search, UserCheck, AlarmClock, UserX, TrendingUp, Calendar, AlertTriangle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
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

  const getCheckInTag = (r: AttendanceRecordJoined) => {
    if (!r.check_in_at) return null
    if (r.status === 'late') return { label: `Late: ${r.late_minutes ?? 0}m`, color: 'text-red-600' }
    if (r.shifts?.start_time) {
      const checkIn = new Date(r.check_in_at)
      const [h, m] = r.shifts.start_time.split(':').map(Number)
      const shiftStart = new Date(checkIn)
      shiftStart.setHours(h, m, 0, 0)
      if (checkIn < shiftStart) return { label: 'Early', color: 'text-blue-600' }
    }
    return { label: 'On Time', color: 'text-green-600' }
  }

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

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div>
      <PageHeader
        title="Attendance"
        description={todayStr}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-600 text-sm font-semibold tracking-[0.05em] rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              onClick={() => setShowManualDialog(true)}
              className="inline-flex items-center gap-2 px-6 py-2 bg-orange-500 text-white text-sm font-semibold tracking-[0.05em] rounded-lg hover:bg-orange-600 transition-all shadow-sm"
            >
              <UserCheck className="h-4 w-4" />
              Manual Check-in
            </button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-50">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-xs font-medium text-slate-500">Present</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{summary?.present ?? 0}</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs font-medium text-green-600">
              {summary?.total ? Math.round((summary.present / summary.total) * 100) : 0}% of total staff
            </span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-50">
              <AlarmClock className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-slate-500">Late</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{summary?.late ?? 0}</p>
          <div className="flex items-center gap-1 mt-1">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-xs font-medium text-amber-600">
              {summary?.late ?? 0} late entr{(summary?.late ?? 0) !== 1 ? 'ies' : 'y'}
            </span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-50">
              <UserX className="h-5 w-5 text-red-600" />
            </div>
            <span className="text-xs font-medium text-slate-500">Absent</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{summary?.absent ?? 0}</p>
          <div className="flex items-center gap-1 mt-1">
            <AlertCircle className="h-3.5 w-3.5 text-red-600" />
            <span className="text-xs font-medium text-red-600">
              {summary?.absent ?? 0} unexcused absence{(summary?.absent ?? 0) !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      {/* Filters */}
<div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

    {/* Search */}
    <div className="relative flex-1 min-w-[320px]">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

      <Input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setPage(0)
        }}
        placeholder="Search employee..."
        className="
          h-11
          pl-10
          text-sm
          bg-slate-50
          border-slate-200
          focus:ring-2
          focus:ring-orange-500
          focus:border-orange-500
        "
      />
    </div>

    {/* Filters */}
    <div className="flex flex-wrap items-center gap-2">

      {/* Date */}
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white pl-3 h-11 text-sm">
        <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(0) }}
          className="h-full bg-transparent text-slate-600 text-sm border-0 outline-none focus:ring-0 w-[130px] [color-scheme:light]"
        />
        <span className="text-slate-300">–</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(0) }}
          className="h-full bg-transparent text-slate-600 text-sm border-0 outline-none focus:ring-0 w-[130px] [color-scheme:light]"
        />
      </div>

      {/* Shift */}
      <Select
        value={shiftFilter}
        onValueChange={(v) => {
          setShiftFilter(v)
          setPage(0)
        }}
      >
        <SelectTrigger className="h-11 w-[170px] bg-white">
          <SelectValue placeholder="All Shifts" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="">All Shifts</SelectItem>

          {(shifts ?? []).map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status */}
      <Select
        value={statusFilter}
        onValueChange={(v) => {
          setStatusFilter(v)
          setPage(0)
        }}
      >
        <SelectTrigger className="h-11 w-[170px] bg-white">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="">All Statuses</SelectItem>
          <SelectItem value="present">Present</SelectItem>
          <SelectItem value="late">Late</SelectItem>
          <SelectItem value="absent">Absent</SelectItem>
          <SelectItem value="leave">On Leave</SelectItem>
        </SelectContent>
      </Select>

      {/* Reset */}
      <button
        onClick={resetFilters}
        className="
          h-11
          px-4
          rounded-lg
          bg-orange-500
          text-white
          text-sm
          font-medium
          hover:bg-orange-600
          transition-colors
        "
      >
        Reset Filters
      </button>
    </div>
  </div>
</div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-4">
            <TableSkeleton rows={8} cols={8} />
          </div>
        ) : !filtered.length ? (
          <EmptyState title="No attendance records" description="Try adjusting filters or add a manual entry." />
        ) : (
          <Table>
            <TableHeader className="bg-slate-100 [&_tr]:border-b-0">
              <TableRow>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Employee</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Shift</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Check-in</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Check-out</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Total Hours</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Status</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-6 py-4">Notes</TableHead>
                <TableHead className="w-[60px] px-6 py-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((r) => (
                <TableRow key={r.id} className="even:bg-slate-50 hover:bg-slate-100 transition-colors">
                  <TableCell className="px-6 py-4">
                    <div>
                      <span className="text-base font-medium text-slate-900">{r.employees.full_name}</span>
                      <p className="text-xs text-slate-400 font-mono">{r.employees.employee_code}</p>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-slate-600">
                    <span>{r.shifts?.name ?? '—'}</span>
                    {r.shifts?.start_time && r.shifts?.end_time && (
                      <p className="text-xs text-slate-400">{r.shifts.start_time}–{r.shifts.end_time}</p>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 font-mono">
                        {r.check_in_at ? new Date(r.check_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </span>
                      {(() => {
                        const tag = getCheckInTag(r)
                        if (!tag) return null
                        return <span className={`text-[11px] font-medium whitespace-nowrap ${tag.color}`}>{tag.label}</span>
                      })()}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-slate-600 font-mono">
                    {r.check_out_at ? new Date(r.check_out_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-slate-500">
                    {calcTotalHours(r) ?? '—'}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge className={statusColors[r.status] ?? 'bg-slate-100 text-slate-600'}>
                      {r.status === 'leave' ? 'On Leave' : r.status.charAt(0).toUpperCase() + r.status.slice(1)}
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
            <div className="flex items-center gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
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
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
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
