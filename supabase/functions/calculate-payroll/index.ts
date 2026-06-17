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

    const { month, year, branch_id, employee_id } = await req.json() as {
      month: number
      year: number
      branch_id: string
      employee_id?: string // optional: recalculate single employee
    }

    // PAY-02: Check for confirmed records first
    const confirmedCheck = supabase
      .from('payroll_records')
      .select('id, employee_id')
      .eq('month', month)
      .eq('year', year)
      .eq('status', 'confirmed')

    if (employee_id) confirmedCheck.eq('employee_id', employee_id)

    const { data: confirmedRecords } = await confirmedCheck
    if (confirmedRecords && confirmedRecords.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Payroll for this month has been confirmed. Contact Super Admin to unlock.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch payroll config (latest effective_from <= this month)
    const effectiveDate = `${year}-${String(month).padStart(2, '0')}-01`
    const { data: config, error: cfgErr } = await supabase
      .from('payroll_configs')
      .select('*')
      .eq('branch_id', branch_id)
      .lte('effective_from', effectiveDate)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (cfgErr) throw cfgErr
    if (!config) {
      return new Response(
        JSON.stringify({ error: 'No payroll configuration found for this branch.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all active employees for branch
    const empQuery = supabase
      .from('employees')
      .select('id, base_salary, allowance, type, ot_multiplier_override')
      .eq('branch_id', branch_id)
      .eq('status', 'active')

    if (employee_id) empQuery.eq('id', employee_id)
    const { data: employees, error: empErr } = await empQuery
    if (empErr) throw empErr
    if (!employees || employees.length === 0) {
      return new Response(
        JSON.stringify({ calculated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get attendance records for this month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const empIds = employees.map((e) => e.id)
    const { data: attendance, error: attErr } = await supabase
      .from('attendance_records')
      .select('employee_id, date, status, late_minutes, overtime_minutes, early_leave_minutes')
      .in('employee_id', empIds)
      .gte('date', startDate)
      .lte('date', endDate)

    if (attErr) throw attErr

    // Fetch holidays for this month
    const { data: holidays } = await supabase
      .from('holidays')
      .select('date')
      .eq('branch_id', branch_id)
      .gte('date', startDate)
      .lte('date', endDate)

    const holidayDates = new Set((holidays ?? []).map((h: { date: string }) => h.date))

    // Fetch special bonuses for this month (table may not exist yet — ignore error)
    const { data: bonusRows } = await supabase
      .from('employee_bonuses')
      .select('employee_id, amount')
      .eq('branch_id', branch_id)
      .eq('month', month)
      .eq('year', year)

    // Sum bonuses per employee_id
    const bonusMap = new Map<string, number>()
    for (const b of bonusRows ?? []) {
      bonusMap.set(b.employee_id, (bonusMap.get(b.employee_id) ?? 0) + b.amount)
    }
    const hasBonusTable = (bonusRows !== null)

    const workingDaysStandard = config.working_days_standard ?? 26
    const records = []

    for (const emp of employees) {
      const empAtt = (attendance ?? []).filter((a) => a.employee_id === emp.id)

      const workingDaysActual = empAtt.filter(
        (a) => a.status === 'present' || a.status === 'late' || a.status === 'leave'
      ).length

      const totalLateMinutes = empAtt.reduce((sum, a) => sum + (a.late_minutes ?? 0), 0)
      const absentDays = empAtt.filter((a) => a.status === 'absent').length

      // Separate OT by day type for correct multiplier
      const hourlyRate = emp.base_salary / (workingDaysStandard * 8)
      let totalOvertimeMinutes = 0
      let overtimePay = 0

      for (const rec of empAtt) {
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

      // Salary calculation
      const lateCount = empAtt.filter((a) => a.status === 'late').length
      const salaryEarned = (emp.base_salary / workingDaysStandard) * workingDaysActual
      const latePenalty = lateCount * (config.late_penalty_per_minute ?? 0)
      const absentPenalty = absentDays * (config.absent_penalty_per_day ?? 0)

      // Attendance bonus: check max late times
      const maxLateForBonus = config.attendance_bonus_condition ?? 0
      const attendanceBonus = lateCount <= maxLateForBonus ? (config.attendance_bonus ?? 0) : 0

      const specialBonus = hasBonusTable ? (bonusMap.get(emp.id) ?? 0) : 0
      const grossSalary = salaryEarned + emp.allowance + overtimePay + attendanceBonus + specialBonus - latePenalty - absentPenalty
      const bhxhEmployee = grossSalary * (config.bhxh_employee_rate ?? 0.08)
      const netSalary = grossSalary - bhxhEmployee

      // PAY-03: net salary cannot be negative
      if (netSalary < 0) {
        console.warn(`Employee ${emp.id}: net salary is negative (${netSalary}), setting to 0`)
      }

      const record: Record<string, unknown> = {
        employee_id: emp.id,
        month,
        year,
        working_days_standard: workingDaysStandard,
        working_days_actual: workingDaysActual,
        total_overtime_minutes: totalOvertimeMinutes,
        total_late_minutes: totalLateMinutes,
        total_absent_days: absentDays,
        base_salary: emp.base_salary,
        salary_earned: Math.round(salaryEarned),
        allowance: emp.allowance,
        overtime_pay: Math.round(overtimePay),
        attendance_bonus: Math.round(attendanceBonus),
        late_penalty: Math.round(latePenalty),
        absent_penalty: Math.round(absentPenalty),
        gross_salary: Math.round(Math.max(0, grossSalary)),
        bhxh_employee: Math.round(bhxhEmployee),
        bhxh_employer: Math.round(grossSalary * (config.bhxh_employer_rate ?? 0.175)),
        tax_amount: 0,
        net_salary: Math.round(Math.max(0, netSalary)),
        status: 'draft',
      }
      // Only include special_bonus if the column exists (migration applied)
      if (hasBonusTable) {
        record.special_bonus = Math.round(specialBonus)
      }
      records.push(record)
    }

    const { error: upsertErr } = await supabase
      .from('payroll_records')
      .upsert(records, { onConflict: 'employee_id,month,year' })

    if (upsertErr) throw upsertErr

    return new Response(
      JSON.stringify({ calculated: records.length }),
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
