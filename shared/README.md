# shared/

Código transversal: lo usa **más de una** feature (o la app entera).

Subcarpetas:
- `components/` — UI compartida (AppShell, NavBar, Onboarding)
- `context/` — estado global (AppContext)
- `auth/` — permisos (permissions)
- `db/` — Supabase, env, session
- `motion/` — wrappers de animación (Framer Motion)
- `constants/` — constantes de marcas/empresas (companies)

**Regla:** si lo usa **una sola** feature → va en `features/esa/`, no acá.
Imports vía `@/shared/...`.
