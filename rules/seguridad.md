# Seguridad

## Ninguna credencial se escribe en un archivo que git trackea

Ni en código, ni en un `.md`, ni en un plan de `docs/`, ni en un YAML de CI. Da igual que el
repo sea privado hoy: los repos cambian de visibilidad, se forkean y se clonan.

Las credenciales viven en `.env.local` / `.env.prod` (gitignored) y en el panel del proveedor.
Si un documento necesita mostrar una, va **elidida** — `sb_secret_…`, `eyJ…` — nunca completa.

<!-- check: block
     pattern: eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6|sb_secret_[A-Za-z0-9]|sbp_[0-9a-f]{20,}|re_[A-Za-z0-9]{20,}
     paths: .
     except: rules/seguridad.md
     version: 1
     test: falla @docs/plan.md :: la key es eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZWRlIn0.x
     test: falla @docs/plan.md :: SUPABASE_SECRET_KEY=sb_secret_A1b2C3d4E5
     test: falla @src/x.ts :: const pat = 'sbp_0f1e2d3c4b5a69788796'
     test: falla @.github/workflows/ci.yml :: RESEND_API_KEY: re_AbCdEfGhIjKlMnOpQrStUv
     test: pasa @.github/workflows/ci.yml :: RESEND_API_KEY: re_dummy_key
     test: pasa @docs/plan.md :: eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24ifQ.x
     test: pasa @docs/plan.md :: la key va elidida, sb_secret_… y listo
-->

**Qué detecta y qué deja pasar, a propósito:**

| Forma | Por qué |
|---|---|
| `eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6` | base64 de `{"iss":"supabase","ref":"` — sólo lo tiene la clave de un proyecto **real** |
| `sb_secret_…` | secret key de Supabase; no existe una versión inocua |
| `sbp_` + 20 hex o más | Personal Access Token de Supabase |
| `re_` + 20 o más | API key de Resend |

Las claves **demo del Supabase local** no disparan: dicen `supabase-demo` y codifican distinto.
Por eso `ci.yml` y `e2e/seed.ts` pueden seguir llevándolas escritas, que es lo correcto — son
públicas, deterministas y sólo abren `127.0.0.1`. Un check que también las frenara obligaría a
exceptuar esos dos archivos enteros, y ahí sí una clave real podría colarse por la excepción.

`re_dummy_key` tampoco dispara: el mínimo de 20 caracteres separa una key real de un placeholder.

El `except` es este mismo archivo: los `test:` del check tienen que contener literales que
matcheen, así que sin la excepción la regla se bloquearía a sí misma. Está acotado a un archivo
que sólo tiene reglas — no a `proceso.md`, que se edita seguido.

**Los fixtures de los `test:` no pueden parecer credenciales de verdad.** GitHub tiene *push
protection* activa en este repo y rechaza el push entero si detecta una. Pasó al escribir esta
misma regla: el fixture `sbp_` con 40 hex —inventado, todo secuencial— fue tomado por un Personal
Access Token y frenó el push con `GH013`. Por eso el patrón pide `{20,}` en vez de `{40}`: atrapa
igual un PAT real, y deja escribir un fixture de 20 que GitHub no confunde.

Vale anotar qué NO cubre esa red: la push protection de GitHub no reconoce los JWT de Supabase,
que es exactamente la forma que se filtró en junio. Por eso esta regla existe además de aquella,
y no en vez de aquella.

**Esto no reemplaza rotar.** El check evita que la credencial entre; no la desactiva si ya entró.
Si una se publicó, el orden es **rotar primero** y limpiar el repo después: borrarla del archivo
no invalida nada, y en un repo público hay que darla por comprometida desde el minuto uno.

**Motivo:** el 11/06/2026 la `service_role` de producción se commiteó dentro de un plan de
`docs/superpowers/` y estuvo **78 días legible en un repo público**. `service_role` saltea toda
la RLS: lee y escribe cualquier tabla del proyecto. Se descubrió el 28/08 por casualidad, mientras
se revisaba otra cosa, y al probarla seguía activa. No la detectó nadie porque nadie estaba
mirando: no hubo error, ni test en rojo, ni build roto — un `.md` con una clave adentro se ve
igual que cualquier otro `.md`. Ese es exactamente el tipo de falla que sólo una verificación
automática agarra.
