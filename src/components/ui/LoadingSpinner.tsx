/* ─────────────────────────────────────────────────────────────────────────────
   Loader padronizado do Sistema Ignição

   Componentes disponíveis:
   - <PageLoading />      → loader de página inteira (logo + anel + dots)
   - <SectionLoading />   → loader de seção (menor, sem fundo)
   - <InlineLoading />    → loader de linha / card
   - <ButtonSpinner />    → spinner branco para dentro de botões
───────────────────────────────────────────────────────────────────────────── */

interface PageLoadingProps {
  message?: string
}

/** Loader principal — usa a logo com anel orbital + dots pulsando */
export function PageLoading({ message = 'Carregando...' }: PageLoadingProps) {
  return (
    <div className="min-h-[420px] flex flex-col items-center justify-center gap-5 select-none">
      <RocketLoader size={88} />
      <RocketDots />
      {message && (
        <p
          className="text-sm font-body text-gray-400 animate-fade-in"
          style={{ animationDelay: '400ms' }}
        >
          {message}
        </p>
      )}
    </div>
  )
}

/** Loader de seção — compacto, sem altura mínima grande */
export function SectionLoading({ message }: { message?: string }) {
  return (
    <div className="py-12 flex flex-col items-center justify-center gap-4 select-none">
      <RocketLoader size={64} />
      <RocketDots small />
      {message && (
        <p className="text-xs font-body text-gray-400">{message}</p>
      )}
    </div>
  )
}

/** Loader inline — para dentro de cards ou containers menores */
export function InlineLoading({ message }: { message?: string }) {
  return (
    <div className="py-8 flex flex-col items-center justify-center gap-3 select-none">
      <RocketLoader size={48} />
      <RocketDots small />
      {message && (
        <p className="text-xs font-body text-gray-400">{message}</p>
      )}
    </div>
  )
}

/** Spinner branco para dentro de botões durante ação assíncrona */
export function ButtonSpinner() {
  return (
    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
  )
}

/* ── Primitivos internos ─────────────────────────────────────────── */

function RocketLoader({ size }: { size: number }) {
  const inner = size * 0.52

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* Anel externo — gira clockwise, efeito cometa */}
      <div className="rocket-ring-outer" />
      {/* Anel interno — gira counter-clockwise */}
      <div className="rocket-ring-inner" />
      {/* Logo flutuando */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          inset: (size - inner) / 2,
          width: inner,
          height: inner,
        }}
      >
        <img
          src="/logo.png"
          alt="Ignição"
          className="rocket-float w-full h-full object-contain"
          draggable={false}
        />
      </div>
    </div>
  )
}

function RocketDots({ small }: { small?: boolean }) {
  const size = small ? 'w-1.5 h-1.5' : 'w-[7px] h-[7px]'
  const gap = small ? 'gap-1' : 'gap-1.5'
  const delays = ['0ms', '160ms', '320ms']

  return (
    <div className={`flex ${gap}`}>
      {delays.map((delay, i) => (
        <span
          key={i}
          className={`rocket-dot ${size}`}
          style={{ animationDelay: delay }}
        />
      ))}
    </div>
  )
}

/* ─── Aliases mantidos para não quebrar imports existentes ─────────── */
export function LoadingSpinner({ message }: { message?: string; size?: string; className?: string }) {
  return <InlineLoading message={message} />
}
