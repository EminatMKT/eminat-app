type Lead = { id: string; display_name?: unknown; status?: unknown; source?: unknown;
  email?: unknown; phone?: unknown; owner_member_id?: unknown; team_id?: unknown }

function csvCell(value: unknown): string {
  const raw = String(value ?? '')
  const safe = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw
  return `"${safe.replaceAll('"', '""')}"`
}

export function serializeLeadsPage(rows: Lead[], ownerName: (id: unknown) => string,
  teamName: (id: unknown) => string): string {
  const columns = ['display_name', 'status', 'source', 'email', 'phone', 'owner', 'team']
  const values = rows.map(row => [row.display_name, row.status, row.source, row.email,
    row.phone, ownerName(row.owner_member_id), teamName(row.team_id)])
  return [columns, ...values].map(row => row.map(csvCell).join(',')).join('\r\n')
}
