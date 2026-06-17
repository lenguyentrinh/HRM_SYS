import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Employee, Shift, EmployeeShiftAssignment, ShiftSchedule } from '@/types/database'

export function useRosterEmployees() {
  const branchId = useAuthStore((s) => s.activeBranchId)

  return useQuery({
    queryKey: ['roster-employees', branchId],
    queryFn: async () => {
      if (!branchId) return []
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name, employee_code, department')
        .eq('branch_id', branchId)
        .eq('status', 'active')
        .order('full_name')
      if (error) throw error
      return data as Pick<Employee, 'id' | 'full_name' | 'employee_code' | 'department'>[]
    },
    enabled: !!branchId,
  })
}

export function useRosterShifts() {
  const branchId = useAuthStore((s) => s.activeBranchId)

  return useQuery({
    queryKey: ['roster-shifts', branchId],
    queryFn: async () => {
      if (!branchId) return []
      const { data, error } = await supabase
        .from('shifts')
        .select('id, name, start_time, end_time')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('start_time')
      if (error) throw error
      return data as Pick<Shift, 'id' | 'name' | 'start_time' | 'end_time'>[]
    },
    enabled: !!branchId,
  })
}

export function useShiftAssignments(month: number, year: number) {
  const branchId = useAuthStore((s) => s.activeBranchId)

  return useQuery({
    queryKey: ['shift-assignments', branchId, month, year],
    queryFn: async () => {
      if (!branchId) return []
      const { data, error } = await supabase
        .from('employee_shift_assignments')
        .select('*, employees!inner(id, full_name, employee_code), shifts(name)')
        .eq('employees.branch_id', branchId)
        .eq('month', month)
        .eq('year', year)
      if (error) throw error
      return data as (EmployeeShiftAssignment & { employees: Pick<Employee, 'id' | 'full_name' | 'employee_code'>; shifts: Pick<Shift, 'name'> })[]
    },
    enabled: !!branchId,
  })
}

export function useShiftSchedules(dateFrom: string, dateTo: string) {
  const branchId = useAuthStore((s) => s.activeBranchId)

  return useQuery({
    queryKey: ['shift-schedules', branchId, dateFrom, dateTo],
    queryFn: async () => {
      if (!branchId) return []
      const { data, error } = await supabase
        .from('shift_schedules')
        .select('*, employees!inner(id, full_name, employee_code), shifts(name)')
        .eq('employees.branch_id', branchId)
        .gte('date', dateFrom)
        .lte('date', dateTo)
      if (error) throw error
      return data as (ShiftSchedule & { employees: Pick<Employee, 'id' | 'full_name' | 'employee_code'>; shifts: Pick<Shift, 'name'> })[]
    },
    enabled: !!branchId,
  })
}

export function useAssignShift() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const branchId = useAuthStore((s) => s.activeBranchId)

  return useMutation({
    mutationFn: async ({
      employee_id,
      shift_id,
      month,
      year,
    }: {
      employee_id: string
      shift_id: string
      month: number
      year: number
    }) => {
      const { data: existing } = await supabase
        .from('employee_shift_assignments')
        .select('id')
        .eq('employee_id', employee_id)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('employee_shift_assignments')
          .update({ shift_id })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('employee_shift_assignments')
          .insert({ employee_id, shift_id, month, year })
        if (error) throw error
      }

      await supabase.from('audit_logs').insert({
        branch_id: branchId,
        user_id: userId,
        action: existing ? 'shift_assignment_updated' : 'shift_assignment_created',
        table_name: 'employee_shift_assignments',
        target_type: 'shift_assignment',
        target_id: employee_id,
        details: { employee_id, shift_id, month, year },
      })
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['shift-assignments', branchId, vars.month, vars.year] })
      toast.success('Shift assigned')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to assign shift'),
  })
}

export function useRemoveAssignment() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const branchId = useAuthStore((s) => s.activeBranchId)

  return useMutation({
    mutationFn: async ({
      employee_id,
      month,
      year,
    }: {
      employee_id: string
      month: number
      year: number
    }) => {
      const { error } = await supabase
        .from('employee_shift_assignments')
        .delete()
        .eq('employee_id', employee_id)
        .eq('month', month)
        .eq('year', year)
      if (error) throw error

      await supabase.from('audit_logs').insert({
        branch_id: branchId,
        user_id: userId,
        action: 'shift_assignment_removed',
        table_name: 'employee_shift_assignments',
        target_type: 'shift_assignment',
        target_id: employee_id,
        details: { employee_id, month, year },
      })
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['shift-assignments', branchId, vars.month, vars.year] })
      toast.success('Assignment removed')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to remove assignment'),
  })
}

export function useScheduleOverride() {
  const qc = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const branchId = useAuthStore((s) => s.activeBranchId)

  return useMutation({
    mutationFn: async ({
      employee_id,
      shift_id,
      date,
    }: {
      employee_id: string
      shift_id: string
      date: string
    }) => {
      const { data: existing } = await supabase
        .from('shift_schedules')
        .select('id')
        .eq('employee_id', employee_id)
        .eq('date', date)
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('shift_schedules')
          .update({ shift_id, is_override: true, created_by: userId })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('shift_schedules')
          .insert({ employee_id, shift_id, date, is_override: true, created_by: userId })
        if (error) throw error
      }

      await supabase.from('audit_logs').insert({
        branch_id: branchId,
        user_id: userId,
        action: existing ? 'schedule_override_updated' : 'schedule_override_created',
        table_name: 'shift_schedules',
        target_type: 'schedule_override',
        target_id: employee_id,
        details: { employee_id, shift_id, date },
      })
    },
    onSuccess: (_, vars) => {
      const month = new Date(vars.date + 'T00:00:00').getMonth() + 1
      const year = new Date(vars.date + 'T00:00:00').getFullYear()
      qc.invalidateQueries({ queryKey: ['shift-schedules', branchId] })
      qc.invalidateQueries({ queryKey: ['shift-assignments', branchId, month, year] })
      toast.success('Override saved')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed to save override'),
  })
}
