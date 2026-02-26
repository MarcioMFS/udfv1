import { useState, useEffect } from 'react'
import {
  Mail, Send, Users, GraduationCap, User, Calendar, RefreshCw, AlertCircle, CheckCircle, UserPlus, MailPlus
} from 'lucide-react'
import { useEmailManagement, RecipientType, EmailOperation } from '../../hooks/useEmailManagement'
import { supabase } from '../../lib/supabase'

interface ClassOption {
  id: string
  code: string
  description: string
}

interface UserOption {
  id: string
  name: string
  email: string
  type: 'player' | 'instructor'
}

interface EventOption {
  id: string
  name: string
  schedule: string
  class_name: string
}

type EmailType = 'announcement' | 'event-reminder' | 'event-date-change' | 'resend_first_access' | 'resend_password_reset' | 'invite_instructor' | 'bulk_emails'

const emailTypeOptions: { value: EmailType; label: string; icon: typeof Mail; description: string }[] = [
  {
    value: 'announcement',
    label: 'Comunicado Livre',
    icon: Mail,
    description: 'Escreva uma mensagem personalizada para os destinatários selecionados'
  },
  {
    value: 'bulk_emails',
    label: 'Envio em Massa',
    icon: MailPlus,
    description: 'Envie para múltiplos emails separados por vírgula'
  },
  {
    value: 'invite_instructor',
    label: 'Convidar Instrutor',
    icon: UserPlus,
    description: 'Cria um novo instrutor e envia email de primeiro acesso'
  },
  {
    value: 'event-reminder',
    label: 'Lembrete de Evento',
    icon: Calendar,
    description: 'Envia lembrete do evento para todos os players da turma'
  },
  {
    value: 'event-date-change',
    label: 'Alteração de Data',
    icon: RefreshCw,
    description: 'Avisa os players sobre a mudança de data de um evento'
  },
  {
    value: 'resend_first_access',
    label: 'Reenviar Primeiro Acesso',
    icon: User,
    description: 'Reenvia o link de definição de senha para um usuário específico'
  },
  {
    value: 'resend_password_reset',
    label: 'Reenviar Reset de Senha',
    icon: RefreshCw,
    description: 'Reenvia o link de redefinição de senha para um usuário específico'
  },
]

const recipientOptions: { value: RecipientType; label: string; icon: typeof Users }[] = [
  { value: 'all_players',     label: 'Todos os Players',     icon: Users },
  { value: 'all_instructors', label: 'Todos os Instrutores', icon: GraduationCap },
  { value: 'by_class',        label: 'Por Turma',            icon: Users },
  { value: 'specific_user',   label: 'Usuário Específico',   icon: User },
]

