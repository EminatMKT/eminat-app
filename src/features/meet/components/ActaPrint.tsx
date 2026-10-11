import {
  MEETING_MODALITY_LABELS,
  MEETING_TYPE_LABELS,
  usuarioNombre,
  type Meeting,
  type MeetingSection,
  type Profile,
  type Topic,
} from '@/features/meet/lib/types'

interface ActaPrintProps {
  meeting: Meeting
  companyName: string | null
  invitees: { nombre: string; cargo: string | null }[]
  attendees: { nombre: string; cargo: string | null }[]
  topics: Topic[]
  usuariosById: Record<string, Profile>
  actividadEstados: Record<string, string>
}

function schedule(meeting: Meeting) {
  const start = meeting.start_time?.slice(0, 5) ?? '—'
  const end = meeting.end_time?.slice(0, 5) ?? '—'
  return { start, end }
}

/**
 * Acta institucional optimizada para impresión / PDF.
 * Oculta en pantalla (hidden) y visible solo al imprimir (print:block).
 */
export function ActaPrint({
  meeting,
  companyName,
  invitees,
  attendees,
  topics,
  usuariosById,
  actividadEstados,
}: ActaPrintProps) {
  const { start, end } = schedule(meeting)
  const bySection = (s: MeetingSection) =>
    topics
      .filter((t) => t.section === s)
      .sort((a, b) => a.order_index - b.order_index)

  return (
    <div className="acta-print hidden print:block">
      {/* Encabezado */}
      <header className="acta-header">
        <h1 className="acta-title">ACTA DE REUNIÓN</h1>
        <table className="acta-meta">
          <tbody>
            <tr>
              <th>Empresa</th>
              <td>{companyName ?? '—'}</td>
              <th>Organismo</th>
              <td>Stratix Solutions</td>
            </tr>
            <tr>
              <th>Lugar</th>
              <td>{meeting.location ?? '—'}</td>
              <th>Modalidad</th>
              <td>
                {meeting.modality
                  ? MEETING_MODALITY_LABELS[meeting.modality]
                  : '—'}
              </td>
            </tr>
            <tr>
              <th>Fecha</th>
              <td>{meeting.meeting_date ?? '—'}</td>
              <th>Tipo</th>
              <td>
                {meeting.meeting_type
                  ? MEETING_TYPE_LABELS[meeting.meeting_type]
                  : '—'}
              </td>
            </tr>
            <tr>
              <th>Hora inicio</th>
              <td>{start}</td>
              <th>Hora fin</th>
              <td>{end}</td>
            </tr>
          </tbody>
        </table>
      </header>

      {/* Convocados y asistentes */}
      <PeopleTable title="Convocados" people={invitees} includeSignature={false} />
      <PeopleTable title="Asistentes" people={attendees} includeSignature />

      {/* Objetivo */}
      <ActaTextSection title="Objetivo" text={meeting.objective} />

      {/* Resumen / Decisiones / Detalles (listas simples) */}
      <ActaListSection title="Resumen" topics={bySection('resumen')} />
      <ActaListSection title="Decisiones" topics={bySection('decisiones')} />

      {/* Tasks (con responsable y estado) */}
      <section className="acta-section">
        <h2>Tasks</h2>
        {bySection('proximos_pasos').length === 0 ? (
          <p className="acta-empty">Sin Tasks registradas.</p>
        ) : (
          <table className="acta-participants">
            <thead>
              <tr>
                <th style={{ width: '55%' }}>Acción</th>
                <th style={{ width: '30%' }}>Responsable</th>
                <th style={{ width: '15%' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {bySection('proximos_pasos').map((t) => {
                const resp = t.responsable_id
                  ? usuariosById[t.responsable_id]
                  : null
                return (
                  <tr key={t.id}>
                    <td>
                      {t.title}
                      {t.description ? ` — ${t.description}` : ''}
                    </td>
                    <td>{resp ? usuarioNombre(resp) : '—'}</td>
                    <td>
                      {t.actividad_id
                        ? actividadEstados[t.actividad_id] ?? 'En CRM'
                        : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      <ActaListSection title="Detalles" topics={bySection('detalles')} />

      {/* Próxima reunión (para completar a mano) */}
      <section className="acta-section">
        <h2>Próxima reunión</h2>
        <div className="acta-nextline">Fecha: __________________________</div>
        <div className="acta-nextline">Notas: __________________________</div>
      </section>

      {/* Pie con numeración de páginas (vía CSS counters) */}
      <div className="acta-footer" aria-hidden="true" />
    </div>
  )
}

function PeopleTable({
  title,
  people,
  includeSignature,
}: {
  title: string
  people: { nombre: string; cargo: string | null }[]
  includeSignature: boolean
}) {
  return (
      <section className="acta-section">
        <h2>{title}</h2>
        <table className="acta-participants">
          <thead>
            <tr>
              <th style={{ width: '35%' }}>Nombre</th>
              <th style={{ width: '25%' }}>Cargo</th>
              {includeSignature && <th style={{ width: '15%' }}>Estado</th>}
              {includeSignature && <th style={{ width: '25%' }}>Firma</th>}
            </tr>
          </thead>
          <tbody>
            {people.length === 0 ? (
              <tr>
                <td>&nbsp;</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            ) : (
              people.map((p, i) => (
                <tr key={i}>
                  <td>{p.nombre}</td>
                  <td>{p.cargo ?? ''}</td>
                  {includeSignature && <td></td>}
                  {includeSignature && <td></td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
  )
}

function ActaTextSection({
  title,
  text,
}: {
  title: string
  text: string | null
}) {
  return (
    <section className="acta-section">
      <h2>{title}</h2>
      {text ? <p>{text}</p> : <p className="acta-empty">—</p>}
    </section>
  )
}

function ActaListSection({ title, topics }: { title: string; topics: Topic[] }) {
  return (
    <section className="acta-section">
      <h2>{title}</h2>
      {topics.length === 0 ? (
        <p className="acta-empty">Sin registros.</p>
      ) : (
        <ol className="acta-list">
          {topics.map((t) => (
            <li key={t.id}>
              <span className="acta-list-title">{t.title}</span>
              {t.description ? <span> — {t.description}</span> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
