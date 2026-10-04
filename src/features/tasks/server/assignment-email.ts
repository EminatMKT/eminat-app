type AssignmentEmail = {
  name: string
  title: string
  area?: string | null
  dueDate?: string | null
  url: string
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char] || char))

// The assignee receives the title, area and due date; descriptions and other user data stay in Tasks.
export function buildAssignmentEmail({ name, title, area, dueDate, url }: AssignmentEmail) {
  const cleanTitle = title.trim().slice(0, 160) || 'Tarea sin título'
  const cleanName = name.trim().slice(0, 100) || 'colaborador/a'
  const date = dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : null
  const row = (label: string, value: string) => `<tr><td style="padding:7px 0;width:130px;color:#8A90A0;font:12px Helvetica,Arial,sans-serif;text-transform:uppercase">${label}</td><td style="padding:7px 0;color:#13192B;font:14px Helvetica,Arial,sans-serif">${escapeHtml(value)}</td></tr>`
  const subject = 'Nueva tarea asignada en LILLY'
  const html = `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#F4F5F8"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F8"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#fff;border:1px solid #E3E5EC;border-radius:14px"><tr><td style="background:#13192B;padding:28px 32px;color:#fff;font:bold 18px Helvetica,Arial,sans-serif">LILLY</td></tr><tr><td style="padding:36px 32px 18px"><h1 style="margin:0;color:#13192B;font:bold 23px Helvetica,Arial,sans-serif">Nueva tarea asignada</h1><p style="color:#4A5063;font:15px/24px Helvetica,Arial,sans-serif">Hola ${escapeHtml(cleanName)}, tienes una nueva tarea en LILLY.</p></td></tr><tr><td style="padding:0 32px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;border:1px solid #E3E5EC;border-radius:9px"><tr><td style="padding:20px 22px"><table role="presentation" width="100%">${row('Tarea', cleanTitle)}${area ? row('Empresa / área', area.slice(0, 100)) : ''}${date ? row('Fecha de entrega', date) : ''}</table></td></tr></table></td></tr><tr><td style="padding:28px 32px 36px"><a href="${escapeHtml(url)}" style="display:inline-block;padding:15px 28px;background:#4E4BE4;color:#fff;border-radius:9px;text-decoration:none;font:bold 15px Helvetica,Arial,sans-serif">Ver tarea en LILLY</a></td></tr><tr><td style="background:#13192B;padding:22px 32px;color:#9AA0B4;font:12px Helvetica,Arial,sans-serif">LILLY · Mensaje automático</td></tr></table></td></tr></table></body></html>`
  const text = [`Hola ${cleanName},`, '', 'Nueva tarea asignada en LILLY', `Tarea: ${cleanTitle}`, area ? `Empresa / área: ${area.slice(0, 100)}` : '', date ? `Fecha de entrega: ${date}` : '', '', `Ver tarea en LILLY: ${url}`].filter(Boolean).join('\n')
  return { subject, html, text }
}
