/**
 * system-health-check
 *
 * Edge Function que verifica inconsistências no banco e envia email de alerta.
 * Pode ser chamada via cron externo (VPS) ou manualmente.
 *
 * Cenários verificados:
 *   1. Partidas com class_id NULL
 *   2. Partidas com event_id inexistente (órfã)
 *   3. Partidas com player_id inexistente (órfã)
 *   4. Partidas duplicadas (mesmo player + match_number)
 *   5. total_matches em class_players divergindo da contagem real
 *   6. Eventos sem class_id
 *   7. Jogadores com partidas mas sem inscrição em nenhuma turma
 *   8. Turmas com alunos mas sem nenhuma partida nos últimos 7 dias
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendAdminAlert } from '../_shared/email-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Aceita chamada via cron com secret ou via service role
  const secret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  if (expectedSecret && secret !== expectedSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const issues: string[] = [];

  try {
    // ── 1. Partidas com class_id NULL ──────────────────────────────────────────
    const { data: nullClassId, error: e1 } = await supabase
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .is('class_id', null);

    if (!e1 && (nullClassId as any)?.count > 0) {
      issues.push(`${(nullClassId as any).count} partida(s) com class_id NULL — execute o script de backfill`);
    }

    // ── 2. Partidas com event_id inexistente ───────────────────────────────────
    const { data: allMatches } = await supabase
      .from('matches')
      .select('id, event_id, player_id, match_number');

    if (allMatches && allMatches.length > 0) {
      const { data: allEvents } = await supabase.from('events').select('id');
      const { data: allPlayers } = await supabase.from('players').select('id');

      const eventIds = new Set((allEvents ?? []).map((e: any) => e.id));
      const playerIds = new Set((allPlayers ?? []).map((p: any) => p.id));

      // 2. event_id órfão
      const orphanEvent = allMatches.filter((m: any) => m.event_id && !eventIds.has(m.event_id));
      if (orphanEvent.length > 0) {
        issues.push(`${orphanEvent.length} partida(s) com event_id inexistente no banco`);
      }

      // 3. player_id órfão
      const orphanPlayer = allMatches.filter((m: any) => m.player_id && !playerIds.has(m.player_id));
      if (orphanPlayer.length > 0) {
        issues.push(`${orphanPlayer.length} partida(s) com player_id inexistente no banco`);
      }

      // 4. Duplicatas (mesmo player_id + match_number)
      const seen = new Map<string, number>();
      for (const m of allMatches as any[]) {
        const key = `${m.player_id}__${m.match_number}`;
        seen.set(key, (seen.get(key) ?? 0) + 1);
      }
      const duplicates = [...seen.values()].filter(v => v > 1).length;
      if (duplicates > 0) {
        issues.push(`${duplicates} combinação(ões) duplicada(s) de player + match_number`);
      }
    }

    // ── 5. total_matches divergindo ────────────────────────────────────────────
    const { data: classPlayers } = await supabase
      .from('class_players')
      .select('player_id, class_id, total_matches');

    if (classPlayers && classPlayers.length > 0) {
      let divergencias = 0;
      for (const cp of classPlayers as any[]) {
        const { count } = await supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .eq('player_id', cp.player_id)
          .eq('class_id', cp.class_id);
        if (count !== null && count !== (cp.total_matches ?? 0)) {
          divergencias++;
        }
      }
      if (divergencias > 0) {
        issues.push(`${divergencias} registro(s) em class_players com total_matches desatualizado`);
      }
    }

    // ── 6. Eventos sem class_id ────────────────────────────────────────────────
    const { data: eventsNoClass, error: e6 } = await supabase
      .from('events')
      .select('id, code', { count: 'exact' })
      .is('class_id', null)
      .limit(5);

    if (!e6 && eventsNoClass && eventsNoClass.length > 0) {
      const codes = (eventsNoClass as any[]).map((e: any) => e.code).join(', ');
      issues.push(`${eventsNoClass.length} evento(s) sem class_id: ${codes}`);
    }

    // ── 7. Jogadores com partidas mas sem inscrição em turma ──────────────────
    if (allMatches && allMatches.length > 0) {
      const playerIdsWithMatches = [...new Set((allMatches as any[]).map((m: any) => m.player_id))];
      const { data: enrolled } = await supabase
        .from('class_players')
        .select('player_id');
      const enrolledIds = new Set((enrolled ?? []).map((e: any) => e.player_id));
      const notEnrolled = playerIdsWithMatches.filter(id => !enrolledIds.has(id));
      if (notEnrolled.length > 0) {
        issues.push(`${notEnrolled.length} jogador(es) com partidas mas sem inscrição em nenhuma turma`);
      }
    }

    // ── 8. Turmas com alunos mas sem partidas nos últimos 7 dias ──────────────
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: classes } = await supabase.from('classes').select('id, code, description');
    if (classes && classes.length > 0) {
      for (const cls of classes as any[]) {
        const { count: studentCount } = await supabase
          .from('class_players')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', cls.id);

        if (!studentCount || studentCount === 0) continue; // turma sem alunos, ignora

        const { count: recentMatches } = await supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', cls.id)
          .gte('match_date', sevenDaysAgo);

        if (recentMatches === 0) {
          issues.push(`Turma "${cls.code}" (${studentCount} alunos) sem partidas nos últimos 7 dias`);
        }
      }
    }

  } catch (err) {
    issues.push(`Erro interno no health check: ${String(err)}`);
  }

  const totalIssues = issues.length;

  if (totalIssues === 0) {
    console.log('[HEALTH CHECK] Nenhuma inconsistência encontrada.');
    return new Response(JSON.stringify({ ok: true, issues: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Envia email de alerta
  await sendAdminAlert(
    `${totalIssues} inconsistência(s) detectada(s)`,
    issues,
  );

  console.log(`[HEALTH CHECK] ${totalIssues} problema(s) encontrado(s). Alerta enviado.`);

  return new Response(JSON.stringify({ ok: false, issues }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
