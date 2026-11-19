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