export function AdminEmailsPage() {
  const { isLoading, dispatch } = useEmailManagement()

  // Form state
  const [emailType, setEmailType]           = useState<EmailType>('announcement')
  const [recipientType, setRecipientType]   = useState<RecipientType>('all_players')
  const [selectedClass, setSelectedClass]   = useState('')
  const [userSearch, setUserSearch]         = useState('')
  const [selectedUser, setSelectedUser]     = useState<UserOption | null>(null)
  const [subject, setSubject]               = useState('')
  const [body, setBody]                     = useState('')
  const [selectedEvent, setSelectedEvent]   = useState('')
  const [newDate, setNewDate]               = useState('')
  // Convite instrutor
  const [instructorName, setInstructorName] = useState('')
  const [instructorEmail, setInstructorEmail] = useState('')
  // Emails em massa
  const [bulkEmails, setBulkEmails]         = useState('')

  // Data state
  const [classes, setClasses]   = useState<ClassOption[]>([])
  const [users, setUsers]       = useState<UserOption[]>([])
  const [events, setEvents]     = useState<EventOption[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserOption[]>([])

  // Feedback state
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null)

  // Carrega dados iniciais
  useEffect(() => {
    async function load() {
      const [{ data: cls, error: clsErr }, { data: players }, { data: instructors }, { data: evts, error: evtsErr }] = await Promise.all([
        supabase.from('classes').select('id, code, description').order('code'),
        supabase.from('players').select('id, name, email'),
        supabase.from('instructors').select('id, name, email'),
        supabase
          .from('events')
          .select('id, name, schedule, class_id, classes(code, description)')
          .order('schedule', { ascending: false }),
      ])

      console.log('📧 [AdminEmails] Classes:', cls?.length, clsErr)
      console.log('📧 [AdminEmails] Events:', evts?.length, evtsErr)
      console.log('📧 [AdminEmails] Events data:', evts)

      setClasses(cls ?? [])

      const allUsers: UserOption[] = [
        ...(players ?? []).map((p: any) => ({ id: p.id, name: p.name, email: p.email, type: 'player' as const })),
        ...(instructors ?? []).map((i: any) => ({ id: i.id, name: i.name, email: i.email, type: 'instructor' as const })),
      ]
      setUsers(allUsers)

      setEvents(
        (evts ?? []).map((e: any) => ({
          id: e.id,
          name: e.name,
          schedule: e.schedule,
          class_name: e.classes?.code || e.classes?.description || '—',
        }))
      )
    }
    load()
  }, [])

  // Filtra usuários conforme busca
  useEffect(() => {
    if (!userSearch.trim()) {
      setFilteredUsers([])
      return
    }
    const q = userSearch.toLowerCase()
    setFilteredUsers(users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)).slice(0, 8))
  }, [userSearch, users])

  const resetForm = () => {
    setSubject('')
    setBody('')
    setSelectedClass('')
    setSelectedUser(null)
    setUserSearch('')
    setSelectedEvent('')
    setNewDate('')
    setInstructorName('')
    setInstructorEmail('')
    setBulkEmails('')
    setLastResult(null)
  }

  const handleTypeChange = (type: EmailType) => {
    setEmailType(type)
    resetForm()
  }

  // Parseia e valida emails em massa
  const parseBulkEmails = (): string[] => {
    return bulkEmails
      .split(/[,;\n]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
  }

  const canSubmit = (): boolean => {
    if (isLoading) return false
    switch (emailType) {
      case 'announcement':
        if (!subject.trim() || !body.trim()) return false
        if (recipientType === 'by_class' && !selectedClass) return false
        if (recipientType === 'specific_user' && !selectedUser) return false
        return true
      case 'bulk_emails':
        return !!subject.trim() && !!body.trim() && parseBulkEmails().length > 0
      case 'invite_instructor':
        return !!instructorName.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(instructorEmail.trim())
      case 'event-reminder':
        return !!selectedEvent
      case 'event-date-change':
        return !!selectedEvent && !!newDate
      case 'resend_first_access':
      case 'resend_password_reset':
        return !!selectedUser
      default:
        return false
    }
  }

  const handleSubmit = async () => {
    setLastResult(null)
    let operation: EmailOperation
    let params: Record<string, any> = {}

    switch (emailType) {
      case 'announcement':
        operation = 'send_announcement'
        params = {
          recipient_type: recipientType,
          subject,
          body,
          ...(recipientType === 'by_class' ? { class_id: selectedClass } : {}),
          ...(recipientType === 'specific_user' ? { user_id: selectedUser!.id } : {}),
        }
        break
      case 'bulk_emails':
        operation = 'send_bulk_emails'
        params = {
          emails: parseBulkEmails(),
          subject,
          body,
        }
        break
      case 'invite_instructor':
        operation = 'invite_instructor'
        params = {
          instructor_name: instructorName.trim(),
          instructor_email: instructorEmail.trim().toLowerCase(),
        }
        break
      case 'event-reminder':
        operation = 'send_event_reminder'
        params = { event_id: selectedEvent }
        break
      case 'event-date-change':
        operation = 'send_event_date_change'
        params = { event_id: selectedEvent, new_date: newDate }
        break
      case 'resend_first_access':
        operation = 'resend_first_access'
        params = { user_id: selectedUser!.id }
        break
      case 'resend_password_reset':
        operation = 'resend_password_reset'
        params = { user_id: selectedUser!.id }
        break
      default:
        return
    }

    const success = await dispatch({ operation, ...params })
    setLastResult({
      success,
      message: success ? 'Email(s) disparado(s) com sucesso!' : 'Falha ao enviar. Verifique o console.',
    })
    if (success) resetForm()
  }

  const selectedTypeInfo = emailTypeOptions.find(o => o.value === emailType)!

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Central de Emails</h1>
        <p className="text-gray-600">Dispare emails para players e instrutores diretamente pelo painel</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Formulário principal */}
        <div className="xl:col-span-2 space-y-6">

          {/* Seleção do tipo de email */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Tipo de Email</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {emailTypeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleTypeChange(opt.value)}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                    emailType === opt.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    emailType === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <opt.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${emailType === opt.value ? 'text-blue-700' : 'text-gray-800'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Campos condicionais */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              Configurar — {selectedTypeInfo.label}
            </h2>

            {/* ── COMUNICADO LIVRE ── */}
            {emailType === 'announcement' && (
              <div className="space-y-5">
                {/* Destinatários */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Destinatários</label>
                  <div className="grid grid-cols-2 gap-2">
                    {recipientOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setRecipientType(opt.value)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all ${
                          recipientType === opt.value
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <opt.icon className="w-4 h-4 flex-shrink-0" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Seletor de turma */}
                {recipientType === 'by_class' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Turma</label>
                    <select
                      value={selectedClass}
                      onChange={e => setSelectedClass(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Selecione uma turma</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.code}{c.description ? ` - ${c.description}` : ''}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Busca de usuário */}
                {recipientType === 'specific_user' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Usuário</label>
                    {selectedUser ? (
                      <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-blue-800">{selectedUser.name}</p>
                          <p className="text-xs text-blue-600">{selectedUser.email} · {selectedUser.type === 'instructor' ? 'Instrutor' : 'Player'}</p>
                        </div>
                        <button onClick={() => { setSelectedUser(null); setUserSearch('') }} className="text-blue-500 hover:text-blue-700 text-xs underline">Trocar</button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Buscar por nome ou email..."
                          value={userSearch}
                          onChange={e => setUserSearch(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {filteredUsers.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredUsers.map(u => (
                              <button
                                key={u.id}
                                onClick={() => { setSelectedUser(u); setUserSearch('') }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
                              >
                                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  {u.type === 'instructor' ? <GraduationCap className="w-3.5 h-3.5 text-blue-500" /> : <User className="w-3.5 h-3.5 text-green-500" />}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-800">{u.name}</p>
                                  <p className="text-xs text-gray-500">{u.email}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Assunto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assunto <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Ex: Comunicado importante sobre o próximo módulo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Corpo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem <span className="text-red-500">*</span></label>
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder="Escreva aqui o conteúdo do email..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">{body.length} caracteres</p>
                </div>
              </div>
            )}

            {/* ── ENVIO EM MASSA ── */}
            {emailType === 'bulk_emails' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emails <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={bulkEmails}
                    onChange={e => setBulkEmails(e.target.value)}
                    placeholder="Digite os emails separados por vírgula, ponto e vírgula ou um por linha&#10;Ex: joao@email.com, maria@email.com"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {parseBulkEmails().length} email(s) válido(s) detectado(s)
                  </p>
                </div>

                {/* Assunto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assunto <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Ex: Comunicado importante"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Corpo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mensagem <span className="text-red-500">*</span></label>
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder="Escreva aqui o conteúdo do email..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">{body.length} caracteres</p>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  <p className="font-medium mb-1">📧 Envio em massa</p>
                  <p>Os emails serão enviados para todos os endereços válidos informados acima, mesmo que não estejam cadastrados no sistema.</p>
                </div>
              </div>
            )}

            {/* ── CONVIDAR INSTRUTOR ── */}
            {emailType === 'invite_instructor' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Instrutor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={instructorName}
                    onChange={e => setInstructorName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email do Instrutor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={instructorEmail}
                    onChange={e => setInstructorEmail(e.target.value)}
                    placeholder="Ex: joao@email.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  <p className="font-medium mb-1">🎓 Novo Instrutor</p>
                  <p>Um novo instrutor será criado no sistema e receberá um email com link para definir sua senha. O link é válido por 24 horas.</p>
                </div>
              </div>
            )}

            {/* ── LEMBRETE / ALTERAÇÃO DE DATA ── */}
            {(emailType === 'event-reminder' || emailType === 'event-date-change') && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Evento <span className="text-red-500">*</span></label>
                  <select
                    value={selectedEvent}
                    onChange={e => setSelectedEvent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Selecione um evento</option>
                    {events.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.name} — {e.schedule ? new Date(e.schedule).toLocaleDateString('pt-BR') : 'Sem data'} · {e.class_name}
                      </option>
                    ))}
                  </select>
                </div>

                {emailType === 'event-date-change' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nova Data <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}

                {selectedEvent && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                    <p className="font-medium mb-1">📧 O email será enviado para:</p>
                    <p>Todos os players vinculados à turma do evento selecionado.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── REENVIAR PRIMEIRO ACESSO / RESET ── */}
            {(emailType === 'resend_first_access' || emailType === 'resend_password_reset') && (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Usuário <span className="text-red-500">*</span></label>
                  {selectedUser ? (
                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-blue-800">{selectedUser.name}</p>
                        <p className="text-xs text-blue-600">{selectedUser.email} · {selectedUser.type === 'instructor' ? 'Instrutor' : 'Player'}</p>
                      </div>
                      <button onClick={() => { setSelectedUser(null); setUserSearch('') }} className="text-blue-500 hover:text-blue-700 text-xs underline">Trocar</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {filteredUsers.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredUsers.map(u => (
                            <button
                              key={u.id}
                              onClick={() => { setSelectedUser(u); setUserSearch('') }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
                            >
                              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                {u.type === 'instructor' ? <GraduationCap className="w-3.5 h-3.5 text-blue-500" /> : <User className="w-3.5 h-3.5 text-green-500" />}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-800">{u.name}</p>
                                <p className="text-xs text-gray-500">{u.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                  <p className="font-medium mb-1">
                    {emailType === 'resend_first_access' ? '🔑 Primeiro Acesso' : '🔒 Reset de Senha'}
                  </p>
                  <p>
                    {emailType === 'resend_first_access'
                      ? 'Um link para definir a senha será enviado. Válido por 24 horas.'
                      : 'Um link para redefinir a senha será enviado. Válido por 24 horas.'}
                  </p>
                </div>
              </div>
            )}

            {/* Feedback de resultado */}
            {lastResult && (
              <div className={`mt-4 flex items-center gap-2 p-3 rounded-lg text-sm ${
                lastResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {lastResult.success
                  ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                {lastResult.message}
              </div>
            )}

            {/* Botão de envio */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit()}
              className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Disparar Email
                </>
              )}
            </button>
          </div>
        </div>

        {/* Painel lateral — info dos tipos */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Tipos Disponíveis</h2>
            <div className="space-y-3">
              {emailTypeOptions.map(opt => (
                <div key={opt.value} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <opt.icon className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{opt.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-yellow-800 mb-1">Atenção</p>
                <p className="text-xs text-yellow-700 leading-relaxed">
                  Emails são enviados imediatamente e não podem ser cancelados. Revise sempre antes de disparar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
