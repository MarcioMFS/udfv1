import { useEffect, useLayoutEffect, useRef } from 'react'
import { ChevronDown, Rocket } from 'lucide-react'
import Logo from '../assets/logo.png'
import { useIsAdmin } from '../hooks/useIsAdmin'

// ── Data ──────────────────────────────────────────────────────────────────────

type ItemType = 'feat' | 'fix' | 'improvement'

interface ChangelogEntry {
  date: string
  version: string
  title: string
  items: { type: ItemType; text: string; adminOnly?: boolean }[]
}

const CHANGELOG: ChangelogEntry[] = [
  {
    date: '28 de março de 2026',
    version: 'v1.4',
    title: 'Relatório de Faturamento Detalhado',
    items: [
      { type: 'feat',        text: 'Lista de instrutores novos com nome e e-mail por mês',           adminOnly: true },
      { type: 'feat',        text: 'Lista de alunos novos com nome, e-mail e instrutor de origem',    adminOnly: true },
      { type: 'feat',        text: 'Filtros por nome, instrutor e turmas de teste',                   adminOnly: true },
      { type: 'feat',        text: 'Paginação de 10 itens por página nas listas detalhadas',          adminOnly: true },
      { type: 'feat',        text: '"Exportar detalhes" gera PDF separado com os filtros aplicados',  adminOnly: true },
      { type: 'feat',        text: '"PDF completo" — resumo na pág. 1 e detalhamento na pág. 2',     adminOnly: true },
      { type: 'feat',        text: 'Marcar turmas como "Teste" para excluir das contagens de faturamento', adminOnly: true },
    ],
  },
  {
    date: '24 de março de 2026',
    version: 'v1.3',
    title: 'Correção de Dados e Infraestrutura',
    items: [
      { type: 'fix',         text: 'Partidas de todas as turmas chegando corretamente — problema de autenticação resolvido' },
      { type: 'feat',        text: 'Instrutores podem corrigir o e-mail de alunos diretamente na lista da turma' },
      { type: 'improvement', text: 'Health check diário envia alertas apenas para turmas com eventos recentes — sem ruído', adminOnly: true },
      { type: 'improvement', text: 'Alertas do sistema chegam simultaneamente para Marcio e Iuri', adminOnly: true },
    ],
  },
  {
    date: '23 de março de 2026',
    version: 'v1.2',
    title: 'Dashboard de Faturamento e Redesign Visual',
    items: [
      { type: 'feat',        text: 'Dashboard de faturamento com resumo mensal e histórico anual clicável', adminOnly: true },
      { type: 'feat',        text: 'Geração de PDF do demonstrativo de uso', adminOnly: true },
      { type: 'improvement', text: 'Visual do sistema renovado — novo estilo, cores e animações' },
      { type: 'improvement', text: 'Tela de carregamento com a identidade visual do Ignição' },
    ],
  },
  {
    date: '19 de março de 2026',
    version: 'v1.1',
    title: 'Correção de Partidas e Sistema de Alertas',
    items: [
      { type: 'fix',         text: 'Partidas vinculadas corretamente às turmas — 28 registros históricos corrigidos' },
      { type: 'feat',        text: 'Alerta imediato quando aluno não encontrado ou não inscrito na turma do evento', adminOnly: true },
      { type: 'feat',        text: 'Health check diário com relatório de inconsistências no banco de dados', adminOnly: true },
    ],
  },
  {
    date: 'Março de 2026',
    version: 'v1.0',
    title: 'Lançamento do Sistema',
    items: [
      { type: 'feat',        text: 'Gestão de turmas, eventos e alunos' },
      { type: 'feat',        text: 'Ranking de alunos por turma e evento' },
      { type: 'feat',        text: 'Partidas do app UDF chegam automaticamente ao sistema' },
      { type: 'feat',        text: 'Acesso por instrutor com visão das próprias turmas' },
      { type: 'feat',        text: 'Painel administrativo completo', adminOnly: true },
    ],
  },
]

