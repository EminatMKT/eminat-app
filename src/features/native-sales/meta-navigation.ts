import {z} from 'zod'
/** Fixed local destinations: query context is a hint, never an authorization grant. */
export const META_SETTINGS_PATH = '/settings/integrations/meta'
export type MetaOrganization = { organizationId:string; name:string; role?:string }
export function metaAdministrationOrganizations<T extends MetaOrganization>(organizations:T[]):T[] {
  return organizations.filter(org=>org.role==='ADMINISTRATOR' || org.role==='SUPERADMIN')
}
export function metaSettingsHref(organization?:string,company?:string,path:string=META_SETTINGS_PATH) {
  const query=new URLSearchParams()
  if(organization)query.set('organization',organization)
  if(organization && company)query.set('company',company)
  return `${path}${query.size ? `?${query}` : ''}`
}

const workspaceResponse=z.object({data:z.array(z.object({organizationId:z.string().uuid(),name:z.string().min(1).max(500)})).max(100)})
/** Navigation is shared by unrelated modules: reject malformed discovery without crashing the shell. */
export function readMetaWorkspaces(body:unknown):MetaOrganization[] {
  return workspaceResponse.parse(body).data
}
