export const PIPELINE_COLS = ['Identificado', 'Calificado', 'Outreach', 'Contacto', 'Discovery/Feasibility', 'Docs', 'Negociación', 'Awarded', 'Cerrado']

export const PIPELINE_COLORS: Record<string, string> = { Identificado: '#9494B3', Calificado: '#60A5FA', Outreach: '#A78BFA', Contacto: '#F472B6', 'Discovery/Feasibility': '#FBB040', Docs: '#FB923C', 'Negociación': '#F87171', Awarded: '#34D399', Cerrado: '#7C6FF7' }

export const CHART_COLORS = ['#34D399', '#60A5FA', '#A78BFA', '#F472B6', '#FBB040', '#F87171', '#7C6FF7', '#FB923C', '#22D3EE', '#9494B3']

export const COUNTRY_FLAGS: Record<string, string> = {
  'United States': '🇺🇸', 'USA': '🇺🇸', 'US': '🇺🇸', 'Spain': '🇪🇸', 'Germany': '🇩🇪', 'France': '🇫🇷', 'UK': '🇬🇧', 'United Kingdom': '🇬🇧',
  'Italy': '🇮🇹', 'Canada': '🇨🇦', 'Australia': '🇦🇺', 'Japan': '🇯🇵', 'China': '🇨🇳', 'Brazil': '🇧🇷', 'Mexico': '🇲🇽', 'India': '🇮🇳',
  'Argentina': '🇦🇷', 'Colombia': '🇨🇴', 'Chile': '🇨🇱', 'Peru': '🇵🇪', 'Ecuador': '🇪🇨', 'Netherlands': '🇳🇱', 'Belgium': '🇧🇪',
  'Switzerland': '🇨🇭', 'Austria': '🇦🇹', 'Poland': '🇵🇱', 'Portugal': '🇵🇹', 'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Denmark': '🇩🇰',
  'Finland': '🇫🇮', 'Ireland': '🇮🇪', 'Israel': '🇮🇱', 'South Korea': '🇰🇷', 'Turkey': '🇹🇷', 'Russia': '🇷🇺', 'South Africa': '🇿🇦',
  'New Zealand': '🇳🇿', 'Greece': '🇬🇷', 'Czech Republic': '🇨🇿', 'Hungary': '🇭🇺', 'Romania': '🇷🇴', 'Taiwan': '🇹🇼',
}

export const LEAD_FIELDS = ['date_added', 'conditions', 'nct', 'official_title', 'phase', 'study_type', 'status', 'countries', 'lead_sponsor', 'contact_name', 'email', 'phone', 'second_contact', 'second_email', 'stage', 'next_followup', 'notes', 'note']

export const FIELD_LABELS: Record<string, string> = { date_added: 'Date Added', conditions: 'Conditions', nct: 'NCT#', official_title: 'Official Title', phase: 'Phase', study_type: 'Study Type', status: 'Status', countries: 'Countries', lead_sponsor: 'Lead Sponsor', contact_name: 'Contact Name', email: 'Email', phone: 'Phone', second_contact: '2nd Contact', second_email: '2nd Email', stage: 'Stage', next_followup: 'Next Follow-up', notes: 'Notes', note: 'NOTE' }

// Campos exportados a CSV (handleExport).
export const EXPORT_HEADERS = ['date_added', 'conditions', 'nct', 'official_title', 'phase', 'study_type', 'status', 'countries', 'lead_sponsor', 'contact_name', 'email', 'phone', 'second_contact', 'second_email', 'stage', 'next_followup', 'notes']

export const MAIL_ESTADO_COLOR: Record<string, string> = { Borrador: '#9CA3AF', Programado: '#60A5FA', Enviado: '#34D399', Cancelado: '#F87171' }
