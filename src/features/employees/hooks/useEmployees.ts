import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { createUserWithPhone, changePassword } from '@/lib/auth'
import type { Employee } from '@/types/database'

export interface EmployeeFilters {
  search?: string
  status?: string
  type?: string
  page?: number
  pageSize?: number
}

export function useEmployees(filters: EmployeeFilters = {}) {
  const branchId = useAuthStore((s) => s.activeBranchId)
  const { search = '', status = '', type = '', page = 0, pageSize = 15 } = filters

  return useQuery({
    queryKey: ['employees', branchId, search, status, type, page],
    queryFn: async () => {
      if (!branchId) return { data: [], count: 0 }

      let query = supabase
        .from('employees')
        .select('*, users(role)', { count: 'exact' })
        .eq('branch_id', branchId)
        .order('full_name')
        .range(page * pageSize, page * pageSize + pageSize - 1)

      if (search) query = query.ilike('full_name', `%${search}%`)
      if (status) query = query.eq('status', status)
      if (type) query = query.eq('type', type)

      const { data, error, count } = await query
      if (error) throw error
      return { data: (data ?? []) as Employee[], count: count ?? 0 }
    },
    enabled: !!branchId,
  })
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*, users(id, role, phone)')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Employee & { users: { id: string; role: string; phone: string } | null }
    },
    enabled: !!id,
  })
}

export interface UpsertEmployeePayload {
  id?: string
  branch_id: string
  full_name: string
  type: 'fulltime' | 'parttime'
  department?: string
  position?: string
  base_salary: number
  allowance: number
  join_date: string
  status: 'active' | 'inactive' | 'terminated' | 'probation'
  notes?: string
  phone?: string
}

export function useUpsertEmployee() {
  const qc = useQueryClient()
  const adminUserId = useAuthStore((s) => s.user?.id)
  const adminBranchId = useAuthStore((s) => s.activeBranchId)

  return useMutation({
    mutationFn: async (payload: UpsertEmployeePayload) => {
      const { id, phone, ...employeeData } = payload

      if (id) {
        const { error } = await supabase.from('employees').update(employeeData).eq('id', id)
        if (error) throw error
        await supabase.from('audit_logs').insert({
          branch_id: adminBranchId,
          user_id: adminUserId,
          action: 'employee_updated',
          table_name: 'employees',
          target_type: 'employee',
          target_id: id,
          details: { full_name: payload.full_name },
        })
      } else {
        if (!phone) throw new Error('Phone number is required')

        const { data: branch } = await supabase
          .from('branches')
          .select('default_employee_password')
          .eq('id', payload.branch_id)
          .single()
        const defaultPassword = branch?.default_employee_password ?? '123456'

        const userId = await createUserWithPhone(phone, defaultPassword, 'employee', payload.branch_id)
        const { data: newEmp, error } = await supabase
          .from('employees')
          .insert({ ...employeeData, user_id: userId })
          .select('id, employee_code')
          .single()
        if (error) {
          await supabase.from('users').delete().eq('id', userId)
          throw error
        }
        await supabase.from('audit_logs').insert({
          branch_id: adminBranchId,
          user_id: adminUserId,
          action: 'employee_created',
          table_name: 'employees',
          target_type: 'employee',
          target_id: newEmp.id,
          details: { employee_code: newEmp.employee_code, full_name: payload.full_name },
        })
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      if (vars.id) qc.invalidateQueries({ queryKey: ['employee', vars.id] })
      toast.success(vars.id ? 'Employee updated' : 'Employee created with account')
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'An error occurred')
    },
  })
}

export function useResetEmployeePassword() {
  const adminUserId = useAuthStore((s) => s.user?.id)
  const adminBranchId = useAuthStore((s) => s.activeBranchId)

  return useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      await changePassword(userId, newPassword)
      await supabase.from('audit_logs').insert({
        branch_id: adminBranchId,
        user_id: adminUserId,
        action: 'password_reset',
        table_name: 'users',
        target_type: 'user',
        target_id: userId,
      })
    },
    onSuccess: () => toast.success('Password reset'),
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useLinkEmployeeAccount() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      employeeId,
      branchId,
      phone,
      password,
    }: {
      employeeId: string
      branchId: string
      phone: string
      password: string
    }) => {
      const userId = await createUserWithPhone(phone, password, 'employee', branchId)
      const { error } = await supabase
        .from('employees')
        .update({ user_id: userId })
        .eq('id', employeeId)
      if (error) {
        await supabase.from('users').delete().eq('id', userId)
        throw error
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['employee', vars.employeeId] })
      qc.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Account created and linked')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useToggleEmployeeStatus() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'inactive' | 'terminated' | 'probation' }) => {
      const { error } = await supabase.from('employees').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Status updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
