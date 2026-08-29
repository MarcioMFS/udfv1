import { useMemo, useState } from 'react'
import { AlertTriangle, Search, Flag, Check, EyeOff, RotateCcw, Users, UserCheck, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMatchAttempts, MatchAttempt, MatchAttemptStatus, ClassStudent } from '../../hooks/useMatchAttempts'
import { SectionLoading } from '../../components/ui/LoadingSpinner'
import { EmptyState, ErrorMessage } from '../../components/ui'

const REASON_LABEL: Record<string, string> = {
  email_not_found: 'E-mail não cadastrado',
  not_enrolled: 'Não inscrito na turma',
  event_not_found: 'Evento inexistente'
}

const REASON_HINT: Record<string, string> = {
  email_not_found: 'O jogador digitou um e-mail que não existe no sistema.',
  not_enrolled: 'O e-mail existe, mas não está inscrito na turma deste evento — possível tentativa de burlar o limite de alunos.',
  event_not_found: 'O código do evento digitado não existe.'
}

const STATUS_STYLE: Record<MatchAttemptStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  ignored: 'bg-gray-100 text-gray-600',
  flagged: 'bg-red-100 text-red-700'
}

const STATUS_LABEL: Record<MatchAttemptStatus, string> = {
  pending: 'Pendente',
  resolved: 'Resolvido',
  ignored: 'Ignorado',
  flagged: 'Burla'
}

type Filter = 'pending' | 'flagged' | 'all'

