import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
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
