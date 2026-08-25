#!/usr/bin/env bun
/**
 * Convierte a `rem` las medidas en píxeles de un .css — la mitad mecánica de
 * rules/componentes.md · "Las medidas van en `rem`, no en píxeles".
 *
 *   bun rules/px-a-rem.ts <archivo.css>          muestra el diff, no toca nada
 *   bun rules/px-a-rem.ts <archivo.css> --write  lo aplica
 *
 * Toca SÓLO las propiedades de tamaño y espaciado. `border`, `outline`, `box-shadow` y los
 * `transform` de un píxel se quedan como están: son líneas de contorno, no medidas de
 * contenido (el motivo largo está en la regla).
 */
const BASE = 16
const PROPS = /^(font-size|padding|margin|gap|border-radius|width|height|min-width|min-height|max-width|max-height|top|right|bottom|left|inset|row-gap|column-gap)$/

const aRem = (px: number): string => {
  const rem = px / BASE
  // Cuatro decimales alcanzan y evitan el 0.8437500000000001 de coma flotante.
  const txt = Number(rem.toFixed(4)).toString()
  return (txt.startsWith("0.") ? txt.slice(1) : txt) + "rem"
}

export function convertir(css: string): string {
  return css.replace(/^(\s*)([a-z-]+)(\s*:\s*)([^;{}]+);/gm, (linea, sangria, prop, sep, valor) => {
    if (!PROPS.test(prop)) return linea
    const nuevo = valor.replace(/\b(\d+(?:\.\d+)?)px\b/g, (_: string, n: string) => {
      const px = Number(n)
      // 0px es 0 en cualquier unidad; convertirlo sólo agrega ruido al diff.
      return px === 0 ? "0" : aRem(px)
    })
    return `${sangria}${prop}${sep}${nuevo};`
  })
}

if (import.meta.main) {
  const [ruta, ...flags] = process.argv.slice(2)
  if (!ruta) {
    console.error("uso: bun rules/px-a-rem.ts <archivo.css> [--write]")
    process.exit(1)
  }
  const antes = await Bun.file(ruta).text()
  const despues = convertir(antes)

  if (antes === despues) {
    console.log(`${ruta}: ya está en rem, nada que hacer.`)
    process.exit(0)
  }

  const lineasAntes = antes.split("\n")
  const lineasDespues = despues.split("\n")
  let cambios = 0
  for (let i = 0; i < lineasAntes.length; i++) {
    if (lineasAntes[i] === lineasDespues[i]) continue
    cambios++
    console.log(`  ${String(i + 1).padStart(4)}  - ${lineasAntes[i].trim()}`)
    console.log(`        + ${lineasDespues[i].trim()}`)
  }

  if (flags.includes("--write")) {
    await Bun.write(ruta, despues)
    console.log(`\n${ruta}: ${cambios} líneas convertidas. Revisá el resultado — la conversión es exacta, pero algún valor pensado para una pantalla concreta puede querer otro número.`)
  } else {
    console.log(`\n${cambios} líneas cambiarían. Agregá --write para aplicarlo.`)
  }
}
