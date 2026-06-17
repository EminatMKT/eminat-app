# 🏠 Eminat App — The operating system of Eminat Group

Sistema interno de Eminat Group. Desarrollado con Next.js + Supabase.

## 🛠️ Stack tecnológico

- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Base de datos:** Supabase (PostgreSQL + Auth + Realtime)
- **Deploy:** Vercel
- **Dominio:** eminat.app (GoDaddy)

## 📋 Requisitos

- Node.js 18.17+
- **pnpm** (gestor de paquetes del proyecto — ver sección [Gestor de paquetes](#-gestor-de-paquetes-pnpm)). Instalar con `corepack enable pnpm` o `npm i -g pnpm`.
- Cuenta en Supabase (ya creada: eminat-app)
- Cuenta en Vercel (para deploy)

## 🚀 Instalación local

```bash
# 1. Clonar el repositorio
git clone https://github.com/[tu-usuario]/eminat-app.git
cd eminat-app

# 2. Instalar dependencias (este proyecto usa pnpm)
pnpm install
# Los build scripts permitidos se declaran en pnpm-workspace.yaml (allowBuilds)

# 3. Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus claves de Supabase

# 4. Ejecutar en desarrollo
pnpm dev
```

Abre http://localhost:3000

## 📦 Gestor de paquetes (pnpm)

Este proyecto usa **pnpm** como **único** gestor de paquetes. El lockfile oficial es `pnpm-lock.yaml`; **no uses `npm` ni `yarn`** (regenerarían un árbol de dependencias distinto).

> ⚠️ Comandos: `pnpm install`, `pnpm dev`, `pnpm build` — nunca `npm install`.

### Por qué migramos de npm a pnpm

Antes el repo tenía `package-lock.json` (npm) **y** `pnpm-lock.yaml` conviviendo. Eso causaba problemas reales:

- **Árboles de dependencias divergentes.** npm y pnpm resuelven versiones transitivas distinto. Con dos lockfiles, lo que instalás en local podía no coincidir con lo de producción → el clásico "en mi máquina anda".
- **Riesgo en el deploy.** Vercel elige el gestor según el lockfile presente; con ambos, podía buildear con uno distinto al de desarrollo.
- **Ruido en cada PR** por lockfiles cruzados que nadie revisa.

Se eliminó `package-lock.json` y se estandarizó en pnpm: **una sola fuente de verdad**, instalaciones reproducibles, store con hardlinks (más rápido y menos disco) y, sobre todo, defensas de seguridad configurables (abajo).

### Configuración — `pnpm-workspace.yaml` (versionado)

```yaml
allowBuilds:
  unrs-resolver: true

minimumReleaseAge: 1440
```

- **`allowBuilds`** — En pnpm 11 los *build scripts* (`postinstall`) de las dependencias están **bloqueados por defecto** (mitiga ejecución de código arbitrario al instalar). Hay que aprobarlos explícitamente. `unrs-resolver` (transitiva de Next/ESLint) necesita compilar un binding nativo, por eso está en `true`. Si una dependencia nueva bloquea su build verás `ERR_PNPM_IGNORED_BUILDS`: agregá `<paquete>: true` acá.
  - Nota: `allowBuilds` (pnpm ≥ 10.26) **reemplaza** al antiguo `onlyBuiltDependencies`.
- **`minimumReleaseAge: 1440`** — Cuarentena de **24 h**: pnpm no instala ninguna versión publicada hace menos de ese tiempo. Es una defensa contra ataques de cadena de suministro (versiones recién comprometidas, que suelen detectarse y bajarse del registro en pocas horas). Si necesitás una versión recién salida (un hotfix legítimo), excluila puntualmente:
    ```yaml
    minimumReleaseAgeExclude:
      - paquete@1.2.3
    ```

### Contexto de seguridad — los ataques a npm de 2025

La cuarentena (`minimumReleaseAge`) no es teórica: durante **2025** el ecosistema npm sufrió varios ataques de cadena de suministro sonados:

- El **gusano "Shai-Hulud"** (septiembre 2025), que se auto-propagaba comprometiendo paquetes, robando tokens y republicando versiones maliciosas.
- El compromiso de paquetes muy populares como **`chalk` / `debug` / `ansi-styles`** (septiembre 2025), publicados con código malicioso tras el phishing de la cuenta de un mantenedor.

El patrón común es la **inmediatez**: el daño ocurre en las **primeras horas** tras publicarse la versión comprometida, antes de que la comunidad la detecte y el registro la baje.

> **Matiz importante:** cambiar de npm a pnpm **no** te hace inmune — ambos instalan desde el mismo registro (`registry.npmjs.org`), así que descargás los mismos paquetes. Lo que aporta pnpm es la **herramienta** para defenderte: `minimumReleaseAge` evita instalar versiones recién publicadas hasta que pasó la ventana de riesgo. Por eso la migración fue *pnpm + endurecer la config*, no solo "dejar npm".

## 🗄️ Base de datos

El schema completo está en `/supabase_schema.sql`.
Los datos de migración del Q1 están en `/migracion_datos.sql`.

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `usuarios` | Todos los miembros de Eminat Group |
| `actividades` | Tareas y producción (migrado del Sheet) |
| `areas` | Marcas: EMC, SVN, ERG, VNF, PREMIER, ORNELLA, Eminat Mentor |
| `departamentos` | Marketing, Medical, Research, Foundation |
| `solicitudes` | Sistema de solicitudes internas y externas |
| `marcaciones` | Clock-in/out automático |
| `dominios_corporativos` | Mapeo email → departamento |

## 👥 Equipo

| ID Sheet | Nombre | Rol | Tipo |
|---------|--------|-----|------|
| Coord_MFreddy | Freddy Crespín | Superadmin | A |
| DG_Joselyn | Joselyn Guerrero | Colaborador | A |
| DGA_David | David Falconi | Colaborador | A |
| Jonathan_CRM | Jonathan Bula | Colaborador | A |
| DG_Ariana | Ariana Sig-Tú | Pasante | B |
| CM_ Naomi | Naomi Panchana | Pasante | B |
| EV_Bryan | Bryan Nuñez | Pasante | B |

## 🔐 Dominios autorizados

- `@eminat.net` → Marketing
- `@emc.health` → Medical Center  
- `@vivinegretefoundation.org` → Foundation

## 📱 Páginas

| Ruta | Descripción | Acceso |
|------|-------------|--------|
| `/` | Landing pública | Todos |
| `/login` | Inicio de sesión | Todos |
| `/solicitar` | Formulario de solicitudes | Todos |
| `/dashboard` | Panel principal | Usuarios autenticados |
| `/admin` | Panel de administración | Superadmin |
| `/clockin` | Registro de horario | Colaboradores tipo A |

## 🚀 Deploy en Vercel

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# 3. Agregar variables de entorno en Vercel:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## 📞 Soporte

- Coordinador: Freddy Crespín — freddy@eminat.net
- Sistema desarrollado con Claude (Anthropic)
