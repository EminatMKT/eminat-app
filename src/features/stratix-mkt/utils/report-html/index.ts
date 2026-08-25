import { ESTADO_COLORS } from '@/shared/constants/domain'
import { escapeHtml } from '@/shared/utils'
import type { I18nKey } from '@/shared/i18n'
import type { Actividad } from '@/features/stratix-mkt/types'

type Datos = {
  acts: Actividad[]
  nombre: string
  mes: string
  completadas: number
  horas: number
  dias: number
  nombrePorId: Record<string, string>
  t: (k: I18nKey) => string
  hoy: Date
}

// centinela-exime: archivo-extenso@2 — es UNA plantilla HTML. Partirla dejaría el <head> en
// un archivo y el <body> en otro: se lee peor, no mejor. Las partes que sí eran lógica
// (escapado, colores del estado) ya salen de funciones compartidas.
// La hoja imprimible del reporte de un miembro. Es una PLANTILLA, no lógica de pantalla: vive
// acá y no en el hook porque ahí eran setenta líneas de string entre los handlers, y porque así
// se puede verificar que escapa lo que viene de la base (un título con `<` rompía el HTML).
// El `style` inline es obligado: se abre en otra ventana, sin acceso a las hojas de la app.
export function reportHtml({ acts, nombre, mes, completadas, horas, dias, nombrePorId, t, hoy }: Datos): string {
  const estadoColor = (e: string | undefined) => ESTADO_COLORS[e ?? ''] || '#999'
  const celda = 'padding:8px 10px;border-bottom:1px solid #e5e7eb'

  const filas = acts.map((a, i) => `<tr>
      <td style="${celda};text-align:center;color:#666">${i + 1}</td>
      <td style="${celda};color:#111;font-weight:500">${escapeHtml(a.titulo || '')}</td>
      <td style="${celda};color:#555">${escapeHtml(a.empresa || '')}</td>
      <td style="${celda};color:#555">${escapeHtml(nombrePorId[a.responsable_id ?? ''] ?? '—')}</td>
      <td style="${celda};color:#555;font-family:monospace;text-align:center">${a.horas || 0}h</td>
      <td style="${celda};color:#555;font-family:monospace;text-align:center">${a.dias_produccion || 0}</td>
      <td style="${celda};color:#555;text-align:center">${escapeHtml(a.mes || '')}</td>
      <td style="${celda};text-align:center"><span style="font-size:11px;padding:2px 10px;border-radius:20px;background:${estadoColor(a.estado)}20;color:${estadoColor(a.estado)};font-weight:600">${escapeHtml(a.estado || '')}</span></td>
    </tr>`).join('')

  const kpis = [
    { label: t('stratix.report.totalTasks'), value: String(acts.length), color: '#7C6FF7' },
    { label: t('stratix.report.completed'), value: String(completadas), color: '#34D399' },
    { label: t('stratix.report.totalHours'), value: `${horas}h`, color: '#F472B6' },
    { label: t('stratix.report.prodDays'), value: String(dias), color: '#60A5FA' },
  ].map(k => `<div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:${k.color}">${escapeHtml(k.value)}</div>
        <div style="font-size:10px;color:#888;margin-top:4px;text-transform:uppercase;letter-spacing:.05em">${escapeHtml(k.label)}</div>
      </div>`).join('')

  const encabezados = ['#', t('stratix.report.colTask'), t('stratix.report.colArea'), t('stratix.report.colAssignee'),
    t('stratix.report.colHours'), t('stratix.report.colProdDays'), t('stratix.report.colMonth'), t('stratix.report.colStatus')]
    .map(h => `<th style="padding:10px;text-align:left;font-size:10px;color:#888;font-family:monospace;text-transform:uppercase;border-bottom:2px solid #e5e7eb;font-weight:400">${escapeHtml(h)}</th>`).join('')

  const fecha = hoy.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })

  return `<!DOCTYPE html><html><head><title>${escapeHtml(t('stratix.report.heading'))} — ${escapeHtml(nombre)}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; background:#fff; color:#111; padding:40px 50px; font-size:13px; }
      @media print { .no-print { display:none !important; } body { padding:20px 30px; } }
    </style></head><body>
    <div style="text-align:center;margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid #222">
      <div style="font-size:24px;font-weight:800;letter-spacing:.5px">${escapeHtml(t('stratix.report.brand'))}</div>
      <div style="font-size:14px;font-weight:600;margin-top:4px;color:#444">${escapeHtml(t('stratix.report.title'))}</div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #e5e7eb">
      <div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">${escapeHtml(t('stratix.report.teamMember'))}</div>
        <div style="font-size:20px;font-weight:700">${escapeHtml(nombre)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">${escapeHtml(t('stratix.report.period'))}</div>
        <div style="font-size:16px;font-weight:700">${escapeHtml(mes)} ${hoy.getFullYear()}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px">${kpis}</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
      <thead><tr style="background:#f8f8fa">${encabezados}</tr></thead>
      <tbody>${filas}</tbody>
    </table>
    ${acts.length === 0 ? `<div style="text-align:center;padding:40px;color:#999">${escapeHtml(t('stratix.report.empty'))}</div>` : ''}
    <div style="margin-top:60px;padding-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:80px">
      <div style="text-align:center">
        <div style="border-top:1px solid #333;padding-top:10px;font-size:12px;font-weight:600">${escapeHtml(nombre)}</div>
        <div style="font-size:10px;color:#888;margin-top:2px">${escapeHtml(t('stratix.report.teamMember'))}</div>
      </div>
      <div style="text-align:center">
        <div style="border-top:1px solid #333;padding-top:10px;font-size:12px;font-weight:600">Freddy Crespín</div>
        <div style="font-size:10px;color:#888;margin-top:2px">Marketing Coordinator — Approved by</div>
      </div>
    </div>
    <div style="margin-top:40px;padding-top:14px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#aaa">
      <span>Generated on ${escapeHtml(fecha)}</span>
      <span>Stratix Solutions — Stratix 360</span>
    </div>
    <div class="no-print" style="text-align:center;margin-top:30px">
      <button onclick="window.print()" style="padding:10px 28px;border-radius:8px;background:#7C6FF7;color:white;border:none;font-size:13px;font-weight:600;cursor:pointer">Print</button>
    </div>
    </body></html>`
}
