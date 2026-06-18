export type Brand = {
  key: string
  icon: string
  name: string
  color: string
  loc: string
  tz: string
  desc: string
  route?: string // si existe → navega; si no → mensaje "coming soon"
}
