export function componenteFueraDeCarpeta(_texto: string, path: string): boolean {
  // Un .tsx de componente que NO se llama index.tsx: vive suelto en vez de en su
  // carpeta. Se mira el PATH, no el contenido — es lo único que dice dónde está.
  // Las rutas de src/app/ quedan afuera: ahí el nombre del archivo es el contrato
  // con el router (page.tsx, layout.tsx), no una elección.
  const archivo = path.split("/").pop() ?? ""
  if (!archivo.endsWith(".tsx")) return false
  if (archivo === "index.tsx" || archivo.endsWith(".test.tsx")) return false
  if (path.includes("/app/")) return false
  return /^[A-Z]/.test(archivo)
}
