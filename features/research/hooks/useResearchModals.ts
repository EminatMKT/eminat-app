import { useState } from 'react'
import type { Lead, Campaign } from '../types'
import { DEFAULT_STAGE } from '../constants'

// Estado de apertura de modales, compartido entre header, tabs y pipeline.
export function useResearchModals() {
  const [modalLead, setModalLead] = useState<Lead | null>(null)
  const [modalNewLead, setModalNewLead] = useState(false)
  const [newLead, setNewLead] = useState<any>({})
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [modalActivity, setModalActivity] = useState<Lead | null>(null)
  // Pop-up del contador de correos: el lead cuyo contador se está editando, o null.
  const [modalCount, setModalCount] = useState<Lead | null>(null)
  const [modalImport, setModalImport] = useState(false)
  // Backfill de especialidad: abierto/cerrado. No guarda un lead porque corre sobre todos los pendientes.
  const [modalSpecialty, setModalSpecialty] = useState(false)
  const [mailViewCampaign, setMailViewCampaign] = useState<Campaign | null>(null)
  // Modal del wizard de mailing: null = cerrado; { campaign, step } al abrir.
  const [mailModal, setMailModal] = useState<{ campaign: Campaign | null; step: number } | null>(null)

  const openNewLead = () => { setNewLead({ stage: DEFAULT_STAGE }); setEditingLead(null); setModalNewLead(true) }
  const openEditLead = (l: Lead) => { setNewLead(l); setEditingLead(l); setModalLead(null); setModalNewLead(true) }
  const closeLeadForm = () => { setModalNewLead(false); setEditingLead(null) }
  const openMailModal = (campaign: Campaign | null, step = 0) => setMailModal({ campaign, step })

  return {
    modalLead, setModalLead, modalNewLead, setModalNewLead, newLead, setNewLead, editingLead, setEditingLead,
    modalActivity, setModalActivity, modalCount, setModalCount, modalImport, setModalImport, modalSpecialty, setModalSpecialty, mailViewCampaign, setMailViewCampaign,
    mailModal, setMailModal,
    openNewLead, openEditLead, closeLeadForm, openMailModal,
  }
}
