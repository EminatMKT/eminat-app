import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MODULE, MODULE_META, modulePath } from '@/shared/auth/permissions'
import TopbarHeading from './index'

const PAGE_TITLE = 'Page title'
const blank = vi.hoisted(() => () => null)

vi.mock('next/navigation', () => ({ usePathname: () => modulePath(MODULE.COBRANZAS) }))
vi.mock('@/shared/context/AppContext', () => ({ useApp: () => ({ usuario: null }) }))
vi.mock('@/shared/components/shell/TopbarBrands', () => ({ default: blank }))
vi.mock('@/shared/components/shell/TopbarDate', () => ({ default: blank }))

describe('TopbarHeading', () => {
  it('says the title the page gives it', () => {
    expect(renderToStaticMarkup(<TopbarHeading title={PAGE_TITLE} />)).toContain(PAGE_TITLE)
  })

  // A page that names nothing still says where the person is: the name of its module.
  it('says the module name when the page gives no title', () => {
    expect(renderToStaticMarkup(<TopbarHeading />)).toContain(MODULE_META[MODULE.COBRANZAS].name)
  })
})
