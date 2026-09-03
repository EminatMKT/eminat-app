import type {
  useTablero, useKanban, useSolicitudes, useActividadForm, useReporte,
} from '@/features/stratix-mkt/hooks'

// Lo que el provider expone: los cinco hooks de datos, más la pestaña abierta.
export type StratixData =
  & ReturnType<typeof useTablero>
  & ReturnType<typeof useKanban>
  & ReturnType<typeof useSolicitudes>
  & ReturnType<typeof useActividadForm>
  & ReturnType<typeof useReporte>
  // La firma del setter es la de useUserPreference: acepta el valor o un actualizador. La
  // pestaña es `string` y no un catálogo cerrado: cuál es el catálogo lo decide quien monta el
  // provider, y `ModuloTabs` la estrecha contra el suyo al renderizar.
  & { mktTab: string; setMktTab: (v: string | ((p: string) => string)) => void }

// Los tres opcionales son lo que cambia entre una ruta y otra. Tienen default con los valores
// de Stratix: el provider se sigue montando sin props donde ya se montaba así.
export type StratixProviderProps = {
  children: React.ReactNode
  prefKey?: string
  tabs?: readonly string[]
  tabInicial?: string
}
