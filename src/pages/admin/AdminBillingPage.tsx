import { useState, useRef, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight, Printer, GraduationCap, Users, BookOpen, Zap,
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, AlertTriangle,
  Search, FileDown,
} from 'lucide-react'
import {
  useAdminBillingStats,
  useAdminYearlyBilling,
  useAdminBillingDetails,
  BillingPlayer,
  BillingInstructor,
} from '../../hooks/useAdminBillingStats'

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]
const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const PAGE_SIZE = 10

// ── Utilities ────────────────────────────────────────────────────────────────

function DeltaBadge({ value }: { value: number }) {
  if (value > 0) return (
    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
      <TrendingUp className="w-3 h-3" />+{value}
    </span>
  )
  if (value < 0) return (
    <span className="inline-flex items-center gap-1 text-red-500 text-xs font-semibold">
      <TrendingDown className="w-3 h-3" />{value}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-gray-400 text-xs">
      <Minus className="w-3 h-3" />0
    </span>
  )
}

function groupByInstructor(players: BillingPlayer[]) {
  const map = new Map<string, { instructorName: string; players: BillingPlayer[] }>()
  for (const p of players) {
    const key = p.instructorName ?? '—'
    if (!map.has(key)) map.set(key, { instructorName: key, players: [] })
    map.get(key)!.players.push(p)
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.instructorName === '—') return 1
    if (b.instructorName === '—') return -1
    return a.instructorName.localeCompare(b.instructorName, 'pt-BR')
  })
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  label: string; value: number; delta?: number; deltaLabel?: string
  icon: typeof Users; accent: string; sublabel?: string
}
function StatCard({ label, value, delta, deltaLabel, icon: Icon, accent, sublabel }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4 print:hidden">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {delta !== undefined && <DeltaBadge value={delta} />}
      </div>
      <div>
        <div className="text-4xl font-black text-gray-900 tracking-tight leading-none mb-1">
          {value.toLocaleString('pt-BR')}
        </div>
        <div className="text-sm font-medium text-gray-500">{label}</div>
        {sublabel && <div className="text-xs text-gray-400 mt-0.5">{sublabel}</div>}
        {deltaLabel && delta !== undefined && (
          <div className="text-xs text-gray-400 mt-1">{deltaLabel}</div>
        )}
      </div>
    </div>
  )
}

function MiniPager({
  page, total, pageSize, onChange,
}: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  return (
    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
      <span className="text-xs text-gray-400">{start}–{end} de {total}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)} disabled={page === 1}
          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
        >‹</button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | '...')[]>((acc, p, idx, arr) => {
            if (idx > 0 && (arr[idx - 1] as number) < p - 1) acc.push('...')
            acc.push(p)
            return acc
          }, [])
          .map((p, i) =>
            p === '...' ? (
              <span key={`ellipsis-${i}`} className="w-7 text-center text-xs text-gray-400">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onChange(p as number)}
                className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                  p === page
                    ? 'text-white'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
                style={p === page ? { backgroundColor: '#3461BE' } : {}}
              >{p}</button>
            )
          )}
        <button
          onClick={() => onChange(page + 1)} disabled={page === totalPages}
          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed text-xs"
        >›</button>
      </div>
    </div>
  )
}

// ── Print helpers ─────────────────────────────────────────────────────────────

const PRINT_STYLE = {
  th: { padding: '8px 12px', textAlign: 'left' as const, fontWeight: 700 },
  td: { padding: '7px 12px', color: '#333', fontSize: 12 },
  sectionLabel: {
    fontSize: 10, fontFamily: 'monospace', letterSpacing: 3,
    textTransform: 'uppercase' as const, color: '#888', marginBottom: 12,
  },
}

