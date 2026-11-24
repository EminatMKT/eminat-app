import {afterEach,describe,expect,it,vi} from 'vitest'
import {complimentaryEmail,complimentaryLocale,type ComplimentaryEmailEvent} from './complimentary-email'
import {renderPatientEmail} from './patient-email-template'
import {sendPatientEmail} from './patient-email-delivery'
const events:ComplimentaryEmailEvent[]=['invitation','activation','expiration','suspension','revocation','reactivation']
afterEach(()=>vi.unstubAllGlobals())
describe('bilingual complimentary notifications',()=>{
 for(const language of ['en','es'] as const)it.each(events)(`${language}: %s includes localized subject, dates, no-charge disclosure and footer`,event=>{
  const content=complimentaryEmail(event,language,{plan:'PLUS',expiresAt:'2027-03-15T04:00:00Z',timezone:'America/New_York',actionUrl:'https://portal.corazonsalud.health/membresia'})
  const result=renderPatientEmail(content)
  expect(content.subject).toBe(content.title)
  expect(result.html).toContain(`lang="${language}"`)
  expect(result.text).toContain(language==='en'?'No membership charge or automatic paid renewal':'No se hará ningún cobro de membresía')
  expect(result.text).toContain(language==='en'?'March 14, 2027':'14 de marzo de 2027')
  expect(result.text).toContain(language==='en'?'not health insurance':'no es un seguro médico')
  if(event==='reactivation')expect(content.message).toContain(language==='en'?'original expiration date has not been reset':'fecha original de vencimiento no se ha reiniciado')
 })
 it('uses available member preference and a deterministic Spanish fallback',()=>{expect(complimentaryLocale('en-US')).toBe('en');expect(complimentaryLocale('es-EC')).toBe('es');expect(complimentaryLocale(undefined)).toBe('es');expect(complimentaryLocale('fr')).toBe('es')})
 it('never calls an email provider in local development, even if credentials were supplied',async()=>{
  const send=vi.fn(),env={NODE_ENV:'development',NEXT_PUBLIC_APP_ENV:'local',RESEND_API_KEY:'re_synthetic',PATIENT_EMAIL_FROM_ADDRESS:'fixture@example.invalid'}
  const result=await sendPatientEmail({kind:'activation',eventId:'synthetic-local-review',recipient:'member@example.invalid',content:complimentaryEmail('activation','en',{plan:'PLUS',timezone:'UTC',actionUrl:'https://portal.corazonsalud.health/membresia'})},{env,provider:{emails:{send}}})
  expect(result.status).toBe('NOT_CONFIGURED');expect(send).not.toHaveBeenCalled()
 })
})
