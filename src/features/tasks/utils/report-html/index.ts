import { ESTADO_COLORS } from '@/shared/constants/domain'
import { escapeHtml } from '@/shared/utils'
import { periodoLargo } from '@/features/tasks/utils/periodo'
import type { I18nKey } from '@/shared/i18n'
import type { Actividad } from '@/features/tasks/types'

type Datos = {
  acts: Actividad[]
  nombre: string
  mes: string
  intlLocale: string
  completadas: number
  nombrePorId: Record<string, string>
  t: (k: I18nKey) => string
  hoy: Date
}

// Printable task list. Free-text fields are escaped; no productivity or payment data enters it.
export function reportHtml({ acts, nombre, mes, intlLocale, completadas, nombrePorId, t, hoy }: Datos): string {
  const estadoColor = (e: string | undefined) => ESTADO_COLORS[e ?? ''] || '#999'
  const celda = 'padding:8px 10px;border-bottom:1px solid #e5e7eb'
  const filas = acts.map(a => `<tr>
      <td style="${celda};color:#111;font-weight:500">${escapeHtml(a.titulo || '')}</td>
      <td style="${celda};color:#555">${escapeHtml(a.empresa || '')}</td>
      <td style="${celda};color:#555">${escapeHtml(nombrePorId[a.responsable_id ?? ''] ?? '—')}</td>
      <td style="${celda};text-align:center"><span style="font-size:11px;padding:2px 10px;border-radius:20px;background:${estadoColor(a.estado)}20;color:${estadoColor(a.estado)};font-weight:600">${escapeHtml(a.estado || '')}</span></td>
    </tr>`).join('')
  const kpis = [
    { label: t('stratix.report.totalTasks'), value: String(acts.length), color: '#7C6FF7' },
    { label: t('stratix.report.completed'), value: String(completadas), color: '#34D399' },
  ].map(k => `<div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;text-align:center">
        <div style="font-size:24px;font-weight:800;color:${k.color}">${escapeHtml(k.value)}</div>
        <div style="font-size:10px;color:#888;margin-top:4px;text-transform:uppercase;letter-spacing:.05em">${escapeHtml(k.label)}</div>
      </div>`).join('')
  const encabezados = [t('stratix.report.colTask'), t('stratix.report.colArea'),
    t('stratix.report.colAssignee'), t('stratix.report.colStatus')]
    .map(h => `<th style="padding:10px;text-align:left;font-size:10px;color:#888;font-family:monospace;text-transform:uppercase;border-bottom:2px solid #e5e7eb;font-weight:400">${escapeHtml(h)}</th>`).join('')
  const fecha = hoy.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
  const imprimir = escapeHtml(t('common.print'))
  return `<!DOCTYPE html><html><head><title>${escapeHtml(t('tasks.report.title'))} — ${escapeHtml(nombre)}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; background:#fff; color:#111; padding:40px 50px; font-size:13px; }
      @media print { .no-print { display:none !important; } body { padding:20px 30px; } }
    </style></head><body>
    <div style="text-align:center;margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid #222">
      <div style="font-size:24px;font-weight:800;letter-spacing:.5px">${escapeHtml(t('tasks.report.brand'))}</div>
      <div style="font-size:12px;margin-top:4px;color:#555">${escapeHtml(t('tasks.report.title'))}</div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #e5e7eb">
      <div><div style="font-size:11px;color:#888;text-transform:uppercase;margin-bottom:4px">${escapeHtml(t('stratix.report.teamMember'))}</div>
        <div style="font-size:20px;font-weight:700">${escapeHtml(nombre)}</div></div>
      <div class="no-print"><button onclick="window.print()" style="padding:7px 16px;border-radius:10px;background:#7C6FF7;color:white;border:none;cursor:pointer">${imprimir}</button></div>
      <div style="text-align:right"><div style="font-size:11px;color:#888;text-transform:uppercase;margin-bottom:4px">${escapeHtml(t('stratix.report.period'))}</div>
        <div style="font-size:16px;font-weight:700">${escapeHtml(periodoLargo(`${mes}-01`, intlLocale))}</div></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:24px">${kpis}</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
      <thead><tr style="background:#f8f8fa">${encabezados}</tr></thead><tbody>${filas}</tbody>
    </table>
    ${acts.length === 0 ? `<div style="text-align:center;padding:40px;color:#999">${escapeHtml(t('stratix.report.empty'))}</div>` : ''}
    <div style="margin-top:40px;padding-top:14px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#aaa">
      <span>${escapeHtml(fecha)}</span><span>${escapeHtml(t('tasks.report.brand'))}</span>
    </div>
    </body></html>`
}
