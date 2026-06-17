import { z } from 'zod'

export const employeeFormSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['fulltime', 'parttime']),
  department: z.string().optional(),
  position: z.string().optional(),
  base_salary: z.coerce.number().min(1, 'Base salary must be greater than 0'),
  allowance: z.coerce.number().min(0).default(0),
  join_date: z.string().min(1, 'Join date is required'),
  status: z.enum(['active', 'inactive', 'terminated', 'probation']).default('active'),
  notes: z.string().optional(),
  phone: z.string().optional(),
})

export const createEmployeeSchema = employeeFormSchema.extend({
  phone: z
    .string()
    .min(9, 'Invalid phone number')
    .regex(/^\d+$/, 'Numbers only'),
})

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>
export type CreateEmployeeFormValues = z.infer<typeof createEmployeeSchema>
