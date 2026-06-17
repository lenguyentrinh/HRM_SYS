import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { useMyAttendanceRecords, useMyAttendanceSummary } from '../hooks/useAttendance'
import { formatDate, minutesToHours } from '@/lib/utils'
import type { AttendanceRecord, Shift } from '@/types/database'

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const statusColors: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  late: 'bg-amber-100 text-amber-700',
  absent: 'bg-red-100 text-red-700',
  leave: 'bg-blue-100 text-blue-700',
  holiday: 'bg-purple-100 text-purple-700',
}

export function MyAttendancePage() {
  const now = useMemo(() => new Date(), [])
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: records, isLoading } = useMyAttendanceRecords(month, year)
  const { data: summary } = useMyAttendanceSummary(month, year)

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  const canGoNext = month < now.getMonth() + 1 || year < now.getFullYear()

  const calcTotalHours = (r: AttendanceRecord & { shifts: Pick<Shift, 'name' | 'start_time' | 'end_time'> }) => {
    if (!r.check_in_at || !r.check_out_at) return null
    const diff = new Date(r.check_out_at).getTime() - new Date(r.check_in_at).getTime()
    return minutesToHours(Math.round(diff / 60000))
  }

  const formatTime = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  return (
    <div className="px-4 py-4 max-w-md mx-auto">
      {/* Month Selector */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-slate-900">{monthNames[month - 1]} {year}</h1>
          <p className="text-xs text-slate-500">Attendance History</p>
        </div>
        <button
          onClick={nextMonth}
          disabled={!canGoNext}
          className="inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronRight className="h-5 w-5 text-slate-600" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Total</p>
          <p className="text-2xl font-bold text-slate-900">{summary?.total ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">Late</p>
          <p className="text-2xl font-bold text-amber-700">{summary?.late ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600 mb-1">Absent</p>
          <p className="text-2xl font-bold text-red-700">{summary?.absent ?? 0}</p>
        </div>
      </div>

      {/* Records */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </div>
      ) : !records?.length ? (
        <EmptyState title="No records found" description="No attendance records for this month." />
      ) : (
        <div className="space-y-3">
          {records.map((r) => {
            const isExpanded = expandedId === r.id
            const hours = calcTotalHours(r)
            return (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base font-semibold text-slate-900">{formatDate(r.date)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[r.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <span>{r.shifts?.name ?? '—'}</span>
                      <span className="text-slate-300">|</span>
                      <span className="font-mono">{r.shifts?.start_time ?? '—'} - {r.shifts?.end_time ?? '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Check In</p>
                      <p className="text-sm font-mono text-slate-700">{formatTime(r.check_in_at)}</p>
                    </div>
                    <div className="text-slate-300">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-0.5">Check Out</p>
                        <p className="text-sm font-mono font-medium text-slate-800">{formatTime(r.check_out_at)}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-0.5">Total Hours</p>
                        <p className="text-sm font-medium text-slate-800">{hours ?? '—'}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-0.5">Late</p>
                        <p className="text-sm font-medium text-amber-700">{r.late_minutes != null ? `${r.late_minutes}m` : '—'}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-0.5">Early Leave</p>
                        <p className="text-sm font-medium text-orange-600">{r.early_leave_minutes != null ? `${r.early_leave_minutes}m` : '—'}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-0.5">Overtime</p>
                        <p className="text-sm font-medium text-green-600">{r.overtime_minutes != null ? `${r.overtime_minutes}m` : '—'}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-0.5">Source</p>
                        <p className="text-sm font-medium text-slate-800">
                          {r.check_in_source === 'qr' ? 'QR' : r.check_in_source === 'link' ? 'Link' : r.check_in_source === 'manual' ? 'Manual' : '—'}
                        </p>
                      </div>
                    </div>
                    {r.notes && (
                      <div className="mt-3 text-sm text-slate-500 bg-slate-50 rounded-lg p-3">
                        <span className="font-medium text-slate-600">Note:</span> {r.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
