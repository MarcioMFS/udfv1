// Script de debug para testar webhook-create-match
// Node.js: node test-webhook-debug.js

const SUPABASE_URL = 'https://xfgsfmexaxmikkksndny.supabase.co';
const WEBHOOK_SECRET = 'yX9kL2pQ8mN4vB7cR5tW3aD6fG1hJ0sZ';

// Dados do teste
const playerEmail = 'iuri@axies.com.br';
const eventCode = '423B78D0';

async function testWebhook() {
  console.log('🔍 Testando webhook-create-match\n');

  // Passo 1: Criar/atualizar o jogador
  console.log('📝 Passo 1: Cadastrando jogador...');
  const playerPayload = {
    "nome": "Iuri Test",
    "email": playerEmail,
    "udf-id": "U12345",
    "class-code": "T000TEST"
  };

  try {
    const playerResponse = await fetch(`${SUPABASE_URL}/functions/v1/webhook-players`, {
      method: 'POST',
      headers: {
        'X-Webhook-Secret': WEBHOOK_SECRET,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(playerPayload)
    });

    const playerData = await playerResponse.json();
    console.log(`   Status: ${playerResponse.status}`);
    console.log(`   Resposta:`, playerData);

    if (playerResponse.status !== 200) {
      console.log('\n❌ Erro ao cadastrar jogador. Verifique:');
      console.log('   - A turma T000TEST existe?');
      console.log('   - O webhook_secret está correto?');
      return;
    }
    console.log('   ✅ Jogador cadastrado\n');
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    return;
  }

  // Passo 2: Tentar criar a partida
  console.log('🎮 Passo 2: Criando partida...');
  const matchPayload = {
    "player-email": playerEmail,
    "event-code": eventCode,
    "match-number": 1,
    "app-serial": "IGNICAO#0,1,2#1;2;true;0;500;50;12.5|2;3;false;0;300;0;8.2#2#0#0#0"
  };

  try {
    const matchResponse = await fetch(`${SUPABASE_URL}/functions/v1/webhook-create-match`, {
      method: 'POST',
      headers: {
        'X-Webhook-Secret': WEBHOOK_SECRET,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(matchPayload)
    });

    const matchData = await matchResponse.json();
    console.log(`   Status: ${matchResponse.status}`);
    console.log(`   Resposta:`, matchData);

    if (matchResponse.status === 403) {
      console.log('\n⚠️  Erro 403 - Jogador não está inscrito na turma do evento');
      console.log('\n🔍 Diagnóstico:');
      console.log(`   1. O evento "${eventCode}" existe?`);
      console.log(`   2. Esse evento pertence a qual turma?`);
      console.log(`   3. O jogador "${playerEmail}" está inscrito nessa turma?`);
      console.log('\n💡 Solução:');
      console.log(`   - Verifique no painel Ignição se o jogador está na turma correta`);
      console.log(`   - Ou use o código da turma correta no webhook-players`);
    } else if (matchResponse.status === 200) {
      console.log('\n✅ Partida criada com sucesso!');
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

// Executar teste
testWebhook();
