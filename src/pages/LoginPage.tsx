import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LoginForm } from '../components/LoginForm'
import Logo from '../assets/logo.png'

export function LoginPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/')
  }, [user, navigate])

  if (user) return null

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left panel — hero ───────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse at 50% 0%,   rgba(52,97,190,0.35) 0%, transparent 60%),
            radial-gradient(ellipse at 15% 85%,  rgba(52,97,190,0.12) 0%, transparent 50%),
            radial-gradient(ellipse at 85% 85%,  rgba(52,97,190,0.10) 0%, transparent 50%),
            #0D1B3E
          `,
        }}
      >
        <style>{`
          @keyframes lg-glow {
            0%, 100% { filter: drop-shadow(0 0 18px rgba(52,97,190,0.5)); }
            50%       { filter: drop-shadow(0 0 52px rgba(52,97,190,1)); }
          }
          @keyframes lg-float {
            0%, 100% { transform: translateY(0px); }
            50%       { transform: translateY(-16px); }
          }
          @keyframes lg-orbit-cw {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes lg-orbit-ccw {
            from { transform: rotate(0deg); }
            to   { transform: rotate(-360deg); }
          }
          @keyframes lg-star {
            0%, 100% { opacity: 0.12; }
            50%       { opacity: 0.55; }
          }
          @keyframes lg-exhaust-wide {
            0%, 100% { opacity: 0.25; transform: translateX(-50%) scaleX(1); }
            50%       { opacity: 0.55; transform: translateX(-50%) scaleX(1.2); }
          }
          @keyframes lg-exhaust-core {
            0%, 100% { opacity: 0.5; transform: translateX(-50%) scaleX(1); }
            50%       { opacity: 0.9; transform: translateX(-50%) scaleX(0.8); }
          }
          @keyframes lg-cloud-a {
            0%, 100% { transform: translateX(0px); }
            50%       { transform: translateX(10px); }
          }
          @keyframes lg-cloud-b {
            0%, 100% { transform: translateX(0px); }
            50%       { transform: translateX(-12px); }
          }
          @keyframes lg-fade-up {
            from { opacity: 0; transform: translateY(22px); }
            to   { opacity: 1; transform: translateY(0); }
          }

          .lg-glow      { animation: lg-glow      3s  ease-in-out infinite; }
          .lg-float     { animation: lg-float      4s  ease-in-out infinite; }
          .lg-orbit-cw  { animation: lg-orbit-cw  10s linear     infinite; }
          .lg-orbit-ccw { animation: lg-orbit-ccw  6s linear     infinite; }
        `}</style>

        {/* Stars */}
        {[
          { top: '5%',  left: '8%',  s: 2, d: '0s'   },
          { top: '11%', left: '76%', s: 1, d: '1s'   },
          { top: '19%', left: '91%', s: 2, d: '1.8s' },
          { top: '33%', left: '4%',  s: 1, d: '0.5s' },
          { top: '47%', left: '89%', s: 2, d: '2.3s' },
          { top: '9%',  left: '56%', s: 2, d: '0.3s' },
          { top: '17%', left: '38%', s: 1, d: '1.4s' },
          { top: '27%', left: '18%', s: 1, d: '2.1s' },
          { top: '54%', left: '3%',  s: 2, d: '0.7s' },
          { top: '41%', left: '61%', s: 1, d: '1.2s' },
          { top: '63%', left: '82%', s: 1, d: '0.9s' },
          { top: '74%', left: '12%', s: 1, d: '1.6s' },
          { top: '22%', left: '66%', s: 1, d: '2.6s' },
          { top: '38%', left: '30%', s: 1, d: '0.2s' },
        ].map((s, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: s.top, left: s.left,
            width: s.s, height: s.s,
            borderRadius: '50%',
            background: 'white',
            animation: `lg-star 3s ease-in-out ${s.d} infinite`,
          }} />
        ))}

        {/* Cloud layer — bottom */}
        {/* Cloud A — large left */}
        <div style={{
          position: 'absolute', bottom: -30, left: -80,
          width: 480, height: 180,
          background: 'radial-gradient(ellipse at 60% 80%, rgba(52,97,190,0.22) 0%, transparent 70%)',
          borderRadius: '55% 65% 0 0 / 85% 85% 0 0',
          animation: 'lg-cloud-a 9s ease-in-out infinite',
          filter: 'blur(3px)',
        }} />
        <div style={{
          position: 'absolute', bottom: 10, left: -20,
          width: 280, height: 90,
          background: 'rgba(52,97,190,0.13)',
          borderRadius: '50%',
          animation: 'lg-cloud-a 9s ease-in-out infinite',
          filter: 'blur(2px)',
        }} />

        {/* Cloud B — right */}
        <div style={{
          position: 'absolute', bottom: -40, right: -60,
          width: 400, height: 160,
          background: 'radial-gradient(ellipse at 40% 80%, rgba(52,97,190,0.18) 0%, transparent 70%)',
          borderRadius: '45% 55% 0 0 / 90% 85% 0 0',
          animation: 'lg-cloud-b 11s ease-in-out infinite',
          filter: 'blur(3px)',
        }} />
        <div style={{
          position: 'absolute', bottom: 15, right: 10,
          width: 220, height: 80,
          background: 'rgba(52,97,190,0.11)',
          borderRadius: '50%',
          animation: 'lg-cloud-b 11s ease-in-out infinite',
          filter: 'blur(2px)',
        }} />

        {/* Cloud C — center soft glow */}
        <div style={{
          position: 'absolute', bottom: -50,
          left: '50%', transform: 'translateX(-50%)',
          width: 360, height: 130,
          background: 'rgba(96,165,250,0.08)',
          borderRadius: '50%',
          filter: 'blur(4px)',
        }} />

        {/* ── Logo scene ── */}
        <div className="relative z-10 text-center" style={{ paddingBottom: '5rem' }}>

          <div className="lg-float" style={{ position: 'relative', display: 'inline-block', marginBottom: '2.5rem' }}>

            {/* Exhaust — wide halo */}
            <div style={{
              position: 'absolute',
              bottom: -65, left: '50%',
              width: 56, height: 90,
              background: 'linear-gradient(to bottom, rgba(52,97,190,0.65), rgba(96,165,250,0.25), transparent)',
              borderRadius: '0 0 60% 60%',
              animation: 'lg-exhaust-wide 2.2s ease-in-out infinite',
              filter: 'blur(8px)',
            }} />
            {/* Exhaust — bright core */}
            <div style={{
              position: 'absolute',
              bottom: -48, left: '50%',
              width: 18, height: 60,
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.65), rgba(96,165,250,0.3), transparent)',
              borderRadius: '0 0 50% 50%',
              animation: 'lg-exhaust-core 1.6s ease-in-out 0.3s infinite',
              filter: 'blur(3px)',
            }} />

            {/* Orbital system */}
            <div style={{ position: 'relative', width: 270, height: 270 }}>

              {/* Outer ring */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: '1px solid rgba(52,97,190,0.22)',
              }} />
              {/* Inner ring dashed */}
              <div style={{
                position: 'absolute', inset: '28px', borderRadius: '50%',
                border: '1px dashed rgba(52,97,190,0.14)',
              }} />

              {/* Dot — clockwise */}
              <div className="lg-orbit-cw" style={{ position: 'absolute', inset: 0, borderRadius: '50%' }}>
                <div style={{
                  position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
                  width: 13, height: 13, borderRadius: '50%',
                  background: '#3461BE',
                  boxShadow: '0 0 14px rgba(52,97,190,1), 0 0 28px rgba(52,97,190,0.45)',
                }} />
              </div>

              {/* Dot — counter-clockwise */}
              <div className="lg-orbit-ccw" style={{ position: 'absolute', inset: '28px', borderRadius: '50%' }}>
                <div style={{
                  position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)',
                  width: 9, height: 9, borderRadius: '50%',
                  background: '#60a5fa',
                  boxShadow: '0 0 10px rgba(96,165,250,0.9)',
                }} />
              </div>

              {/* Logo */}
              <img
                src={Logo}
                alt="Ignição"
                className="lg-glow"
                style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 175, height: 175, objectFit: 'contain',
                }}
              />
            </div>
          </div>

          {/* Text */}
          <p style={{
            fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.3em',
            textTransform: 'uppercase', color: 'rgba(96,165,250,0.65)',
            marginBottom: '0.75rem',
            animation: 'lg-fade-up 0.9s ease both',
          }}>
            Sistema UDF
          </p>
          <h2 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 900,
            fontSize: 'clamp(2.4rem, 3.2vw, 3rem)',
            color: 'white', letterSpacing: '-0.03em', lineHeight: 1,
            marginBottom: '1rem',
            animation: 'lg-fade-up 0.9s ease 0.15s both',
          }}>
            Ignição
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.38)',
            fontSize: '0.9rem', fontFamily: 'DM Sans, sans-serif',
            maxWidth: 270, margin: '0 auto', lineHeight: 1.65,
            animation: 'lg-fade-up 0.9s ease 0.3s both',
          }}>
            Plataforma de gestão de turmas, eventos e rankings
          </p>
        </div>
      </div>

      {/* ── Right panel — form ─────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-20 h-20 rounded-full shadow-md flex items-center justify-center mx-auto mb-4">
              <img src={Logo} alt="logo" />
            </div>
          </div>

          <LoginForm />

          <div className="mt-6 text-center">
            <a href="/terms" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
              Termos de Política e Privacidade
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
