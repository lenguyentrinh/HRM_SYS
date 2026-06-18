import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, Users, Copy, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useRosterEmployees, useRosterShifts, useShiftAssignments, useShiftSchedules, useScheduleOverride, useCopyRosterFromPreviousMonth, useClearEmployeeRoster } from '../hooks/useRoster'
import { formatDate } from '@/lib/utils'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const SHIFT_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500' },
]

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function RosterPage() {
  const today = new Date()
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1)
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedShiftId, setSelectedShiftId] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [showCopyDialog, setShowCopyDialog] = useState(false)
  const [clearEmpId, setClearEmpId] = useState<string | null>(null)

  const { data: employees, isLoading: empLoading } = useRosterEmployees()
  const { data: shifts, isLoading: shiftLoading } = useRosterShifts()
  const { data: assignments, isLoading: assignLoading } = useShiftAssignments(currentMonth, currentYear)

  const dateFrom = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const dateTo = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

  const { data: schedules, isLoading: schedLoading } = useShiftSchedules(dateFrom, dateTo)
  const scheduleOverride = useScheduleOverride()
  const copyFromPrev = useCopyRosterFromPreviousMonth()
  const clearRoster = useClearEmployeeRoster()

  const firstDayOffset = new Date(currentYear, currentMonth - 1, 1).getDay()

  const prevMonth = () => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear((y) => y - 1) }
    else setCurrentMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear((y) => y + 1) }
    else setCurrentMonth((m) => m + 1)
  }

  const shiftColorMap = useMemo(() => {
    const map = new Map<string, typeof SHIFT_COLORS[0]>()
    ;(shifts ?? []).forEach((s, i) => map.set(s.id, SHIFT_COLORS[i % SHIFT_COLORS.length]))
    return map
  }, [shifts])

  const assignmentMap = useMemo(() => {
    const map = new Map<string, { shift_id: string; shift_name: string }>()
    ;(assignments ?? []).forEach((a) => {
      map.set(a.employee_id, { shift_id: a.shift_id, shift_name: a.shifts.name })
    })
    return map
  }, [assignments])

  const scheduleMap = useMemo(() => {
    const map = new Map<string, { shift_id: string | null; shift_name: string }>()
    ;(schedules ?? []).forEach((s) => {
      map.set(`${s.employee_id}_${s.date}`, { shift_id: s.shift_id, shift_name: s.shifts?.name ?? '' })
    })
    return map
  }, [schedules])

  const getCurrentOverride = () => {
    if (!selectedDate || !selectedEmployeeId) return null
    return scheduleMap.get(`${selectedEmployeeId}_${selectedDate}`)
  }

  const days = useMemo(() => {
    const result: Array<{
      day: number
      dateStr: string
      shiftGroups: Array<{ shiftId: string; shiftName: string; count: number }>
    }> = []

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const shiftCounts = new Map<string, { shiftId: string; shiftName: string; count: number }>()

      ;(employees ?? []).forEach((emp) => {
        const override = scheduleMap.get(`${emp.id}_${dateStr}`)
        const assignment = assignmentMap.get(emp.id)
        const resolved = override ?? assignment
        if (!resolved) return

        const key = resolved.shift_id ?? 'off'
        const existing = shiftCounts.get(key)
        if (existing) {
          existing.count++
        } else {
          shiftCounts.set(key, {
            shiftId: key,
            shiftName: resolved.shift_id ? resolved.shift_name : 'Day Off',
            count: 1,
          })
        }
      })

      result.push({
        day: d,
        dateStr,
        shiftGroups: Array.from(shiftCounts.values()),
      })
    }
    return result
  }, [daysInMonth, currentYear, currentMonth, employees, assignmentMap, scheduleMap])

  const totalScheduled = useMemo(() => {
    return (assignments ?? []).length
  }, [assignments])

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr)
    setSelectedEmployeeId('')
    setSelectedShiftId('')
  }

  const handleSaveOverride = () => {
    if (!selectedDate || !selectedEmployeeId) return
    scheduleOverride.mutate(
      { employee_id: selectedEmployeeId, shift_id: selectedShiftId || null, date: selectedDate },
      { onSuccess: () => { setSelectedDate(null); setSelectedEmployeeId(''); setSelectedShiftId('') } },
    )
  }

  const isLoading = empLoading || shiftLoading || assignLoading || schedLoading

  return (
    <div>
      <PageHeader
        title="Roster Scheduling"
        description={`${MONTH_NAMES[currentMonth - 1]} ${currentYear}`}
        actions={
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => setShowCopyDialog(true)}
            disabled={copyFromPrev.isPending}
          >
            <Copy className="h-4 w-4" />
            Copy from Previous Month
          </Button>
        }
      />

      {/* Month Navigator + Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-semibold text-slate-900 min-w-[180px] text-center">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </h2>
          <button
            onClick={nextMonth}
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              setCurrentMonth(today.getMonth() + 1)
              setCurrentYear(today.getFullYear())
            }}
            className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Today
          </button>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-slate-500">
            <Users className="h-4 w-4" />
            <span>{totalScheduled} employees scheduled</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
            <span>{(employees ?? []).length} active</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      {shifts && shifts.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 px-1">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Legend:</span>
          {shifts.map((s) => {
            const c = shiftColorMap.get(s.id) ?? SHIFT_COLORS[0]
            return (
              <span
                key={s.id}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                {s.name}
              </span>
            )
          })}
        </div>
      )}

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="p-4">
          <TableSkeleton rows={5} cols={7} />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {/* Day Labels */}
          <div className="grid grid-cols-7 border-b border-slate-200">
            {DAY_LABELS.map((label) => (
              <div
                key={label}
                className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50 border-r last:border-r-0 border-slate-200"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7">
            {/* Empty cells for offset */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[100px] border-r border-b border-slate-100 bg-slate-50/50" />
            ))}

            {days.map((day) => {
              const isToday =
                day.day === today.getDate() &&
                currentMonth === today.getMonth() + 1 &&
                currentYear === today.getFullYear()

              return (
                <button
                  key={day.dateStr}
                  onClick={() => handleDayClick(day.dateStr)}
                  className={`min-h-[100px] p-2 border-r border-b border-slate-100 text-left transition-colors hover:bg-orange-50/50 group ${
                    isToday ? 'bg-orange-50/30 ring-1 ring-inset ring-orange-200' : ''
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium mb-1 ${
                      isToday
                        ? 'bg-orange-500 text-white'
                        : 'text-slate-500 group-hover:text-slate-700'
                    }`}
                  >
                    {day.day}
                  </span>
                  <div className="space-y-0.5">
                    {day.shiftGroups.map((sg) => {
                      const c = shiftColorMap.get(sg.shiftId) ?? SHIFT_COLORS[0]
                      return (
                        <span
                          key={sg.shiftId}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium leading-tight ${c.bg} ${c.text} w-full`}
                        >
                          <span className={`h-1 w-1 rounded-full ${c.dot} shrink-0`} />
                          <span className="truncate">{sg.shiftName}</span>
                          <span className="ml-auto opacity-60">{sg.count}</span>
                        </span>
                      )
                    })}
                  </div>
                </button>
              )
            })}

            {/* Fill remaining cells */}
            {(() => {
              const totalCells = firstDayOffset + days.length
              const remainder = totalCells % 7
              if (remainder === 0) return null
              return Array.from({ length: 7 - remainder }).map((_, i) => (
                <div key={`trailing-${i}`} className="min-h-[100px] border-r border-b border-slate-100 bg-slate-50/50" />
              ))
            })()}
          </div>
        </div>
      )}

      {/* Employee Roster Actions */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Employee Roster Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {(employees ?? []).map((emp) => (
            <div
              key={emp.id}
              className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200"
            >
              <span className="text-sm font-medium text-slate-700 truncate">{emp.full_name}</span>
              <button
                onClick={() => setClearEmpId(emp.id)}
                className="flex-shrink-0 p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Clear roster for this month"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Assignment Dialog */}
      <Dialog open={!!selectedDate} onOpenChange={(open) => { if (!open) setSelectedDate(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Schedule Override — {selectedDate ? formatDate(selectedDate, 'long') : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Employee</label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="w-full bg-slate-50 border-slate-200 focus:ring-2 focus:ring-orange-500">
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {(employees ?? []).map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Shift</label>
              <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
                <SelectTrigger className="w-full bg-slate-50 border-slate-200 focus:ring-2 focus:ring-orange-500">
                  <SelectValue placeholder="Select shift..." />
                </SelectTrigger>
                <SelectContent>
                  {(shifts ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.start_time}–{s.end_time})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between gap-3 pt-2">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedDate(null)}>
                  Cancel
                </Button>
                {getCurrentOverride()?.shift_id && (
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      scheduleOverride.mutate(
                        { employee_id: selectedEmployeeId, shift_id: null, date: selectedDate! },
                        { onSuccess: () => { setSelectedDate(null); setSelectedEmployeeId(''); setSelectedShiftId('') } },
                      )
                    }}
                    disabled={scheduleOverride.isPending}
                  >
                    Remove Override
                  </Button>
                )}
              </div>
              <Button
                onClick={handleSaveOverride}
                disabled={!selectedEmployeeId || !selectedShiftId || scheduleOverride.isPending}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                {scheduleOverride.isPending ? 'Saving...' : 'Save Override'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Copy Roster Dialog */}
      <ConfirmDialog
        open={showCopyDialog}
        onOpenChange={setShowCopyDialog}
        title="Copy roster from previous month?"
        description={`Will copy all schedule overrides from ${MONTH_NAMES[(currentMonth === 1 ? 12 : currentMonth - 1) - 1]} to ${MONTH_NAMES[currentMonth - 1]}. Current schedules will not be deleted.`}
        confirmLabel="Copy"
        onConfirm={() => copyFromPrev.mutate({ month: currentMonth, year: currentYear }, { onSuccess: () => setShowCopyDialog(false) })}
        isLoading={copyFromPrev.isPending}
      />

      {/* Clear Employee Roster Dialog */}
      <ConfirmDialog
        open={!!clearEmpId}
        onOpenChange={(o) => { if (!o) setClearEmpId(null) }}
        title="Clear employee roster?"
        description={`Will delete all schedule overrides for ${employees?.find((e) => e.id === clearEmpId)?.full_name} in ${MONTH_NAMES[currentMonth - 1]}. Default assignments will remain.`}
        confirmLabel="Clear"
        onConfirm={() => {
          if (!clearEmpId) return
          clearRoster.mutate(
            { employeeId: clearEmpId, month: currentMonth, year: currentYear },
            { onSuccess: () => setClearEmpId(null) },
          )
        }}
        isLoading={clearRoster.isPending}
      />
    </div>
  )
}
