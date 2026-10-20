function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char))
}

export function buildBirthdayEmail(name: string) {
  const firstName = name.trim().split(/\s+/)[0] || 'compañero/a'
  const safeName = escapeHtml(firstName)
  return {
    subject: `🎉 ¡Feliz cumpleaños, ${firstName}!`,
    text: `¡Feliz cumpleaños, ${firstName}!\n\nHoy queremos celebrar contigo un día especial. Todo el equipo te desea un feliz cumpleaños y un nuevo año lleno de bienestar, crecimiento y grandes momentos.\n\n¡Que disfrutes mucho tu día!\n\nEquipo Stratix`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033;line-height:1.6"><h1 style="font-size:26px;color:#624bc3">🎉 ¡Feliz cumpleaños, ${safeName}!</h1><p>Hoy queremos celebrar contigo un día especial.</p><p>Todo el equipo te desea un feliz cumpleaños y un nuevo año lleno de bienestar, crecimiento y grandes momentos.</p><p>¡Que disfrutes mucho tu día!</p><p><strong>Equipo Stratix</strong></p></div>`,
  }
}

export function guayaquilBirthdayDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}
