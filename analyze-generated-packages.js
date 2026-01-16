const appSerial = "639038287823104760#6,2,7,7,3,8,0,3,5,1,8#6;2;True;2250;2250;0;12,28775|2;7;True;2250;2250;0;8,621302|7;3;True;1500;1500;0;10,93351|6;8;False;1500;1500;0;54,99779|3;8;True;1000;1000;0;15,22742|8;3;True;2250;2362;0;13,97229|8;3;True;1500;1575;0;13,31193|6;5;False;1000;1000;50;82,77723|3;5;True;1500;1575;0;11,29683|5;1;True;1000;1050;0;8,224697|3;1;True;2250;2362;236;20,54571|5;8;True;2250;2362;0;20,44663#3#120#Test_Dash_3#8#2250_1_E_0,1500_1_F_0,1000_1_D_0,2250_2_G_0,1500_2_F_0,1000_2_C_0,2250_3_A_0,1500_3_E_0,1000_3_H_0,2250_4_A_0,1500_4_H_0,1000_4_B_0,2250_5_H_0,1500_5_G_0,1000_5_A_0,2250_6_B_0,1500_6_H_0,1000_6_E_0,2250_7_A_0,1500_7_C_0,1000_7_A_0,2250_8_C_0,1500_8_C_0,1000_8_A_0,2250_6_H_0,1500_6_A_0,1000_6_B_0,2250_2_G_0,1500_7_E_0,1000_3_F_0,2250_8_E_0,1500_8_B_0,1500_3_G_0,2250_3_B_0";

const parts = appSerial.split('#');
const bonusTarget = parseInt(parts[3], 10);

// Parse generated packages (parte #7)
const packagesStr = parts[7];
const packages = packagesStr.split(',');

console.log('📦 ANÁLISE DOS PACOTES GERADOS (parte #7):\n');
console.log(`Total de pacotes: ${packages.length}`);
console.log(`Bonus Target: ${bonusTarget}\n`);

const ARCode = {
  HOME: 0, A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8
};
const ARCodeNames = Object.keys(ARCode);

// Parse packages: format is value_source_destination_bonus
const parsedPackages = packages.map(pkg => {
  const [value, source, destination, bonus] = pkg.split('_').map(Number);
  return { value, source, destination, bonus };
});

// Agrupar por source
const bySource = {};
ARCodeNames.forEach(name => {
  if (ARCode[name] === 0) return; // Skip HOME
  bySource[name] = { total: 0, packages: [] };
});

parsedPackages.forEach((pkg, i) => {
  const sourceName = ARCodeNames.find(k => ARCode[k] === pkg.source);
  if (sourceName && sourceName !== 'HOME') {
    bySource[sourceName].total++;
    bySource[sourceName].packages.push(pkg);
  }
  console.log(`Pacote ${i + 1}: source=${sourceName}(${pkg.source}), dest=${ARCodeNames.find(k => ARCode[k] === pkg.destination)}, value=${pkg.value}, bonus=${pkg.bonus}`);
});

console.log('\n═'.repeat(80));
console.log('RESUMO POR LOCALIZAÇÃO (PACOTES GERADOS):');
console.log('═'.repeat(80));

let totalBonusFromPackages = 0;
Object.entries(bySource).forEach(([source, data]) => {
  console.log(`${source}: ${data.total} pacotes`);

  // Calcular bônus para essa localização
  let bonus = 0;
  if (data.total > bonusTarget) {
    bonus = data.total - bonusTarget;
  } else if (data.total === bonusTarget) {
    bonus = 1;
  }
  totalBonusFromPackages += bonus;
  console.log(`  Bônus: ${bonus}`);
});

console.log('\n═'.repeat(80));
console.log(`BÔNUS TOTAL (baseado em pacotes gerados): ${totalBonusFromPackages}`);
console.log('═'.repeat(80));

// Agora parse as deliveries completadas
const deliveriesStr = parts[2];
const deliveries = deliveriesStr.split('|');

console.log('\n═'.repeat(80));
console.log('COMPARAÇÃO:');
console.log('═'.repeat(80));
console.log(`Pacotes gerados: ${packages.length} → Bônus calculado: ${totalBonusFromPackages}`);
console.log(`Entregas completadas: ${deliveries.length} → Bônus calculado: 1 (já verificado)`);
console.log('');
console.log('❓ O Unity pode estar calculando o bônus baseado nos PACOTES GERADOS');
console.log('   ao invés das ENTREGAS COMPLETADAS?');
