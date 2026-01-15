// Teste para verificar se bonus_money está sendo calculado corretamente
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

  get bonusMoney() {
    return this.deliveries.reduce((sum, d) => sum + (d.bonusValue || 0), 0);
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

const appSerial = "639038287823104760#6,2,7,7,3,8,0,3,5,1,8#6;2;True;2250;2250;0;12,28775|2;7;True;2250;2250;0;8,621302|7;3;True;1500;1500;0;10,93351|6;8;False;1500;1500;0;54,99779|3;8;True;1000;1000;0;15,22742|8;3;True;2250;2362;0;13,97229|8;3;True;1500;1575;0;13,31193|6;5;False;1000;1000;50;82,77723|3;5;True;1500;1575;0;11,29683|5;1;True;1000;1050;0;8,224697|3;1;True;2250;2362;236;20,54571|5;8;True;2250;2362;0;20,44663#3#120#Test_Dash_3#8#2250_1_E_0,1500_1_F_0,1000_1_D_0,2250_2_G_0,1500_2_F_0,1000_2_C_0,2250_3_A_0,1500_3_E_0,1000_3_H_0,2250_4_A_0,1500_4_H_0,1000_4_B_0,2250_5_H_0,1500_5_G_0,1000_5_A_0,2250_6_B_0,1500_6_H_0,1000_6_E_0,2250_7_A_0,1500_7_C_0,1000_7_A_0,2250_8_C_0,1500_8_C_0,1000_8_A_0,2250_6_H_0,1500_6_A_0,1000_6_B_0,2250_2_G_0,1500_7_E_0,1000_3_F_0,2250_8_E_0,1500_8_B_0,1500_3_G_0,2250_3_B_0";

console.log('🧪 Testando cálculo de bonus_money:\n');

const manifest = new GameDataManifest();
manifest.deserialize(appSerial);

console.log('Valores individuais de bonusValue por entrega:');
manifest.deliveries.forEach((d, i) => {
  console.log(`  Entrega ${i + 1}: bonusValue = ${d.bonusValue}`);
});

console.log('');
console.log('═'.repeat(80));
console.log('RESULTADO FINAL:');
console.log('═'.repeat(80));
console.log(`bonus (contagem de localizações): ${manifest.bonus}`);
console.log(`bonusMoney (soma de bonusValue): ${manifest.bonusMoney}`);
console.log('');

if (manifest.bonusMoney === 286) {
  console.log('✅ SUCESSO! bonusMoney = 286 (valor esperado)');
} else {
  console.log(`❌ ERRO! bonusMoney = ${manifest.bonusMoney}, esperado = 286`);
}