const TYPE_CONFIG: Record<ItemType, { label: string; dot: string; badge: string }> = {
  feat:        { label: 'Novo',      dot: '#3461BE', badge: 'bg-blue-100 text-blue-700' },
  fix:         { label: 'Correção',  dot: '#10b981', badge: 'bg-emerald-100 text-emerald-700' },
  improvement: { label: 'Melhoria',  dot: '#8b5cf6', badge: 'bg-violet-100 text-violet-700' },
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ChangelogPage() {
  const { isAdmin } = useIsAdmin()
  const entryRefs = useRef<(HTMLDivElement | null)[]>([])
  const changelogRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('cl-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -32px 0px' }
    )
    entryRefs.current.forEach(el => { if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])

  const scrollToChangelog = () => {
    changelogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <style>{`
        /* Animations */
        @keyframes cl-glow {
          0%, 100% { filter: drop-shadow(0 0 18px rgba(52,97,190,0.45)); }
          50%       { filter: drop-shadow(0 0 42px rgba(52,97,190,0.85)); }
        }
        @keyframes cl-orbit-cw {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes cl-orbit-ccw {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes cl-bounce {
          0%, 100% { transform: translateY(0);    opacity: 0.45; }
          50%      { transform: translateY(10px);  opacity: 1; }
        }
        @keyframes cl-fade-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cl-stars {
          0%   { opacity: 0.15; }
          50%  { opacity: 0.45; }
          100% { opacity: 0.15; }
        }

        .cl-logo-glow   { animation: cl-glow       3s ease-in-out infinite; }
        .cl-orbit-cw    { animation: cl-orbit-cw   8s linear     infinite; }
        .cl-orbit-ccw   { animation: cl-orbit-ccw  5s linear     infinite; }
        .cl-bounce      { animation: cl-bounce      2s ease-in-out infinite; }
        .cl-hero-text   { animation: cl-fade-in    0.9s ease both; }
        .cl-hero-text-2 { animation: cl-fade-in    0.9s ease 0.2s both; }
        .cl-hero-text-3 { animation: cl-fade-in    0.9s ease 0.4s both; }

        /* Entry reveal */
        .cl-entry {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.55s cubic-bezier(.22,1,.36,1),
                      transform 0.55s cubic-bezier(.22,1,.36,1);
        }
        .cl-entry.cl-visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* Stars canvas */
        .cl-star {
          position: absolute;
          border-radius: 50%;
          background: white;
          animation: cl-stars 3s ease-in-out infinite;
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════
          HERO — full-bleed, dark navy
      ══════════════════════════════════════════════════════════════ */}
      <div
        className="-mx-4 sm:-mx-6 -mt-4 sm:-mt-6"
        style={{
          background: `
            radial-gradient(ellipse at 50% 0%, rgba(52,97,190,0.22) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 80%, rgba(52,97,190,0.08) 0%, transparent 50%),
            #0D1B3E
          `,
          minHeight: 'calc(100vh - 60px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          padding: '4rem 2rem 6rem',
        }}
      >
        {/* Static star dots */}
        {[
          { top: '8%',  left: '12%', size: 2, delay: '0s'   },
          { top: '15%', left: '72%', size: 1, delay: '0.8s' },
          { top: '22%', left: '88%', size: 2, delay: '1.5s' },
          { top: '55%', left: '6%',  size: 1, delay: '0.4s' },
          { top: '65%', left: '90%', size: 2, delay: '1.1s' },
          { top: '78%', left: '20%', size: 1, delay: '2s'   },
          { top: '40%', left: '95%', size: 1, delay: '0.6s' },
          { top: '30%', left: '3%',  size: 2, delay: '1.8s' },
          { top: '85%', left: '60%', size: 1, delay: '0.2s' },
          { top: '10%', left: '45%', size: 1, delay: '1.3s' },
        ].map((s, i) => (
          <div
            key={i}
            className="cl-star"
            style={{
              top: s.top, left: s.left,
              width: s.size, height: s.size,
              animationDelay: s.delay,
            }}
          />
        ))}

        {/* Orbital logo */}
        <div style={{ position: 'relative', width: 240, height: 240, marginBottom: '2.5rem' }}>
          {/* Outer orbit ring */}
          <div
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '1px solid rgba(52,97,190,0.18)',
            }}
          />
          {/* Inner orbit ring */}
          <div
            style={{
              position: 'absolute', inset: '24px', borderRadius: '50%',
              border: '1px dashed rgba(52,97,190,0.1)',
            }}
          />

          {/* Orbiting dot — clockwise */}
          <div
            className="cl-orbit-cw"
            style={{ position: 'absolute', inset: 0, borderRadius: '50%' }}
          >
            <div style={{
              position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)',
              width: 10, height: 10, borderRadius: '50%',
              background: '#3461BE',
              boxShadow: '0 0 10px rgba(52,97,190,0.9), 0 0 20px rgba(52,97,190,0.4)',
            }} />
          </div>

          {/* Orbiting dot — counter-clockwise, smaller */}
          <div
            className="cl-orbit-ccw"
            style={{ position: 'absolute', inset: '24px', borderRadius: '50%' }}
          >
            <div style={{
              position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
              width: 7, height: 7, borderRadius: '50%',
              background: '#60a5fa',
              boxShadow: '0 0 8px rgba(96,165,250,0.8)',
            }} />
          </div>

          {/* Logo */}
          <img
            src={Logo}
            alt="Ignição"
            className="cl-logo-glow"
            style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 150, height: 150, objectFit: 'contain',
            }}
          />
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="cl-hero-text" style={{
            fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.25em',
            textTransform: 'uppercase', color: 'rgba(96,165,250,0.7)',
            marginBottom: '0.75rem',
          }}>
            Sistema UDF
          </p>
          <h1 className="cl-hero-text-2" style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 900,
            fontSize: 'clamp(2.2rem, 6vw, 3.5rem)',
            color: 'white', lineHeight: 1.05, letterSpacing: '-0.03em',
            marginBottom: '1rem',
          }}>
            Ignição
          </h1>
          <p className="cl-hero-text-3" style={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: '1rem', fontFamily: 'DM Sans, sans-serif',
            maxWidth: 320, lineHeight: 1.6,
          }}>
            Plataforma de gestão de turmas, eventos e rankings
          </p>
        </div>

        {/* Scroll cue */}
        <div style={{
          position: 'absolute', bottom: '2rem',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
        }}>
          <button
            onClick={scrollToChangelog}
            className="cl-bounce"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            <span style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Notas de atualização
            </span>
            <ChevronDown size={18} />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          CHANGELOG SECTION
      ══════════════════════════════════════════════════════════════ */}
      <div ref={changelogRef} style={{ padding: '5rem 0 4rem', scrollMarginTop: '1rem' }}>

        {/* Section header */}
        <div style={{ marginBottom: '3.5rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem',
          }}>
            <Rocket size={18} style={{ color: '#3461BE' }} />
            <span style={{
              fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.25em',
              textTransform: 'uppercase', color: '#3461BE', fontWeight: 600,
            }}>
              Release Notes
            </span>
          </div>
          <h2 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 900,
            fontSize: 'clamp(1.6rem, 4vw, 2.25rem)',
            color: '#0D1B3E', letterSpacing: '-0.02em', lineHeight: 1.1,
          }}>
            Notas de Atualização
          </h2>
          <p style={{
            marginTop: '0.5rem', color: '#6b7280',
            fontFamily: 'DM Sans, sans-serif', fontSize: '0.9rem',
          }}>
            Acompanhe tudo que foi entregue e melhorado no sistema.
          </p>
        </div>

        {/* Timeline */}
        <div style={{ position: 'relative' }}>
          {/* Vertical timeline line */}
          <div style={{
            position: 'absolute', left: 0, top: 8, bottom: 0,
            width: 2,
            background: 'linear-gradient(to bottom, #3461BE 0%, rgba(52,97,190,0.15) 100%)',
            borderRadius: 2,
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {CHANGELOG.map((entry, idx) => {
              const visibleItems = entry.items.filter(item => !item.adminOnly || isAdmin)
              if (visibleItems.length === 0) return null
              return (
              <div
                key={idx}
                ref={el => { entryRefs.current[idx] = el }}
                className="cl-entry"
                style={{
                  transitionDelay: `${idx * 0.08}s`,
                  paddingLeft: '2rem',
                  position: 'relative',
                }}
              >
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute', left: -6, top: 18,
                  width: 14, height: 14, borderRadius: '50%',
                  background: idx === 0 ? '#3461BE' : 'white',
                  border: `2px solid ${idx === 0 ? '#3461BE' : 'rgba(52,97,190,0.35)'}`,
                  boxShadow: idx === 0 ? '0 0 0 4px rgba(52,97,190,0.12)' : 'none',
                }} />

                {/* Card */}
                <div style={{
                  background: 'white',
                  borderRadius: 16,
                  border: `1px solid ${idx === 0 ? 'rgba(52,97,190,0.2)' : '#f3f4f6'}`,
                  padding: '1.5rem 1.75rem',
                  boxShadow: idx === 0
                    ? '0 4px 24px rgba(52,97,190,0.08), 0 1px 3px rgba(0,0,0,0.04)'
                    : '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                  {/* Card header */}
                  <div style={{
                    display: 'flex', flexWrap: 'wrap',
                    alignItems: 'center', justifyContent: 'space-between',
                    gap: '0.5rem', marginBottom: '1rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '0.2rem 0.65rem', borderRadius: 99,
                        fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
                        background: idx === 0 ? '#3461BE' : '#f3f4f6',
                        color: idx === 0 ? 'white' : '#374151',
                        letterSpacing: '0.03em',
                      }}>
                        {entry.version}
                      </span>
                      <h3 style={{
                        fontFamily: 'Syne, sans-serif', fontWeight: 700,
                        fontSize: '1rem', color: '#111827',
                      }}>
                        {entry.title}
                      </h3>
                    </div>
                    <span style={{
                      fontSize: 12, color: '#9ca3af',
                      fontFamily: 'DM Sans, sans-serif',
                      whiteSpace: 'nowrap',
                    }}>
                      {entry.date}
                    </span>
                  </div>

                  {/* Items */}
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {visibleItems.map((item, i) => {
                      const cfg = TYPE_CONFIG[item.type]
                      return (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            padding: '0.15rem 0.5rem', borderRadius: 99,
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
                            textTransform: 'uppercase', whiteSpace: 'nowrap', marginTop: 2,
                            flexShrink: 0,
                          }} className={cfg.badge}>
                            {cfg.label}
                          </span>
                          <span style={{
                            fontSize: '0.875rem', color: '#374151',
                            fontFamily: 'DM Sans, sans-serif', lineHeight: 1.55,
                          }}>
                            {item.text}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
              )
            })}
          </div>

          {/* Timeline end cap */}
          <div style={{
            marginLeft: '-0.25rem', marginTop: '1rem',
            paddingLeft: '2rem', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', left: -4, top: 6,
              width: 10, height: 10, borderRadius: '50%',
              background: 'rgba(52,97,190,0.15)',
              border: '1.5px solid rgba(52,97,190,0.2)',
            }} />
            <p style={{
              fontSize: 12, color: '#9ca3af', fontFamily: 'monospace',
              letterSpacing: '0.05em',
            }}>
              início do projeto
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
