const SUPABASE_URL = 'https://xfgsfmexaxmikkksndny.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhtaWtra3NuZG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5NDQ4NiwiZXhwIjoyMDY1MjcwNDg2fQ.6_IPw8u2TN2HKg4J_roihlWIs3NlehYGgwWBmO-JJ2w';

const classId = '5d62c7cd-453a-4402-bc87-e889891fb558';

async function getPlayerIds() {
  // Buscar resultados completos
  const classPlayersRes = await fetch(`${SUPABASE_URL}/rest/v1/class_players?class_id=eq.${classId}&select=player_id`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const classPlayers = await classPlayersRes.json();
  const playerIds = classPlayers.map(cp => cp.player_id);

  const resultsRes = await fetch(`${SUPABASE_URL}/rest/v1/match_results?player_id=in.(${playerIds.join(',')})&select=*`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const results = await resultsRes.json();

  console.log('IDs completos:');
  results.forEach(r => {
    console.log(`Player ID: ${r.player_id}`);
    console.log(`Event ID: ${r.event_id}`);
    console.log(`Class ID from class_players lookup needed`);
    console.log('');
  });
}

getPlayerIds().catch(console.error);
