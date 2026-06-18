'use client'
import { RESEARCH_THEME } from '../theme'
import { useResearch } from './ResearchContext'
import ResearchHeader from './ResearchHeader'
import DashboardTab from './DashboardTab'
import LeadsTab from './leads/LeadsTab'
import NewsletterTab from './campaigns/NewsletterTab'
import SmsTab from './campaigns/SmsTab'
import MailingTab from './campaigns/MailingTab'
import PipelineTab from './leads/PipelineTab'
import OportunidadesTab from './leads/OportunidadesTab'
import LeadDetailModal from './leads/LeadDetailModal'
import LeadFormModal from './leads/LeadFormModal'
import ActivityModal from './leads/ActivityModal'
import ImportModal from './leads/ImportModal'
import MailCampaignModal from './campaigns/MailCampaignModal'
import CampaignViewModal from './campaigns/CampaignViewModal'

export default function ResearchContent({ tab }: { tab: string }) {
  const { t3 } = RESEARCH_THEME
  const { loading } = useResearch()
  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: t3 }}>Loading Research...</div>

  return (
    <div>
      <ResearchHeader tab={tab} />
      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'leads' && <LeadsTab />}
      {tab === 'newsletter' && <NewsletterTab />}
      {tab === 'sms' && <SmsTab />}
      {tab === 'mailing' && <MailingTab />}
      {tab === 'pipeline' && <PipelineTab />}
      {tab === 'oportunidades' && <OportunidadesTab />}

      <LeadDetailModal />
      <LeadFormModal />
      <ActivityModal />
      <ImportModal />
      <MailCampaignModal />
      <CampaignViewModal />
    </div>
  )
}
