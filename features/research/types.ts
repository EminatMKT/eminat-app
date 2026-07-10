// Filas de Supabase (research_leads/activities/campaigns). Campos dinámicos →
// tipamos los conocidos y dejamos índice abierto para el resto.
export interface Lead {
  id: string
  date_added?: string
  nct_number?: string
  official_title?: string
  conditions?: string
  brief_explanation?: string
  phase?: string | number
  study_type?: string
  recruitment_status?: string
  study_start_date?: string
  primary_completion_date?: string
  countries?: string
  spain_focus?: boolean
  record_link?: string
  lead_sponsor?: string
  sponsor_type?: string
  contact_name?: string
  contact_role?: string
  contact_email?: string
  contact_phone?: string
  contact_source?: string
  contact2_name?: string
  contact2_role?: string
  contact2_email?: string
  contact2_phone?: string
  stage?: string
  next_followup_date?: string
  email_date?: string
  notes?: string
  internal_note?: string
  valor_estimado?: string | number
  [key: string]: any
}

export interface Activity {
  id: string
  lead_id: string
  tipo: string
  nota: string
  fecha: string
  [key: string]: any
}

export interface Campaign {
  id: string
  nombre?: string
  asunto?: string
  contenido?: string
  tipo?: string
  estado?: string
  total_enviados?: number
  total_abiertos?: number
  total_clicks?: number
  fecha_envio?: string
  created_at?: string
  [key: string]: any
}