function PrintInstructorTable({ list }: { list: BillingInstructor[] }) {
  if (!list.length) return null
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={PRINT_STYLE.sectionLabel}>
        Instrutores novos no mês ({list.length})
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#3461BE', color: 'white' }}>
            <th style={PRINT_STYLE.th}>Nome</th>
            <th style={PRINT_STYLE.th}>Email</th>
          </tr>
        </thead>
        <tbody>
          {list.map((inst, i) => (
            <tr key={inst.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #eee' }}>
              <td style={PRINT_STYLE.td}>{inst.name}</td>
              <td style={{ ...PRINT_STYLE.td, fontFamily: 'monospace', fontSize: 11, color: '#555' }}>{inst.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PrintPlayerTable({ list }: { list: BillingPlayer[] }) {
  if (!list.length) return null
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={PRINT_STYLE.sectionLabel}>
        Alunos novos no mês ({list.length})
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#3461BE', color: 'white' }}>
            <th style={PRINT_STYLE.th}>Nome</th>
            <th style={PRINT_STYLE.th}>Email</th>
            <th style={PRINT_STYLE.th}>Instrutor</th>
            <th style={PRINT_STYLE.th}>Turma</th>
            <th style={{ ...PRINT_STYLE.th, textAlign: 'center' }}>Obs</th>
          </tr>
        </thead>
        <tbody>
          {list.map((p, i) => (
            <tr key={p.id} style={{ background: p.isTestOnly ? '#fffbeb' : i % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #eee' }}>
              <td style={{ ...PRINT_STYLE.td, fontWeight: p.isTestOnly ? 600 : 400 }}>{p.name}</td>
              <td style={{ ...PRINT_STYLE.td, fontFamily: 'monospace', fontSize: 11, color: '#555' }}>{p.email}</td>
              <td style={PRINT_STYLE.td}>{p.instructorName ?? '—'}</td>
              <td style={{ ...PRINT_STYLE.td, color: '#666', fontSize: 11 }}>{p.className ?? '—'}</td>
              <td style={{ ...PRINT_STYLE.td, textAlign: 'center', color: '#b45309', fontSize: 11 }}>
                {p.isTestOnly ? '⚠ teste' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PrintFooter({ issuedAt }: { issuedAt: string }) {
  return (
    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontSize: 10, color: '#aaa', fontFamily: 'monospace' }}>Sistema UDF Ignição · ignicao.netlify.app</div>
      <div style={{ fontSize: 10, color: '#aaa', fontFamily: 'monospace' }}>Documento gerado automaticamente — {issuedAt}</div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdminBillingPage() {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())
  const [notes, setNotes] = useState('')
  const printAreaRef = useRef<HTMLDivElement>(null)

  // Detail filter state
  const [instrOpen, setInstrOpen] = useState(false)
  const [instrSearch, setInstrSearch] = useState('')
  const [instrPage, setInstrPage] = useState(1)

  const [playerOpen, setPlayerOpen] = useState(false)
  const [playerSearch, setPlayerSearch] = useState('')
  const [playerInstructor, setPlayerInstructor] = useState('')
  const [playerShowTest, setPlayerShowTest] = useState(false)
  const [playerPage, setPlayerPage] = useState(1)

  // Data hooks
  const { stats, isLoading } = useAdminBillingStats(month, year)
  const { summary, isLoading: yearLoading } = useAdminYearlyBilling(year)
  const { instructors: newInstructorsList, players: newPlayersList, isLoading: detailLoading } =
    useAdminBillingDetails(month, year)

  // Reset filters when month/year changes
  useEffect(() => {
    setInstrSearch(''); setInstrPage(1)
    setPlayerSearch(''); setPlayerInstructor(''); setPlayerShowTest(false); setPlayerPage(1)
  }, [month, year])

  // Reset pagination on filter change
  useEffect(() => { setInstrPage(1) }, [instrSearch])
  useEffect(() => { setPlayerPage(1) }, [playerSearch, playerInstructor, playerShowTest])

  // Filtered lists
  const filteredInstructors = newInstructorsList.filter(i =>
    !instrSearch ||
    i.name.toLowerCase().includes(instrSearch.toLowerCase()) ||
    i.email.toLowerCase().includes(instrSearch.toLowerCase())
  )
  const filteredPlayers = newPlayersList.filter(p => {
    if (playerSearch &&
      !p.name.toLowerCase().includes(playerSearch.toLowerCase()) &&
      !p.email.toLowerCase().includes(playerSearch.toLowerCase())) return false
    if (playerInstructor && p.instructorName !== playerInstructor) return false
    if (playerShowTest && !p.isTestOnly) return false
    return true
  })

  // Paginated
  const pagedInstructors = filteredInstructors.slice((instrPage - 1) * PAGE_SIZE, instrPage * PAGE_SIZE)
  const pagedPlayers = filteredPlayers.slice((playerPage - 1) * PAGE_SIZE, playerPage * PAGE_SIZE)
  const groupedPagedPlayers = groupByInstructor(pagedPlayers)

  // Instructor options for select
  const instructorOptions = Array.from(
    new Set(newPlayersList.map(p => p.instructorName).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'))

  const testOnlyCount = newPlayersList.filter(p => p.isTestOnly).length
  const issuedAt = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  const handlePrintAll = () => { window.print() }

  const handlePrintDetails = () => {
    document.body.classList.add('print-details-only')
    window.print()
    document.body.classList.remove('print-details-only')
  }

  const monthLabel = MONTH_NAMES[month - 1]

  return (
    <>
      {/* ── Print styles ─────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #billing-print-area, #billing-print-area * { visibility: visible !important; }
          #billing-print-area {
            position: fixed !important; inset: 0 !important;
            padding: 40px !important; background: white !important;
          }
          body.print-details-only #billing-print-area { visibility: hidden !important; }
          body.print-details-only #billing-print-details,
          body.print-details-only #billing-print-details * { visibility: visible !important; }
          body.print-details-only #billing-print-details {
            position: fixed !important; inset: 0 !important;
            padding: 40px !important; background: white !important;
          }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>

      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Faturamento</h1>
            <p className="text-gray-500 text-sm mt-1">Demonstrativo mensal de uso do sistema</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintDetails}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all print:hidden"
            >
              <FileDown className="w-4 h-4" />
              Exportar detalhes
            </button>
            <button
              onClick={handlePrintAll}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white shadow-md transition-all hover:shadow-lg active:scale-95 print:hidden"
              style={{ backgroundColor: '#3461BE' }}
            >
              <Printer className="w-4 h-4" />
              PDF completo
            </button>
          </div>
        </div>

        {/* ── Month navigator ─────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-6 mb-8 print:hidden">
          <button onClick={prevMonth} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center min-w-[180px]">
            <div className="text-2xl font-black text-gray-900 tracking-tight">{monthLabel}</div>
            <div className="text-sm text-gray-400 font-medium">{year}</div>
          </div>
          <button onClick={nextMonth} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* ── Stat cards ──────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 print:hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                <div className="w-10 h-10 bg-gray-100 rounded-xl mb-4" />
                <div className="h-10 bg-gray-100 rounded mb-2" />
                <div className="h-4 bg-gray-50 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={GraduationCap} label="Instrutores ativos" value={stats.totalInstructors}
              delta={stats.newInstructors} deltaLabel={`+${stats.newInstructors} novo${stats.newInstructors !== 1 ? 's' : ''} no mês`}
              accent="bg-blue-500" sublabel="total acumulado" />
            <StatCard icon={Users} label="Alunos ativos" value={stats.totalPlayers}
              delta={stats.newPlayers} deltaLabel={`+${stats.newPlayers} novo${stats.newPlayers !== 1 ? 's' : ''} no mês`}
              accent="bg-emerald-500" sublabel="total acumulado" />
            <StatCard icon={BookOpen} label="Turmas criadas" value={stats.newClasses}
              accent="bg-amber-500" sublabel="no mês · exclui testes" />
            <StatCard icon={Zap} label="Partidas registradas" value={stats.totalMatches}
              accent="bg-purple-500" sublabel="no mês · exclui testes" />
          </div>
        )}

        {/* ── Detail accordions ───────────────────────────────────────── */}
        {!isLoading && !detailLoading && (
          <div className="flex flex-col gap-3 mb-8 print:hidden">

            {/* ── Instrutores novos ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setInstrOpen(v => !v)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-800 text-sm">
                    Instrutores novos em {monthLabel}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                    {newInstructorsList.length}
                  </span>
                </div>
                {instrOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {instrOpen && (
                <div className="border-t border-gray-100 px-6 py-4">
                  {/* Filter */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nome ou email..."
                      value={instrSearch}
                      onChange={e => setInstrSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                  </div>

                  {filteredInstructors.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                      {instrSearch ? 'Nenhum resultado para a busca.' : 'Nenhum instrutor cadastrado neste mês.'}
                    </p>
                  ) : (
                    <>
                      <ul className="divide-y divide-gray-50">
                        {pagedInstructors.map(instructor => (
                          <li key={instructor.id} className="py-2.5 flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-800">{instructor.name}</div>
                              <div className="text-xs text-gray-400">{instructor.email}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <MiniPager
                        page={instrPage}
                        total={filteredInstructors.length}
                        pageSize={PAGE_SIZE}
                        onChange={setInstrPage}
                      />
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Alunos novos ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setPlayerOpen(v => !v)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-800 text-sm">
                    Alunos novos em {monthLabel}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                    {newPlayersList.length}
                  </span>
                  {testOnlyCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                      <AlertTriangle className="w-3 h-3" />{testOnlyCount} teste
                    </span>
                  )}
                </div>
                {playerOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {playerOpen && (
                <div className="border-t border-gray-100 px-6 py-4">
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        value={playerSearch}
                        onChange={e => setPlayerSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      />
                    </div>
                    {instructorOptions.length > 0 && (
                      <select
                        value={playerInstructor}
                        onChange={e => setPlayerInstructor(e.target.value)}
                        className="py-2 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-gray-700 bg-white"
                      >
                        <option value="">Todos os instrutores</option>
                        {instructorOptions.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    )}
                    {testOnlyCount > 0 && (
                      <button
                        onClick={() => setPlayerShowTest(v => !v)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                          playerShowTest
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Só teste
                      </button>
                    )}
                  </div>

                  {filteredPlayers.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                      Nenhum resultado para os filtros selecionados.
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-col gap-4">
                        {groupedPagedPlayers.map(group => (
                          <div key={group.instructorName}>
                            <div className="flex items-center gap-2 mb-1.5">
                              <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                                {group.instructorName === '—' ? 'Sem turma atribuída' : group.instructorName}
                              </span>
                              <span className="text-xs text-gray-400">
                                ({group.players.length} aluno{group.players.length > 1 ? 's' : ''})
                              </span>
                            </div>
                            <ul className="divide-y divide-gray-50 ml-5">
                              {group.players.map(player => (
                                <li key={player.id} className="py-2 flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                      <Users className="w-3 h-3 text-emerald-600" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium text-gray-800 truncate">{player.name}</div>
                                      <div className="text-xs text-gray-400 truncate">{player.email}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {player.className && !player.isTestOnly && (
                                      <span className="text-xs text-gray-400 hidden sm:block">{player.className}</span>
                                    )}
                                    {player.isTestOnly && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                                        <AlertTriangle className="w-3 h-3" />turma de teste
                                      </span>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                      <MiniPager
                        page={playerPage}
                        total={filteredPlayers.length}
                        pageSize={PAGE_SIZE}
                        onChange={setPlayerPage}
                      />
                    </>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── Annual summary table ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8 print:hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-800 text-base">Histórico {year}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Turmas e partidas de teste excluídas</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-gray-400 font-semibold text-xs uppercase tracking-wide">Mês</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-semibold text-xs uppercase tracking-wide">Instrutores novos</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-semibold text-xs uppercase tracking-wide">Alunos novos</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-semibold text-xs uppercase tracking-wide">Turmas</th>
                  <th className="text-right px-6 py-3 text-gray-400 font-semibold text-xs uppercase tracking-wide">Partidas</th>
                </tr>
              </thead>
              <tbody>
                {yearLoading
                  ? [...Array(12)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td colSpan={5} className="px-6 py-3">
                        <div className="h-4 bg-gray-50 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                  : summary.map((row) => {
                    const isSelected = row.month === month
                    const isFuture = new Date(year, row.month - 1, 1) > today
                    return (
                      <tr
                        key={row.month}
                        onClick={() => setMonth(row.month)}
                        className={`border-b border-gray-50 cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50' : isFuture ? 'opacity-40 cursor-default' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className={`px-6 py-3 font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                          {MONTH_SHORT[row.month - 1]}
                          {isSelected && <span className="ml-2 text-xs text-blue-500 font-medium">← selecionado</span>}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono ${isSelected ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
                          {row.newInstructors > 0 ? `+${row.newInstructors}` : row.newInstructors}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono ${isSelected ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
                          {row.newPlayers > 0 ? `+${row.newPlayers}` : row.newPlayers}
                        </td>
                        <td className={`px-4 py-3 text-right font-mono ${isSelected ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
                          {row.newClasses}
                        </td>
                        <td className={`px-6 py-3 text-right font-mono ${isSelected ? 'text-blue-700 font-bold' : 'text-gray-600'}`}>
                          {row.totalMatches}
                        </td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Notes ───────────────────────────────────────────────────── */}
        <div className="print:hidden">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Observações (aparecem no PDF)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ex: Inclui 2 turmas corporativas. Próximo ciclo inicia em 01/04."
            rows={3}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
          />
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════
          PRINT AREA — PDF completo (resumo + detalhes)
      ══════════════════════════════════════════════════════════════════ */}
      <div id="billing-print-area" ref={printAreaRef} style={{ position: 'absolute', left: '-9999px', top: 0, fontFamily: 'Georgia, serif', color: '#111' }}>
        <style>{`#billing-print-area * { box-sizing: border-box; }`}</style>

        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 20, borderBottom: '2px solid #3461BE' }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 3, textTransform: 'uppercase', color: '#3461BE', marginBottom: 6 }}>
              Sistema UDF Ignição
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1, lineHeight: 1 }}>Demonstrativo de Uso</div>
            <div style={{ fontSize: 18, color: '#555', marginTop: 4, fontWeight: 400 }}>{monthLabel} / {year}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#888', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>Emitido em</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{issuedAt}</div>
          </div>
        </div>

        {/* Resumo */}
        <div style={{ marginBottom: 28 }}>
          <div style={PRINT_STYLE.sectionLabel}>Resumo do Mês</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                { label: 'Instrutores ativos (acumulado)', value: stats?.totalInstructors ?? '—', highlight: true },
                { label: 'Novos instrutores no mês', value: stats ? `+${stats.newInstructors}` : '—' },
                { label: 'Alunos ativos (acumulado)', value: stats?.totalPlayers ?? '—', highlight: true },
                { label: 'Novos alunos no mês', value: stats ? `+${stats.newPlayers}` : '—' },
                { label: 'Turmas criadas no mês (excl. teste)', value: stats?.newClasses ?? '—' },
                { label: 'Partidas registradas no mês (excl. teste)', value: stats?.totalMatches ?? '—' },
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee', background: row.highlight ? '#f8faff' : 'white' }}>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: '#333' }}>{row.label}</td>
                  <td style={{ padding: '10px 12px', fontSize: row.highlight ? 18 : 14, fontWeight: row.highlight ? 900 : 600, textAlign: 'right', fontFamily: 'monospace', color: row.highlight ? '#3461BE' : '#111' }}>
                    {String(row.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Histórico anual */}
        <div style={{ marginBottom: 28 }}>
          <div style={PRINT_STYLE.sectionLabel}>Histórico {year}</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#3461BE', color: 'white' }}>
                {['Mês', 'Instrutores', 'Alunos', 'Turmas', 'Partidas'].map(h => (
                  <th key={h} style={{ ...PRINT_STYLE.th, textAlign: h === 'Mês' ? 'left' : 'right' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => {
                const isSelected = row.month === month
                return (
                  <tr key={row.month} style={{ background: isSelected ? '#EFF6FF' : row.month % 2 === 0 ? '#fafafa' : 'white', borderBottom: '1px solid #eee', fontWeight: isSelected ? 700 : 400 }}>
                    <td style={{ ...PRINT_STYLE.td, color: isSelected ? '#3461BE' : '#333' }}>{MONTH_SHORT[row.month - 1]}{isSelected ? ' ◀' : ''}</td>
                    <td style={{ ...PRINT_STYLE.td, textAlign: 'right', fontFamily: 'monospace' }}>{row.newInstructors > 0 ? `+${row.newInstructors}` : row.newInstructors}</td>
                    <td style={{ ...PRINT_STYLE.td, textAlign: 'right', fontFamily: 'monospace' }}>{row.newPlayers > 0 ? `+${row.newPlayers}` : row.newPlayers}</td>
                    <td style={{ ...PRINT_STYLE.td, textAlign: 'right', fontFamily: 'monospace' }}>{row.newClasses}</td>
                    <td style={{ ...PRINT_STYLE.td, textAlign: 'right', fontFamily: 'monospace' }}>{row.totalMatches}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {notes.trim() && (
          <div style={{ marginBottom: 28, padding: '14px 16px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fafafa' }}>
            <div style={PRINT_STYLE.sectionLabel}>Observações</div>
            <div style={{ fontSize: 13, color: '#444', lineHeight: 1.6 }}>{notes}</div>
          </div>
        )}

        {/* Detalhes — página 2 */}
        {(newInstructorsList.length > 0 || newPlayersList.length > 0) && (
          <div style={{ pageBreakBefore: 'always', paddingTop: 8 }}>
            <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '2px solid #3461BE' }}>
              <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 3, textTransform: 'uppercase', color: '#3461BE', marginBottom: 4 }}>Sistema UDF Ignição</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>Detalhamento de Novos Cadastros</div>
              <div style={{ fontSize: 15, color: '#555', marginTop: 4 }}>{monthLabel} / {year}</div>
            </div>
            <PrintInstructorTable list={newInstructorsList} />
            <PrintPlayerTable list={newPlayersList} />
            <PrintFooter issuedAt={issuedAt} />
          </div>
        )}

        <PrintFooter issuedAt={issuedAt} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          PRINT AREA — Exportar detalhes (filtros aplicados)
      ══════════════════════════════════════════════════════════════════ */}
      <div id="billing-print-details" style={{ position: 'absolute', left: '-9999px', top: 0, fontFamily: 'Georgia, serif', color: '#111' }}>
        <style>{`#billing-print-details * { box-sizing: border-box; }`}</style>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 20, borderBottom: '2px solid #3461BE' }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 3, textTransform: 'uppercase', color: '#3461BE', marginBottom: 6 }}>Sistema UDF Ignição</div>
            <div style={{ fontSize: 24, fontWeight: 900 }}>Detalhamento de Novos Cadastros</div>
            <div style={{ fontSize: 16, color: '#555', marginTop: 4 }}>{monthLabel} / {year}
              {(playerInstructor || playerSearch || playerShowTest) && (
                <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>
                  (filtrado{playerInstructor ? ` · ${playerInstructor}` : ''}{playerShowTest ? ' · apenas teste' : ''})
                </span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#888', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>Emitido em</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{issuedAt}</div>
          </div>
        </div>

        <PrintInstructorTable list={filteredInstructors} />
        <PrintPlayerTable list={filteredPlayers} />
        <PrintFooter issuedAt={issuedAt} />
      </div>
    </>
  )
}
