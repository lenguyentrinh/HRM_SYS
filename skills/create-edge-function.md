# Skill: Tạo Supabase Edge Function

## Dùng khi
Cần logic chạy server-side: tính lương, validate QR, bulk operations.

## Tạo file

```
supabase/functions/<function-name>/index.ts
```

## Template

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Unauthorized')

    // 2. Init Supabase client với user token (respects RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    // 3. Parse body
    const body = await req.json()

    // 4. Business logic
    // ...

    // 5. Return response
    return new Response(JSON.stringify({ success: true, data: {} }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
```

## Deploy

```bash
supabase functions deploy <function-name>
```

## Notes
- Nếu cần bypass RLS (VD: pg_cron job), dùng `SUPABASE_SERVICE_ROLE_KEY` thay vì anon key
- Luôn validate input trước khi query DB
- Tham khảo API.md cho danh sách Edge Functions đã có
