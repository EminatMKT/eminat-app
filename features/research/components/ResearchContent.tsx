'use client'
import { RESEARCH_THEME } from '../theme'
import { useResearch } from './ResearchContext'
import ResearchHeader from './ResearchHeader'
import DashboardTab from './DashboardTab'
import LeadsTab from './LeadsTab'
import NewsletterTab from './NewsletterTab'
import SmsTab from './SmsTab'
import MailingTab from './MailingTab'
import PipelineTab from './PipelineTab'
import OportunidadesTab from './OportunidadesTab'
import LeadDetailModal from './LeadDetailModal'
import LeadFormModal from './LeadFormModal'
import ActivityModal from './ActivityModal'
import ImportModal from './ImportModal'
import MailCampaignModal from './MailCampaignModal'
import CampaignViewModal from './CampaignViewModal'

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
