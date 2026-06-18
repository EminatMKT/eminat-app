# features/

Un módulo de negocio por carpeta. Cada feature:
- `components/` — UI endémica de la feature
- `hooks/` — lógica/estado de la feature
- `types.ts` — tipos de la feature (opcional)
- `index.ts` — **API pública**: único punto importable desde afuera (`@/features/<x>`)
- `export const access = {...} as const` — convención access-aware (la consume el plan de control de acceso)

**Regla:** nunca importar `@/features/otra/components/...` — solo su `index.ts`.
La regla `feature-deps` de praxis-guard lo enforcea.
