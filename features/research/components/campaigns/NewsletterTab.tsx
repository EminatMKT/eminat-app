'use client'
import { useState } from 'react'
import { useApp } from '@/shared/context/AppContext'
import { supabase } from '@/shared/db/supabase'
import { useResearch } from '../ResearchContext'
import NewsletterStepCard from './NewsletterStepCard'
import NewsletterContactsStep from './NewsletterContactsStep'
import NewsletterCampaignStep from './NewsletterCampaignStep'
import NewsletterPreviewStep from './NewsletterPreviewStep'
import NewsletterResultsStep from './NewsletterResultsStep'

export default function NewsletterTab() {
  const { mostrarMensaje } = useApp()
  const { setCampaigns } = useResearch()
  const [nlStep, setNlStep] = useState(0)
  const [nlSelected, setNlSelected] = useState<string[]>([])
  const [nlSearch, setNlSearch] = useState('')
  const [nlCampaign, setNlCampaign] = useState({ subject: '', content: '', type: 'Email' })

  const toggle = (id: string) => setNlSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  async function send() {
    const { data: camp } = await supabase.from('research_campaigns').insert([{ nombre: nlCampaign.subject, asunto: nlCampaign.subject, contenido: nlCampaign.content, tipo: nlCampaign.type, estado: 'Enviado', total_enviados: nlSelected.length }]).select()
    if (camp?.[0]) {
      const recs = nlSelected.map(lid => ({ campaign_id: camp[0].id, lead_id: lid, status: 'sent' }))
      await supabase.from('research_campaign_recipients').insert(recs)
      setCampaigns(prev => [camp[0], ...prev])
    }
    mostrarMensaje('ok', `Campaign sent to ${nlSelected.length} contacts`)
    setNlStep(3)
  }

  const steps = [
    <NewsletterContactsStep selected={nlSelected} onToggle={toggle} search={nlSearch} setSearch={setNlSearch} onNext={() => setNlStep(1)} />,
    <NewsletterCampaignStep campaign={nlCampaign} setCampaign={setNlCampaign} onBack={() => setNlStep(0)} onNext={() => setNlStep(2)} />,
    <NewsletterPreviewStep campaign={nlCampaign} recipientsCount={nlSelected.length} onBack={() => setNlStep(1)} onSend={send} />,
    <NewsletterResultsStep recipientsCount={nlSelected.length} type={nlCampaign.type} onReset={() => { setNlStep(0); setNlSelected([]); setNlCampaign({ subject: '', content: '', type: 'Email' }) }} />,
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['Contacts', 'Campaign', 'Preview', 'Results'].map((step, i) => (
          <NewsletterStepCard key={step} index={i} label={step} icon={['👥', '⚙️', '👁', '📊'][i]} active={nlStep === i} onClick={() => setNlStep(i)} />
        ))}
      </div>
      {steps[nlStep]}
    </div>
  )
}
