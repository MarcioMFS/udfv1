import { useState, useRef } from 'react'
import {
  ChevronLeft, ChevronRight, Printer, GraduationCap, Users, BookOpen, Zap,
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react'
import {
  useAdminBillingStats,
  useAdminYearlyBilling,
  useAdminBillingDetails,
  BillingPlayer,
} from '../../hooks/useAdminBillingStats'

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

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

interface StatCardProps {
  label: string
  value: number
  delta?: number
  deltaLabel?: string
  icon: typeof Users
  accent: string
  sublabel?: string
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

// ── Detail accordion ─────────────────────────────────────────────────────────

function AccordionSection({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-800 text-sm">{title}</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
            {count}
          </span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="border-t border-gray-100 px-6 py-4">
          {children}
        </div>
      )}
    </div>
  )
}

// Group players by instructor
function groupByInstructor(players: BillingPlayer[]) {
  const map = new Map<string, { instructorName: string; players: BillingPlayer[] }>()
  for (const p of players) {
    const key = p.instructorName ?? '—'
    if (!map.has(key)) map.set(key, { instructorName: key, players: [] })
    map.get(key)!.players.push(p)
  }
  // Sort: real classes first, then "sem turma"
  return Array.from(map.values()).sort((a, b) => {
    if (a.instructorName === '—') return 1
    if (b.instructorName === '—') return -1
    return a.instructorName.localeCompare(b.instructorName, 'pt-BR')
  })
}

