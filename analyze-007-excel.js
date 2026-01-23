import XLSX from 'xlsx'
import fs from 'fs'

const filePath = '007_Turma_Piloto_Teste.xlsx'

console.log('📊 Analisando planilha 007_Turma_Piloto_Teste.xlsx...\n')

const workbook = XLSX.readFile(filePath)

console.log(`Total de abas: ${workbook.SheetNames.length}`)
console.log('Nomes das abas:', workbook.SheetNames)
console.log('')

workbook.SheetNames.forEach((sheetName, index) => {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`ABA ${index + 1}: "${sheetName}"`)
  console.log('='.repeat(60))

  const sheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  console.log(`Total de linhas: ${data.length}`)

  if (data.length > 0) {
    console.log('\nPrimeiras 15 linhas:')
    data.slice(0, 15).forEach((row, i) => {
      const rowData = Array.isArray(row) ? row : []
      const display = rowData.map(cell => {
        const str = String(cell || '').trim()
        return str.length > 30 ? str.substring(0, 27) + '...' : str
      })
      console.log(`  ${String(i + 1).padStart(2, ' ')}:`, display)
    })
  }

  // Verificar se tem cabeçalhos esperados
  console.log('\n🔍 Procurando por cabeçalhos...')
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i]
    if (!Array.isArray(row)) continue

    const hasNome = row.some(cell => String(cell).toLowerCase().includes('nome'))
    const hasEmail = row.some(cell => String(cell).toLowerCase().includes('email'))
    const hasInstrutor = row.some(cell => String(cell).toLowerCase().includes('instrutor'))

    if (hasNome || hasEmail || hasInstrutor) {
      console.log(`  Linha ${i + 1}: Possível cabeçalho -`, row.filter(c => c))
    }
  }
})

console.log('\n\n' + '='.repeat(60))
console.log('RESUMO DA ANÁLISE')
console.log('='.repeat(60))

const abaAlunos = workbook.SheetNames.find(name =>
  name.toLowerCase().includes('aluno') || name.toLowerCase().includes('tabela')
)

if (abaAlunos) {
  console.log(`✅ Aba de alunos encontrada: "${abaAlunos}"`)

  const sheet = workbook.Sheets[abaAlunos]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  let headerRow = -1
  for (let i = 0; i < Math.min(data.length, 20); i++) {
    const row = data[i]
    if (!Array.isArray(row)) continue

    const hasNome = row.some(cell => String(cell).toLowerCase().includes('nome'))
    const hasEmail = row.some(cell => String(cell).toLowerCase().includes('email'))

    if (hasNome && hasEmail) {
      headerRow = i
      break
    }
  }

  if (headerRow !== -1) {
    console.log(`✅ Cabeçalho encontrado na linha ${headerRow + 1}`)

    const alunosCount = data.slice(headerRow + 1).filter(row => {
      if (!Array.isArray(row)) return false
      return row.some(cell => String(cell).includes('@'))
    }).length

    console.log(`✅ Número de alunos com email: ${alunosCount}`)
  } else {
    console.log('❌ Cabeçalho de alunos NÃO encontrado!')
  }
} else {
  console.log('❌ Aba de alunos NÃO encontrada!')
  console.log('   Esperado: aba com nome contendo "aluno" ou "tabela"')
  console.log('   Ou terceira aba (índice 2)')
}
