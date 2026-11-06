import { estadoLabel } from '@/shared/constants/domain'
import { STRATIX_LOGO_DATA } from './logo'
import type { ReportMetrics } from '@/server/tasks/reports/read'
import { PRODUCTION_REPORT_DISCLAIMER, PRODUCTION_REPORT_SLOGAN } from './disclaimer'
import { escapeHtml } from '@/shared/utils'
import { periodoLargo } from '@/features/tasks/utils/periodo'
import responsibleNames from '@/features/tasks/utils/responsables/label'
import type { I18nKey } from '@/shared/i18n'
import type { Actividad } from '@/features/tasks/types'

type Datos = {
  acts: Actividad[]
  nombre: string
  mes: string
  intlLocale: string
  nombrePorId: Record<string, string>
  t: (k: I18nKey) => string
  completadas?: number // Compatibility with the existing, unused report hook.
  metrics?: ReportMetrics
  hoy: Date
}

// Printable task list. Free-text fields are escaped; no productivity or payment data enters it.
export function reportHtml({ acts, nombre, mes, intlLocale, nombrePorId, t, hoy, metrics }: Datos): string {
  const celda = 'padding:8px 10px;border-bottom:1px solid #e5e7eb'
  const filas = acts.map(a => `<tr>
      <td style="${celda};color:#111;font-weight:500">${escapeHtml(a.titulo || '')}${a.descripcion ? `<div style="white-space:pre-wrap;font-weight:400;margin-top:4px">${escapeHtml(a.descripcion)}</div>` : ''}</td>
      <td style="${celda};color:#555">${escapeHtml(a.empresa || '')}</td>
      <td style="${celda};color:#555">${escapeHtml(responsibleNames(a, nombrePorId))}</td>
      <td style="${celda}">${escapeHtml(a.fecha_inicio || '—')}</td>
      <td style="${celda}">${escapeHtml(a.fecha_entrega || '—')}</td>
      <td style="${celda}">${escapeHtml(estadoLabel(a.estado, t))}</td>
      ${metrics ? `<td style="${celda}">${escapeHtml(String(a.horas ?? 0))}</td><td style="${celda}">${escapeHtml(String(a.dias_produccion ?? 0))}</td>` : ''}
    </tr>`).join('')
  const encabezados = [t('stratix.report.colTask'), t('stratix.report.colArea'),
    t('stratix.report.colAssignee'), t('stratix.new.start'), t('tasks.report.deadline'), t('stratix.report.colStatus'), ...(metrics ? [t('stratix.col.hours'), t('stratix.report.colProdDays')] : [])]
    .map(h => `<th style="padding:10px;text-align:left;font-size:10px;color:#888;font-family:monospace;text-transform:uppercase;border-bottom:2px solid #e5e7eb;font-weight:400">${escapeHtml(h)}</th>`).join('')
  const fecha = hoy.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
  const imprimir = escapeHtml(t('common.print'))
  return `<!DOCTYPE html><html><head><title>${escapeHtml(t('tasks.report.title'))} — ${escapeHtml(nombre)}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; background:#fff; color:#111; padding:40px 50px; font-size:13px; }
      td { overflow-wrap:anywhere; } table { table-layout:fixed; } thead { display:table-header-group; }
      @media print { .no-print { display:none !important; } body { padding:20px 30px; } }
    </style></head><body>
    <div style="text-align:center;margin-bottom:28px;padding-bottom:18px;border-bottom:2px solid #222">
<img src="${STRATIX_LOGO_DATA}" alt="Stratix Communications" width="176" height="59" style="object-fit:contain;height:auto;margin-bottom:12px" />
      <div style="font-size:12px;margin-top:4px;color:#555">${PRODUCTION_REPORT_SLOGAN}</div>
      <p style="font-size:12px;margin-top:10px;color:#111">${PRODUCTION_REPORT_DISCLAIMER}</p>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #e5e7eb">
      <div><div style="font-size:11px;color:#888;text-transform:uppercase;margin-bottom:4px">${escapeHtml(t('stratix.report.teamMember'))}</div>
        <div style="font-size:20px;font-weight:700">${escapeHtml(nombre)}</div></div>
      <div class="no-print"><button onclick="window.print()" style="padding:7px 16px;border-radius:10px;background:#7C6FF7;color:white;border:none;cursor:pointer">${imprimir}</button></div>
      <div style="text-align:right"><div style="font-size:11px;color:#888;text-transform:uppercase;margin-bottom:4px">${escapeHtml(t('stratix.report.period'))}</div>
        <div style="font-size:16px;font-weight:700">${escapeHtml(periodoLargo(`${mes}-01`, intlLocale))}</div></div>
    </div>
    ${metrics ? `<div style="display:flex;gap:24px;margin:0 0 20px;font-size:12px">${escapeHtml(t('stratix.report.totalTasks'))}: ${metrics.totalTasks} · ${escapeHtml(t('stratix.report.completed'))}: ${metrics.completedTasks} · ${escapeHtml(t('stratix.dash.totalHours'))}: ${metrics.totalHours} · ${escapeHtml(t('tasks.report.completionRate'))}: ${metrics.completionRate}% · ${escapeHtml(t('stratix.detail.prodDays'))}: ${metrics.productionDays ?? 0}</div>` : ''}
    <table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:${metrics ? '11px' : '13px'}">
      ${metrics ? '<colgroup><col style="width:29%"/><col style="width:6%"/><col style="width:15%"/><col style="width:12%"/><col style="width:12%"/><col style="width:12%"/><col style="width:7%"/><col style="width:7%"/></colgroup>' : '<colgroup><col style="width:34%"/><col style="width:7%"/><col style="width:18%"/><col style="width:13%"/><col style="width:13%"/><col style="width:15%"/></colgroup>'}
      <thead><tr style="background:#f8f8fa">${encabezados}</tr></thead><tbody>${filas}</tbody>
    </table>
    ${acts.length === 0 ? `<div style="text-align:center;padding:40px;color:#999">${escapeHtml(t('stratix.report.empty'))}</div>` : ''}
    <div class="report-signatures" style="margin-top:60px;padding-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:80px;break-inside:avoid;page-break-inside:avoid">
      <div style="text-align:center">
        <div style="border-top:1px solid #333;padding-top:10px;font-size:12px;font-weight:600">${escapeHtml(nombre)}</div>
        <div style="font-size:10px;color:#888;margin-top:2px">Miembro del equipo</div>
      </div>
      <div style="text-align:center">
        <div style="border-top:1px solid #333;padding-top:10px;font-size:12px;font-weight:600">Freddy Crespín</div>
        <div style="font-size:10px;color:#888;margin-top:2px">Marketing Director — Approved by</div>
      </div>
    </div>
    <div style="margin-top:40px;padding-top:14px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#aaa">
      <span>${escapeHtml(fecha)}</span><span>${escapeHtml(t('tasks.report.brand'))}</span>
    </div>
    </body></html>`
}