export function AdminBillingPage() {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [year, setYear] = useState(today.getFullYear())
  const [notes, setNotes] = useState('')
  const printAreaRef = useRef<HTMLDivElement>(null)

  const { stats, isLoading } = useAdminBillingStats(month, year)
  const { summary, isLoading: yearLoading } = useAdminYearlyBilling(year)
  const { instructors: newInstructorsList, players: newPlayersList, isLoading: detailLoading } =
    useAdminBillingDetails(month, year)

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const issuedAt = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const groupedPlayers = groupByInstructor(newPlayersList)
  const testOnlyCount = newPlayersList.filter(p => p.isTestOnly).length

  return (
    <>
      {/* ── Print styles ─────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #billing-print-area, #billing-print-area * { visibility: visible !important; }
          #billing-print-area {
            position: fixed !important;
            inset: 0 !important;
            padding: 40px !important;
            background: white !important;
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
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white shadow-md transition-all hover:shadow-lg active:scale-95 print:hidden"
            style={{ backgroundColor: '#2B63BA' }}
          >
            <Printer className="w-4 h-4" />
            Gerar PDF do Mês
          </button>
        </div>

        {/* ── Month navigator ─────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-6 mb-8 print:hidden">
          <button
            onClick={prevMonth}
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center min-w-[180px]">
            <div className="text-2xl font-black text-gray-900 tracking-tight">
              {MONTH_NAMES[month - 1]}
            </div>
            <div className="text-sm text-gray-400 font-medium">{year}</div>
          </div>
          <button
            onClick={nextMonth}
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
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
        ) : stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={GraduationCap}
              label="Instrutores ativos"
              value={stats.totalInstructors}
              delta={stats.newInstructors}
              deltaLabel={`+${stats.newInstructors} novo${stats.newInstructors !== 1 ? 's' : ''} no mês`}
              accent="bg-blue-500"
              sublabel="total acumulado"
            />
            <StatCard
              icon={Users}
              label="Alunos ativos"
              value={stats.totalPlayers}
              delta={stats.newPlayers}
              deltaLabel={`+${stats.newPlayers} novo${stats.newPlayers !== 1 ? 's' : ''} no mês`}
              accent="bg-emerald-500"
              sublabel="total acumulado"
            />
            <StatCard
              icon={BookOpen}
              label="Turmas criadas"
              value={stats.newClasses}
              accent="bg-amber-500"
              sublabel="no mês · exclui testes"
            />
            <StatCard
              icon={Zap}
              label="Partidas registradas"
              value={stats.totalMatches}
              accent="bg-purple-500"
              sublabel="no mês · exclui testes"
            />
          </div>
        ) : null}

        {/* ── Detail accordions ───────────────────────────────────────── */}
        {!isLoading && !detailLoading && (
          <div className="flex flex-col gap-3 mb-8">

            {/* Instrutores novos */}
            <AccordionSection
              title={`Instrutores novos em ${MONTH_NAMES[month - 1]}`}
              count={newInstructorsList.length}
            >
              {newInstructorsList.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum instrutor cadastrado neste mês.</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {newInstructorsList.map(instructor => (
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
              )}
            </AccordionSection>

            {/* Alunos novos */}
            <AccordionSection
              title={`Alunos novos em ${MONTH_NAMES[month - 1]}`}
              count={newPlayersList.length}
            >
              {newPlayersList.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum aluno cadastrado neste mês.</p>
              ) : (
                <>
                  {testOnlyCount > 0 && (
                    <div className="flex items-center gap-2 mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 font-medium">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      {testOnlyCount} aluno{testOnlyCount > 1 ? 's' : ''} estão apenas em turmas de teste — marcados abaixo
                    </div>
                  )}
                  <div className="flex flex-col gap-5">
                    {groupedPlayers.map(group => (
                      <div key={group.instructorName}>
                        <div className="flex items-center gap-2 mb-2">
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
                              <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                  <Users className="w-3 h-3 text-emerald-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-800">{player.name}</div>
                                  <div className="text-xs text-gray-400">{player.email}</div>
                                </div>
                              </div>
                              {player.isTestOnly && (
                                <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                                  <AlertTriangle className="w-3 h-3" />
                                  turma de teste
                                </span>
                              )}
                              {player.className && !player.isTestOnly && (
                                <span className="flex-shrink-0 text-xs text-gray-400 hidden sm:block">
                                  {player.className}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </AccordionSection>

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
                          isSelected
                            ? 'bg-blue-50'
                            : isFuture
                            ? 'opacity-40 cursor-default'
                            : 'hover:bg-gray-50'
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

        {/* ── Notes field ─────────────────────────────────────────────── */}
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
          PRINT AREA — só visível no PDF
      ══════════════════════════════════════════════════════════════════ */}
      <div id="billing-print-area" ref={printAreaRef} style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <style>{`
          #billing-print-area { font-family: 'Georgia', serif; color: #111; }
          #billing-print-area * { box-sizing: border-box; }
        `}</style>

        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 20, borderBottom: '2px solid #2B63BA' }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: 3, textTransform: 'uppercase', color: '#2B63BA', marginBottom: 6 }}>
              Sistema UDF Ignição
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1, lineHeight: 1 }}>
              Demonstrativo de Uso
            </div>
            <div style={{ fontSize: 18, color: '#555', marginTop: 4, fontWeight: 400 }}>
              {MONTH_NAMES[month - 1]} / {year}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#888', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: 1 }}>Emitido em</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{issuedAt}</div>
          </div>
        </div>

        {/* Resumo do mês */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: 3, textTransform: 'uppercase', color: '#888', marginBottom: 12 }}>
            Resumo do Mês
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                { label: 'Instrutores ativos (acumulado)', value: stats?.totalInstructors ?? '—', highlight: true },
                { label: `Novos instrutores no mês`, value: stats ? `+${stats.newInstructors}` : '—' },
                { label: 'Alunos ativos (acumulado)', value: stats?.totalPlayers ?? '—', highlight: true },
                { label: 'Novos alunos no mês', value: stats ? `+${stats.newPlayers}` : '—' },
                { label: 'Turmas criadas no mês (excl. teste)', value: stats?.newClasses ?? '—' },
                { label: 'Partidas registradas no mês (excl. teste)', value: stats?.totalMatches ?? '—' },
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee', background: row.highlight ? '#f8faff' : 'white' }}>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: '#333' }}>{row.label}</td>
                  <td style={{ padding: '10px 12px', fontSize: row.highlight ? 18 : 14, fontWeight: row.highlight ? 900 : 600, textAlign: 'right', fontFamily: 'monospace', color: row.highlight ? '#2B63BA' : '#111' }}>
                    {String(row.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Instrutores novos no mês */}
        {newInstructorsList.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: 3, textTransform: 'uppercase', color: '#888', marginBottom: 12 }}>
              Instrutores Novos no Mês ({newInstructorsList.length})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#2B63BA', color: 'white' }}>
                  <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 700 }}>Nome</th>
                  <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 700 }}>Email</th>
                </tr>
              </thead>
              <tbody>
                {newInstructorsList.map((inst, i) => (
                  <tr key={inst.id} style={{ background: i % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '7px 12px', color: '#333' }}>{inst.name}</td>
                    <td style={{ padding: '7px 12px', color: '#666', fontFamily: 'monospace', fontSize: 11 }}>{inst.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Alunos novos no mês */}
        {newPlayersList.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: 3, textTransform: 'uppercase', color: '#888', marginBottom: 12 }}>
              Alunos Novos no Mês ({newPlayersList.length})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#2B63BA', color: 'white' }}>
                  <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 700 }}>Nome</th>
                  <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 700 }}>Instrutor</th>
                  <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 700 }}>Turma</th>
                  <th style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 700 }}>Obs</th>
                </tr>
              </thead>
              <tbody>
                {newPlayersList.map((player, i) => (
                  <tr key={player.id} style={{ background: player.isTestOnly ? '#fffbeb' : i % 2 === 0 ? 'white' : '#fafafa', borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '7px 12px', color: '#333', fontWeight: player.isTestOnly ? 600 : 400 }}>{player.name}</td>
                    <td style={{ padding: '7px 12px', color: '#555' }}>{player.instructorName ?? '—'}</td>
                    <td style={{ padding: '7px 12px', color: '#666', fontSize: 11 }}>{player.className ?? '—'}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'center', color: '#b45309', fontSize: 11 }}>
                      {player.isTestOnly ? '⚠ teste' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Observações */}
        {notes.trim() && (
          <div style={{ marginBottom: 28, padding: '14px 16px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fafafa' }}>
            <div style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, textTransform: 'uppercase', color: '#888', marginBottom: 6 }}>Observações</div>
            <div style={{ fontSize: 13, color: '#444', lineHeight: 1.6 }}>{notes}</div>
          </div>
        )}

        {/* Histórico anual */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: 3, textTransform: 'uppercase', color: '#888', marginBottom: 12 }}>
            Histórico {year}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#2B63BA', color: 'white' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Mês</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>Instrutores</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>Alunos</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>Turmas</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>Partidas</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => {
                const isSelected = row.month === month
                return (
                  <tr
                    key={row.month}
                    style={{
                      background: isSelected ? '#EFF6FF' : row.month % 2 === 0 ? '#fafafa' : 'white',
                      borderBottom: '1px solid #eee',
                      fontWeight: isSelected ? 700 : 400,
                    }}
                  >
                    <td style={{ padding: '7px 12px', color: isSelected ? '#2B63BA' : '#333' }}>
                      {MONTH_SHORT[row.month - 1]}{isSelected ? ' ◀' : ''}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                      {row.newInstructors > 0 ? `+${row.newInstructors}` : row.newInstructors}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                      {row.newPlayers > 0 ? `+${row.newPlayers}` : row.newPlayers}
                    </td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{row.newClasses}</td>
                    <td style={{ padding: '7px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{row.totalMatches}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Rodapé */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 10, color: '#aaa', fontFamily: 'monospace' }}>
            Sistema UDF Ignição · ignicao.netlify.app
          </div>
          <div style={{ fontSize: 10, color: '#aaa', fontFamily: 'monospace' }}>
            Documento gerado automaticamente — {issuedAt}
          </div>
        </div>
      </div>
    </>
  )
}
