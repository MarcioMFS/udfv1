import { supabase } from '../lib/supabase'

/**
 * Busca o ID do instrutor na tabela instructors baseado no email do usuário autenticado
 * Necessário porque user.id é da tabela auth.users, mas instructor_id é da tabela instructors
 */
export async function getInstructorIdByEmail(userEmail: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('instructors')
      .select('id')
      .eq('email', userEmail)
      .limit(1)

    return data?.[0]?.id || null
  } catch (error) {
    console.error('Erro ao buscar instructor_id:', error)
    return null
  }
}
