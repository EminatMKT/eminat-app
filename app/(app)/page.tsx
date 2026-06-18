'use client'
import { useRouter } from 'next/navigation'
import { useApp } from '@/shared/context/AppContext'
import AppShell from '@/app/components/AppShell'
import { PageTransition } from '@/shared/motion'
import { MODULE_META, type ModuleSlug } from '@/shared/auth/permissions'

// ── Dark theme (matches AppShell's sidebar palette) ───────────────────
const D = {
  bg: '#0A0A0F',
  card: '#13131C',
  cardHover: '#191923',
  border: 'rgba(255,255,255,0.07)',
  borderHover: 'rgba(79,70,229,0.55)',
  t1: '#FFFFFF',
  t2: 'rgba(255,255,255,0.65)',
  t3: 'rgba(255,255,255,0.35)',
  accent: '#4F46E5',
  accentSoft: 'rgba(79,70,229,0.12)',
}

// ── Inline SVG icons (no emoji) ────────────────────────────────────────
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function ModuleIcon({ slug }: { slug: ModuleSlug }) {
  const props = { width: 26, height: 26, viewBox: '0 0 24 24', 'aria-hidden': true as const }
  switch (slug) {
    case 'stratix-mkt':
      return (
        <svg {...props}>
          <path d="M3 11l16-6v14L3 13v-2z" {...stroke} />
          <path d="M7 13v4a2 2 0 0 0 4 0v-3" {...stroke} />
        </svg>
      )
    case 'cobranzas':
      return (
        <svg {...props}>
          <rect x="3" y="6" width="18" height="13" rx="2" {...stroke} />
          <path d="M3 10h18M7 15h4" {...stroke} />
        </svg>
      )
    case 'research':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="6" {...stroke} />
          <path d="M16 16l5 5M8 11h6M11 8v6" {...stroke} />
        </svg>
      )
    case 'medical':
      return (
        <svg {...props}>
          <rect x="5" y="5" width="14" height="14" rx="3" {...stroke} />
          <path d="M12 8v8M8 12h8" {...stroke} />
        </svg>
      )
    case 'accounting':
      return (
        <svg {...props}>
          <rect x="4" y="3" width="16" height="18" rx="2" {...stroke} />
          <path d="M8 8h8M8 12h8M8 16h5" {...stroke} />
        </svg>
      )
    case 'th-hr':
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="3.5" {...stroke} />
          <path d="M5 20a7 7 0 0 1 14 0" {...stroke} />
        </svg>
      )
    case 'directorio':
      return (
        <svg {...props}>
          <circle cx="9" cy="9" r="3.5" {...stroke} />
          <path d="M3 19a6 6 0 0 1 12 0" {...stroke} />
          <circle cx="17" cy="8" r="2.5" {...stroke} />
          <path d="M14.5 19a4.5 4.5 0 0 1 7 0" {...stroke} />
        </svg>
      )
    case 'admin':
      return (
        <svg {...props}>
          <path d="M12 3l8 4v5c0 5-4 8-8 9-4-1-8-4-8-9V7l8-4z" {...stroke} />
          <path d="M9 12l2 2 4-4" {...stroke} />
        </svg>
      )
    default:
      return null
  }
}

// ── Launchpad ──────────────────────────────────────────────────────────

export default function LaunchpadPage() {
  const { usuario, modules, esSuperAdmin } = useApp()
  const router = useRouter()

  return (
    <AppShell>
      <PageTransition>
        {/* Negative margins escape AppShell's light content padding, so the
            launchpad takes over the full content area with its dark canvas. */}
        <div
          style={{
            margin: '-20px -24px',
            minHeight: 'calc(100vh - 60px)',
            background: D.bg,
            color: D.t1,
            padding: '64px 32px 96px',
            fontFamily: 'Poppins, "DM Sans", sans-serif',
          }}
        >
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* Welcome header */}
            <div style={{ marginBottom: 40 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '5px 12px',
                  borderRadius: 999,
                  background: D.accentSoft,
                  border: `1px solid ${D.accent}30`,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '.22em',
                  textTransform: 'uppercase',
                  color: '#A5A7FF',
                  marginBottom: 18,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: D.accent }} />
                Launchpad
              </div>
              <h1
                style={{
                  fontFamily: 'Poppins, sans-serif',
                  fontSize: 'clamp(36px, 5vw, 56px)',
                  fontWeight: 800,
                  lineHeight: 1.05,
                  letterSpacing: '-0.02em',
                  color: D.t1,
                  margin: 0,
                }}
              >
                Hola, {usuario?.nombre || 'equipo'}
              </h1>
              <p
                style={{
                  marginTop: 12,
                  fontSize: 15,
                  color: D.t2,
                  fontWeight: 400,
                }}
              >
                Selecciona un área para comenzar.
              </p>
            </div>

            {/* Admin "Ver todo" — only visible to admin role */}
            {esSuperAdmin && <VerTodoBanner onClick={() => router.push('/overview')} />}

            {/* Cards grid */}
            {modules.length === 0 ? (
              <EmptyState />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 16,
                }}
              >
                {modules.map((slug, i) => {
                  const meta = MODULE_META[slug]
                  return (
                    <LaunchCard
                      key={slug}
                      slug={slug}
                      meta={meta}
                      onClick={() => router.push(meta.href)}
                      delay={i * 0.04}
                    />
                  )
                })}
              </div>
            )}

            {/* Footer line */}
            <div
              style={{
                marginTop: 64,
                paddingTop: 18,
                borderTop: `1px solid ${D.border}`,
                fontSize: 10,
                color: D.t3,
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            >
              The operating system of Eminat Group
            </div>
          </div>
        </div>

        <style>{`
          @keyframes launchFadeIn {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .launch-card { animation: launchFadeIn .5s ease-out backwards; }
        `}</style>
      </PageTransition>
    </AppShell>
  )
}

