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

    const body = (await req.json()) as {
      run_all?: boolean;
      shift_id?: string;
      date?: string;
    };

    // Vietnam time (UTC+7) so pg_cron at 23:30 UTC gets correct VN date
    const VN_OFFSET = 7 * 60 * 60 * 1000;
    const dateStr =
      body.date ??
      new Date(Date.now() + VN_OFFSET).toISOString().split("T")[0];

    let shifts: {
      id: string;
      end_time: string;
      branch_id: string;
      is_overnight: boolean;
    }[] = [];

    if (body.run_all) {
      const { data, error } = await supabase
        .from("shifts")
        .select("id, end_time, branch_id, is_overnight")
        .eq("is_active", true);

      if (error) throw error;
      shifts = data ?? [];
    } else if (body.shift_id) {
      const { data, error } = await supabase
        .from("shifts")
        .select("id, end_time, branch_id, is_overnight")
        .eq("id", body.shift_id)
        .single();

      if (error) throw error;
      if (data) shifts = [data];
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Provide run_all=true or shift_id",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const tokens = shifts.map((shift) => {
      const endTimeHHMM = shift.end_time.slice(0, 5);
      const [endH] = endTimeHHMM.split(":").map(Number);
      let expireDate = dateStr;
      if (shift.is_overnight && endH < 12) {
        const d = new Date(`${dateStr}T00:00:00`);
        d.setDate(d.getDate() + 1);
        expireDate = d.toISOString().split("T")[0];
      }
      const expiresAt = new Date(
        `${expireDate}T${endTimeHHMM}:00+07:00`,
      );

      return {
        shift_id: shift.id,
        branch_id: shift.branch_id,
        date: dateStr,
        token: crypto.randomUUID(),
        is_active: true,
        expires_at: expiresAt.toISOString(),
      };
    });

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ success: true, generated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: upsertErr } = await supabase
      .from("qr_tokens")
      .upsert(tokens, { onConflict: "shift_id,date" });

    if (upsertErr) throw upsertErr;

    return new Response(
      JSON.stringify({ success: true, generated: tokens.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
