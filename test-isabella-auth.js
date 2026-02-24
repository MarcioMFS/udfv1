const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xfgsfmexaxmikkksndny.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não encontrada nas variáveis de ambiente');
  console.log('Execute: export SUPABASE_SERVICE_ROLE_KEY=your_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkIsabella() {
  console.log('🔍 Procurando Isabella na tabela players...\n');

  // Search for Isabella in players table
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, name, email')
    .ilike('name', '%isabella%');

  if (playersError) {
    console.error('❌ Erro ao buscar players:', playersError);
    return;
  }

  console.log('Players encontrados:', players);
  console.log('');

  if (players && players.length > 0) {
    for (const player of players) {
      console.log(`\n📧 Verificando auth.users para: ${player.name} (${player.email})`);
      console.log(`   Player ID: ${player.id}`);

      // Check if user exists in auth
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(player.id);

      if (authError) {
        console.log(`   ⚠️  Usuário NÃO encontrado em auth.users`);
        console.log(`   Erro:`, authError.message);
      } else if (authUser) {
        console.log(`   ✅ Usuário encontrado em auth.users`);
        console.log(`   Auth Email: ${authUser.user.email}`);
        console.log(`   Auth ID: ${authUser.user.id}`);

        if (authUser.user.email !== player.email) {
          console.log(`   ⚠️  EMAILS DIFERENTES!`);
          console.log(`   Player table: ${player.email}`);
          console.log(`   Auth table: ${authUser.user.email}`);
        } else {
          console.log(`   ✅ Emails sincronizados`);
        }
      }
    }
  } else {
    console.log('❌ Nenhum player encontrado com nome "Isabella"');
  }
}

checkIsabella().catch(console.error);
