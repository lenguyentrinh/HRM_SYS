import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { token, employee_id, type } = (await req.json()) as {
      token: string;
      employee_id: string;
      type: "check_in" | "check_out";
    };

    if (!token || !employee_id || !type) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "missing_fields",
          message: "Thiếu thông tin token, employee_id hoặc type",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (type !== "check_in" && type !== "check_out") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "invalid_type",
          message: "Type phải là check_in hoặc check_out",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ATT-01: Validate QR token
    const now = new Date();
    const { data: qrToken, error: tErr } = await supabase
      .from("qr_tokens")
      .select("id, shift_id, branch_id, date, token, expires_at, is_active")
      .eq("token", token)
      .maybeSingle();

    if (tErr) throw tErr;

    if (!qrToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "invalid_token",
          message: "Mã QR không hợp lệ",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!qrToken.is_active) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "invalid_token",
          message: "Mã QR đã bị vô hiệu hóa",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (new Date(qrToken.expires_at) <= now) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "expired_token",
          message: "Mã QR đã hết hạn",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const shiftId = qrToken.shift_id;
    const dateStr = qrToken.date;

    // ATT-02: Verify employee belongs to the shift's branch
    const { data: employee, error: eErr } = await supabase
      .from("employees")
      .select("id, branch_id")
      .eq("id", employee_id)
      .maybeSingle();

    if (eErr) throw eErr;

    if (!employee) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "employee_not_found",
          message: "Không tìm thấy nhân viên",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: shift, error: sErr } = await supabase
      .from("shifts")
      .select("id, branch_id, start_time, end_time, grace_period_minutes, early_leave_minutes, is_overnight")
      .eq("id", shiftId)
      .single();

    if (sErr) throw sErr;

    if (employee.branch_id !== shift.branch_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "wrong_branch",
          message: "Nhân viên không thuộc chi nhánh của ca làm việc này",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ATT-03: Determine employee's assigned shift for today
    // Priority: shift_schedules (date-specific) > employee_shift_assignments (monthly default)
    const { data: scheduleOverride } = await supabase
      .from("shift_schedules")
      .select("shift_id")
      .eq("employee_id", employee_id)
      .eq("date", dateStr)
      .maybeSingle();

    let assignedShiftId: string | null =
      scheduleOverride?.shift_id ?? null;

    if (!assignedShiftId) {
      const targetDate = new Date(dateStr + "T00:00:00");
      const month = targetDate.getMonth() + 1;
      const year = targetDate.getFullYear();

      const { data: assignment } = await supabase
        .from("employee_shift_assignments")
        .select("shift_id")
        .eq("employee_id", employee_id)
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();

      assignedShiftId = assignment?.shift_id ?? null;
    }

    if (!assignedShiftId || assignedShiftId !== shiftId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "wrong_shift",
          message: "Bạn không được phân công ca làm việc này",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ATT-04: Check for duplicates
    const { data: existing } = await supabase
      .from("attendance_records")
      .select("id, check_in_at, check_out_at")
      .eq("employee_id", employee_id)
      .eq("date", dateStr)
      .eq("shift_id", shiftId)
      .maybeSingle();

    if (type === "check_in" && existing?.check_in_at) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "already_checked_in",
          message: "Bạn đã check-in cho ca làm việc này rồi",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (type === "check_out" && !existing?.check_in_at) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "not_checked_in",
          message: "Bạn chưa check-in cho ca làm việc này",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (
      type === "check_out" &&
      existing?.check_in_at &&
      now <= new Date(existing.check_in_at)
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "invalid_checkout",
          message: "Thời gian check-out không hợp lệ",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ATT-05: Calculate late minutes / overtime
    let lateMinutes = 0;
    let earlyLeaveMinutes = 0;
    let overtimeMinutes = 0;
    let message = "";

    if (type === "check_in") {
      const startHHMM = shift.start_time.slice(0, 5);
      const shiftStart = new Date(`${dateStr}T${startHHMM}:00+07:00`);
      const deadline = new Date(
        shiftStart.getTime() + shift.grace_period_minutes * 60000,
      );

      const isLate = now > deadline;
      lateMinutes = isLate
        ? Math.round((now.getTime() - shiftStart.getTime()) / 60000)
        : 0;

      const statusVal = isLate ? "late" : "present";
      const timeStr =
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      message = isLate
        ? `Check-in lúc ${timeStr} – Trễ ${lateMinutes} phút`
        : `Check-in lúc ${timeStr} – Đúng giờ`;

      // ATT-06: Upsert attendance record
      const { error: upsertErr } = await supabase
        .from("attendance_records")
        .upsert(
          {
            employee_id,
            shift_id: shiftId,
            date: dateStr,
            check_in_at: now.toISOString(),
            check_in_source: "qr",
            status: statusVal,
            late_minutes: lateMinutes,
            early_leave_minutes: 0,
            overtime_minutes: 0,
          } as Record<string, unknown>,
          { onConflict: "employee_id,date,shift_id" },
        );

      if (upsertErr) throw upsertErr;

      return new Response(
        JSON.stringify({
          success: true,
          status: statusVal,
          late_minutes: lateMinutes,
          message,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } else {
      // Check-out
      const endHHMM = shift.end_time.slice(0, 5);
      const shiftEnd = new Date(`${dateStr}T${endHHMM}:00+07:00`);
      const earlyLeaveThreshold = new Date(
        shiftEnd.getTime() - shift.early_leave_minutes * 60000,
      );

      earlyLeaveMinutes =
        now < earlyLeaveThreshold
          ? Math.round((shiftEnd.getTime() - now.getTime()) / 60000)
          : 0;
      overtimeMinutes =
        now > shiftEnd
          ? Math.round((now.getTime() - shiftEnd.getTime()) / 60000)
          : 0;

      const timeStr =
        `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      if (overtimeMinutes > 0) {
        message =
          `Check-out lúc ${timeStr} – OT ${overtimeMinutes} phút`;
      } else if (earlyLeaveMinutes > 0) {
        message =
          `Check-out lúc ${timeStr} – Về sớm ${earlyLeaveMinutes} phút`;
      } else {
        message = `Check-out lúc ${timeStr} – Hoàn thành`;
      }

      const { error: updateErr } = await supabase
        .from("attendance_records")
        .update({
          check_out_at: now.toISOString(),
          check_out_source: "qr",
          early_leave_minutes: earlyLeaveMinutes,
          overtime_minutes: overtimeMinutes,
        })
        .eq("employee_id", employee_id)
        .eq("date", dateStr)
        .eq("shift_id", shiftId);

      if (updateErr) throw updateErr;

      return new Response(
        JSON.stringify({
          success: true,
          status: "present",
          message,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "server_error",
        message: "Lỗi máy chủ: " + (err as Error).message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
