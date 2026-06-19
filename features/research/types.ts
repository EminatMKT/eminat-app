// Filas de Supabase (research_leads/activities/campaigns). Campos dinámicos →
// tipamos los conocidos y dejamos índice abierto para el resto.
export interface Lead {
  id: string
  nct?: string
  official_title?: string
  conditions?: string
  phase?: string | number
  study_type?: string
  status?: string
  countries?: string
  lead_sponsor?: string
  contact_name?: string
  email?: string
  phone?: string
  stage?: string
  date_added?: string
  next_followup?: string
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
