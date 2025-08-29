import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// Cabeçalhos CORS para permitir requisições de qualquer origem
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
var ARCode;
// --- INÍCIO DA LÓGICA DE DESSERIALIZAÇÃO E CÁLCULO ---
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
// Função de validação para garantir que um número corresponde a um ARCode válido
function isValidARCode(value) {
  return value >= ARCode.HOME && value <= ARCode.H;
}
class DeliveryManifest {
  source = ARCode.HOME;
  satisfaction = false;
  value = 0;
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
  }
}
class GameDataManifest {
  deliveries = [];
  travelLog = [];
  bonusTarget = 0;
  static pathCostGrid = {
    [ARCode.HOME]: {
      [ARCode.HOME]: 0,
      [ARCode.A]: 1000,
      [ARCode.B]: 1250,
      [ARCode.C]: 900,
      [ARCode.D]: 1100,
      [ARCode.E]: 950,
      [ARCode.F]: 1150,
      [ARCode.G]: 1050,
      [ARCode.H]: 1200
    },
    [ARCode.A]: {
      [ARCode.HOME]: 1000,
      [ARCode.A]: 0,
      [ARCode.B]: 800,
      [ARCode.C]: 1100,
      [ARCode.D]: 1500,
      [ARCode.E]: 1750,
      [ARCode.F]: 1650,
      [ARCode.G]: 1350,
      [ARCode.H]: 950
    },
    [ARCode.B]: {
      [ARCode.HOME]: 1250,
      [ARCode.A]: 800,
      [ARCode.B]: 0,
      [ARCode.C]: 950,
      [ARCode.D]: 1350,
      [ARCode.E]: 1100,
      [ARCode.F]: 1750,
      [ARCode.G]: 1500,
      [ARCode.H]: 1650
    },
    [ARCode.C]: {
      [ARCode.HOME]: 900,
      [ARCode.A]: 1100,
      [ARCode.B]: 950,
      [ARCode.C]: 0,
      [ARCode.D]: 800,
      [ARCode.E]: 1350,
      [ARCode.F]: 1500,
      [ARCode.G]: 1650,
      [ARCode.H]: 1750
    },
    [ARCode.D]: {
      [ARCode.HOME]: 1100,
      [ARCode.A]: 1500,
      [ARCode.B]: 1350,
      [ARCode.C]: 800,
      [ARCode.D]: 0,
      [ARCode.E]: 950,
      [ARCode.F]: 1100,
      [ARCode.G]: 1750,
      [ARCode.H]: 1650
    },
    [ARCode.E]: {
      [ARCode.HOME]: 950,
      [ARCode.A]: 1750,
      [ARCode.B]: 1100,
      [ARCode.C]: 1350,
      [ARCode.D]: 950,
      [ARCode.E]: 0,
      [ARCode.F]: 950,
      [ARCode.G]: 800,
      [ARCode.H]: 1500
    },
    [ARCode.F]: {
      [ARCode.HOME]: 1150,
      [ARCode.A]: 1650,
      [ARCode.B]: 1750,
      [ARCode.C]: 1500,
      [ARCode.D]: 1100,
      [ARCode.E]: 950,
      [ARCode.F]: 0,
      [ARCode.G]: 800,
      [ARCode.H]: 1100
    },
    [ARCode.G]: {
      [ARCode.HOME]: 1050,
      [ARCode.A]: 1350,
      [ARCode.B]: 1500,
      [ARCode.C]: 1650,
      [ARCode.D]: 1750,
      [ARCode.E]: 800,
      [ARCode.F]: 800,
      [ARCode.G]: 0,
      [ARCode.H]: 950
    },
    [ARCode.H]: {
      [ARCode.HOME]: 1200,
      [ARCode.A]: 950,
      [ARCode.B]: 1650,
      [ARCode.C]: 1750,
      [ARCode.D]: 1650,
      [ARCode.E]: 1500,
      [ARCode.F]: 1100,
      [ARCode.G]: 950,
      [ARCode.H]: 0
    }
  };
  deserialize(serial) {
    const parts = serial.split('#');
    if (parts.length < 7) throw new Error("Formato de app_serial inválido.");
    this.travelLog = parts[1] ? parts[1].split(',').map((val)=>{
      const code = parseInt(val, 10);
      if (!isValidARCode(code)) throw new Error(`Código ARCode inválido no travelLog: ${val}`);
      return code;
    }) : [];
    this.deliveries = parts[2] ? parts[2].split('|').map((deliverySerial)=>{
      const manifest = new DeliveryManifest();
      if (deliverySerial) manifest.deserialize(deliverySerial);
      return manifest;
    }) : [];
    this.bonusTarget = parseInt(parts[3], 10) || 0;
  }
  get cost() {
    if (!this.travelLog?.length) return 0;
    let totalCost = 0;
    let lastLoc = ARCode.HOME;
    for (const currentLoc of this.travelLog){
      totalCost += GameDataManifest.pathCostGrid[lastLoc][currentLoc];
      lastLoc = currentLoc;
    }
    return totalCost;
  }
  get revenue() {
    return this.deliveries.reduce((sum, d)=>sum + d.value, 0);
  }
  get profit() {
    return this.revenue - this.cost;
  }
  get satisfaction() {
    if (!this.deliveries?.length) return 0;
    const satisfiedCount = this.deliveries.filter((d)=>d.satisfaction).length;
    return Math.ceil(100 * satisfiedCount / this.deliveries.length);
  }
  get bonus() {
    if (!this.deliveries?.length || this.bonusTarget === 0) return 0;
    let totalBonus = 0;
    const allLocations = [
      ARCode.A,
      ARCode.B,
      ARCode.C,
      ARCode.D,
      ARCode.E,
      ARCode.F,
      ARCode.G,
      ARCode.H
    ];
    for (const loc of allLocations){
      const satisfiedDeliveriesFromLoc = this.deliveries.filter((d)=>d.source === loc && d.satisfaction).length;
      if (satisfiedDeliveriesFromLoc > this.bonusTarget) {
        totalBonus += satisfiedDeliveriesFromLoc - this.bonusTarget;
      } else if (satisfiedDeliveriesFromLoc === this.bonusTarget) {
        totalBonus++;
      }
    }
    return totalBonus;
  }
}
function deserializeAppSerial(serial) {
  if (!serial) {
    throw new Error("app_serial não pode ser nulo.");
  }
  const manifest = new GameDataManifest();
  manifest.deserialize(serial);
  return {
    lucro: manifest.profit,
    satisfacao: manifest.satisfaction,
    bonus: manifest.bonus
  };
}
// Função principal do servidor da Edge Function
serve(async (req)=>{
  // Trata a requisição OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const payload = await req.json();
    const { 'player-udf-id': playerUdfId, 'player-email': playerEmail, 'event-code': eventCode, 'match-number': matchNumber } = payload;
    
    if ((!playerUdfId && !playerEmail) || !eventCode || matchNumber === undefined) {
      throw new Error('Campos obrigatórios ausentes no payload: (player-udf-id OU player-email), event-code, match-number');
    }
    
    // 1. Busca IDs do jogador e do evento - aceita tanto udf_id quanto email
    let playerData, playerError;
    if (playerUdfId) {
      ({ data: playerData, error: playerError } = await supabaseClient.from('players').select('id').eq('udf_id', playerUdfId).single());
    } else {
      ({ data: playerData, error: playerError } = await supabaseClient.from('players').select('id').eq('email', playerEmail).single());
    }
    
    if (playerError || !playerData) {
      const identifier = playerUdfId || playerEmail;
      const field = playerUdfId ? 'udf_id' : 'email';
      throw new Error(`Player com ${field} ${identifier} não encontrado`);
    }
    
    const { data: eventData, error: eventError } = await supabaseClient.from('events').select('id, class_id').eq('code', eventCode).single();
    if (eventError || !eventData) throw new Error(`Evento com código ${eventCode} não encontrado`);
    
    // 2. Busca o app_serial bruto da tabela de partidas (usando event_id)
    const { data: matchEntry, error: matchEntryError } = await supabaseClient.from('matches').select('app_serial, event_id').eq('player_id', playerData.id).eq('event_id', eventData.id).eq('match_number', matchNumber).single();
    if (matchEntryError || !matchEntry) throw new Error(`Partida não encontrada para os critérios fornecidos.`);
    // 3. Desserializa e Calcula os resultados
    const { lucro, satisfacao, bonus } = deserializeAppSerial(matchEntry.app_serial);
    // 4. Salva os resultados calculados
    const { data: matchResultData, error: matchResultError } = await supabaseClient.from('match_results').upsert({
      player_id: playerData.id,
      event_id: eventData.id,
      match_number: matchNumber,
      lucro: lucro,
      satisfacao: satisfacao,
      bonus: bonus,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'player_id,event_id,match_number'
    }).select().single();
    if (matchResultError) throw matchResultError;
    // 5. Atualiza as estatísticas agregadas do jogador
    await updatePlayerStats(supabaseClient, playerData.id, eventData.class_id, eventData.id);
    console.log('Resultado da partida salvo com sucesso:', matchResultData);
    return new Response(JSON.stringify({
      success: true,
      message: 'Resultado da partida processado e salvo com sucesso.',
      matchResult: matchResultData
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Erro no processamento do webhook:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
async function updatePlayerStats(supabaseClient, playerId, classId, eventId) {
  try {
    // Buscar results do evento específico
    const { data: results, error: resultsError } = await supabaseClient
      .from('match_results')
      .select('lucro, satisfacao, bonus')
      .eq('player_id', playerId)
      .eq('event_id', eventId);
    
    if (resultsError) throw resultsError;
    if (!results?.length) return;
    
    const totalMatches = results.length;
    const totalScore = results.reduce((sum, result) => 
      sum + (result.lucro || 0) + (result.satisfacao || 0) + (result.bonus || 0), 0
    );
    const avgScore = totalScore / totalMatches;
    
    // Atualizar estatísticas do jogador na turma
    const { error: updateError } = await supabaseClient
      .from('class_players')
      .update({
        total_matches: totalMatches,
        avg_score: Math.round(avgScore)
      })
      .eq('player_id', playerId)
      .eq('class_id', classId);
    
    if (updateError) throw updateError;
    console.log(`Estatísticas atualizadas para player ${playerId} no evento ${eventId}`);
  } catch (error) {
    console.error('Erro na função updatePlayerStats:', error);
  }
}
