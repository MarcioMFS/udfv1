import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateWebhook } from '../_shared/auth-middleware.ts';
import { sendAdminAlert } from '../_shared/email-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret'
};

// Lógica de cálculo dos resultados (copiada do webhook-match-results)
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
  destination = ARCode.HOME;
  satisfaction = false;
  value = 0;
  bonusValue = 0;
  deliveryTime = 0;
  deserialize(serial) {
    const parts = serial.split(';');
    if (parts.length < 5) return; // Suporta formato antigo e novo
    const parsedSource = parseInt(parts[0], 10);
    if (!isValidARCode(parsedSource)) {
      throw new Error(`Código ARCode inválido na entrega: ${parts[0]}`);
    }
    this.source = parsedSource;

    // Formato novo tem 7+ campos, antigo tem 5
    if (parts.length >= 7) {
      const parsedDestination = parseInt(parts[1], 10);
      if (!isValidARCode(parsedDestination)) {
        throw new Error(`Código ARCode inválido na entrega: ${parts[1]}`);
      }
      this.destination = parsedDestination;
      this.satisfaction = parts[2].toLowerCase() === 'true';
      this.value = parseInt(parts[4], 10) || 0;
      this.bonusValue = parseInt(parts[5], 10) || 0;
      this.deliveryTime = parseFloat(parts[6]) || 0;
    } else {
      // Formato antigo: source;destination;satisfaction;type;value
      this.satisfaction = parts[2].toLowerCase() === 'true';
      this.value = parseInt(parts[4], 10) || 0;
      this.bonusValue = 0;
    }
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
  get bonusMoney() {
    return this.deliveries.reduce((sum, d)=>sum + (d.bonusValue || 0), 0);
  }
  get result() {
    if (this.revenue === 0) return 0;
    return Math.round(100 * this.profit / this.revenue);
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
    bonus: manifest.bonus,
    bonusMoney: manifest.bonusMoney
  };
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const auth = await validateWebhook(req);
    if (!auth.valid) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const {
      "player-email": playerEmail,
      "event-code": eventCode,
      "app-serial": appSerial,
      "match-number": matchNumber,
      // Novos campos opcionais: valores já calculados
      "lucro": lucroFromApi,
      "satisfacao": satisfacaoFromApi,
      "bonus": bonusFromApi,
      "bonus-money": bonusMoneyFromApi
    } = body;

    if (!playerEmail || !eventCode || !appSerial || matchNumber == null) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Campos obrigatórios ausentes: player-email, event-code, match-number, app-serial'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    // Validar que o código do evento tem exatamente 8 caracteres
    if (eventCode.length !== 8) {
      return new Response(JSON.stringify({
        success: false,
        error: `O código do evento deve ter exatamente 8 caracteres. Recebido: "${eventCode}" (${eventCode.length} caracteres)`
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));

    // Buscar evento com informações da turma
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, class_id')
      .eq('code', eventCode)
      .single();

    if (eventError || !eventData) {
      return new Response(JSON.stringify({
        success: false,
        error: `Evento com código '${eventCode}' não encontrado.`
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 404
      });
    }

    // Buscar todos os players com esse email (pega o mais recente)
    const { data: players, error: playerError } = await supabase
      .from('players')
      .select('id, email')
      .eq('email', playerEmail)
      .order('created_at', { ascending: false });

    if (playerError || !players || players.length === 0) {
      // Alerta: email não existe no sistema
      sendAdminAlert('Email de jogador não encontrado', [
        `Email: ${playerEmail}`,
        `Evento: ${eventCode} | App Serial: ${appSerial}`,
        `O jogo enviou uma partida para um email que não está cadastrado no sistema.`,
      ]);
      return new Response(JSON.stringify({
        success: false,
        error: `Jogador com email '${playerEmail}' não encontrado.`
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 404
      });
    }

    // Verificar qual desses players está inscrito na turma do evento
    let player = null;
    for (const p of players) {
      const { data: classPlayer, error: cpError } = await supabase
        .from('class_players')
        .select('id')
        .eq('class_id', eventData.class_id)
        .eq('player_id', p.id)
        .maybeSingle();

      if (!cpError && classPlayer) {
        player = p;
        break;
      }
    }

    if (!player) {
      // Alerta: jogador existe no sistema mas não está inscrito nesta turma
      sendAdminAlert('Jogador não inscrito na turma', [
        `Email: ${playerEmail}`,
        `Evento: ${eventCode} | Turma ID: ${eventData.class_id}`,
        `O jogador existe no sistema mas não está inscrito na turma deste evento.`,
        `Verifique se o jogador foi adicionado à turma correta.`,
      ]);
      return new Response(JSON.stringify({
        success: false,
        error: `Jogador '${playerEmail}' não está inscrito na turma deste evento.`
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 403
      });
    }

    const { data: match, error: matchError } = await supabase.from('matches').insert({
      player_id: player.id,
      event_id: eventData.id,
      class_id: eventData.class_id,
      match_number: matchNumber,
      app_serial: appSerial,
      match_date: new Date().toISOString()
    }).select().single();
    if (matchError || !match) {
      throw new Error(`Erro ao salvar match: ${matchError?.message}`);
    }

    // Determinar os resultados: usar valores da API se fornecidos, caso contrário calcular
    try {
      let lucro: number;
      let satisfacao: number;
      let bonus: number;
      let bonusMoney: number;

      // Verificar se os valores ESSENCIAIS foram fornecidos pela API
      // bonus é opcional - se não vier, deixamos como 0
      const hasCalculatedValues =
        lucroFromApi !== undefined &&
        satisfacaoFromApi !== undefined &&
        bonusMoneyFromApi !== undefined;

      if (hasCalculatedValues) {
        // Usar valores já calculados pela API do Unity
        console.log('Usando valores calculados recebidos da API...');
        lucro = Number(lucroFromApi);
        satisfacao = Number(satisfacaoFromApi);
        bonusMoney = Number(bonusMoneyFromApi);
        // bonus é opcional - se não vier, deixa como 0
        bonus = bonusFromApi !== undefined ? Number(bonusFromApi) : 0;

        console.log('Valores da API - Lucro:', lucro, 'Satisfação:', satisfacao, 'Bonus:', bonus, 'BonusMoney:', bonusMoney);
      } else {
        // Calcular a partir do app_serial (comportamento antigo - retrocompatível)
        console.log('Calculando valores a partir do app_serial...');
        console.log('App serial recebido:', appSerial);

        const calculated = deserializeAppSerial(appSerial);
        lucro = calculated.lucro;
        satisfacao = calculated.satisfacao;
        bonus = calculated.bonus;
        bonusMoney = calculated.bonusMoney;

        console.log('Valores calculados - Lucro:', lucro, 'Satisfação:', satisfacao, 'Bonus:', bonus, 'BonusMoney:', bonusMoney);
      }

      // Salvar resultados na tabela match_results
      console.log('Salvando resultados em match_results...');
      const { data: matchResultData, error: matchResultError } = await supabase
        .from('match_results')
        .insert({
          id: crypto.randomUUID(),
          player_id: player.id,
          event_id: eventData.id,
          match_number: matchNumber,
          lucro: lucro,
          satisfacao: satisfacao,
          bonus: bonus,
          bonus_money: bonusMoney,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select().single();

      if (matchResultError) {
        console.error('Erro ao salvar match_results:', matchResultError);
        throw matchResultError;
      }

      console.log('Resultados salvos com sucesso:', matchResultData);

      // Atualizar estatísticas do jogador
      await updatePlayerStats(supabase, player.id, eventData.class_id, eventData.id);

    } catch (calcError) {
      console.error('Erro completo ao processar resultados:', calcError);
      console.error('Stack trace:', calcError.stack);
    }

    return new Response(JSON.stringify({
      success: true,
      match_id: match.id,
      player_id: player.id,
      message: 'Partida registrada e resultados calculados'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (err) {
    console.error('Erro no webhook:', err);
    return new Response(JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
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
