// Copiado do webhook
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
  deserialize(serial) {
    const parts = serial.split(';');
    // Suporta ambos formatos: antigo (5 campos) e novo (7+ campos)
    if (parts.length < 5) return;
    const parsedSource = parseInt(parts[0], 10);
    if (!isValidARCode(parsedSource)) {
      throw new Error(`Código ARCode inválido na entrega: ${parts[0]}`);
    }
    this.source = parsedSource;
    this.satisfaction = parts[2].toLowerCase() === 'true';

    // Formato novo: 6;2;True;2250;2250;0;12,28775
    // Formato antigo: 6;2;True;1;1000
    // Ambos usam parts[4] mas com base diferente (0 vs 1)
    this.value = parseInt(parts[4], 10) || 0;
  }
}

class GameDataManifest {
  deliveries = [];
  travelLog = [];
  bonusTarget = 0;
  static pathCostGrid = {
    [ARCode.HOME]: { [ARCode.HOME]: 0, [ARCode.A]: 1000, [ARCode.B]: 1250, [ARCode.C]: 900, [ARCode.D]: 1100, [ARCode.E]: 950, [ARCode.F]: 1150, [ARCode.G]: 1050, [ARCode.H]: 1200 },
    [ARCode.A]: { [ARCode.HOME]: 1000, [ARCode.A]: 0, [ARCode.B]: 800, [ARCode.C]: 1100, [ARCode.D]: 1500, [ARCode.E]: 1750, [ARCode.F]: 1650, [ARCode.G]: 1350, [ARCode.H]: 950 },
    [ARCode.B]: { [ARCode.HOME]: 1250, [ARCode.A]: 800, [ARCode.B]: 0, [ARCode.C]: 950, [ARCode.D]: 1350, [ARCode.E]: 1100, [ARCode.F]: 1750, [ARCode.G]: 1500, [ARCode.H]: 1650 },
    [ARCode.C]: { [ARCode.HOME]: 900, [ARCode.A]: 1100, [ARCode.B]: 950, [ARCode.C]: 0, [ARCode.D]: 800, [ARCode.E]: 1350, [ARCode.F]: 1500, [ARCode.G]: 1650, [ARCode.H]: 1750 },
    [ARCode.D]: { [ARCode.HOME]: 1100, [ARCode.A]: 1500, [ARCode.B]: 1350, [ARCode.C]: 800, [ARCode.D]: 0, [ARCode.E]: 950, [ARCode.F]: 1100, [ARCode.G]: 1750, [ARCode.H]: 1650 },
    [ARCode.E]: { [ARCode.HOME]: 950, [ARCode.A]: 1750, [ARCode.B]: 1100, [ARCode.C]: 1350, [ARCode.D]: 950, [ARCode.E]: 0, [ARCode.F]: 950, [ARCode.G]: 800, [ARCode.H]: 1500 },
    [ARCode.F]: { [ARCode.HOME]: 1150, [ARCode.A]: 1650, [ARCode.B]: 1750, [ARCode.C]: 1500, [ARCode.D]: 1100, [ARCode.E]: 950, [ARCode.F]: 0, [ARCode.G]: 800, [ARCode.H]: 1100 },
    [ARCode.G]: { [ARCode.HOME]: 1050, [ARCode.A]: 1350, [ARCode.B]: 1500, [ARCode.C]: 1650, [ARCode.D]: 1750, [ARCode.E]: 800, [ARCode.F]: 800, [ARCode.G]: 0, [ARCode.H]: 950 },
    [ARCode.H]: { [ARCode.HOME]: 1200, [ARCode.A]: 950, [ARCode.B]: 1650, [ARCode.C]: 1750, [ARCode.D]: 1650, [ARCode.E]: 1500, [ARCode.F]: 1100, [ARCode.G]: 950, [ARCode.H]: 0 }
  };

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

  get cost() {
    if (!this.travelLog?.length) return 0;
    let totalCost = 0;
    let lastLoc = ARCode.HOME;
    for (const currentLoc of this.travelLog) {
      totalCost += GameDataManifest.pathCostGrid[lastLoc][currentLoc];
      lastLoc = currentLoc;
    }
    return totalCost;
  }

  get revenue() {
    return this.deliveries.reduce((sum, d) => sum + d.value, 0);
  }

  get profit() {
    return this.revenue - this.cost;
  }

  get satisfaction() {
    if (!this.deliveries?.length) return 0;
    const satisfiedCount = this.deliveries.filter((d) => d.satisfaction).length;
    return Math.ceil(100 * satisfiedCount / this.deliveries.length);
  }

  get bonus() {
    if (!this.deliveries?.length || this.bonusTarget === 0) return 0;
    let totalBonus = 0;
    const allLocations = [ARCode.A, ARCode.B, ARCode.C, ARCode.D, ARCode.E, ARCode.F, ARCode.G, ARCode.H];
    for (const loc of allLocations) {
      const satisfiedDeliveriesFromLoc = this.deliveries.filter((d) => d.source === loc && d.satisfaction).length;
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

// Teste com o app_serial REAL do banco
const appSerial = "639038287823104760#6,2,7,7,3,8,0,3,5,1,8#6;2;True;2250;2250;0;12,28775|2;7;True;2250;2250;0;8,621302|7;3;True;1500;1500;0;10,93351|6;8;False;1500;1500;0;54,99779|3;8;True;1000;1000;0;15,22742|8;3;True;2250;2362;0;13,97229|8;3;True;1500;1575;0;13,31193|6;5;False;1000;1000;50;82,77723|3;5;True;1500;1575;0;11,29683|5;1;True;1000;1050;0;8,224697|3;1;True;2250;2362;236;20,54571|5;8;True;2250;2362;0;20,44663#3#120#Test_Dash_3#8#2250_1_E_0,1500_1_F_0,1000_1_D_0,2250_2_G_0,1500_2_F_0,1000_2_C_0,2250_3_A_0,1500_3_E_0,1000_3_H_0,2250_4_A_0,1500_4_H_0,1000_4_B_0,2250_5_H_0,1500_5_G_0,1000_5_A_0,2250_6_B_0,1500_6_H_0,1000_6_E_0,2250_7_A_0,1500_7_C_0,1000_7_A_0,2250_8_C_0,1500_8_C_0,1000_8_A_0,2250_6_H_0,1500_6_A_0,1000_6_B_0,2250_2_G_0,1500_7_E_0,1000_3_F_0,2250_8_E_0,1500_8_B_0,1500_3_G_0,2250_3_B_0";

console.log('📊 Testando cálculo com app_serial do banco:');
console.log('');

try {
  const result = deserializeAppSerial(appSerial);
  console.log('✅ Resultado calculado:');
  console.log(`  Lucro: ${result.lucro}`);
  console.log(`  Satisfação: ${result.satisfacao}%`);
  console.log(`  Bônus: ${result.bonus}`);
  console.log('');
  console.log('🔍 Comparação com o banco de dados:');
  console.log(`  Banco: Lucro=6836, Satisfação=84%, Bônus=1`);
  console.log(`  Calculado: Lucro=${result.lucro}, Satisfação=${result.satisfacao}%, Bônus=${result.bonus}`);
  console.log('');
  if (result.lucro === 6836 && result.satisfacao === 84 && result.bonus === 1) {
    console.log('✅ Os valores batem! O cálculo está correto.');
  } else {
    console.log('❌ Os valores NÃO batem! Há um problema no cálculo.');
  }
} catch (error) {
  console.error('❌ Erro ao processar:', error.message);
}
