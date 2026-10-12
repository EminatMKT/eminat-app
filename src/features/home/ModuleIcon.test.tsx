import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NAV } from '@/shared/components/shell/appShellConfig'
import ModuleIcon from './ModuleIcon'

it.each(NAV.filter(item => ['home', 'tasks', 'medical', 'research', 'directorio', 'reuniones'].includes(item.slug)))('Home uses the sidebar glyph for $slug', item => {
  expect(renderToStaticMarkup(<ModuleIcon slug={item.slug} />)).toContain(item.icon)
})
