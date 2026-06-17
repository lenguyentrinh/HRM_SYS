import { z } from 'zod'

export const shiftFormSchema = z.object({
  name: z.string().min(1, 'Shift name is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  grace_period_minutes: z.coerce.number().min(0).default(5),
  early_leave_minutes: z.coerce.number().min(0).default(15),
  is_overnight: z.boolean().default(false),
  is_active: z.boolean().default(true),
})

export type ShiftFormValues = z.infer<typeof shiftFormSchema>
