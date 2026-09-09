// Transitorio: slugs fuera de MODULE que aún tienen filas en `role_modules`, porque la
// migración que las borra corre después del deploy que cambia el catálogo. Se borra esta
// carpeta entera cuando esa migración esté aplicada y verificada en prod (0 filas de 'tasks').
const SLUGS_RETIRADOS = ['tasks'] as const

/** ¿Es un slug que la app conoce, vigente o recién retirado? */
export default function esSlugConocido(s: string): boolean {
  return (SLUGS_RETIRADOS as readonly string[]).includes(s)
}

// Le da a `validateModuleSlugs` un sí para un slug que ya salió del catálogo pero todavía
// tiene filas en `role_modules`, para que /admin no le arranque el módulo a un rol por error.
