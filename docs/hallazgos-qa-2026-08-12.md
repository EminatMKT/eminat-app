# Hallazgos del QA — 12 de agosto de 2026

Salieron haciendo el QA en navegador de la fase 2 (`responsable_ref` → FK uuid), en la base
local. **Ninguno los introdujo la fase 2**: son cosas que el QA destapó al pasar por encima.
Ordenados por gravedad.

---

## 1. Borrar un usuario le destruye el login aunque el borrado falle

**Grave.** `app/api/admin/delete-user/route.ts`

La ruta borra la cuenta de `auth.users` en el paso 2 (línea 104) y recién en el paso 3
(línea 118) intenta borrar el row de `public.usuarios`. Si el row está protegido por una FK
—que es el caso normal: cualquiera con actividades— el DELETE falla con `23503`, la ruta
devuelve 409 y la UI ofrece el panel de herencia. Todo correcto salvo por una cosa: **la
cuenta de Auth ya se borró y no vuelve.**

El usuario queda como un fantasma: la fila de `usuarios` intacta, con sus actividades y su
historial, pero sin poder entrar nunca más. Y desde la UI el admin ve un mensaje de error,
así que se lleva la impresión de que no pasó nada.

Se llega ahí por el camino que el propio modal recomienda: *"Si tiene actividades, te abrirá
un panel para heredarlas a otro miembro antes de borrar"*. O sea, invita a apretar "Borrado
definitivo" para ver el panel — y ese click ya es irreversible.

Por esto el check (d) del QA se verificó por SQL en vez de por la UI.

**Arreglo:** invertir el orden. Contar primero las actividades (la ruta ya sabe hacerlo,
línea 130) y devolver el 409 **antes** de tocar Auth. El borrado de Auth solo cuando el
DELETE del row vaya a prosperar.

**Verificado:** las 4 FK de `actividades` son `NO ACTION` (`confdeltype='a'`), así que el row
de `usuarios` sí se salva. El daño es exclusivamente la cuenta de Auth.

---

## 2. El KPI "Completed" del reporte cuenta lo que no cobra

**Menor, pero es un documento que se firma.** `features/stratix-mkt/hooks/useStratixData.ts`

El *Production Payment Report* de Freddy en Agosto muestra:

| Total tasks | Completed | Total hours | Production days |
|---|---|---|---|
| 7 | **2** | 0h | 0 |

Las 7 son tareas que Freddy **solicitó**, no que ejecutó — por eso horas y días dan 0, que es
exactamente lo que pide la regla "listar sí, sumar no". Pero `completadasRep` se calcula sobre
la lista completa, no sobre lo propio, así que dice 2.

No está *mal*: 7 y 2 son coherentes entre sí (de las 7 listadas, 2 están completadas). El
problema es que el bloque queda mitad-listado y mitad-propio sin que nada lo explique. En un
papel que se firma para pagar, "Completed 2 / Total hours 0h" invita a la pregunta.

Es la misma raíz que el pendiente ya anotado: las filas muestran horas que el total no suma.
Una columna **"Responsable"** en la tabla resolvería los dos de una: se ve de un vistazo qué
filas son propias y cuáles son delegadas.

---

## 3. "New task" asigna a Angie sin que nadie la haya elegido

**Menor, pero silencioso.** `features/stratix-mkt/components/NewActivityModal.tsx`

El estado arranca con `responsable_id` vacío. Como el `<select>` de **Assignee** no tiene
opción placeholder, el browser cae en el primer `<option>` y pinta "Angie Núñez". Lo que se
guarda es lo que se ve —no hay desalineación entre estado y UI, esto se comprobó— pero el
admin que llena título, marca y horas y le da Create sin bajar la vista le acaba de asignar
la tarea a Angie.

El campo de al lado, **Requested by**, sí tiene su `—` de placeholder. Es la misma solución:
un `<option value="">— Seleccionar —</option>` de primero, y que la validación lo rechace.

---

## 4. Horas en blanco se pintan "h"

**Cosmético.** Requests → Task list.

El template interpola `${a.horas}h` sin fallback, así que una actividad sin horas muestra una
`h` suelta en la columna. Se ve creando una tarea sin completar el campo. `${a.horas || 0}h`.

---

## 5. El reporte corta por mes y los pagos no

**No es un bug: es un spec pendiente.** Lo levantó Wagner el 12/08.

Los pagos se hacen entre el **20 y el 30**, sin fecha fija. El reporte, en cambio, filtra por
`actividades.mes`, que es un bucket de texto (`'Agosto'`). Los dos calendarios no coinciden, y
en la juntura se pierde trabajo:

> Se emite el reporte de agosto el día 22. Los días del 23 al 31 ya no entran ahí —el papel
> está firmado— y tampoco entran en el de septiembre, que arranca el 1. Quedan huérfanos.

