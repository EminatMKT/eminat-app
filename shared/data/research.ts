import { supabase } from '@/shared/db/supabase'
import { subscribeToTable, type RealtimeChannel, type RowChangeHandlers } from './realtime'
import { TABLES, COLUMNS } from './tables'

// Capa de acceso a datos del dominio Research:
// research_leads, research_activities, research_campaigns, research_campaign_recipients.

// --- research_leads ---

export const listLeads = () =>
  supabase.from(TABLES.researchLeads).select('*').order(COLUMNS.createdAt, { ascending: false })

export const updateLead = (id: string, data: any) =>
  supabase.from(TABLES.researchLeads).update(data).eq('id', id)

export const insertLead = (data: any) =>
  supabase.from(TABLES.researchLeads).insert([data]).select()

export const deleteLead = (id: string) =>
  supabase.from(TABLES.researchLeads).delete().eq('id', id)

export const updateLeadStage = (id: string, stage: string) =>
  supabase.from(TABLES.researchLeads).update({ stage }).eq('id', id)

// Import masivo. Devuelve las filas insertadas (.select()) para refrescar el estado en el acto.
export const insertLeads = (records: any[]) =>
  supabase.from(TABLES.researchLeads).insert(records).select()

// Realtime: propaga a todos los usuarios del módulo los INSERT/UPDATE/DELETE sobre el
// pool compartido (research_leads no es por-usuario). Dedup por id del lado del consumidor.
export const subscribeToLeads = <T extends { id: string }>(h: RowChangeHandlers<T>): RealtimeChannel =>
  subscribeToTable<T>({ channel: `realtime:${TABLES.researchLeads}`, table: TABLES.researchLeads }, h)

// --- research_activities ---

export const listActivities = () =>
  supabase.from(TABLES.researchActivities).select('*').order(COLUMNS.createdAt, { ascending: false })

export const insertActivity = (record: any) =>
  supabase.from(TABLES.researchActivities).insert([record]).select()

// --- research_campaigns ---

export const listCampaigns = () =>
  supabase.from(TABLES.researchCampaigns).select('*').order(COLUMNS.createdAt, { ascending: false })

export const insertCampaign = (payload: any) =>
  supabase.from(TABLES.researchCampaigns).insert([payload]).select()

export const updateCampaign = (id: string, payload: any) =>
  supabase.from(TABLES.researchCampaigns).update(payload).eq('id', id).select()

export const deleteCampaign = (id: string) =>
  supabase.from(TABLES.researchCampaigns).delete().eq('id', id)

// --- research_campaign_recipients ---

export const insertRecipients = (records: any[]) =>
  supabase.from(TABLES.researchCampaignRecipients).insert(records)
