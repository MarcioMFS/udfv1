import * as XLSX from 'xlsx'

/**
 * Gera e faz download de um arquivo Excel modelo para importação de turmas
 * O arquivo contém 3 abas com dados de exemplo: Instrutor, Encontros e Alunos
 */
export function downloadClassImportTemplate() {
  // Criar workbook
  const wb = XLSX.utils.book_new()

  // ABA 1: Instrutor
  const instructorData = [
    ['TURMA EXEMPLO'],
    ['INSTRUTOR', 'EMAIL'],
    ['João Silva', 'joao@exemplo.com']
  ]
  const wsInstructor = XLSX.utils.aoa_to_sheet(instructorData)
  XLSX.utils.book_append_sheet(wb, wsInstructor, 'Instrutor')

  // ABA 2: Encontros
  const eventsData = [
    ['DATA INICIO', 'DATA FIM', 'HORÁRIO'],
    ['2025-12-02', '2025-12-02', '8 as 12'],
    ['2025-12-02', '2025-12-02', '14 as 18'],
    ['2025-12-03', '2025-12-03', '8 as 12'],
    ['2025-12-03', '2025-12-03', '14 as 18'],
    ['2025-12-04', '2025-12-04', '8 as 12'],
    ['2025-12-04', '2025-12-04', '14 as 18']
  ]
  const wsEvents = XLSX.utils.aoa_to_sheet(eventsData)
  XLSX.utils.book_append_sheet(wb, wsEvents, 'Encontros')

  // ABA 3: Alunos
  const studentsData = [
    ['NOME DO ALUNO', 'EMAIL'],
    ['Maria Santos', 'maria@exemplo.com'],
    ['Pedro Oliveira', 'pedro@exemplo.com'],
    ['Ana Costa', 'ana@exemplo.com'],
    ['Carlos Souza', 'carlos@exemplo.com'],
    ['Julia Lima', 'julia@exemplo.com']
  ]
  const wsStudents = XLSX.utils.aoa_to_sheet(studentsData)
  XLSX.utils.book_append_sheet(wb, wsStudents, 'Alunos')

  // Gerar arquivo e fazer download
  XLSX.writeFile(wb, 'Modelo_Importacao_Turma.xlsx')
}
