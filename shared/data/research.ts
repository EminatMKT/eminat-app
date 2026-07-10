import { supabase } from '@/shared/db/supabase'
import {
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT as CHANGE,
  type RealtimeChannel,
  type RealtimePostgresChangesPayload,
} from '@supabase/supabase-js'
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
// pool compartido (research_leads no es por-usuario). El dispatch por-evento vive acá:
// el consumidor recibe callbacks tipados y nunca compara strings. Dedup por id de su lado.
export interface RowChangeHandlers<T> {
  onInsert?: (row: T) => void
  onUpdate?: (row: T) => void
  onDelete?: (row: Partial<T>) => void
}

export const subscribeToLeads = <T extends { id: string }>(h: RowChangeHandlers<T>): RealtimeChannel =>
  supabase
    .channel(`realtime:${TABLES.researchLeads}`)
    .on<T>(
      REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
      { event: CHANGE.ALL, schema: 'public', table: TABLES.researchLeads },
      payload => {
        if (payload.eventType === CHANGE.INSERT) h.onInsert?.(payload.new)
        else if (payload.eventType === CHANGE.UPDATE) h.onUpdate?.(payload.new)
        else if (payload.eventType === CHANGE.DELETE) h.onDelete?.(payload.old)
      },
    )
    .subscribe()

export const removeChannel = (channel: RealtimeChannel) => supabase.removeChannel(channel)

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
