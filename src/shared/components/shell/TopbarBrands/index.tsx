'use client'
import { useApp } from '@/shared/context/AppContext'
import { useT } from '@/shared/i18n'
import { COLOR_MARCA_FALLBACK } from '@/shared/context/empresa-derivations'
import { ColorBadge } from '@/shared/components/ui'
import TopbarLayout from '@/shared/components/shell/TopbarLayout'

const SEPARATOR = ', '

/** The group's brands in the topbar: labels to READ, never clicked, so `ColorBadge` and not a
 *  chip that looks choosable. It also brings ColorBadge's measured contrast (5.12:1 at worst). */
export default function TopbarBrands() {
  const { marcas } = useApp()
  const { t } = useT()
  if (!marcas.length) return null
  const codes = marcas.map(m => m.codigo)
  const hint = t('shell.brandsTitle', { list: codes.join(SEPARATOR) })
  return (
    <>
      <TopbarLayout part="wide">
        <TopbarLayout part="brands">
          {marcas.map(m => <ColorBadge key={m.codigo} color={m.color ?? COLOR_MARCA_FALLBACK}>{m.codigo}</ColorBadge>)}
        </TopbarLayout>
      </TopbarLayout>
      <TopbarLayout part="narrow" title={hint}>
        <ColorBadge color={COLOR_MARCA_FALLBACK}>{t('shell.brandsMore', { n: marcas.length })}</ColorBadge>
      </TopbarLayout>
    </>
  )
}

// On a phone the seven chips reached far past the screen's edge, so they fold into one count
// whose hint names them all. The wide row is only tucked away there, so it is still read aloud.
