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

    const { token, employee_id, type } = await req.json() as {
      token: string
      employee_id: string
      type: 'check_in' | 'check_out'
    }

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    // ATT-01: Validate QR token
    const { data: qrToken, error: tErr } = await supabase
      .from('qr_tokens')
      .select('id, shift_id, date, expires_at, is_active')
      .eq('token', token)
      .maybeSingle()

    if (tErr) throw tErr

    if (!qrToken || !qrToken.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: 'invalid_token', message: 'Invalid or expired QR code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (new Date(qrToken.expires_at) < now) {
      return new Response(
        JSON.stringify({ success: false, error: 'expired_token', message: 'QR code has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const shiftId = qrToken.shift_id
    const dateStr = qrToken.date

    // ATT-02: Check employee is assigned to this shift on this date
    // Priority: shift_schedules override, fallback to employee_shift_assignments
    const { data: scheduleOverride } = await supabase
      .from('shift_schedules')
      .select('shift_id')
      .eq('employee_id', employee_id)
      .eq('date', dateStr)
      .maybeSingle()

    let assignedShiftId: string | null = scheduleOverride?.shift_id ?? null

    if (!assignedShiftId) {
      const targetDate = new Date(dateStr)
      const month = targetDate.getMonth() + 1
      const year = targetDate.getFullYear()

      const { data: assignment } = await supabase
        .from('employee_shift_assignments')
        .select('shift_id')
        .eq('employee_id', employee_id)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle()

      assignedShiftId = assignment?.shift_id ?? null
    }

    if (!assignedShiftId || assignedShiftId !== shiftId) {
      return new Response(
        JSON.stringify({ success: false, error: 'wrong_shift', message: 'You are not assigned to this shift' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ATT-03: Check for duplicate check-in
    const { data: existing } = await supabase
      .from('attendance_records')
      .select('id, check_in_at, check_out_at')
      .eq('employee_id', employee_id)
      .eq('date', dateStr)
      .eq('shift_id', shiftId)
      .maybeSingle()

    if (type === 'check_in' && existing?.check_in_at) {
      return new Response(
        JSON.stringify({ success: false, error: 'already_checked_in', message: 'You have already checked in for this shift' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (type === 'check_out' && !existing?.check_in_at) {
      return new Response(
        JSON.stringify({ success: false, error: 'not_checked_in', message: 'You have not checked in for this shift yet' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ATT-04: check_out must be after check_in
    if (type === 'check_out' && existing?.check_in_at && now < new Date(existing.check_in_at)) {
      return new Response(
        JSON.stringify({ success: false, error: 'invalid_checkout', message: 'Check-out time is invalid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get shift details for late/overtime calculation
    const { data: shift, error: sErr } = await supabase
      .from('shifts')
      .select('start_time, end_time, grace_period_minutes, early_leave_minutes')
      .eq('id', shiftId)
      .single()

    if (sErr) throw sErr

    let record: Record<string, unknown>
    let lateMinutes = 0
    let message = ''

    if (type === 'check_in') {
      // ATT-05: calculate late
      // PostgreSQL TIME returns "HH:MM:SS" — slice to "HH:MM" then append VN timezone
      const startHHMM = shift.start_time.slice(0, 5)
      const shiftStart = new Date(`${dateStr}T${startHHMM}:00+07:00`)
      const deadline = new Date(shiftStart.getTime() + shift.grace_period_minutes * 60000)

      const isLate = now > deadline
      lateMinutes = isLate ? Math.round((now.getTime() - shiftStart.getTime()) / 60000) : 0

      const statusVal = isLate ? 'late' : 'present'
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

      record = {
        employee_id,
        shift_id: shiftId,
        date: dateStr,
        check_in_at: now.toISOString(),
        check_in_source: 'qr',
        status: statusVal,
        late_minutes: lateMinutes,
        early_leave_minutes: 0,
        overtime_minutes: 0,
      }

      message = isLate
        ? `Check-in successful at ${timeStr} – ${lateMinutes} min late`
        : `Check-in successful at ${timeStr} – On time ✓`
    } else {
      // ATT-06, ATT-07: calculate early leave and OT
      const endHHMM = shift.end_time.slice(0, 5)
      const shiftEnd = new Date(`${dateStr}T${endHHMM}:00+07:00`)
      const earlyLeaveThreshold = new Date(shiftEnd.getTime() - shift.early_leave_minutes * 60000)

      const earlyLeaveMinutes = now < earlyLeaveThreshold
        ? Math.round((shiftEnd.getTime() - now.getTime()) / 60000)
        : 0
      const overtimeMinutes = now > shiftEnd
        ? Math.round((now.getTime() - shiftEnd.getTime()) / 60000)
        : 0

      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

      record = {
        check_out_at: now.toISOString(),
        check_out_source: 'qr',
        early_leave_minutes: earlyLeaveMinutes,
        overtime_minutes: overtimeMinutes,
      }

      message = overtimeMinutes > 0
        ? `Check-out successful at ${timeStr} – OT ${overtimeMinutes} min`
        : earlyLeaveMinutes > 0
        ? `Check-out successful at ${timeStr} – Early leave ${earlyLeaveMinutes} min`
        : `Check-out successful at ${timeStr} ✓`
    }

    if (type === 'check_in') {
      const { error: insertErr } = await supabase
        .from('attendance_records')
        .upsert(record as Parameters<typeof supabase.from>[0], { onConflict: 'employee_id,date,shift_id' })
      if (insertErr) throw insertErr
    } else {
      const { error: updateErr } = await supabase
        .from('attendance_records')
        .update(record)
        .eq('employee_id', employee_id)
        .eq('date', dateStr)
        .eq('shift_id', shiftId)
      if (updateErr) throw updateErr
    }

    return new Response(
      JSON.stringify({ success: true, status: type === 'check_in' ? (lateMinutes > 0 ? 'late' : 'present') : 'present', late_minutes: lateMinutes, message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: 'server_error', message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
