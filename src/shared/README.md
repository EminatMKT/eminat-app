# src/shared/

Código transversal: lo usa **más de una** feature (o la app entera).

**Un directorio por tipo de cosa**, con el mismo nombre que su equivalente dentro de una feature:
un hook compartido va a `src/shared/hooks/` porque un hook de módulo va a `src/features/<modulo>/hooks/`.
No hay bolsas mezcladas — `lib/` era una (cuatro funciones puras y dos hooks adentro) y por eso
se partió el 19/08/2026.

| Directorio | Qué va |
|---|---|
| `components/` | UI compartida — AppShell, Sidebar, Topbar, y `dashboard/` (el tablero) |
| `hooks/` | Hooks transversales — `useUserPreference`, `usePersistedState`, `useClock` |
| `utils/` | Funciones puras — `api`, `canonical`, `delimited`, `filters`, `html` |
| `context/` | Estado global — `AppContext` y lo que solo existe para servirlo |
| `data/` | Acceso a datos (repos de Supabase, realtime) |
| `db/` | Cliente de Supabase, env, guards de las rutas API |
| `auth/` | Permisos (`permissions.ts`) |
| `i18n/` | `es.json` / `en.json` + `useT()` |
| `motion/` | Wrappers de animación (Framer Motion) |
| `constants/` | Constantes de dominio transversales |
| `theme/` | Tokens y estilos de la app |

**Regla:** si lo usa **una sola** feature → va en `src/features/esa/`, no acá. El criterio completo,
con sus motivos, está en `.claude/rules/arquitectura.md` y `.claude/rules/componentes.md`.

Imports vía `@/shared/...`.