Es una fuga silenciosa: nadie ve los días perdidos, porque no aparecen en ningún reporte.

Lo que Wagner pide son dos piezas, y la segunda es la que resuelve el problema:

1. **Rango de fechas** en vez de mes, para poder cortar el 22.
2. **Registro de reportes emitidos**, para saber cuándo fue el último corte de cada persona.

La segunda no es una comodidad. Es lo que hace que el próximo reporte pueda **arrancar donde
terminó el anterior** — sin huecos y sin superposiciones. Un rango libre sin memoria del corte
previo tiene el mismo agujero que hoy, solo que ahora el agujero lo elige el operador a mano.

### El obstáculo: no existe la fecha del hecho

Hoy no hay con qué bucketear un rango de forma honesta. El estado de las tres columnas de
fecha de `actividades` (medido en la base local, 19 filas):

| Columna | Filas con dato | Usos en el código | Qué es realmente |
|---|---|---|---|
| `fecha_entrega` | 18 | 15 | La UI la etiqueta **"Due date"**: es el plazo, no la entrega |
| `fecha_requerida` | 0 | 0 | Muerta |
| `fecha_aprobacion` | 0 | 0 | Muerta, aunque `aprobado_por_id` sí existe |

La única fecha viva es un **vencimiento**. Y un vencimiento se mueve, se incumple o se cumple
antes: cortar un pago sobre él es pagar por la fecha en que el trabajo *debía* estar lista, no
por aquella en que estuvo. `estado = 'Completado'` tampoco alcanza — dice *que* se completó,
nunca *cuándo*.

O sea que antes del rango hace falta decidir **cuál es el hecho que se paga** (¿entregado?
¿aprobado?) y empezar a sellarlo con su fecha. `fecha_aprobacion` ya está en el esquema
esperando que alguien la escriba.

### Lo que el spec tiene que resolver

- Qué evento vuelve pagable una actividad, y en qué columna se sella su fecha.
- Qué pasa con las 19 filas históricas, que no tienen ese sello.
- Si el corte es por persona o global (hoy el reporte es por miembro; el último corte de
  Bryan no tiene por qué ser el de Naomi).
- Si un reporte emitido **congela** sus filas —quedan pagadas, no vuelven a aparecer— o si es
  solo un registro informativo. Congelarlas es lo que hace imposible pagar dos veces.
- Qué pasa con una actividad que se aprueba con fecha anterior al último corte: ¿entra en el
  reporte siguiente o se pierde? (Es el mismo agujero, un nivel más abajo.)
- Si `mes`/`trimestre`/`semana` —texto denormalizado— sobreviven a la fecha real o se
  derivan de ella.

Cruza con el hallazgo #2: si el reporte pasa a ser por rango y con registro de emisión, la
columna "Responsable" que ahí se propone deja de ser cosmética y pasa a ser parte del
documento de pago.

---

## 6. No hay forma de darle cuenta a alguien que ya existe

**Grave.** `app/api/admin/create-user/route.ts`

Las tres acciones del panel que parecen servir para esto, no sirven:

| Acción | Qué hace | Con Bryan (fila sin Auth) |
|---|---|---|
| **Nuevo usuario** | `auth.createUser` y después **INSERT** de una fila nueva en `usuarios` (línea 176) | `usuarios.email` es UNIQUE → `23505` → rollback del Auth → error |
| **Restablecer** | Resuelve el auth id desde `auth_id` o `id` y rota la contraseña | No hay fila en Auth que rotar → error |
| **Validar** | `UPDATE usuarios SET validado = true` | Cambia una etiqueta. No crea ninguna cuenta |

La ruta de creación siempre **inserta**; no contempla que la persona ya esté en `usuarios` sin
cuenta. Y ese no es un caso raro: son **9 de los 10 usuarios** de la base local, todos los que
vinieron del seed. El badge "Cuenta por crear" que muestra el tab Team no tiene ninguna acción
detrás que lo resuelva.

**Arreglo:** que `create-user` haga upsert por email — si la fila existe, crear el Auth y
**enlazar** (`UPDATE usuarios SET auth_id = <nuevo>`), en vez de insertar una duplicada.
Ojo: `id` quedaría distinto de `auth_id` en esas filas, que es justo el caso que `reset-password`
y `delete-user` ya contemplan probando ambos candidatos.

---

## 7. La columna "Estado" no dice si la persona puede entrar

**Menor, pero engaña al admin.** `features/admin/components/UserRow.tsx:68`

El estado sale de `validado && activo` — dos flags de la ficha. Ninguno mira Auth. Medido en la
base local:

