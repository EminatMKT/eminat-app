import type { NextRequest } from 'next/server'
import { requireModule } from '@/shared/db/requireAccess'
import { MODULE } from '@/shared/auth/permissions'
import serveRequest from './repository/serve-request'

export async function GET() {
  const authz = await requireModule(MODULE.TASKS)

  return serveRequest(authz)
}

export async function PUT(request: NextRequest) {
  const authz = await requireModule(MODULE.TASKS)

  return serveRequest(authz, request)
}
