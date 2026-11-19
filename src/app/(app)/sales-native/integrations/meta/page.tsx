import MetaWorkspacePage from '@/features/native-sales/MetaWorkspacePage'
export const dynamic = 'force-dynamic'
export default function Page(props: {searchParams?:{organization?:string|string[];company?:string|string[]}}) {
  return <MetaWorkspacePage {...props} />
}
