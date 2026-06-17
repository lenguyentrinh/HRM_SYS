import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { AttendanceRecord, Employee, Shift } from '@/types/database'
import type { AttendanceFilters, ManualAttendanceValues, AttendanceRecordJoined } from '../types'

export function useAttendanceRecords(filters: AttendanceFilters = {}) {
  const branchId = useAuthStore((s) => s.activeBranchId)
  const { date_from, date_to, shift_id, status } = filters

  return useQuery({
    queryKey: ['attendance-records', branchId, date_from, date_to, shift_id, status],
    queryFn: async () => {
      if (!branchId) return []
      let query = supabase
        .from('attendance_records')
        .select('*, employees!inner(full_name, employee_code), shifts(name, start_time, end_time)')
        .eq('employees.branch_id', branchId)
        .order('date', { ascending: false })
        .order('check_in_at', { ascending: false })

      if (date_from) query = query.gte('date', date_from)
      if (date_to) query = query.lte('date', date_to)
      if (shift_id) query = query.eq('shift_id', shift_id)
      if (status) query = query.eq('status', status)

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as AttendanceRecordJoined[]
    },
    enabled: !!branchId,
  })
}

export function useAttendanceSummary(filters: AttendanceFilters = {}) {
  const branchId = useAuthStore((s) => s.activeBranchId)
  const { date_from, date_to, shift_id } = filters

  return useQuery({
    queryKey: ['attendance-summary', branchId, date_from, date_to, shift_id],
    queryFn: async () => {
      if (!branchId) return { total: 0, present: 0, late: 0, absent: 0, leave: 0, holiday: 0 }
      let query = supabase
        .from('attendance_records')
        .select('status', { count: 'exact' })
        .eq('employees.branch_id', branchId)

      if (date_from) query = query.gte('date', date_from)
      if (date_to) query = query.lte('date', date_to)
      if (shift_id) query = query.eq('shift_id', shift_id)

      const { data, error } = await query
      if (error) throw error
      const records = (data ?? []) as Pick<AttendanceRecord, 'status'>[]
      return {
        total: records.length,
        present: records.filter((r) => r.status === 'present').length,
        late: records.filter((r) => r.status === 'late').length,
        absent: records.filter((r) => r.status === 'absent').length,
        leave: records.filter((r) => r.status === 'leave').length,
        holiday: records.filter((r) => r.status === 'holiday').length,
      }
    },
    enabled: !!branchId,
  })
}

export function useMyAttendanceRecords(month: number, year: number) {
  const userId = useAuthStore((s) => s.user?.id)

  return useQuery({
    queryKey: ['my-attendance', userId, month, year],
    queryFn: async () => {
      if (!userId) return []
      const start = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = new Date(year, month, 0)
      const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (!emp) return []

      const { data, error } = await supabase
        .from('attendance_records')
        .select('*, shifts(name, start_time, end_time)')
        .eq('employee_id', emp.id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false })

      if (error) throw error
      return (data ?? []) as (AttendanceRecord & { shifts: Pick<Shift, 'name' | 'start_time' | 'end_time'> })[]
    },
    enabled: !!userId,
  })
}

export function useMyAttendanceSummary(month: number, year: number) {
  const userId = useAuthStore((s) => s.user?.id)

  return useQuery({
    queryKey: ['my-attendance-summary', userId, month, year],
    queryFn: async () => {
      if (!userId) return { total: 0, present: 0, late: 0, absent: 0, leave: 0 }
      const start = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = new Date(year, month, 0)
      const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`

      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (!emp) return { total: 0, present: 0, late: 0, absent: 0, leave: 0 }

      const { data, error } = await supabase
        .from('attendance_records')
        .select('status')
        .eq('employee_id', emp.id)
        .gte('date', start)
        .lte('date', end)

      if (error) throw error
      const records = (data ?? []) as Pick<AttendanceRecord, 'status'>[]
      return {
        total: records.length,
        present: records.filter((r) => r.status === 'present').length,
        late: records.filter((r) => r.status === 'late').length,
        absent: records.filter((r) => r.status === 'absent').length,
        leave: records.filter((r) => r.status === 'leave').length,
      }
    },
    enabled: !!userId,
  })
}

export function useUpsertAttendance() {
  const qc = useQueryClient()
  const adminUserId = useAuthStore((s) => s.user?.id)
  const branchId = useAuthStore((s) => s.activeBranchId)

  return useMutation({
    mutationFn: async (values: ManualAttendanceValues) => {
      const { source, ...record } = values
      const payload = {
        ...record,
        check_in_source: source,
        check_out_source: source,
        created_by: adminUserId,
      }

      const { data, error } = await supabase
        .from('attendance_records')
        .upsert(payload, { onConflict: 'employee_id,date,shift_id' })
        .select('id')
        .single()

      if (error) throw error

      await supabase.from('audit_logs').insert({
        branch_id: branchId,
        user_id: adminUserId,
        action: 'attendance_upserted',
        table_name: 'attendance_records',
        target_type: 'attendance',
        target_id: data.id,
        details: { employee_id: values.employee_id, date: values.date, shift_id: values.shift_id },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-records'] })
      qc.invalidateQueries({ queryKey: ['attendance-summary'] })
      toast.success('Attendance record saved')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to save attendance record')
    },
  })
}

export function useDeleteAttendance() {
  const qc = useQueryClient()
  const adminUserId = useAuthStore((s) => s.user?.id)
  const branchId = useAuthStore((s) => s.activeBranchId)

  return useMutation({
    mutationFn: async (record: AttendanceRecord) => {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('id', record.id)

      if (error) throw error

      await supabase.from('audit_logs').insert({
        branch_id: branchId,
        user_id: adminUserId,
        action: 'attendance_deleted',
        table_name: 'attendance_records',
        target_type: 'attendance',
        target_id: record.id,
        details: { employee_id: record.employee_id, date: record.date },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-records'] })
      qc.invalidateQueries({ queryKey: ['attendance-summary'] })
      toast.success('Attendance record deleted')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to delete attendance record')
    },
  })
}

export function useActiveEmployees() {
  const branchId = useAuthStore((s) => s.activeBranchId)

  return useQuery({
    queryKey: ['active-employees', branchId],
    queryFn: async () => {
      if (!branchId) return []
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, employee_code')
        .eq('branch_id', branchId)
        .eq('status', 'active')
        .order('full_name')

      if (error) throw error
      return (data ?? []) as Pick<Employee, 'id' | 'full_name' | 'employee_code'>[]
    },
    enabled: !!branchId,
  })
}