| Persona | Muestra /admin | ¿Puede entrar? |
|---|---|---|
| Freddy | Pendiente | **Sí** (único con fila en Auth) |
| Los otros 9 | Pendiente | No |

Está invertido en los dos sentidos. Y basta apretar **Validar** sobre cualquiera de los 9 para
que pase a decir **"Activo"** sin que nada haya cambiado: sigue sin poder entrar. Pasó durante
este QA, con un click perdido sobre Bryan (revertido después).

Mientras el estado no distinga "tiene cuenta" de "tiene la ficha en orden", el panel afirma
cosas que no son.

---

## 8. Crear un usuario manda la contraseña por mail, en texto plano, desde local

**Grave por el lado operativo.** `create-user/route.ts:103-125`

Dos cosas separadas que juntas incomodan:

1. El mail de bienvenida lleva **la contraseña en el cuerpo del HTML** (línea 72), en claro, y
   va con **CC**. Queda en dos buzones para siempre.
2. `RESEND_API_KEY` **está seteada en `.env.local`**, así que esto sale **de verdad** desde el
   entorno local. La base es local; el mail no. Probar el alta contra Docker le manda un correo
   real a una casilla `@eminat.net`.

La contraseña además **la tipea el admin** (`body.password`, mínimo 8 caracteres) — no se
genera. O sea que el admin elige la contraseña de otro y se la manda por mail. Lo esperable es
al revés: generarla, o directamente no mandarla y usar un link de invitación con token de un
solo uso, que es lo que `resetPasswordForEmail` ya sabe hacer (`shared/db/auth.ts:15`).

**Mínimo inmediato:** que el entorno local no tenga `RESEND_API_KEY`, o que el envío quede
detrás de un guard por `NEXT_PUBLIC_APP_ENV`. Hoy cualquier prueba de alta en local es un mail
real a un dominio corporativo.

---

## 9. Sin `RESEND_API_KEY` se cae todo el panel de admin, no solo el mail

**Grave.** `shared/db/env.server.ts:13`

```ts
export const serverEnv = serverSchema.parse(process.env)   // parse EAGER, al importar
```

`RESEND_API_KEY` está declarada como **obligatoria** (`z.string().startsWith('re_')`), y
`shared/db/supabaseAdmin.ts` importa `serverEnv`. Como `supabaseAdmin()` es lo que usan *todas*
las rutas de admin, sacar la key del entorno no degrada el correo: **tira con ZodError el alta,
el borrado, la edición, los roles y la organización.** Una credencial de mail voltea la
administración de usuarios, que no tiene nada que ver con mandar mails.

Encima contradice al comentario de la propia ruta (`create-user/route.ts:18-21`), que promete
que el envío es best-effort *"si Resend falla **o falta `RESEND_API_KEY`**"*. La segunda mitad
es inalcanzable: la app no llega a arrancar sin la key.

Es la misma clase de bug que ya pasó una vez con `APP_ENV` → `NEXT_PUBLIC_APP_ENV` (PR #22, que
tiró producción con un ZodError). Vale la pena mirar el schema entero con esa luz: lo que es
opcional para el negocio tiene que ser `.optional()` en el schema.

**Arreglo:** `RESEND_API_KEY: z.string().startsWith('re_').optional()` y que
`sendWelcomeEmail` devuelva su warning cuando no está. Eso además hace cierto el comentario.

**Workaround usado en este QA:** en vez de sacar la key, ponerle un valor válido pero muerto
(`re_...`). La app arranca, Resend rechaza con "API key is invalid", y el `emailWarning`
aparece en pantalla — **la primera vez que ese branch se pudo ejercitar**.

---

## 10. La UI promete un cambio de contraseña que nadie obliga

**Menor.** Modal de éxito de `create-user` + cuerpo del mail (`route.ts:74`)

El modal dice, en indicativo: *"La cambiará en su primer inicio de sesión"*. El mail repite
*"Cámbiala en tu primer inicio de sesión"*. **No existe ningún mecanismo que lo fuerce**: no
hay flag `must_change_password`, ni intercepción en el login, ni nada. Buscado en `app/`,
`shared/` y `features/`; el único resultado es ese string.

O sea que la contraseña que eligió el admin —y que viajó por mail en texto plano, ver #8—
queda vigente indefinidamente. La frase describe una intención, no una conducta del sistema.

**Arreglo:** o se implementa (flag en `usuarios` + guard en el layout protegido), o la frase
pasa a imperativo y deja de afirmar lo que no ocurre: *"Pedile que la cambie apenas entre"*.

Cosmético del mismo modal: el warning concatena sin puntuación —
*"No se envió el correo: API key is invalid Comparte la contraseña manualmente."*

---

## 11. Nadie creado desde el panel puede recibir una tarea, nunca

