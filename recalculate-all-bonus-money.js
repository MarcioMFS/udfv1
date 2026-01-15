const SUPABASE_URL = 'https://xfgsfmexaxmikkksndny.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZ3NmbWV4YXhtaWtra3NuZG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY5NDQ4NiwiZXhwIjoyMDY1MjcwNDg2fQ.6_IPw8u2TN2HKg4J_roihlWIs3NlehYGgwWBmO-JJ2w';

// Lógica de cálculo (copiada do webhook)
var ARCode;
(function(ARCode) {
  ARCode[ARCode["HOME"] = 0] = "HOME";
  ARCode[ARCode["A"] = 1] = "A";
  ARCode[ARCode["B"] = 2] = "B";
  ARCode[ARCode["C"] = 3] = "C";
  ARCode[ARCode["D"] = 4] = "D";
  ARCode[ARCode["E"] = 5] = "E";
  ARCode[ARCode["F"] = 6] = "F";
  ARCode[ARCode["G"] = 7] = "G";
  ARCode[ARCode["H"] = 8] = "H";
})(ARCode || (ARCode = {}));

function isValidARCode(value) {
  return value >= ARCode.HOME && value <= ARCode.H;
}

class DeliveryManifest {
  source = ARCode.HOME;
  satisfaction = false;
  value = 0;
  bonusValue = 0;
  deserialize(serial) {
    const parts = serial.split(';');
    if (parts.length < 5) return;
    const parsedSource = parseInt(parts[0], 10);
    if (!isValidARCode(parsedSource)) {
      throw new Error(`Código ARCode inválido na entrega: ${parts[0]}`);
    }
    this.source = parsedSource;
    this.satisfaction = parts[2].toLowerCase() === 'true';
    this.value = parseInt(parts[4], 10) || 0;
    this.bonusValue = parseInt(parts[5], 10) || 0;
  }
}

class GameDataManifest {
  deliveries = [];
  travelLog = [];
  bonusTarget = 0;

  deserialize(serial) {
    const parts = serial.split('#');
    if (parts.length < 7) throw new Error("Formato de app_serial inválido.");
    this.travelLog = parts[1] ? parts[1].split(',').map((val) => {
      const code = parseInt(val, 10);
      if (!isValidARCode(code)) throw new Error(`Código ARCode inválido no travelLog: ${val}`);
      return code;
    }) : [];
    this.deliveries = parts[2] ? parts[2].split('|').map((deliverySerial) => {
      const manifest = new DeliveryManifest();
      if (deliverySerial) manifest.deserialize(deliverySerial);
      return manifest;
    }) : [];
    this.bonusTarget = parseInt(parts[3], 10) || 0;
  }

  get bonusMoney() {
    return this.deliveries.reduce((sum, d) => sum + (d.bonusValue || 0), 0);
  }
}

async function recalculateAllBonusMoney() {
  console.log('🔄 Recalculando bonus_money para todos os registros...\n');

  // 1. Buscar todos os match_results que precisam ser atualizados
  const resultsRes = await fetch(`${SUPABASE_URL}/rest/v1/match_results?select=id,player_id,event_id,match_number`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const results = await resultsRes.json();

  console.log(`📊 Encontrados ${results.length} registros para atualizar\n`);

  let updated = 0;
  let errors = 0;

  for (const result of results) {
    try {
      // 2. Buscar o app_serial correspondente
      const matchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/matches?player_id=eq.${result.player_id}&event_id=eq.${result.event_id}&match_number=eq.${result.match_number}&select=app_serial`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          }
        }
      );
      const matches = await matchRes.json();

      if (!matches || matches.length === 0) {
        console.log(`⚠️  Match não encontrado para result ${result.id}`);
        errors++;
        continue;
      }

      const appSerial = matches[0].app_serial;

      // 3. Calcular bonus_money
      const manifest = new GameDataManifest();
      manifest.deserialize(appSerial);
      const bonusMoney = manifest.bonusMoney;

      // 4. Atualizar o registro
      const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/match_results?id=eq.${result.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bonus_money: bonusMoney })
      });

      if (!updateRes.ok) {
        console.log(`❌ Erro ao atualizar ${result.id}`);
        errors++;
        continue;
      }

      console.log(`✅ Atualizado ${result.id}: bonus_money = ${bonusMoney}`);
      updated++;

    } catch (error) {
      console.log(`❌ Erro ao processar ${result.id}:`, error.message);
      errors++;
    }
  }

  console.log('');
  console.log('═'.repeat(80));
  console.log('RESUMO:');
  console.log('═'.repeat(80));
  console.log(`Total de registros: ${results.length}`);
  console.log(`Atualizados com sucesso: ${updated}`);
  console.log(`Erros: ${errors}`);
}

recalculateAllBonusMoney().catch(console.error);
