# Descartados — eminat-app

_Última actualización: 2026-08-08_

- ~~**[UX] Confirmar restablecer contraseña**~~ — Pedido por consistencia con las demás acciones del panel admin. _(creado por: EminatMKT · 2026-06-25)_
  _Descartado 2026-08-08: la confirmación ya existe y agregar otra sería fricción duplicada. A diferencia de activar/borrar —que eran de 1 clic y sí recibieron su ConfirmModal— "Restablecer" nunca aplicó nada al instante: abre `ResetPasswordModal`, donde hay que generar o escribir la contraseña y recién ahí pulsar "Establecer nueva". Ese ya es el paso deliberado. El propio ticket lo anticipaba ("No duplicar fricción"). Si en algún momento se quiere reforzar, es cuestión de copy en ese modal (advertir que invalida la anterior), no de un modal más._

- ~~**[Dashboard] Panel embudo (Funnel Chart)**~~ — Panel de embudo para visualizar la conversión del pipeline de leads. _(creado por: SmithDR · 2026-06-09)_
  _Descartado 2026-08-08: el funnel estaba diseñado para las **8 etapas viejas** (Identificado → … → Awarded). La reunión del 2026-07-20 (Federico Salviche, Freddy Crespin) redujo el CRM a **4 etapas** (Nuevo → Contactado → Ganado, + Sin respuesta archivada) y pidió en su lugar el **pie de pipeline** (`StagePieChart`), que ya está implementado y en producción. Un embudo de 3 pasos no aporta sobre el pie. Rehacer solo si dirección lo re-pide explícitamente con las etapas nuevas._
