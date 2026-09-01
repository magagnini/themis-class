// Supabase Edge Function: cleanup-reports
// Deploy: supabase functions deploy cleanup-reports
// Cron: Configure no Dashboard > Edge Functions > Schedule (diariamente às 03:00 UTC)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (_req) => {
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // 1. Buscar relatórios expirados ainda com status 'available'
    const { data: expired, error: fetchErr } = await supabase
      .from('reports')
      .select('id, file_path, school_id')
      .eq('status', 'available')
      .lt('expires_at', new Date().toISOString())

    if (fetchErr) throw fetchErr

    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ cleaned: 0, message: 'Nenhum relatório expirado.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    let deleted = 0
    const errors = []

    for (const report of expired) {
      try {
        // 2. Remover arquivo do Storage
        if (report.file_path) {
          const { error: storageErr } = await supabase.storage
            .from('reports')
            .remove([report.file_path])
          if (storageErr) console.error(`Erro ao deletar ${report.file_path}:`, storageErr)
        }

        // 3. Marcar como expirado no banco
        await supabase
          .from('reports')
          .update({ status: 'expired' })
          .eq('id', report.id)

        deleted++
      } catch (err) {
        errors.push({ id: report.id, error: err.message })
      }
    }

    return new Response(
      JSON.stringify({ cleaned: deleted, errors }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
