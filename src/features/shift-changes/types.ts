import { z } from 'zod'

export const shiftChangeFilterSchema = z.object({
  status: z.enum(['all', 'pending', 'approved', 'rejected']).default('all'),
})

export type ShiftChangeFilterValues = z.infer<typeof shiftChangeFilterSchema>

export interface ShiftChangeRequestWithJoins {
  id: string
  employee_id: string
  from_shift_id: string
  to_shift_id: string
  date: string
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
  review_reason: string | null
  created_at: string
  updated_at: string
  employees: { full_name: string; employee_code: string }
  from_shift: { name: string; start_time: string; end_time: string }
  to_shift: { name: string; start_time: string; end_time: string }
}