**Grave.** `create-user` / `update-user` + `shared/context/team-derivations.ts`

`usuarios.equipo_id` **no aparece en ninguna ruta de `/api/admin/`** — ni en el alta ni en la
edición— y tampoco hay campo en ningún formulario del panel. En `features/admin/` la palabra
"equipo" solo sale en el CRUD de **Organización**, que administra el catálogo de equipos: se
pueden crear, editar y borrar equipos, pero **no hay dónde poner a una persona en uno**.

Consecuencia: todo usuario nacido de la UI queda con `equipo_id = NULL` para siempre. Y como
las derivaciones exigen departamento `MKT`…

```ts
const esMarketing = (u: U) => u.equipos?.departamentos?.codigo === 'MKT'
```

…esa persona **nunca** aparece en el dropdown de Assignee (`deriveMiembrosAsignables`) ni en el
tab Team (`deriveEquipoMarketing`). No puede recibir una tarea jamás.

Se vio en vivo: Quinn Prueba, recién creado desde `/admin`, aparece en **Requested by** (10
opciones, que ofrece a todos los activos) pero **no en Assignee** (9 opciones). Los 9 del seed
sí están, porque el seed SQL les puso `equipo_id` a mano.

| Usuario | `equipo_id` | Depto | ¿Asignable? |
|---|---|---|---|
| Los 9 del seed | seteado por SQL | MKT | sí |
| Quinn (nacido en la UI) | **NULL** | — | **no** |
| Jonathan (inactivo) | NULL | — | no |

Es el mismo patrón que el de Auth, invertido: allá el seed **produce** el estado roto, acá el
seed **tapa** un agujero de la UI. Contratás a alguien de marketing, lo das de alta por el
panel, y no se le puede asignar nada — sin ningún mensaje que explique por qué.

**Arreglo:** un selector de equipo en el alta y en la edición, y `equipo_id` aceptado por ambas
rutas. Es la pieza que falta para que el panel sea autosuficiente.

---

## Veredicto: la UI resuelve bien la identidad y mal la pertenencia

Se creó un usuario de punta a punta desde `/admin` (Quinn Prueba, `stratix360`) con el envío de
mail neutralizado. Del lado de **Auth**, la fila resultante es **impecable**:

| Chequeo | Resultado |
|---|---|
| `id = auth_id` | sí |
| Fila en `auth.users` | 1 |
| `activo` / `validado` | true / true |
| Rol y cargo | `stratix360` / Graphic Designer |
| Estado en el panel | "Activo" — y **sí puede entrar** |

Así que la respuesta a la duda de fondo, en su primera mitad: **el estado "sin cuenta de Auth"
es artefacto del seed SQL**, no del flujo de la UI. Quien nace del panel nace consistente en
identidad, y los hallazgos #6 y #7 no se manifiestan en él.

**Pero la segunda mitad es al revés.** Del lado de la **pertenencia** —a qué equipo va la
persona— el panel deja el trabajo a medias: `equipo_id` queda NULL y no hay dónde setearlo
(#11). Quinn tiene cuenta y entra sin problema, pero no puede recibir una tarea. Ahí los 9 del
seed están *mejor* que él, porque el SQL les puso el equipo.

O sea que ninguno de los dos caminos deja un usuario completo: el seed resuelve la pertenencia
y se olvida de Auth; la UI resuelve Auth y se olvida de la pertenencia. Hoy hacen falta los dos
para tener a alguien entero, que es exactamente lo que no debería pasar.

Con una salvedad que los mantiene vivos: **el bug #1 fabrica ese mismo estado desde la UI, en
producción y sin SQL de por medio.** Borrás a alguien con actividades, la FK frena el DELETE
pero el Auth ya se borró, y queda la fila fantasma — idéntica a las del seed. Ahí #6 dice que
no se puede reparar desde el panel y #7 la muestra como "Activo". El seed las expone; el bug #1
las produce.

**Cuidado si se piensa en borrar y recrear los 9 usuarios del seed:** las 19 actividades
apuntan a sus uuid por FK, que es justamente lo que construyó la fase 2. Recrearlos desde la UI
les da uuid nuevos y deja las actividades colgadas de los viejos.

---

## Nota aparte: no se puede entrar como nadie que no sea Freddy

No es un bug del código, es el estado de la base local: de los 10 usuarios, **solo Freddy
tiene cuenta en `auth.users`**. Los otros 9 existen en `public.usuarios` con su email y su
rol, pero sin `auth_id` y sin fila en Auth — el tab Team los marca "Cuenta por crear".

Por eso los dos últimos checks del QA (Kanban con nombres y tarea delegada que sobrevive al
reload, ambos como usuario `stratix360`) siguen pendientes: no hay con qué iniciar esa sesión.
