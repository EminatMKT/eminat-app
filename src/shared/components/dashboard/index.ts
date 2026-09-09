export { default as Panel } from './Panel'

// La puerta de los bloques del tablero. Hoy ofrece uno solo —`Panel`, el contenedor de sección—
// porque es el único que se pide desde acá: los otros seis de la carpeta (las tarjetas de
// indicador, las dos gráficas y sus piezas) siguen importándose módulo por módulo desde 31
// lugares, y se van sumando a esta lista a medida que se los toque.
//
// Nace con uno y no con los siete a propósito: un barrel exporta lo que la carpeta OFRECE, no el
// inventario de lo que hay adentro. Exportar de más deja la puerta diciendo cosas que nadie pidió,
// y no hay forma de saber cuáles sobran.
