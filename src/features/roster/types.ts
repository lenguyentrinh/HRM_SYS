import { z } from 'zod'

export const rosterFiltersSchema = z.object({
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
})

export type RosterFilters = z.infer<typeof rosterFiltersSchema>

export interface DayShiftGroup {
  shiftId: string
  shiftName: string
  startTime: string
  endTime: string
  employeeCount: number
}