function VerTodoBanner({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 28,
        padding: '18px 22px',
        borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(79,70,229,0.18) 0%, rgba(124,58,237,0.12) 100%)',
        border: `1px solid ${D.accent}40`,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        color: D.t1,
        transition: 'background .2s, border-color .2s, transform .2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background =
          'linear-gradient(135deg, rgba(79,70,229,0.28) 0%, rgba(124,58,237,0.18) 100%)'
        e.currentTarget.style.borderColor = '#7C6FF7'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background =
          'linear-gradient(135deg, rgba(79,70,229,0.18) 0%, rgba(124,58,237,0.12) 100%)'
        e.currentTarget.style.borderColor = `${D.accent}40`
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            display: 'grid',
            placeItems: 'center',
            background: D.accent,
            color: 'white',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="12" r="3" {...stroke} />
            <path d="M3 7h4M3 12h3M3 17h4M21 7h-4M21 12h-3M21 17h-4M12 3v4M12 21v-4" {...stroke} />
          </svg>
        </span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-.01em' }}>Ver todo</div>
          <div style={{ fontSize: 12, color: D.t2, marginTop: 2 }}>
            Abre la vista panorámica con todas las marcas del holding.
          </div>
        </div>
      </div>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          color: '#A5A7FF',
        }}
      >
        Abrir
        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
          <path d="M3 6h6m-2-2 2 2-2 2" {...stroke} />
        </svg>
      </span>
    </button>
  )
}

function LaunchCard({
  slug,
  meta,
  onClick,
  delay,
}: {
  slug: ModuleSlug
  meta: typeof MODULE_META[ModuleSlug]
  onClick: () => void
  delay: number
}) {
  return (
    <button
      onClick={onClick}
      className="launch-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 14,
        padding: 22,
        borderRadius: 16,
        background: D.card,
        border: `1px solid ${D.border}`,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        color: D.t1,
        transition: 'transform .25s ease, background .25s ease, border-color .25s ease, box-shadow .25s ease',
        animationDelay: `${delay}s`,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.transform = 'translateY(-4px)'
        el.style.background = D.cardHover
        el.style.borderColor = D.borderHover
        el.style.boxShadow = '0 22px 44px -16px rgba(79,70,229,0.45)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.transform = 'translateY(0)'
        el.style.background = D.card
        el.style.borderColor = D.border
        el.style.boxShadow = 'none'
      }}
    >
      <span
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          display: 'grid',
          placeItems: 'center',
          background: D.accentSoft,
          color: D.accent,
        }}
      >
        <ModuleIcon slug={slug} />
      </span>
      <div style={{ width: '100%' }}>
        <div
          style={{
            fontFamily: 'Poppins, sans-serif',
            fontSize: 17,
            fontWeight: 700,
            color: D.t1,
            letterSpacing: '-.01em',
            marginBottom: 4,
          }}
        >
          {meta.name}
        </div>
        <div style={{ fontSize: 12, color: D.t2, lineHeight: 1.5 }}>{meta.description}</div>
      </div>

      {/* Leader / Titular */}
      <div
        style={{
          width: '100%',
          marginTop: 4,
          paddingTop: 12,
          borderTop: `1px solid ${D.border}`,
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: D.t3,
            marginBottom: 6,
          }}
        >
          Titular
        </div>
        {meta.leader ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: D.accent,
                color: 'white',
                fontSize: 10,
                fontWeight: 700,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              {meta.leader.name
                .split(' ')
                .slice(0, 2)
                .map((p) => p[0])
                .join('')}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: D.t1 }}>
                {meta.leader.name}
              </div>
              <div style={{ fontSize: 10, color: D.t2 }}>{meta.leader.title}</div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: D.t3, fontStyle: 'italic' }}>
            Por asignar
          </div>
        )}

        {/* Optional sub-areas (Stratix 360) */}
        {meta.subAreas && meta.subAreas.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {meta.subAreas.map((sa) => (
              <div
                key={sa.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontSize: 10,
                  color: D.t2,
                }}
              >
                <span style={{ color: D.t3 }}>{sa.name}</span>
                <span style={{ color: D.t1, fontWeight: 500, textAlign: 'right' }}>
                  {sa.leader}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 4,
          fontSize: 11,
          fontWeight: 600,
          color: D.accent,
          letterSpacing: '.02em',
        }}
      >
        Abrir
        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden>
          <path d="M3 6h6m-2-2 2 2-2 2" {...stroke} />
        </svg>
      </span>
    </button>
  )
}

function EmptyState() {
  return (
    <div
      style={{
        border: `1px dashed ${D.border}`,
        borderRadius: 16,
        padding: '48px 32px',
        textAlign: 'center',
        color: D.t2,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 600, color: D.t1, marginBottom: 6 }}>
        Tu cuenta no tiene áreas asignadas todavía.
      </div>
      <div style={{ fontSize: 12 }}>
        Pídele a un administrador que active tu rol en el panel de Administración.
      </div>
    </div>
  )
}
