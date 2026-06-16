import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { employee_id, month, year } = await req.json() as {
      employee_id: string
      month: number
      year: number
    }

    if (!employee_id || !month || !year) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: employee_id, month, year' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch employee
    const { data: emp, error: empErr } = await supabase
      .from('employees')
      .select('id, base_salary, allowance, branch_id, ot_multiplier_override')
      .eq('id', employee_id)
      .maybeSingle()

    if (empErr) throw empErr
    if (!emp) {
      return new Response(
        JSON.stringify({ error: 'Employee not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch payroll config
    const effectiveDate = `${year}-${String(month).padStart(2, '0')}-01`
    const { data: config, error: cfgErr } = await supabase
      .from('payroll_configs')
      .select('*')
      .eq('branch_id', emp.branch_id)
      .lte('effective_from', effectiveDate)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cfgErr) throw cfgErr
    if (!config) {
      return new Response(
        JSON.stringify({ error: 'Payroll config not found for this branch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate only up to today (not end of month)
    const today = new Date()
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDayOfMonth = new Date(year, month, 0).getDate()
    const currentDay = today.getFullYear() === year && today.getMonth() + 1 === month
      ? today.getDate()
      : lastDayOfMonth
    const calcEndDate = `${year}-${String(month).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`

    // Fetch attendance up to today
    const { data: attendance, error: attErr } = await supabase
      .from('attendance_records')
      .select('date, status, late_minutes, overtime_minutes')
      .eq('employee_id', employee_id)
      .gte('date', startDate)
      .lte('date', calcEndDate)

    if (attErr) throw attErr

    // Fetch holidays for this month (same date range)
    const { data: holidays } = await supabase
      .from('holidays')
      .select('date')
      .eq('branch_id', emp.branch_id)
      .gte('date', startDate)
      .lte('date', calcEndDate)

    const holidayDates = new Set((holidays ?? []).map((h: { date: string }) => h.date))

    const workingDaysStandard = config.working_days_standard ?? 26
    const records = attendance ?? []

    const daysWorked = records.filter(
      (a) => a.status === 'present' || a.status === 'late' || a.status === 'leave'
    ).length
    const absentDays = records.filter((a) => a.status === 'absent').length
    const lateCount = records.filter((a) => a.status === 'late').length

    const salaryEarned = (emp.base_salary / workingDaysStandard) * daysWorked
    const hourlyRate = emp.base_salary / (workingDaysStandard * 8)

    // OT: use correct multiplier per day type (holiday > weekend > weekday)
    let overtimePay = 0
    let totalOvertimeMinutes = 0
    for (const rec of records) {
      const ot = rec.overtime_minutes ?? 0
      if (!ot) continue
      totalOvertimeMinutes += ot
      const date = new Date(rec.date)
      const isHoliday = holidayDates.has(rec.date)
      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      const weekdayMultiplier = emp.ot_multiplier_override ?? (config.ot_multiplier_weekday ?? 1.5)
      const multiplier = isHoliday
        ? (config.ot_multiplier_holiday ?? 3.0)
        : isWeekend
        ? (config.ot_multiplier_weekend ?? 2.0)
        : weekdayMultiplier
      overtimePay += (ot / 60) * hourlyRate * multiplier
    }

    const latePenalty = lateCount * (config.late_penalty_per_minute ?? 0)
    const absentPenalty = absentDays * (config.absent_penalty_per_day ?? 0)
    const maxLateForBonus = config.attendance_bonus_condition ?? 0
    const attendanceBonus = lateCount <= maxLateForBonus ? (config.attendance_bonus ?? 0) : 0

    const grossEstimate = salaryEarned + emp.allowance + overtimePay + attendanceBonus - latePenalty - absentPenalty
    const bhxhEmployee = grossEstimate * (config.bhxh_employee_rate ?? 0.08)
    const netEstimate = Math.max(0, grossEstimate - bhxhEmployee)

    const daysRemaining = lastDayOfMonth - currentDay

    return new Response(
      JSON.stringify({
        salary_earned: Math.round(salaryEarned),
        overtime_pay: Math.round(Math.max(0, overtimePay)),
        attendance_bonus: Math.round(attendanceBonus),
        gross_estimate: Math.round(Math.max(0, grossEstimate)),
        net_estimate: Math.round(netEstimate),
        days_worked: daysWorked,
        days_remaining: daysRemaining,
        allowance: emp.allowance,
        late_penalty: Math.round(latePenalty),
        absent_penalty: Math.round(absentPenalty),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : (err as { message?: string })?.message ?? JSON.stringify(err)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
