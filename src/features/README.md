# features/

Un módulo de negocio por carpeta. `app/` solo rutea; la lógica vive acá.

## Estructura de una feature

```
features/<x>/
  index.ts                 ← API pública: ÚNICO punto importable (@/features/<x>)
  index.test.ts            ← smoke test de la API pública
  components/              ← componentes de la feature (UI)
    <X>Module.tsx          ← orquestador: arma la pantalla; incluye <AppShell>
    <Otros>.tsx            ← un componente por archivo
  hooks/                   ← lógica/estado reutilizable (opcional)
  data.ts                  ← datos estáticos (opcional)
  types.ts                 ← tipos de la feature (opcional)
  format.ts / *.ts         ← helpers puros (opcional)
```

## Reglas

1. **API pública.** Lo único importable desde afuera es `index.ts`
   (`@/features/<x>`). Exporta el `<X>Module` y `export const access = {...} as const`.
   Nunca importar `@/features/otra/components/...`. La regla `feature-deps` de
   praxis-guard lo enforcea.

2. **La página es fina.** `app/(app)/<x>/page.tsx` solo monta el módulo:
   ```tsx
   import { XModule } from '@/features/x'
   export default function XPage() { return <XModule /> }
   ```
   El `Module` es el límite `'use client'`; la página queda como server component.

3. **Un componente = un archivo.** Nunca varios componentes en un mismo `.tsx`.
   `export default` para componentes.

4. **Bloque mapeado = su componente.** Todo JSX estructural dentro de un `.map()`
   se extrae a un componente propio (ej. `SalesRow`, `BrandOrbitNode`), no se deja
   inline.

5. **Nombres que describen el rol.** `SectionCard`, no `Card`; `BrandOrbitNode`,
   no `Item`. El nombre dice qué es / qué hace.

6. **Tests co-locados (híbrido).** Por defecto, archivo hermano: `Foo.tsx` +
   `Foo.test.tsx`. Solo si un componente gana piezas internas privadas se pasa a
   carpeta `Foo/index.tsx` con su test adentro.

7. **Datos y derivados.** Datos estáticos → `data.ts`. Agregados sobre datos
   estáticos → constantes de módulo (no `useMemo`). Tipos derivados de los datos
   cuando sea limpio (`type Venta = (typeof ventas)[number]`); si no, en `types.ts`.

## Genérico vs de feature

Si un componente presentacional lo usa **más de una** feature (tablas, cards,
KPIs…), va en `shared/components/ui/`, no duplicado por feature. Mientras lo use
**una sola**, queda en su feature; se promueve a `shared/` cuando aparezca el
segundo consumidor.
