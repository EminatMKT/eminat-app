# 🏠 Eminat App — The operating system of Eminat Group

Sistema interno de Eminat Group. Desarrollado con Next.js + Supabase.

## 🛠️ Stack tecnológico

- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Base de datos:** Supabase (PostgreSQL + Auth + Realtime)
- **Deploy:** Vercel
- **Dominio:** eminat.app (GoDaddy)

## 📋 Requisitos

- Node.js 18+
- npm o yarn
- Cuenta en Supabase (ya creada: eminat-app)
- Cuenta en Vercel (para deploy)

## 🚀 Instalación local

```bash
# 1. Clonar el repositorio
git clone https://github.com/[tu-usuario]/eminat-app.git
cd eminat-app

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus claves de Supabase

# 4. Ejecutar en desarrollo
npm run dev
```

Abre http://localhost:3000

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
