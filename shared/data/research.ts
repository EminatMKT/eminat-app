import { supabase } from '@/shared/db/supabase'
import { TABLES } from './tables'

// Capa de acceso a datos del dominio Research:
// research_leads, research_activities, research_campaigns, research_campaign_recipients.

// --- research_leads ---

export const listLeads = () =>
  supabase.from(TABLES.researchLeads).select('*').order('created_at', { ascending: false })

export const updateLead = (id: string, data: any) =>
  supabase.from(TABLES.researchLeads).update(data).eq('id', id)

export const insertLead = (data: any) =>
  supabase.from(TABLES.researchLeads).insert([data]).select()

export const deleteLead = (id: string) =>
  supabase.from(TABLES.researchLeads).delete().eq('id', id)

export const updateLeadStage = (id: string, stage: string) =>
  supabase.from(TABLES.researchLeads).update({ stage }).eq('id', id)

// Import masivo (sin .select()).
export const insertLeads = (records: any[]) =>
  supabase.from(TABLES.researchLeads).insert(records)

// --- research_activities ---

export const listActivities = () =>
  supabase.from(TABLES.researchActivities).select('*').order('created_at', { ascending: false })

export const insertActivity = (record: any) =>
  supabase.from(TABLES.researchActivities).insert([record]).select()

// --- research_campaigns ---

export const listCampaigns = () =>
  supabase.from(TABLES.researchCampaigns).select('*').order('created_at', { ascending: false })

export const insertCampaign = (payload: any) =>
  supabase.from(TABLES.researchCampaigns).insert([payload]).select()

export const updateCampaign = (id: string, payload: any) =>
  supabase.from(TABLES.researchCampaigns).update(payload).eq('id', id).select()

export const deleteCampaign = (id: string) =>
  supabase.from(TABLES.researchCampaigns).delete().eq('id', id)

// --- research_campaign_recipients ---

export const insertRecipients = (records: any[]) =>
  supabase.from(TABLES.researchCampaignRecipients).insert(records)