export function AdminUnidentifiedPlayersPage() {
  const { attempts, isLoading, error, refresh, updateStatus, fetchClassStudents, reprocess } = useMatchAttempts()
  const [filter, setFilter] = useState<Filter>('pending')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  // Modal de reprocessamento
  const [reprocessing, setReprocessing] = useState<MatchAttempt | null>(null)
  const [students, setStudents] = useState<ClassStudent[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const openReprocess = async (a: MatchAttempt) => {
    setReprocessing(a)
    setSelectedEmail('')
    setStudents([])
    if (a.class_id) {
      setStudentsLoading(true)
      const list = await fetchClassStudents(a.class_id)
      setStudents(list)
      setStudentsLoading(false)
    }
  }

  const confirmReprocess = async () => {
    if (!reprocessing || !selectedEmail) return
    setSubmitting(true)
    const res = await reprocess(reprocessing.id, selectedEmail)
    setSubmitting(false)
    if (res.success) {
      toast.success(res.message)
      setReprocessing(null)
    } else {
      toast.error(res.message)
    }
  }

  const counts = useMemo(() => ({
    pending: attempts.filter(a => a.status === 'pending').length,
    flagged: attempts.filter(a => a.status === 'flagged').length,
    all: attempts.length
  }), [attempts])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return attempts
      .filter(a => (filter === 'all' ? true : a.status === filter))
      .filter(a => {
        if (!term) return true
        return (
          a.player_email.toLowerCase().includes(term) ||
          (a.classes?.description || '').toLowerCase().includes(term) ||
          (a.instructors?.name || '').toLowerCase().includes(term) ||
          a.event_code.toLowerCase().includes(term)
        )
      })
  }, [attempts, filter, search])

  const act = async (a: MatchAttempt, status: MatchAttemptStatus) => {
    setBusyId(a.id)
    const ok = await updateStatus(a.id, status)
    setBusyId(null)
    if (ok) {
      const msg: Record<MatchAttemptStatus, string> = {
        flagged: 'Marcado como burla',
        ignored: 'Ignorado',
        resolved: 'Marcado como resolvido',
        pending: 'Reaberto'
      }
      toast.success(msg[status])
    } else {
      toast.error('Não foi possível atualizar. Tente novamente.')
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorMessage title="Erro ao carregar" message={error} onRetry={refresh} />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="text-yellow-500" size={26} />
          Jogadores não identificados
        </h1>
        <p className="text-gray-600 mt-1">
          Partidas que chegaram do jogo mas não casaram com nenhum aluno inscrito —
          e-mail digitado errado ou tentativa de jogar fora do cadastro da turma.
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => setFilter('pending')}
          className={`text-left bg-white rounded-lg border p-4 transition ${filter === 'pending' ? 'border-yellow-400 ring-1 ring-yellow-300' : 'border-gray-200 hover:bg-gray-50'}`}
        >
          <p className="text-sm text-gray-500">Pendentes</p>
          <p className="text-2xl font-bold text-yellow-600">{counts.pending}</p>
        </button>
        <button
          onClick={() => setFilter('flagged')}
          className={`text-left bg-white rounded-lg border p-4 transition ${filter === 'flagged' ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-200 hover:bg-gray-50'}`}
        >
          <p className="text-sm text-gray-500">Marcadas como burla</p>
          <p className="text-2xl font-bold text-red-600">{counts.flagged}</p>
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`text-left bg-white rounded-lg border p-4 transition ${filter === 'all' ? 'border-blue-400 ring-1 ring-blue-300' : 'border-gray-200 hover:bg-gray-50'}`}
        >
          <p className="text-sm text-gray-500">Total registrado</p>
          <p className="text-2xl font-bold text-gray-800">{counts.all}</p>
        </button>
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por e-mail, turma, instrutor ou código do evento..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {isLoading ? (
        <SectionLoading message="Carregando tentativas..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nada por aqui"
          message={
            filter === 'pending'
              ? 'Nenhuma tentativa pendente. Quando um jogador entrar com e-mail errado ou fora da turma, aparece aqui.'
              : 'Nenhum registro para este filtro.'
          }
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left font-medium px-4 py-3">E-mail digitado</th>
                  <th className="text-left font-medium px-4 py-3">Turma / Instrutor</th>
                  <th className="text-left font-medium px-4 py-3">Motivo</th>
                  <th className="text-left font-medium px-4 py-3">Quando</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-right font-medium px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-gray-800">{a.player_email}</span>
                      {a.event_code && (
                        <span className="block text-xs text-gray-400">evento {a.event_code}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-800">{a.classes?.description || a.class_id || '—'}</span>
                      <span className="block text-xs text-gray-400">{a.instructors?.name || 'instrutor desconhecido'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span title={REASON_HINT[a.reason]} className="text-gray-700 cursor-help border-b border-dotted border-gray-300">
                        {REASON_LABEL[a.reason] || a.reason}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(a.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[a.status]}`}>
                        {STATUS_LABEL[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {a.status !== 'resolved' && a.app_serial && a.class_id && (
                          <button
                            onClick={() => openReprocess(a)}
                            disabled={busyId === a.id}
                            title="Reprocessar: atribuir a partida ao aluno certo"
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-40"
                          >
                            <UserCheck size={16} />
                          </button>
                        )}
                        {a.status !== 'flagged' && (
                          <button
                            onClick={() => act(a, 'flagged')}
                            disabled={busyId === a.id}
                            title="Marcar como burla (cobrança)"
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-40"
                          >
                            <Flag size={16} />
                          </button>
                        )}
                        {a.status !== 'ignored' && (
                          <button
                            onClick={() => act(a, 'ignored')}
                            disabled={busyId === a.id}
                            title="Ignorar"
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                          >
                            <EyeOff size={16} />
                          </button>
                        )}
                        {a.status !== 'resolved' && (
                          <button
                            onClick={() => act(a, 'resolved')}
                            disabled={busyId === a.id}
                            title="Marcar como resolvido"
                            className="p-2 rounded-lg text-green-600 hover:bg-green-50 disabled:opacity-40"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        {a.status !== 'pending' && (
                          <button
                            onClick={() => act(a, 'pending')}
                            disabled={busyId === a.id}
                            title="Reabrir"
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4 flex items-center gap-1">
        <Users size={13} />
        Dica: "Não inscrito na turma" costuma ser aluno jogando fora do cadastro — marque como burla para cobrança.
      </p>

      {/* Modal de reprocessamento */}
      {reprocessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <UserCheck size={18} className="text-blue-600" />
                Reprocessar partida
              </h3>
              <button onClick={() => setReprocessing(null)} className="p-1 rounded hover:bg-gray-100">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <p className="text-sm text-gray-600">
                O jogador digitou <span className="font-mono text-gray-800">{reprocessing.player_email}</span>.
                Escolha o aluno correto da turma <strong>{reprocessing.classes?.description || ''}</strong> para
                atribuir esta partida. Os dados da partida serão lançados no nome dele.
              </p>

              {studentsLoading ? (
                <p className="text-sm text-gray-400">Carregando alunos da turma...</p>
              ) : students.length === 0 ? (
                <p className="text-sm text-red-500">
                  Nenhum aluno inscrito nesta turma. Inscreva o aluno primeiro para poder reprocessar.
                </p>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aluno correto</label>
                  <select
                    value={selectedEmail}
                    onChange={e => setSelectedEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">Selecione...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.email || ''}>
                        {s.name || '(sem nome)'} — {s.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => setReprocessing(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmReprocess}
                disabled={!selectedEmail || submitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {submitting ? 'Reprocessando...' : 'Reprocessar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
