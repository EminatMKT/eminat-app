import 'react'

// Por qué existe este archivo.
//
// `componentes.md` bendice UNA excepción al ban del `style` inline: pasar un DATO como variable
// CSS, porque el ancho de una barra o el color de una marca no se conocen al escribir el `.css`.
// Pero el tipo `CSSProperties` de React no admite claves `--algo`, así que la forma bendecida no
// compilaba y todo el repo la escribía con un cast:
//
//     style={{ '--marca': color } as CSSProperties}
//
// Ese `as` es exactamente lo que `codigo.md` llama "un `as` que solo silencia al compilador", y
// encima apaga la verificación del objeto ENTERO: con el cast puesto, agregarle `padding: 8`
// al mismo `style` tampoco daría error de tipos. O sea que el cast que existía para habilitar
// la excepción estaba, de paso, desactivando la regla.
//
// La solución es de tipos y no de código: se le enseña a `CSSProperties` que una clave que
// empieza con `--` es válida. Con eso `style={{ '--marca': color }}` compila SIN cast, y una
// propiedad CSS real mal escrita vuelve a fallar como corresponde. Cero runtime.
//
// Los 24 casts que quedan de antes se migran por contacto, como los `../../`.
declare module 'react' {
  interface CSSProperties {
    [variable: `--${string}`]: string | number | undefined
  }
}
