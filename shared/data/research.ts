import { supabase } from '@/shared/db/supabase'

// Capa de acceso a datos del dominio Research:
// research_leads, research_activities, research_campaigns, research_campaign_recipients.

// --- research_leads ---

export const listLeads = () =>
  supabase.from('research_leads').select('*').order('created_at', { ascending: false })

export const updateLead = (id: string, data: any) =>
  supabase.from('research_leads').update(data).eq('id', id)

export const insertLead = (data: any) =>
  supabase.from('research_leads').insert([data]).select()

export const deleteLead = (id: string) =>
  supabase.from('research_leads').delete().eq('id', id)

export const updateLeadStage = (id: string, stage: string) =>
  supabase.from('research_leads').update({ stage }).eq('id', id)

// Import masivo (sin .select()).
export const insertLeads = (records: any[]) =>
  supabase.from('research_leads').insert(records)

// --- research_activities ---

export const listActivities = () =>
  supabase.from('research_activities').select('*').order('created_at', { ascending: false })

export const insertActivity = (record: any) =>
  supabase.from('research_activities').insert([record]).select()

// --- research_campaigns ---

export const listCampaigns = () =>
  supabase.from('research_campaigns').select('*').order('created_at', { ascending: false })

export const insertCampaign = (payload: any) =>
  supabase.from('research_campaigns').insert([payload]).select()

export const updateCampaign = (id: string, payload: any) =>
  supabase.from('research_campaigns').update(payload).eq('id', id).select()

export const deleteCampaign = (id: string) =>
  supabase.from('research_campaigns').delete().eq('id', id)

// --- research_campaign_recipients ---

export const insertRecipients = (records: any[]) =>
  supabase.from('research_campaign_recipients').insert(records)
