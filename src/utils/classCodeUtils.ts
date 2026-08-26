import { supabase } from '../lib/supabase'

/**
 * O código da turma é um IDENTIFICADOR, não um resumo do nome.
 *
 * A geração antiga derivava o código de um hash do nome da turma. Como a
 * planilha modelo vem com a célula A1 preenchida com o texto "TURMA", toda
 * planilha que o instrutor não renomeava gerava o MESMO código (T1BQQF90),
 * colidindo entre instrutores e entre semestres do mesmo instrutor.
 *
 * Agora o código é sorteado no momento da criação e checado contra o banco.
 */

// Sem 0/O e 1/I/L: o código é digitado à mão pelos alunos.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

export const CLASS_CODE_LENGTH = 8

/**
 * Sorteia um código de 8 caracteres. Não consulta o banco.
 */
export function randomClassCode(): string {
  const values = new Uint32Array(CLASS_CODE_LENGTH)
  crypto.getRandomValues(values)

  let code = ''
  for (let i = 0; i < CLASS_CODE_LENGTH; i++) {
    code += CODE_ALPHABET[values[i] % CODE_ALPHABET.length]
  }
  return code
}

/**
 * Sorteia um código ainda não usado por nenhuma turma.
 *
 * A unicidade real é garantida pelo índice UNIQUE em classes.code; esta
 * checagem só evita que o usuário esbarre no erro do banco no caminho feliz.
 */
export async function generateUniqueClassCode(maxAttempts = 10): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const code = randomClassCode()

    const { data, error } = await supabase
      .from('classes')
      .select('id')
      .eq('code', code)
      .limit(1)

    if (error) {
      throw new Error(`Não foi possível verificar o código da turma: ${error.message}`)
    }

    if (!data || data.length === 0) {
      return code
    }

    console.warn(`[CLASS CODE] Código ${code} já em uso, sorteando outro (tentativa ${attempt})`)
  }

  throw new Error('Não foi possível gerar um código de turma livre. Tente novamente.')
}

/**
 * Extrai um código já explícito no nome da turma (padrão T000XXXX usado nas
 * planilhas piloto). Retorna null quando o nome não carrega um código — que é
 * o caso da maioria das planilhas, onde o nome é só "TURMA" ou o número da turma.
 *
 * Importante: NÃO inventa código a partir do nome. Sem correspondência, quem
 * decide o código é generateUniqueClassCode().
 */
export function extractExplicitClassCode(className: string): string | null {
  if (!className) return null

  const match = className.match(/\bT\d{3}[A-Z0-9]{4}\b/i)
  if (!match) return null

  return match[0].toUpperCase()
}
