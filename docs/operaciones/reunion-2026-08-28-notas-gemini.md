# **📝 Las notas**

ago 28, 2026

## **REUNIÓN DEVELOPMENT**

Invitado [freddy@eminat.net](mailto:freddy@eminat.net) [wagner@eminat.net](mailto:wagner@eminat.net) [angie Núñez](mailto:angie@stratix360.com) [Don Freddy](mailto:freddy@stratix360.com)

Archivos adjuntos [REUNIÓN DEVELOPMENT](https://calendar.google.com/calendar/event?eid=NDY5ZDJ2MnAzNGVtY2x1OWdrcnJnZ3J2MThfMjAyNjA4MjhUMTYwMDAwWiBhbmdpZUBzdHJhdGl4MzYwLmNvbQ) [REUNIÓN DEVELOPMENT - 2026/08/21 11:00 GMT-05:00 - Recording](https://drive.google.com/file/d/1ZFp6Y9xF9RYpBgkVZl0uwtmXxwYpu0IV/view?usp=drive_web) [Notas de Gemini](https://docs.google.com/document/d/12SN5moGKwzS_iFLc79ngoRUXUVc-cmJrRSF0T4grCrU/edit?usp=meet_tnfm_calendar)

Registros de la reunión [Transcripción](https://docs.google.com/document/d/1XBFFZsVzA2lPZkdrHbVsbwMynMXhKuXr-pCQgpgdoDs/edit?usp=drive_web&tab=t.bviujgjiw9ux) [Grabación](https://drive.google.com/file/d/1ZRK7EZMPBOCdoUr47kcMSIUVbXH4RHko/view?usp=drive_web) 

### **Resumen**

Se priorizó el desarrollo del módulo de reuniones sobre el sistema de pacientes para mejorar la gestión semanal.

**Prioridades del sistema CRM**  
El equipo decidió priorizar el desarrollo del módulo de reuniones sobre el sistema de pacientes. Esto permitirá presentar avances concretos durante la próxima revisión semanal.

**Saneamiento de datos médicos**  
Se implementó un proceso manual para detectar registros duplicados en la base de datos de pacientes. El sistema emitirá alertas automáticas al intentar guardar información coincidente con registros existentes.

**Especificaciones del nuevo módulo**  
El nuevo módulo de reuniones permitirá registrar asistentes y estados de tareas con acceso restringido. Se estandarizó la captura manual de datos para acelerar la implementación inmediata.

### **Decisiones**

## Acordada

* **Nuevo módulo de reuniones independiente** Se establece la creación de un nuevo módulo independiente dentro del sistema Stratics destinado al registro de reuniones, actas y seguimiento de tareas.

* **Reemplazo del módulo Medical Center** El módulo actual de Medical Center será reemplazado por el nuevo módulo de registro de pacientes en desarrollo.

* **Priorización del módulo de reuniones** Se asigna prioridad máxima al desarrollo del módulo de reuniones y actividades para su presentación el próximo lunes.

* **Definición del flujo de desarrollo** Se adopta un flujo de trabajo para el desarrollo del nuevo módulo: primero redactar un documento de visión en prosa, seguido de la creación de un borrador en HTML, y finalmente la codificación.

* **Presentación de dashboard con datos parciales** Se acuerda realizar una presentación provisional del dashboard utilizando un único libro de datos mientras se continúa trabajando en la infraestructura de saneamiento de la base de datos.

* **Implementación de alerta de duplicados** Se decide integrar una funcionalidad de advertencia sobre posibles coincidencias en la interfaz al registrar nuevos pacientes para prevenir la creación de duplicados.

* **Priorización de infraestructura de saneamiento** Se establece la finalización de la infraestructura de saneamiento y deduplicación de datos como la prioridad técnica principal antes de proceder con el desarrollo del módulo de reuniones.

## Pospuesta

* **Suspensión temporal del desarrollo Medical Center** Se deja en espera (standby) el desarrollo de la página de aterrizaje y las correcciones del módulo de Medical Center para centrar los recursos en el módulo de reuniones.

### **Próximos pasos**

- [ ] \[Wagner Duenas\] Desarrollar módulo actividades: Crear un módulo independiente para registrar temas de reuniones y listas de verificación. Integrar la generación de actas de reunión y notificaciones automáticas para los responsables.

- [ ] \[Wagner Duenas\] Migrar datos pacientes: Subir los registros de pacientes contenidos en el archivo Excel al módulo de Medical Center. Reemplazar la estructura actual con la nueva implementación propuesta.

- [ ] \[Don Freddy\] Enviar recursos desarrollo: Enviar a Wagner Duenas el documento y el archivo HTML necesarios para la construcción del nuevo módulo de actividades.

- [ ] \[Don Freddy\] Redactar visión reuniones: Redactar el documento en prosa con la visión y los requisitos para el nuevo módulo de reuniones.

- [ ] \[Wagner Duenas\] Desarrollar módulo reuniones: Desarrollar el módulo de gestión de reuniones utilizando la planificación y los documentos proporcionados por Don Freddy.

- [ ] \[Wagner Duenas\] Reportar días adeudados: Enviar al correo de Stratic un reporte de los días acumulados que la empresa adeuda al colaborador.

- [ ] \[angie Núñez\] Cargar tareas mensuales: Cargar al sistema CRM todas las tareas realizadas durante el mes actual.

- [ ] \[The group\] Coordinar reunión desarrollo: Coordinar el horario para la próxima reunión de desarrollo a realizarse el día martes.

### **Detalles**

* **Stratics CRM \- Actualización de Edición y Trabajo Local**: Don Freddy y Wagner Duenas conversan sobre los avances en el CRM de Stratics, confirmando que la función para editar tareas ya se encuentra operativa ([00:02:22](#00:02:22)). Wagner Duenas explica que trabaja localmente para evitar errores antes de enviar los cambios definitivos a producción en INC ([00:04:27](#00:04:27)).

* **Proyecto Alejandro Magno y Modelos de Inteligencia Artificial**: Wagner Duenas comenta que colaboró temporalmente con Raúl para corregir problemas en el flujo del proyecto Alejandro Magno ocasionados por cambios en los modelos de inteligencia artificial ([00:05:59](#00:05:59)). Adicionalmente, Wagner Duenas menciona que interrumpió sus labores para rendir un examen universitario de dos horas antes de retomar la clonación del repositorio de INC ([00:07:11](#00:07:11)).

* **Evaluación de Tecnologías: PHP frente a TypeScript y JavaScript**: Don Freddy y Wagner Duenas debaten sobre la conveniencia de utilizar PHP frente a TypeScript y JavaScript. Mientras Don Freddy sugiere considerar PHP para la interacción con el servidor, Wagner Duenas argumenta que WordPress ya ofrece una abstracción basada en PHP y que migrar el proyecto implicaría reconstruir bases de datos y herramientas de posicionamiento desde cero ([00:08:34](#00:08:34)).

* **Estado del Módulo Stratics y Granularidad de Cargos**: Don Freddy confirma que ya se pueden agregar nuevas empresas, usuarios y asignar módulos específicos en Stratics ([00:11:12](#00:11:12)). Wagner Duenas valida que los cargos del sistema han sido granularizados adecuadamente para permitir una mejor trazabilidad y la creación futura de un panel de control con resúmenes por persona ([00:12:28](#00:12:28)).

* **Propuesta de un Módulo Independiente de Reuniones y Minutas**: Don Freddy propone el desarrollo de un módulo independiente en el CRM para registrar minutas, temas de reuniones y listas de verificación (checklists) ([00:13:28](#00:13:28)) ([00:15:43](#00:15:43)). Wagner Duenas sugiere incorporar filtros para que cada usuario visualice únicamente las tareas que tiene asignadas ([00:14:35](#00:14:35)), mientras Don Freddy enfatiza que el propósito es recolectar los puntos tratados con estados como pendiente, aprobado o en desarrollo ([00:15:43](#00:15:43)).

* **Flujo de Seguimiento de Tareas en Reuniones Periódicas**: Don Freddy detalla la dinámica del nuevo módulo de reuniones, diseñado para registrar temas pendientes que serán revisados en sesiones posteriores, como las programadas para el viernes 4 de septiembre y el viernes 11 de septiembre ([00:17:08](#00:17:08)). Se estipula que el sistema debe enviar notificaciones tanto internas como por correo electrónico a los responsables asignados ([00:18:30](#00:18:30)).

* **Requerimientos y Automatización para el Módulo de Actas**: Don Freddy indica que el módulo incluirá campos manuales para registrar asistentes, departamentos y la opción de exportar un PDF para generar actas de reunión. Ante la sugerencia de integrar la transcripción de Gemini, Wagner Duenas y Don Freddy acuerdan mantener el ingreso manual de datos por el momento para acelerar la entrega ([00:19:58](#00:19:58)).

* **Revisión del Diseño de la Página Principal de INC**: Wagner Duenas muestra los avances locales en el rediseño de la página principal de INC utilizando Elementor para aplicar una plantilla unificada a las páginas restantes ([00:25:21](#00:25:21)). Don Freddy expresa confusión inicial sobre si el trabajo correspondía al documento HTML enviado previamente o a la estructura del sistema ([00:27:50](#00:27:50)).

* **Problemas con el Registro de Pacientes y Datos Duplicados de Medical Center**: Wagner Duenas aclara que el documento de registro de pacientes de Medical Center proviene de tres libros de Excel exportados de un sistema clínico, los cuales contienen datos duplicados ([00:33:12](#00:33:12)). Esto ha retrasado la creación del panel de control y requiere una interfaz específica para resolver dichos conflictos de datos ([00:35:32](#00:35:32)).

* **Estrategia de Justificación de Retrasos y Definición de Prioridades**: Ante los retrasos en los proyectos de INC y Medical Center, Don Freddy propone enfocar la presentación del próximo lunes en el nuevo módulo de actividades y reuniones para justificar el avance semanal. Se decide dejar temporalmente en pausa los módulos problemáticos de Medical Center y los cambios complejos en la página web ([00:41:57](#00:41:57)).

* **Alineación sobre el Módulo de Tareas y Reuniones**: Don Freddy, angie Núñez y Wagner Duenas discuten las confusiones surgidas respecto a las prioridades de desarrollo. Don Freddy reitera que la urgencia actual se centra en finalizar el desarrollo del módulo de seguimiento de reuniones en lugar del sistema de pacientes ([00:44:36](#00:44:36)) ([00:48:04](#00:48:04)).

* **Especificaciones para el Desarrollo del Módulo de Reuniones**: Don Freddy solicita a Wagner Duenas la creación del módulo de reuniones en Stratics para registrar asistentes, temas y estados de los pendientes ([00:49:22](#00:49:22)) ([00:52:06](#00:52:06)). Wagner Duenas advierte que necesita planificar los cambios en la base de datos y definir con precisión los campos requeridos antes de comprometer una fecha de entrega ([00:50:47](#00:50:47)) ([00:53:39](#00:53:39)).

* **Definición de Formatos y Documentación para el Módulo de Reuniones**: Wagner Duenas solicita a Don Freddy que redacte su visión y requerimientos en prosa dentro de un documento de Google Docs para poder planificar el desarrollo y generar un HTML de prueba ([00:56:32](#00:56:32)). Don Freddy se compromete a elaborar dicho documento en un plazo aproximado de una hora ([00:57:34](#00:57:34)).

* **Demostración de Importación de Datos de Medical Center**: Wagner Duenas realiza una prueba local para mostrar el proceso de importación por hojas del archivo de Excel de Medical Center. Wagner Duenas señala que, aunque el sistema procesa la importación de libros, el manejo de datos duplicados hace indispensable contar con una interfaz de resolución de conflictos ([00:58:40](#00:58:40)).

* **Proceso de saneamiento de base de datos de pacientes**: Wagner Duenas explicó que al importar múltiples hojas de datos, el sistema detecta conflictos debido a nombres repetidos o registros similares, por lo que desarrolló un proceso de saneamiento. Este módulo permite identificar duplicados por similitud y decidir si se fusionan los datos para evitar filas repetidas en el panel de control ([01:01:23](#01:01:23)). Asimismo, Wagner Duenas propuso implementar una piscina de direcciones de correo electrónico para un mismo paciente en casos de coincidencias parciales, en lugar de mantener un correo principal y uno alternativo ([01:03:28](#01:03:28)).

* **Problemas de rendimiento del sistema y carga de datos**: Wagner Duenas abordó el problema de la lentitud presentada en el sistema al procesar una carga masiva de aproximadamente 3,000 pacientes según B. Se discutió que, aunque la subida de datos funciona, el sistema experimentó ralentizaciones que inicialmente se atribuyeron a la carga masiva, aunque posteriormente se descubrió que el origen del problema era distinto ([01:04:47](#01:04:47)).

* **Estrategia provisional para el panel de control y llenado de datos por recepción**: Don Freddy sugirió cargar provisionalmente un solo libro de datos para presentar un panel de control funcional a corto plazo. Adicionalmente, Don Freddy planteó la necesidad de instruir al personal de recepción de Medical Center para que realicen un llenado correcto de los campos desde el inicio, minimizando errores en las bases de datos antes de que se suban directamente al sistema ([01:05:46](#01:05:46)).

* **Advertencias de duplicados para nuevos pacientes**: Wagner Duenas propuso y acordó con Don Freddy que, al momento en que la recepción intente guardar un nuevo paciente ingresado manualmente, el sistema emita una advertencia de posible coincidencia buscando en el sistema si el registro ya existe. Wagner Duenas reconoció que este módulo fue inicialmente subestimado debido a necesidades específicas diferentes a las de aplicaciones de genealogía ([01:07:05](#01:07:05)).

* **Presentación de avances y priorización de tareas**: Don Freddy indicó que se pueden presentar los avances actuales enfatizando la limpieza de la base de datos. Don Freddy instruyó a Wagner Duenas para que continúe trabajando en el módulo actual durante una hora más hasta recibir un documento específico, tras lo cual deberá cambiar su enfoque al módulo de reuniones ([01:08:06](#01:08:06)). Respecto a los plazos para los clientes de Medical, se acordó comunicarles que los cambios tomarán de una a dos semanas en implementarse ([01:09:07](#01:09:07)).

* **Gestión de horas de fin de semana, prioridades y comunicación**: Don Freddy y Wagner Duenas conversaron sobre el registro y acumulación de días laborados durante los fines de semana para compensar días libres. Don Freddy exigió mayor orden, establecimiento de prioridades y comunicación constante sobre el estado de las tareas, sugiriendo que angie Núñez apoye en la gestión de tiempos si es necesario ([01:10:11](#01:10:11)). Se acordó el envío de un correo formal a la dirección Freddy@stratic360.com para contabilizar los días acumulados de descanso ([01:12:43](#01:12:43)).

* **Reuniones de desarrollo y coordinación de horarios**: Don Freddy solicitó dar máxima prioridad al módulo de reuniones para tenerlo listo de cara al día lunes ([01:12:43](#01:12:43)). Asimismo, Don Freddy estipuló que las reuniones de desarrollo se programarán para los días martes o miércoles para evitar enterarse de los avances a última hora del viernes, promoviendo un mejor canal de apoyo mutuo entre los participantes ([01:13:47](#01:13:47)).

* **Diseño y control de acceso del módulo de reuniones**: angie Núñez y Wagner Duenas discutieron sobre la interfaz visual y la reutilización de componentes de tablas para el módulo de reuniones, adaptándolo para que las personas usuarias puedan consultar las reuniones por fechas ([01:16:10](#01:16:10)). Wagner Duenas señaló que será necesario implementar controles de acceso estrictos para determinar si las personas usuarias visualizan únicamente las reuniones en las que participaron o un listado general, funcionando de manera similar a los permisos de un servicio de almacenamiento en la nube ([01:17:28](#01:17:28)).

* **Jornada laboral y seguimiento de tareas en el sistema de gestión**: angie Núñez y Wagner Duenas conversaron sobre el estado de su contratación y jornada laboral, así como el uso del sistema de gestión CRM (solution.us) para registrar las tareas realizadas en el mes ([01:18:30](#01:18:30)). Wagner Duenas confirmó que la funcionalidad para editar tareas ya se encuentra implementada en la interfaz, reconociendo que faltó una comunicación oportuna al respecto, y angie Núñez indicó que continuará registrando sus pendientes en la plataforma ([01:19:43](#01:19:43)).

*Revisa las notas de Gemini para asegurarte de que sean precisas. [Obtén sugerencias y descubre cómo Gemini toma notas](https://support.google.com/meet/answer/14754931)*

*Cómo es la calidad de **estas notas específicas?** [Responde una breve encuesta](https://google.qualtrics.com/jfe/form/SV_5bXzKQfylMIhSXc?confid=TjOAM6Ozeu3mRnNISW1kDxIQOBEBMgUIigIgABgBCA&detailLevel=standard&hasImages=False&entryPoint=footerMain&isGoogler=False) para darnos tu opinión; por ejemplo, cuán útiles te resultaron las notas.*

# **📖 Transcripción**

ago 28, 2026

## **REUNIÓN DEVELOPMENT \- Transcripción**

### **00:02:22**

**Don Freddy:** Es necesario colocar cámara.

**angie Núñez:** Ah, no, yo me olvidé de quitarla.

**Don Freddy:** Demasiada aura de Ya tú sabes. Yeah. Hola, hola, hola. No.

**angie Núñez:** Hola. Hola.

**Wagner Duenas:** Hola.

**Don Freddy:** ¿Cómo les va? ¿Cómo le va?

**Wagner Duenas:** ¿Quién? A mí. Ah, conmigo la cosa.

**Don Freddy:** Cuéntame cómo vamos con ese maravilloso.

**Wagner Duenas:** Está de maravilla. Oh, sí.

**Don Freddy:** Tenderemos eso para el diálogo.

**Wagner Duenas:** ¿Qué

**Don Freddy:** A ver,

**Wagner Duenas:** cosa?

**Don Freddy:** Medical Center, pero principalmente principalmente deciones de

**Wagner Duenas:** No sé si es mi señal o no estoy entendiendo nada. tú le entiendas algo.

**Don Freddy:** las

**angie Núñez:** dijo algo para presentar el lunes, pero dijo algo de

**Wagner Duenas:** Ah,

**angie Núñez:** DMC.

**Don Freddy:** yo creo que micrófono.

**Wagner Duenas:** ya.

**Don Freddy:** Ya, ahí. Hola, hola.

**angie Núñez:** Hola. Hola,

**Don Freddy:** A ver, son dos cuestiones. La de el CM de de Stratic es una que no sé si ya le hiciste los cambios que me habías mencionado.

**Wagner Duenas:** Ah, sí,

**Don Freddy:** Por ejemplo,

**Wagner Duenas:** esos ya están des de

### **00:04:27**

**Don Freddy:** editar editar tareas.

**Wagner Duenas:** editar.

**Don Freddy:** Ya se puede ya.

**Wagner Duenas:** Si ya se

**Don Freddy:** Okay,

**Wagner Duenas:** puede.

**Don Freddy:** si ya se puede entonces check ya. ID en

**Wagner Duenas:** Perdón. Estoy trabajando en ello. Estoy, o sea, para no digamos no fregarla, decidí utilizar este trabajar localmente, así como trabajo el CRM localmente antes de mandar los cambios a producción. Encontré la manera de poder traer todo el proyecto de que está en WordPress, traerlo a lo local para trabajarlo y una vez que estén bien hechos los cambios, pues lo mando a producción ahí a al INC.

**Don Freddy:** Vamos a ver. Ya. Okay. Sí, sí,

**Wagner Duenas:** Perdón,

**Don Freddy:** veo que está para editarse. Qué belleza. A ver, en sí todavía no está ya está trabajando.

**Wagner Duenas:** no este, pero eso estoy justo ahora trabajando en ello, o sea, o sea, ahorita no vas a haber cambio, probablemente así en el día, no sé si ahora de tarde o cerca de la noche pueda subir algunos cambios, pero O sea, van a ser, o sea, cuando suba cambio van a haber cambios radicales, o sea, o sea, y basándome en el template que tú me diste, la idea es que yo lo pueda aplicar para todas las páginas restantes, porque si tú ves ahorita, solamente está la home provisional esa que con el nuevo diseño de que aparentemente todo el equipo está enamorado, que Okay.

### **00:05:59**

**Don Freddy:** Ok.

**Wagner Duenas:** Sí, sino que el problema es que tal como está ahora no puedo yo desde desde WordPress va a aplicarlos para todos porque

**Don Freddy:** Sí.

**Wagner Duenas:** sería un trabajo enorme. Entonces, como te comenté el otro día, pues voy a optar por otro camino para que a punta de código pueda sacar los cambios más rápido.

**Don Freddy:** Belleza. cinco tareas no se muestran en el

**Wagner Duenas:** Perdón.

**Don Freddy:** ya yo estoy viendo, sí, estaba viendo primero los cambios que ya habías dicho que se que hiciste de editar. Ya, eso ya está. Si ya está cheverísimo. Medical Center está está en proceso.

**Wagner Duenas:** Sí está. Ah,

**Don Freddy:** Eh,

**Wagner Duenas:** sí, sí está en proceso. Iba a decir en crisis, pero no está en

**Don Freddy:** ya. Y el día de ayer,

**Wagner Duenas:** proceso.

**Don Freddy:** ¿qué avanzaste? Pero el día de ayer creo que estuviste más con lo de Raúl.

**Wagner Duenas:** Estuve un rato con Raúl y Jutiendo sobre esa vaina que bueno, al final, o sea, había unos problemas con el flujo este de Alejandro Magno y ahí bueno, o sea, lo acomodé, pero era un problema con porque resulta que cambiaron los modelos de IA en toda esa vaina.

### **00:07:11**

**Wagner Duenas:** Entonces, ya por ahí también tuve 2 horas de de mi examen de la universidad y luego me puse a a transportar, digamos, la el proyecto que está en producción de de INC, mandarlo al local, o sea, tener una copia local para poder trabajar. Por eso ahí en Stratis, en la cuenta de marketing, ves que hay un nuevo repositorio relacionado a INC.

**Don Freddy:** Ya. Okay. Entonces sí, mira, eso ahí tiene que quedar supercaro cuando ustedes trabajando o apoyando con lo de Raúl, porque él me había dicho, me llamó primero para autorizar el uso de de ya.

**Wagner Duenas:** Eso sí me

**Don Freddy:** Entonces él me dice,"Solo son 10 minutos." Bueno,

**Wagner Duenas:** dio.

**Don Freddy:** ya no hay ningún problema. Pero también yo le dije entonces que no puede entonces no puede tu se llama Steven no no puede el otro desarrollador a hacer ese

**Wagner Duenas:** Ok.

**Don Freddy:** trabajo que tiene que pedirlo.

**Wagner Duenas:** Eh, Jan, no, lo que pasa es que no J, ese fue Yang, o sea, que el otro no es Steve, es Jan. Sí. Bueno, lo que pasa es que ese proyecto lo hice yo, entonces, ¿quién mejor que yo mismo para guiar? Porque ya, o sea, ya no no desarrolló ese proyecto de Alejandro Magna. Entonces, por eso me requerían a mí, porque así podíamos salir de los errores que estaba presentando la aplicación.

### **00:08:34**

**Don Freddy:** Oye, le sabe.

**Wagner Duenas:** ¿Cómo te puedo decir? Bueno, según Raúl está igual de loco que yo, según las palabras de Raúl, pero pero bueno, no sé, yo no he trabajado junto a él para tener un veredicto, decir,"Sí, Jack, J es un crack, pero bueno, pero por ahí vi que la aplicación esta que hizo de VP Monitor está en PHP, así que supongo que va a ser bueno porque, o sea, Mm. tipo domina PHP. Yo, por ejemplo, acá no manejo mucho PHP, la verdad soy más de Typecript y

**Don Freddy:** Oye, yo te había dicho desde el inicio,

**Wagner Duenas:** JavaScript.

**Don Freddy:** a ver si le hacías PHP, creo que era más de una diferencia era creo que estabas trabajando, eso de ahí se trabaja directamente con el servidor lo de

**Wagner Duenas:** ¿Qué cosa?

**Don Freddy:** PHP.

**Wagner Duenas:** No, PHP es un es un lenguaje, o sea, este digamos WordPress es una abstracción que está hecha en base a PHP, pero el problema es que tendría que si yo mudara todo el proyecto ahí en sí a PHP, tendría que construir un montón de cosas que ya eh WordPress ya me da, por ejemplo, el tema este del CEO de posicionamiento, la tener una base de datos, así, todo eso ya te lo da WordPress, entonces tendría que, o sea, ya de hecho construyó esa base, tuvo que poner una base de datos, o sea, Ahí tendría que construir un montón de cosas desde el

### **00:09:56**

**Don Freddy:** trabajar A ver,

**Wagner Duenas:** principio.

**Don Freddy:** trabajar en PHP no es es bueno siempre y cuando tengas que hacer todo lo que me acabas de mencionar, o sea, ya no sería suabase la base de datos, sino netamente en

**Wagner Duenas:** Eh, no, estás confundiendo dos cosas.

**Don Freddy:** PHP.

**Wagner Duenas:** Una cosa es el lenguaje, ya el lenguaje y otra cosa es la base de datos. La base de dat implicaría que tú por tuviéramos que utilizar un host eh qué s. Bueno, en el mejor de los casos,

**Don Freddy:** Ajá.

**Wagner Duenas:** sí, o sea, la base de datos es aparte y la base de datos SQL por,

**Don Freddy:** Ya.

**Wagner Duenas:** bueno,

**Don Freddy:** Okay.

**Wagner Duenas:** depende qué base de datos elijas. Hay post SQL, My SQL, SQL, qué sé

**Don Freddy:** Sí, sí, sí.

**Wagner Duenas:** yo.

**Don Freddy:** Yo me acuerdo porque acá estos manes habían desarrollado en PHP y sí les había salido chévere.

**Wagner Duenas:** M, claro,

**Don Freddy:** Bueno, en ese tiempo no existía la

**Wagner Duenas:** me imagino. Ah, claro.

**Don Freddy:** IA.

**Wagner Duenas:** Sí, eso es que también depende mucho porque bueno, la es muy buena también porque tengo discusiones ahí de sobre qué tecnología sería el mejor de utilizar según el caso y por eso te estoy comentando esto de que yo también pensé por un momento desmontar todo y mandarlo a así a PHP, pero no valía la pena, la verdad, o al menos se fue el veradito hasta

### **00:11:12**

**Don Freddy:** Ya, okay.

**Wagner Duenas:** ahora.

**Don Freddy:** Ya chévere, mira, le hacemos caso a la experta, ya no hay ningún problema.

**Wagner Duenas:** Eh, bueno, no sé. Bueno, yo tampoco es que sea el dueño de la verdad tampoco. Yo a ver qué tengo todavía ni siquiera tengo 2 años de experiencia como programador, pero bueno, pero bueno, estoy aprendiendo, eso sí estoy

**Don Freddy:** Ya, pero bueno, eres el que más tiene experiencia en ese c\*\*\*. Eh, mira,

**Wagner Duenas:** Bueno,

**Don Freddy:** entonces sería la plena que si ya está, cheverísimo. Medical Center. Okay, bacán.

**Wagner Duenas:** eh hay que definir qué se entiende porque con que ya está Stratics, porque depende O

**Don Freddy:** A ver, ya ahorita se hizo lo de lo de editar, que era básicamente lo que me estaban

**Wagner Duenas:** Sí,

**Don Freddy:** pidiendo.

**Wagner Duenas:** digamos que era el mayor dolor de cabeza que tenían actualmente con la primera versión.

**Don Freddy:** Ya. Okay. Yo puedo agregar porque ya sé que puedo agregar nuevas empresas, puedo agregar nuevos usuarios y esos usuarios asignarle un módulo en específico y

**Wagner Duenas:** Eh eh también puedes asignar

**Don Freddy:** bla bla bla. Ya yo digo

**Wagner Duenas:** eh puedes asignar equipos,

**Don Freddy:** que

**Wagner Duenas:** por cierto, por creo que no aparecía el equipo de marketing porque creo que no nombraste equipo.

### **00:12:28**

**Don Freddy:** no todavía no le he metido a eso. No he hecho

**Wagner Duenas:** Ya. Okay. Eh, los cargos. Ah, sí, los cargos, por cierto, ya están.

**Don Freddy:** eso.

**Wagner Duenas:** Si lo hiciste bien. O sea, mi idea es que los granularices, porque la idea es que, por ejemplo, si alguien tiene dos cargos, ya solito el sistema le pone los dos, o sea, lo más granular posible, ¿no? Es que,

**Don Freddy:** Ok.

**Wagner Duenas:** o sea, que vi que, por ejemplo, en la demo había roles tipo lead designer y graphic designer, así con la que utilizas como la inglesa para enlazar los cargos.

**Don Freddy:** Entonces, eso de ahí nada más hay que corregirlo, pero por parte

**Wagner Duenas:** Sí,

**Don Freddy:** mía.

**Wagner Duenas:** es eso es por si acaso es para tener mejor trazabilidad. Por ejemplo, de pronto después tenemos que hacer un dashboard para resumir cuántos cargos ocupa cada persona y así. Entonces, la idea es tenerlos bien granularizados, pero bueno.

**Don Freddy:** Bueno,

**Wagner Duenas:** Bueno, veo que sí lo sí lo sí lo has puesto bien,

**Don Freddy:** eso está bien.

**Wagner Duenas:** entonces no tengo problema con

**Don Freddy:** Okay, está bien. Perfecto.

**Wagner Duenas:** eso.

### **00:13:28**

**Don Freddy:** Ya. Entonces, a ver, en estrat faltaría el apartado de social media que tú me habías recomendado que no esté ahí, sino que esté como un módulo independiente.

**Wagner Duenas:** Hm.

**Don Freddy:** Yo digo que sí.

**Wagner Duenas:** Y de hecho el módulo de tarea posiblemente se vuelva también un módulo asignable para cualquier otro departamento, o sea, de momento está exclusivamente para est y de hecho

**Don Freddy:** Ah, ya te acordaste lo que te iba a pedir.

**Wagner Duenas:** este

**Don Freddy:** A ver,

**Wagner Duenas:** cosa

**Don Freddy:** ¿te acuerdas que te había mencionado y creo que te pedí y te envié primero el HTML, te envié de las tareas? No, no.

**Wagner Duenas:** no fue eso fue de medical. Sí, ese medical todavía es un es todo un caso medical. Ese fue el dashboard para

**Don Freddy:** No, ese de ahí no fue para actividades,

**Wagner Duenas:** médica,

**Don Freddy:** para las reuniones,

**Wagner Duenas:** no me acuerdo. Es o no me enviaste nada. Déjame ver.

**Don Freddy:** por favor.

**Wagner Duenas:** Pero, ¿qué? ¿Me lo enviaste por WhatsApp o por correo? Ah, de razón que no que me voy a acordar. Lo que me acuerdo es el gato con la pistola que todos los días

**Don Freddy:** Estaba

**Wagner Duenas:** como ah,

### **00:14:35**

**Don Freddy:** cansísimo.

**Wagner Duenas:** no sé, la verdad tengo sentimientos encontrado con ese

**Don Freddy:** Ah, okay, okay. Mía culpa.

**Wagner Duenas:** sticker.

**Don Freddy:** No te he enviado lo de las actividades porque te acuerdas que estábamos definiendo este asunto, pero te lo mencioné, pero no te envié el HTML que era prácticamente prácticamente

**Wagner Duenas:** Eh, claro. M. y no sería bueno todavía enviarlo todavía, o sea, de momento el módulo de tareas todavía tiene, o sea,

**Don Freddy:** hacer

**Wagner Duenas:** tiene espacio para mejoras. Por ejemplo, faltaría poner filtros para que cada uno solo vean las tareas que se le han asignado a a, o sea, por ejemplo, yo entro y que solo yo pueda tener, puedo aplicar un filtro para ver solo las tareas que se me han asignado a mí, podría es una mejora que te puede agregar. Entonces, no sé, digo yo,

**Don Freddy:** Sí,

**Wagner Duenas:** yo

**Don Freddy:** pero pero tendríamos que tendrías que sacarlo de ahí porque ese módulo,

**Wagner Duenas:** dime,

**Don Freddy:** ese módulo, mira, básicamente no, a ver, la idea es tener un módulo independiente para que cualquiera que ingrese, ya sea medical research, igual ese módulo esté ahí. Ya,

**Wagner Duenas:** eh,

**Don Freddy:** el módulo es el módulo,

**Wagner Duenas:** sí, claro,

**Don Freddy:** el módulo es básicamente de recolectar

### **00:15:43**

**Wagner Duenas:** Pero

**Don Freddy:** eh una especie de minutas o hacer un checklist de las reuniones que uno está asistiendo. Ya,

**Wagner Duenas:** eso es otro tema

**Don Freddy:** por eso es que yo te Sí, yo ya por eso es que yo te mencionaba el asunto de de las prácticas de FQM,

**Wagner Duenas:** ya.

**Don Freddy:** pero ojo, a ver, por ejemplo, es nada más de un registro de de lo que se está hablando eh a través de temas y colocar checklists, ya colocar checklists, por ejemplo, ahorita estamos teniendo una reunión y esta reunión comenzó a las 12, entonces se le se le agrega el tema de la reunión.

**Wagner Duenas:** Ya,

**Don Freddy:** bla bla bla en el CRM es en el módulo de de de

**Wagner Duenas:** pero eso no lo hace la transcripción

**Don Freddy:** Mixing. Puede ser eso, pero la cuestión es que Gemini luego no se enlaza con la reunión anterior, entonces tienes que igualmente descargarlo y hacer el trabajo manual. Entonces acá lo que haces es, puedes hacer dos cosas, pero yo primero estoy haciendo de que se vayan anotando los temas principales y esos temas principales ir colocándole si está pendiente, aprobado o en desarrollo o postergado, lo que sea,

**Wagner Duenas:** Ah,

**Don Freddy:** ya oro por tema,

**Wagner Duenas:** okay.

**Don Freddy:** ¿ya? Entonces, ¿qué pasa?

**Wagner Duenas:** Creo que ya entiendo la idea.

### **00:17:08**

**Don Freddy:** Ahorita ya, mira, ahorita estamos hablando, estamos conversando, estamos en la reunión a las 12, la reunión es de desarrollo de actividades de desarrollo, ¿ya? Entonces, en esta reunión que estamos CRM de Stratic y

**Wagner Duenas:** Mhm.

**Don Freddy:** y lo que se trabajó, entonces el checklist o o el o el peline de de esa tarea está en proceso todavía, por decirlo así, no está finalizado. Entonces, el otro tema que estuvimos conversando es de Medical Center, del módulo de Medical Center. Ese todavía sigue en proceso. Okay. Entonces ahí se le pone cuándo se va a entregar,

**Wagner Duenas:** Aha.

**Don Freddy:** si hay algún tipo de anotación adicional, si hay algún tipo de responsable. Listo, cerramos esa reunión,

**Wagner Duenas:** Yeah.

**Don Freddy:** pero esa reunión no da por finalizada. ¿Por qué? Porque es reunión todavía tiene pendientes que se hablaron y no se finalizaron. Entonces, de aquí llega el próximo viernes que vamos a tener otra reunión y vamos a revisar eh en en nuestro módulo de de reuniones y vamos a ver que quedan estos dos temas que se conversaron. Entonces ahí vamos a verificar, okay, ya tuviste una semana para haber trabajado eso, en qué estado está, okay, ya lo entregaste, lo damos por finalizado y se cierra esa ese ese tema de reunión.

### **00:18:30**

**Don Freddy:** Listo. El siguiente, todavía nos falta por entregar el CRM de Medical. Okay. Entonces, vamos a colocarle un nuevo una nueva fecha de entrega. ¿Para cuándo será? Asíismo le colocamos el estado. El estado puede estar todavía en proceso o postergado dependiendo. Ya. Entonces, cerramos esa reunión de la próxima semana del viernes. A ver, que estamos del viernes 4\. Entonces de aquí viene ya próximo próximo viernes. Ya estamos en el viernes 11 de septiembre. Eh, y ahí revisamos todavía ese checklist porque tiene todavía una tarea pendiente y recién en esa en esa semana ya se le da por finalizado. Pero ojo, nosotros ya habíamos iniciado una nueva reunión porque obviamente ya tiene tenemos otro tema o simplemente en la misma reunión se van agregando se va agregando las nuevas tareas acorde a las fechas. ¿Ya? Entonces, eso nada más y lo que si tiene que notificar y ojalá se pueda y yo creo que sí es que cada vez que se agregan responsables tareas hay que colocar hay que colocar un tipo de notificación, ya sea una notificación. Yo sé que ahorita están llegando las notificaciones aquí en en el CRM porque cuando me asignaron una tarea me llegó una notificación, pero también tendría que llegar una notificación al correr así como que te han asignado esta tarea,

### **00:19:58**

**Wagner Duenas:** No.

**Don Freddy:** está pendiente y bla bla bla. Listo. Eso de ahí no no no no tiene nada más nada más cosas. Ya después vemos si se enlaza ese módulo de de las reuniones a lo de las tareas ahí hasta ahí. Entonces,

**Wagner Duenas:** Eh,

**Don Freddy:** eso es lo que yo te había mencionado ese día, que no te la desarrollé porque estaba buscando ese documento de FQM,

**Wagner Duenas:** Eh,

**Don Freddy:** que es básicamente llenar llenar campos, eh llenar los integrantes de la reunión, eh va a estar Javier, o sea, ya llenar ahí por seteado quiénes están en el qué departamento, con qué departamento estamos reunidos, bla bla bla bla bla bla. Ya, eso es eso y luego tener un un botoncito en el cual se pueda descargar descargar de lo que se habló, de lo que está por por todavía por pendientes para que después se levante una especie de acta de reunión y esa acta de reunión la puedan firmar. M. virtualmente o lo que sea las personas que estuvieron en Word CL. Entonces, ese es el módulo que no sé si cuántos días, cuánto tiempo te va a llevar siempre y cuando yo te pase la HTML o la idea.

**Wagner Duenas:** La idea puede ser, pero el HTML no tampoco tengo una bola de cristal para decirte que que va a estar en qué s yo, en dos días o algo así porque bueno, eh no puedo, o sea, la idea está muy bonita y todo, pero tengo que pensar cómo se va a integrar esos requerimientos.

### **00:21:30**

**Wagner Duenas:** O sea, a mí lo que se me ocurre es que lo que tú quieres en el fondo, o sea, lo que se quiere es una automatización tal que cuando te llegue la transcripción de Gemini y ya tenerla almacenada en el CRM y que a partir de un proceso de automatización que s identifiquen las próximas

**Don Freddy:** Oh.

**Wagner Duenas:** tareas o o se identifique

**Don Freddy:** No, no,

**Wagner Duenas:** qué.

**Don Freddy:** no involucres a Gemin todavía porque después te vas a

**Wagner Duenas:** Entonces,

**Don Freddy:** demorar.

**Wagner Duenas:** ¿cómo vamos a obtener la la minuta la transcripción o o lo piensan hacer a mano?

**Don Freddy:** Lo piensan tipiar, por eso es la cuestión. Lo piensan tipiar.

**Wagner Duenas:** Pero tipar, o sea,

**Don Freddy:** Ya después se agrega eso,

**Wagner Duenas:** alguien se va a tomar el tiempo de escribir eso a mano.

**Don Freddy:** eso lo va a hacer r prácticamente. Ya. Por eso es que yo te digo que todavía no integres, porque Gemini puede ser para una actualización después, salvo que tú me digas que lo puedes hacer ya. Y ahí sí, ya chévere, bacán, se ahorran bastantísimo, pero pero Gemini te lo da el documento ya después de que finalizó la

**Wagner Duenas:** Ya.

**Don Freddy:** reunión y y esa y esa cuestión tiene que ser ahí en el momento en vivo.

### **00:22:37**

**Wagner Duenas:** Hm. Bueno,

**Don Freddy:** Mira, la chamba la va a hacer R por el momento.

**Wagner Duenas:** este tengo que pieno o el tema

**Don Freddy:** La va a hacer ya el

**Wagner Duenas:** de anotar.

**Don Freddy:** código.

**Wagner Duenas:** Ah, el código. Ah,

**Don Freddy:** Por eso es que por eso es que yo te mencionaba eh este de aquí, este módulo no se va a conectar todavía con ninguno,

**Wagner Duenas:** bueno.

**Don Freddy:** ni con el CRM ni no. Primero hay que presentar ya que otro está ahí que está aceptando datos, está recopilando datos, está generando PDF de del acta de la reunión y también se están llenando datos.

**Wagner Duenas:** M.

**Don Freddy:** Posterior a eso hay notificaciones y ya después nos vamos a ir puliendo, pero la idea es presentar ya qué se está haciendo, que se está haciendo ese trabajo y que se y que se puede después mejorar todavía. Ya. Entonces, eso es de llenar datos manual a

**Wagner Duenas:** Eh,

**Don Freddy:** mano.

**Wagner Duenas:** tengo mi duda de que lo vayan a utilizar realmente, pero bueno, está bien.

**Don Freddy:** Entonces, mira, yo te voy a pasar igualmente cómo cómo

**Wagner Duenas:** Pásame,

**Don Freddy:** sería.

**Wagner Duenas:** pásame el documento porque si si pasarme el HTML y vamos.

**Don Freddy:** Yo te paso,

**Wagner Duenas:** Pero

### **00:23:52**

**Don Freddy:** yo te paso todo porque el documento el documento en sí es prácticamente ente eh ya el documento impreso del el programa que habíamos usado,

**Wagner Duenas:** Pero

**Don Freddy:** que es un programa en PHP, ¿ya? Eh,

**Wagner Duenas:** sí,

**Don Freddy:** ya eso y nada más vas guardando y recordatorio,

**Wagner Duenas:** a ver.

**Don Freddy:** por eso se me hace más fácil. Te voy a pasar las dos, el documento y el HTML para que lo tengas ya más o menos algo. Y lo agregas así como un módulo independiente ahí debajo de debajo del directorio,

**Wagner Duenas:** que

**Don Freddy:** debajo de adm, no sé, lo tengas

**Wagner Duenas:** es un módulo más el orden donde esté ubicado los de menos.

**Don Freddy:** ahí.

**Wagner Duenas:** Okay, pero bueno, ahí tengo que ver qué qué hago con eso. Pero no te puedo decir esto va a estar mañana o algo porque bueno, primero tengo que terminar en sí ahí no sé. Ah, sí, todavía falta el tema del de la automatización, de generar reporte, mejorar la tarea, por ejemplo,

**Don Freddy:** Mira, puedes puedes presentar. Déjame ver el chat que tengo con Javier.

**Wagner Duenas:** Entonces,

**Don Freddy:** Ya puedes presentarme ahorita lo de En para ver si es que lo dejamos pausado y haces el de las tareas, el de las rales.

**Wagner Duenas:** ¿cómo presentaron?

### **00:25:21**

**Don Freddy:** a presentar lo que lo de que me dijiste que estás trabajando en local en

**Wagner Duenas:** que todavía está diseñando. Se puede casi estoy literalmente codificando esta vaina.

**Don Freddy:** cos.

**Wagner Duenas:** Espérate, no, no empezace mucho. A ver, este ya te lo presento. A ver, ¿dónde? Déjame ponerme otro usuario. ¿Dónde estaba el link? Se me perdió el link. Ah, no lo encuentro. A ver. Me equivoqué. ¿Me ayudas con el link? Porque me metí otra reunión que no era o si es esta.

**angie Núñez:** Sí, dice un usuario no confirmado,

**Don Freddy:** A ver.

**Wagner Duenas:** Ser entonces.

**angie Núñez:** dice

**Don Freddy:** agregado.

**Wagner Duenas:** A ver.

**angie Núñez:** cargando.

**Wagner Duenas:** Ah, ya.

**Don Freddy:** está conectando.

**Wagner Duenas:** Chévere. Espérate, se me perdió el Ay, caramba. Bueno, esta es la versión en local. Mira, si te fijas, este es el local host, o sea, estoy trabajando a partir de la versión de Elementor ahí para aplicar lo que me diste de plantilla el otro día, que actualmente está en la en la parte de se me perdió la vaina en la parte esto de aquí.

### **00:27:50**

**Wagner Duenas:** Esto aquí lo voy a, o sea, voy a hacer el rediseño basado en esta plantilla, pero que aplique para todas las páginas, porque si tú te fijas actualmente te vas a ory, eh, mira, estás con el diseño anterior, entonces todo esto va, o sea, sale mejor programarlo en código para que, digamos, este hero cambie para todo.

**Don Freddy:** Vale.

**Wagner Duenas:** Si lo cambio para home, cambia para todo. Mira. Entonces, básicamente eso. Eh, se me perdió el local host. Ya, este es el local host. Mira, esto está en local, no está en producción. Entonces, estoy haciendo los cambios a partir de esto para que aplique todo. Aló.

**Don Freddy:** Me he quedado sorprendido Porque creo queado. A ver, entonces estás trabajando lo que es N en C en sí o XIE

**Wagner Duenas:** Claro, pues este, o sea, integrar todo a partir del código.

**Don Freddy:** pensar que estamos trabajando en sí el sistema.

**Wagner Duenas:** ¿Qué sistema?

**Don Freddy:** Yo te pasé el HTML. Esa sí te pasé.

**Wagner Duenas:** Ya me perdí.

**Don Freddy:** Sí.

**Wagner Duenas:** M. Aló. ¿Qué pasó? Se no

**Don Freddy:** Cuéntame qué pasó.

### **00:31:40**

**Wagner Duenas:** sé que no entiendo por cuál es tu inquietud.

**Don Freddy:** Oye, pero estaba trabajando otra cosa. Pues a ver,

**Wagner Duenas:** No, no entiendo. Pues eso es lo que no entiendo. ¿A qué otra cosa te

**Don Freddy:** revisa, revisa, revisa el WhatsApp que te envié el HTML.

**Wagner Duenas:** refieres?

**Don Freddy:** Ahí te envié lo de lo que hay que trabajar de Había que trabajar de MC.

**Wagner Duenas:** No entiendo, pero el el único HTML referente a INC es este diseño que me enviaste el otro día, que tuve que pegarlo de improviso para poder salir del apuro que tú decías de INC. Esto de aquí es lo único referente a eso. ¿A qué te refieres?

**Don Freddy:** Ya,

**Wagner Duenas:** No

**Don Freddy:** mira eso de ahí,

**Wagner Duenas:** entiendo.

**Don Freddy:** ya eso de ahí digamos que eso ya está aceptable, hay elogios, hay premios,

**Wagner Duenas:** Ya,

**Don Freddy:** tenemos eso de ahí

**Wagner Duenas:** pero

**Don Freddy:** ignor,

**Wagner Duenas:** ya no

**Don Freddy:** a ver,

**Wagner Duenas:** entiendo. Ahora sí ya me perdí.

**Don Freddy:** Sí, le había dado Ah, claro,

**Wagner Duenas:** C'est

**Don Freddy:** te lo envié el viernes anterior. Aquí te estoy colocando un punto y arriba te enví la base de datos.

### **00:33:12**

**Wagner Duenas:** A ver, déjame ver. Dice,"Pero ese es otro,

**Don Freddy:** Hm.

**Wagner Duenas:** pero eso es otra cosa." Pues eso es el módulo este de, ¿cómo se llama? De de Stratix.

**Don Freddy:** No, eso es en sí.

**Wagner Duenas:** Te voy a llamar ese. Déjame ver.

**Don Freddy:** Ábrelo,

**Wagner Duenas:** Eso era, eso era el módulo de médica que te dije que todavía tengo problemas,

**Don Freddy:** ábrelo.

**Wagner Duenas:** que era para era este documento que tú dijiste del registro de paciente. Era este documento, te muestro el

**Don Freddy:** Que yo te había pasado un Excel.

**Wagner Duenas:** Sí, pero eso era para

**Don Freddy:** Es

**Wagner Duenas:** estrat web de

**Don Freddy:** no,

**Wagner Duenas:** C.

**Don Freddy:** eso es eso sí. Ahí ahí clarito está.

**Wagner Duenas:** ¿Cómo? No

**Don Freddy:** Y te envío un audio también el día

**Wagner Duenas:** entiendo.

**Don Freddy:** viernes

**Wagner Duenas:** Sigo sin pillarlo, pero bueno, espérate. ¿Dónde está la esa vaina

**Don Freddy:** ya. Mira, realmente realmente creo que estamos todavía e estamos atrás muy

**Wagner Duenas:** de

**Don Freddy:** atrasados ya, pero yo ahorita estoy buscando soluciones para poder justificar este atraso.

**Wagner Duenas:** Pero es que a ver ese, a ver, ya te envío este.

### **00:34:30**

**Wagner Duenas:** A ver,

**Don Freddy:** Ya, ya, ahorita,

**Wagner Duenas:** déjame ver.

**Don Freddy:** ahoritas, ahoritas, ahorita si hubiese sido la reunión de presentación de del sistema de MC, ahí sí, ahí sí yo no sabía qué decir. Me tendría que inventar

**Wagner Duenas:** Es que no es que yo entendí que eso era parte de medical, que era una tabla que tenías que subir. Este es esta cosa de aquí.

**Don Freddy:** algo.

**Wagner Duenas:** Ya. Ay, pero bueno, a ver, déjame ver. Y que esto yo había entendido que era un dashboard lo de lo del HTML que me enviaste, que tenía que corregir el dashboard. Es esto de aquí, esto esta es la tabla que me enviaste el viernes. Esto de aquí. Son tres son tres tres hojas y la idea era subirlo,

**Don Freddy:** Exacto. Mhm.

**Wagner Duenas:** según yo entendía, había que subirlo acá el registro de pacientes y esto de C HTML que no,

**Don Freddy:** Mm.

**Wagner Duenas:** la verdad que no me dio el tiempo para hacerlo porque todavía tengo que corregir cosas del registro de pacientes para yo poder a partir de ese registro poder diseñar el dashboard.

**Don Freddy:** Okay. Puedes compartir el

**Wagner Duenas:** Esto la no sé,

**Don Freddy:** HTML.

**Wagner Duenas:** ni siquiera lo ha abierto.

### **00:35:32**

**Wagner Duenas:** Espérate, ya te lo

**Don Freddy:** ¿Qué pasa? No me diga.

**Wagner Duenas:** dejo,

**Don Freddy:** ¿Qué está pasando? Mucho ánime están viendo corajos. Belleza. ¿Qué?

**Wagner Duenas:** seguro.

**Don Freddy:** Hermos.

**Wagner Duenas:** Ya, pero este es otro ya, pues este es otro trabajo. Pues yo estaba con el trabajo este de ¿cómo se llama? de este módulo de medical.

**Don Freddy:** Mira, yo ya no te voy a decir. Te voy a decir que pongas los audios porque ahí estaba la explicación. Eh, a ver, ahorita déjame pensar y ayúdenme a pensar, Wagner y Angi,

**Wagner Duenas:** Pero es que es que me confundiste porque yo pensé que el registro

**Don Freddy:** ayúdenme a pensar cómo justificar que no

**Wagner Duenas:** de paciente era en el en el CR, después no en el módulo de no en la página web de de C. Y esto tiene y esto tiene varios problemas porque esos tres esas tres hojas tienen datos duplicados. Bueno, no sé si eso vaya a ser bueno, supongo, pero y segundo, ¿dónde se supone que va esto de que en alguna que en alguna sección de la de la homepage o cómo cómo llegó a esto?

**Don Freddy:** Espérate, espérate. Estoy canalizando primero las

### **00:36:45**

**Wagner Duenas:** Porque esta página para empezar es una esto es una página de presentación este o sea para registrar

**Don Freddy:** excusas.

**Wagner Duenas:** paciente. Ay, Dios mío.

**Don Freddy:** Ya. A ver, a ver. Tiene, mira, déjame respirar.

**Wagner Duenas:** Creo que estás mezclando dos cosas porque en como tal es una página de presentación,

**Don Freddy:** A ver,

**Wagner Duenas:** no es para est menesteres.

**Don Freddy:** ya yo creo yo creo que a partir de hoy te voy a comenzar a enviar correos electrónicos muy muy detallados, tareas que tienen que estar en estrat en en ya esas son dos

**Wagner Duenas:** Sí, pero

**Don Freddy:** soluciones internas ahorita ahorita es para que Angi esté al tanto y Angi también te pregunte cómo van las vainas ya. solucionada esa parte de comunicación. Eh,

**Wagner Duenas:** registra de paciente, pero

**Don Freddy:** ahora, ahora volviendo a este tema, son tres tareas de las cuales no voy a no voy a repetir,

**Wagner Duenas:** Todo.

**Don Freddy:** obviamente porque yo te envié los audios, pero a ver, canalizando, canalizando porque realmente si ahorita hubiese sido la reunión, nos íbamos a al más allá. Nos vamos al más allá. A ver, a ver, a ver, a ver. Colocando excusas. Colocando excusas.

### **00:38:02**

**Don Freddy:** No importa. Eh, este módulo de aquí que tú ves de registro de pacientes, eh, te pasé el HTML, te pasé los audios, las explicaciones, viernes 21 de agosto, ya no hay ningún problema, no se hizo. O sea, si hay problemas, pero no se hizo. La cuestión es que este es el módulo de sí, ya tranquilamente transcripción de los audios que también ahí está toda la huevada. Ahora no es el fin del mundo. Yo yo digo que no es el fin del mundo porque estoy pensando positivamente y estoy pensando en también no hacer quedar mal a nadie, sino es que a ver, este módulo tranquilamente, este módulo que estamos viendo ahorita en las pantallas compartidas es en sí. Eso es en sí. Ya en sí eso.

**Wagner Duenas:** Ya.

**Don Freddy:** Listo. Lo que está en Stratics,

**Wagner Duenas:** No.

**Don Freddy:** y te lo había mencionado, lo que está en Stratic, en CM Stratics, ya ese de ahí se puede borrar, se puede eliminar, lo que sea, no hay ningún problema, pero este de aquí es el que vale. Lo único que faltaría es agregar desde mi desde mi visión agregar el registro acorde a las a los campos que están en el en el Excel, en el documento de Excel que te pasé. En el documento de Excel hay tres libros, ¿ya?

### **00:39:23**

**Don Freddy:** De esos tres libros son descargados de una base eh de un sistema clínico que ellos manejan. Ya son tres bases. Por eso es que han hecho un solo Excel, pero han especificado en la pestaña uno que se llama Inclip Word. De ahí se extrajo esos datos. No hay más. No hay, no hay historial clínico, no hay si ese paciente padece de algo, bla bla bla. Ese módulo de MC tiene que estar reemplazado eh por el que estado actualmente de SRM de en el en el ya en su módulo de medical. Lo que está en medical tiene que ser reemplazado por listo. Ese esa esce, okay, no se hizo, dejémoslo ahí. No se hizo. La página web que está que me mostraste y que has estado trabajando en el

**Wagner Duenas:** Mhm.

**Don Freddy:** asunto vendedor comercial, el el que ya tenemos montado funciona. Funciona. Está funcionando. Está muy bien. No, el local, el el que ya está montado.

**Wagner Duenas:** Pero no está no está bien diseñado porque,

**Don Freddy:** El que ya está montado ya.

**Wagner Duenas:** o sea, literalmente es una home quemada con el resto de el resto básicamente con la versión anterior porque en maquetar es una tarea agonizante, o sea, no no puedo hacer yo un cambio acá y que aplique para todo eso.

### **00:40:51**

**Wagner Duenas:** No, no se puede hacer con elementos.

**Don Freddy:** Ya. A ver, a ver, escúchame primero, primero eh, vuelve a Leny, a Lenis. No, al local. Ya. Listo. Ahora, ¿cómo vamos a salvar esto? ¿Cómo vamos a salvar esto de aquí de MC Medical?

**Wagner Duenas:** Ô

**Don Freddy:** A ver. Primer punto, este de aquí ya tiene felicitaciones y tiene sus logros y tiene la persona que lo hizo. Yo mencioné que fue Wagner, que es un ingenio de la programación, bla bla bla. Me lo preguntaron todo el mundo, ya, okay, vamos a obtener un premio por eso, no hay ningún problema. Tal cual como tú lo estás viendo ahí, yo sé que tú internamente tu consciente dice,"No, es que nuestro mal diseñado." Okay. Pero para la persona común y corriente como yo, que que va a la tienda, hace sus compras directo o va un centro de salud solo porque le dio fiebre, no me voy a poner a verificar si este trabajo realmente tiene los parámetros que está que que un desarrollador o una agencia de marketing está haciendo,

**Wagner Duenas:** Es que es que no se trata de parámetro,

**Don Freddy:** ¿no? Ya. Okay.

**Wagner Duenas:** es simplemente una consistencia. Mira,

### **00:41:57**

**Don Freddy:** Sí,

**Wagner Duenas:** te vas a otra.

**Don Freddy:** sí, Pero escucha, escucha, el cliente no me va no me va a estar buscando eso todavía. No,

**Wagner Duenas:** Yeah.

**Don Freddy:** ya todavía no. Entonces estamos salvados por parte del sistema de sí está salvado tranquilamente. Está en desarrollo la parte de desarroll de corrección de la página web como la estamos viendo ahorita, eh está ahí y se va a actualizar de aquí a un a un mes ya. Okay, salvado. Digamos que hasta ahí está salvado la situación y cómo yo lo puedo plantear ante los dueños. Ya vuelvo y repito, NC, Encina NC.

**Wagner Duenas:** Bueno,

**Don Freddy:** Health tranquilamente funciona y si no hay un pervínculo, me van a pasar a mí eh el problema y luego se soluciona. Ahorita no nos vamos a hogar en un vaso de agua. El que tiene que salir para poder presentarse algo el día lunes trabajando,

**Wagner Duenas:** No va a estar para el uno.

**Don Freddy:** ya no va a ser estos dos estas dos estos dos que me acabas de presentar ni Ency ni los que estás corregendo en local, ni el ni el software, el desarrollo de pacientes del módulo de NC,

**Wagner Duenas:** He.

**Don Freddy:** ya eso de ahí no se va a presentar. Lo que se va a presentar es el módulo de actividades de tareas.

### **00:43:28**

**Don Freddy:** Este se va a presentar y yo digo que esa de ahí va a ser como quien dice nuestro justificativo de la semana y listo.

**Wagner Duenas:** Claro.

**Don Freddy:** Porque el resto ya está, el resto ya existe, Wagner. El resto yo le puedo meter labia a a a cualquier persona. Le digo,"Mira, esto está ahí y ya justificado.

**Wagner Duenas:** E

**Don Freddy:** Wagner lo puede hacer. lo hizo, lo hizo. Las actualizaciones vienen después, pero hasta ahorita, hasta ahorita el que hay que levantar y ya como un grado de prioridad es ese asunto de las actividades, de la de las reuniones, de de lo que conversamos ahorita ya ya olvídate de eso porque ya

**Wagner Duenas:** Eso de ahí. Eso.

**Don Freddy:** ahorita ya ya estamos

**Wagner Duenas:** ¿Qué cosa? Estamos muy tarde de esto.

**Don Freddy:** de eso sí. Si tú si tú quieres hazlo, no ten ningún problema,

**Wagner Duenas:** No sé.

**Don Freddy:** pero pero me preocupa más el me preocupa más el de las actividades.

**Wagner Duenas:** Pu de

**Don Freddy:** Realmente si tenías dudas o tienes dudas durante la semana,

**Wagner Duenas:** la ¿Cuál es activa?

**Don Freddy:** pregunta, escríbele a escríbeme a mí,

**Wagner Duenas:** A ver, de las actividades.

**Don Freddy:** preséntame.

**Wagner Duenas:** ¿Cuál te refieres con te refieres de las tareas?

### **00:44:36**

**Don Freddy:** Ya.

**Wagner Duenas:** Espérate que estoy, espérate,

**Don Freddy:** El

**Wagner Duenas:** estoy mariado con tantaña. A ver, a ver, a ver, a ver. y el de las

**Don Freddy:** ahorita ahorita no vamos a crucificar a nadie,

**Wagner Duenas:** actividades.

**Don Freddy:** a nadie porque realmente no es mi intención estar echándole el muerto a nadie y como ustedes saben, yo no le voy a estar echando la culpa a nadie. Esto es un trabajo en equipo.

**Wagner Duenas:** No.

**Don Freddy:** Si no se hizo ya. M. Hay que buscar soluciones. A ver,

**Wagner Duenas:** A ver,

**Don Freddy:** ¿y cuál cuáles son tus tareas, Wagner?

**Wagner Duenas:** actividades te refieres con actividad te refieres a tareas

**Don Freddy:** Ahí ya. Eh, a ver, a ver, a ver, antes de todo, dime qué es lo que tú estás pensando o cómo tú lo entendiste. No sé si Angi igualmente tienes alguna duda o cómo tú lo entendiste, Angi, también o o qué pasó.

**angie Núñez:** No, o sea, o sea, tengo algunas dudas en sí, pero es que bueno, siento que solamente estoy como que viendo una parte de la historia porque no tengo así como que todo el contexto.

**Don Freddy:** Ya. Okay. Mira, la cuestión es que Wagner estaba trabajando una cosa que que es la página web, le estaba dando como que estaba ajustándolo y todo eso de la forma local que quiere decir en su

### **00:45:52**

**Wagner Duenas:** Eh,

**Don Freddy:** computadora personalmente en su equipo. Todavía no estaba montado ya. Ahora él estaba trabajando una cosa que no tiene prioridad en mi sentido, mi buen sentido de de palabra. Yo pensando que él estaba trabajando ese módulo que acabamos de ver ahorita que es el registro de pacientes.

**angie Núñez:** H

**Don Freddy:** Ya ese módulo pensé que él estaba trabajando,

**Wagner Duenas:** Mm.

**Don Freddy:** pero no lo está trabajando. Ya. Okay.

**Wagner Duenas:** Si lo trabajé o o el que yo pensé esto de aquí es que a ver qué este es

**Don Freddy:** No hay ningún no hay ningún problema.

**Wagner Duenas:** un diseño ya este era el que yo entendí por registro de

**Don Freddy:** Sí, pero como nosotros, a ver, como nosotros es, a ver,

**Wagner Duenas:** paciente.

**Don Freddy:** eso que vemos ahorita en pantalla, el que es Medical Center, IPA, rayita IPA, ya todo ese módulo se puede ir y ser reemplazado por el nuevo el nuevo de pacientes que acabamos de ver. Ya, el ese ese

**Wagner Duenas:** Ok. Pero eh un tanto o sea no va,

**Don Freddy:** ya

**Wagner Duenas:** o sea, tal como lo ves ahí no va a quedar. Primer lugar,

**Don Freddy:** no no importa. La la cuestión es que me suba esos datos que ya te pasé en un Excel,

**Wagner Duenas:** segundo

### **00:46:59**

**Don Freddy:** que son datos reales, que me los suba y que las personas igualmente puedan ir registrando ir registrando estos nuevos datos ya eh del equipo,

**Wagner Duenas:** con personas del equipo o pacientes. Este,

**Don Freddy:** el front,

**Wagner Duenas:** ah,

**Don Freddy:** el asistente,

**Wagner Duenas:** esta parte, esta parte la está avanzada.

**Don Freddy:** el que está en recepción

**Wagner Duenas:** Esta esta lógica de aquí está avanzada. Ah, lo que no entendí. A ver, segmentos. Ya, esto es dashboard este alcanzable segmento. Esto de aquí dice lista armada de no sé dónde saca est estos datos, pero bueno, eso tengo que ver. Pero este panel, este panel como tal, sí, eso es vista,

**Don Freddy:** Das

**Wagner Duenas:** pero es que me extraña porque yo pensé que era que lo yo no sé si es que esto es lo que me confunde a mí, porque yo pensé que esto me esto iba dentro de INC, o sea, y no puede ir dentro de INC porque INC es una página de presentación, no es para que alguien de que Ya,

**Don Freddy:** No, no, no.

**Wagner Duenas:** pues eso es lo que me confundiste, por eso eh y acá dice medical y yo entendí que Yeah. mejor eh era arreglar esta tabla y no y resulta que no fue un copy paste de de ¿cómo se llama?

### **00:48:04**

**Wagner Duenas:** El módulo de research porque es, a ver, este libro tiene un problema y es que los muchos de los pacientes están repetidos, entonces eh hay que hay que poner una interfaz de resolución de conflictos para este desambiguar datos y cosas así. Entonces, todo eso me tomó el tiempo, me tomó un fin de semana arreglarlo y todavía me queda trabajo pendiente solo de esa parte. Ahora el de dashboard simplemente no me dio el tiempo para hacerlo, o sea, y todavía quedo pendiente porque luego entró la prioridad de resolver el tema esto de las tareas, del módulo de tareas y bueno y ahora, bueno, ahora toca, supongo que atender

**Don Freddy:** Ya. A ver, vamos,

**Wagner Duenas:** esto.

**Don Freddy:** vamos por prioridad. Este de aquí vamos a dejarlo en standby todavía, ¿ya? Este de aquí, el que estamos viendo ahorita, está en ya. No te preocupes, yo ya encontré una solución, pero el que sí necesito que trabajes, no sé si mañana trabajes, el domingo, no, no sé, pero sí necesito porque porque necesito presentar esa vaina es lo de las reuniones que

**Wagner Duenas:** Eh,

**Don Freddy:** te acabo de mencionar que tú me dijiste, no es que Gemini reuniones,

**Wagner Duenas:** las reuniones es.

**Don Freddy:** ese símulo módulo reuniones,

**Wagner Duenas:** A ver,

**Don Freddy:** módulo meet. Como sea,

### **00:49:22**

**Wagner Duenas:** ya.

**Don Freddy:** ahí en Stratics, ponte en Stratics.

**Wagner Duenas:** A ver, ya. A

**Don Freddy:** Ya ahí debajo, no sé, abajo de directorio,

**Wagner Duenas:** ver.

**Don Freddy:** abajo de research, donde sea, pero tiene que haber el módulo de reuniones con módulo de Meet, en el cual tiene que ser lo que te había mencionado, llenar campos, llenar texto, hacer como una especie de peline y que en la próxima pues reunión, si hoy hoy estamos 4, hoy estamos 28 de de agosto, para la próxima semana que es otra vez la reunión del mismo tema, pueda podamos abordar esos temas que no se cerraron, que todavía sigan abiertos porque todavía están en desarrollo y bla bla bla. Hay que agregar quiénes asistieron a la a la reunión, eh hay que agregar eh algún tipo de anotación adicional y todo eso. Por eso, Walter, yo siempre te digo y siempre les menciono y a toditos les trabajo de la misma forma para hacerle un poquito más más factible el trabajo es pasar de referencias. En tu caso, Wagner, yo no te obviamente yo no soy desarrollador, yo te paso cómo cómo quedaría más o menos el diseñito y todo eso. Ya en HTML, mil disculpas, no soy desarrollador, pero ya te di la visión de cómo quedaría, cómo debería de ser.

### **00:50:47**

**Wagner Duenas:** Permite.

**Don Freddy:** Ya en el caso de los diseñadores les paso ya la imagen generada como cómo se haría. En el caso de los editores,

**Wagner Duenas:** Hy,

**Don Freddy:** les paso la referencia. las hacemos correcciones y todo eso. En tu caso, en tu caso distinto ya. Ahora vuelvo y pregunto, lo que te estoy pidiendo ahorita es como para llegar al día lunes con una buena tarea. ¿Es factible hacerse entre hoy o no?

**Wagner Duenas:** puedo avanzar algo, pero no te puedo garantizar que para El lunes ya, uy, ya está la hecha la minuta porque ni siquiera tengo me queda del todo claro. O sea, entiendo que quieres poner como una hacer un registro de de actas de de las reuniones, pero o sea, lo que no acabo de entender son qué datos específicamente aparte de quienes asistieron, los asuntos que se discutieron, eh, o sea, todavía me quedan cosas que muy probablemente se me habían olvidado posterior esta reunión de qué datos se van a registrar

**Don Freddy:** Ah,

**Wagner Duenas:** y eso implica y y eso implica tener que hacer cambios en la base de datos, implica hacer proceso de migración en la base de datos, de agregar nuevas tablas nuevos enlaces. Entonces, ¿quiénes van a poder acceder a ese a ese módulo? Bueno, eso ya lo cargas tú, pero o sea, tengo que, o sea, primero tengo que trabajar la planificación, no es que yo voy, le digo a Yamin, no, esto y ya me lo hace,

### **00:52:06**

**Don Freddy:** Ya. Okay. Vamos a a ver. Primero, ese módulo va a estar abierto para todos porque las reuniones van a ser abiertas desde el CRM y la persona, ya sea Rod, ya sea yo, ya seas tú,

**Wagner Duenas:** Ah.

**Don Freddy:** quien quiera que sea, abre ese módulo y mientras estamos ahorita en una reunión así mismo online, va tomando anotaciones, ya van tomando anotaciones, se van colocando puntos si esto está o no está o si esto está en desarrollo o no está. anota sí mismo por el momento quiénesono. Ya después vamos a ir mejorando ese módulo. Eh, pero la idea es tener un registro.

**Wagner Duenas:** M.

**Don Freddy:** Ahora, los campos que tú me dices, igual tú me puedes decir, Freddy, mira, estos campos son factibles. Nombre, eh, apellido, teléfono, dirección, cargo, ya lo que tú me digas. Luego yo te voy a pasar así mismo el HTML. Eh, sorry que no soy desarrollador, pero te paso la idea y en ese HTML va a estar lo que se va a presentar, ya sea el nombre, el el este cuadro de texto en el cual se va ir agregando eh temas y asimismo en qué proceso o en qué módulo está, eh, en qué etapa está, si está por desarrollarse, bla, bla, bla. Se guarda eso, se guarda la base de datos y en la próxima reunión, vuelvo a insistir, en la próxima reunión del día viernes 4 de de septiembre se vuelve a abrir ese ese módulo de ahí.

### **00:53:39**

**Don Freddy:** Obviamente si lo abrió Ronnie es la reunión de Ron. Si laó Fredy va a tener la Fredy. Lo vio Ang igualmente hay que resolver el postre cómo llamar eh la reunión, si es reunión tal, si es Yeah. del día 28 de agosto tiene que salirse todos. Si es la reunión actual o una reunión hace dos semanas tien que todo desarrolló esa semana ya y ir actualizando las cosas si es que todavía está o no está. Ya. Entonces tengo que pasarte eso para que puedasarte. Tú dime qué campos son factibles o no para hacerte más fácil también la

**Wagner Duenas:** Ah, sí, eso tengo que, como digo,

**Don Freddy:** tarea.

**Wagner Duenas:** una vez más planificarlo. Probablemente primero leer la transcripción de esta reunión para acordarme bien y luego trabajar la planificación porque no es que yo le no es tan sencillo, pero bueno. Eh, y pues eso ya,

**Don Freddy:** Ok.

**Wagner Duenas:** o sea, la prioridad es es crear un nuevo módulo para el tema este de digamos del del rastreo de reuniones, de qué temas se trataron, todo

**Don Freddy:** Así es.

**Wagner Duenas:** eso.

**Don Freddy:** Esa esitas con eso ya justificamos el trabajo de la

**Wagner Duenas:** Mm, okay. Sí, porque el de medical,

**Don Freddy:** semana.

**Wagner Duenas:** o sea, que medical ese módulo como bueno, lo queda en standby por también.

### **00:55:11**

**Wagner Duenas:** Entonces, tanto el el módulo de Medical como el la landing page de

**Don Freddy:** Sí, sí, sí,

**Wagner Duenas:** de

**Don Freddy:** sí, sí. Eh, trata de colocar tus tareas en estrategimiento y si no sé qué

**Wagner Duenas:** No tengo usuario registrado, por cierto, que no registrate mi

**Don Freddy:** cosa vea es

**Wagner Duenas:** usuario.

**Don Freddy:** y recién ya viernes ya.

**Wagner Duenas:** O sea,

**Don Freddy:** Dios

**Wagner Duenas:** para que yo igual yo tengo igual tengo igual mi lista de tareas ahí traqueadas,

**Don Freddy:** mío.

**Wagner Duenas:** así que tengo tengo

**Don Freddy:** Vamos, ya vamos a mover, vamos a mover las reuniones de desarrollo para el día el día

**Wagner Duenas:** play.

**Don Freddy:** martes. el día martes y más mover porque realmente ahorita ahorita yo estoy yo estoy llevándome una gran impresión de Ya, dame dame una hora, te desarrollo rapidito la cuestión de de las de las actas y te lo paso y trata de avanzar todo lo que más

**Wagner Duenas:** Eh, o sea, yo más que todo con un documento de cuáles son las ideas,

**Don Freddy:** puedas.

**Wagner Duenas:** qué, o sea, qué información se quiere guardar más que todo eso, o sea, la

**Don Freddy:** ¿Sabes que? Dame tú, a ver,

**Wagner Duenas:** el

**Don Freddy:** dame tu formato, dame cómo quieres que te pasen las ideas, porque si tú a ti se te hace mejor así,

### **00:56:32**

**angie Núñez:** Sí. Yeah.

**Don Freddy:** yo te lo doy.

**Wagner Duenas:** no es un documento así formal, lo puedes hacer con con la tú le pones tus ideas y vas le, o sea, un, o sea, un, ¿cómo que se llama esto? Un Google Shep Mundano, o sea, ah, no, perdón, Google Docs, así puede ser. O sea, lo que yo lo que necesito tener es clara tu visión, o sea, que tengas plasmada tu visión en en texto, en prosa para yo a partir de eso ya empezar a trabajarlo, trabajar la planificación. No.

**Don Freddy:** Ya. Okay.

**Wagner Duenas:** Mm. Sí, no tengo yo un formato. O sea, lo que me interesa es la que eh puedes utilizar la guía le dices en quiero estas ideas, tú lees el documento, dice, ya esto está alineado o no. Y le vas corrigiendo hasta que finalmente ya tienes consolidado tu documento y me lo pasas.

**Don Freddy:** Esto

**Wagner Duenas:** Eso ahí no. El HTML diría que es, o sea, sí lo puedes hacer, pero es más que todo secundario y de hecho te si vas a hacer el HTML, primero el documento en prosa para que a partir del documento en prosa te haga un HTML borrador para yo tener idea de cuál es tu visión.

**Don Freddy:** Claro, es que yo primero redacto el prom,

### **00:57:34**

**Wagner Duenas:** Claro,

**Don Freddy:** entonces ahí ya me da como que la idea

**Wagner Duenas:** es que no pues es que ese es el problema,

**Don Freddy:** final.

**Wagner Duenas:** que si tú solo redactas de pron en pron la pierde parte del contexto y probablemente el HTML no va a plmar todo. Por eso sería bueno primero generar el documento y que a partir del documento te genere el HTML y

**Don Freddy:** Ya. Okay, está bien. Perfecto. Ya.

**Wagner Duenas:** si es posible cuando te hagas el documento abres una nueva sesión para que,

**Don Freddy:** Eh,

**Wagner Duenas:** o sea, para que no se contamine, porque a veces te pueden contaminar ideas que desechaste ahí haces el

**Don Freddy:** ya. Okay,

**Wagner Duenas:** HTML,

**Don Freddy:** perfecto. Ahora ya cerrado ese tema, ya te voy a pasar todo eso. Te hable un prximado de una hora.

**Wagner Duenas:** ¿eh?

**Don Freddy:** Mientras tanto,

**Wagner Duenas:** Ya sí

**Don Freddy:** no se puedes ir avanzando cualquier cosa lo que tú

**Wagner Duenas:** trabajando era la landing pch porque o sea a mí lo que me da,

**Don Freddy:** creas.

**Wagner Duenas:** o sea, yo lo que considero que esto hay que bueno, eventualmente hay que mejorarla ahí en sí como pero tú dices que no es prioridad, bueno, está bien. Eh, ya esto de aquí queda en standby porque, o sea, es que yo no puedo entregar un trabajo donde, a ver, el problema son esos conflictos de datos repetidos.

### **00:58:40**

**Wagner Duenas:** Entonces yo lo que estaba trabajando era la interfaz para que quien suba esos datos, porque yo estos estos datos yo, o sea, lo subí por un momento, pero luego decidí bajarlo precisamente por ese problema de los pacientes. Por eso ves en producción que está vacío. O sea, mi idea es que puedan importar, puedas importar el libro. Mira, ya te muestro lo que estás haciendo. Por ejemplo, aquí cuando importo el libro voy por la primera hoja. Ya, chévere. Aquí, aquí, por ejemplo, vas diciendo qué columna se corresponde a cuál y ya. Eh, por ejemplo, aquí hay un Bueno, puedes excluir. Ya, entonces es el primer documento. A ver, dejar si lo puedo hacer. Dejar si puedo hacer la prueba en local porque o o te mando un video más luego. No sé cómo

**Don Freddy:** No, no,

**Wagner Duenas:** hacemos porque si

**Don Freddy:** haz hazle la prueba ahorita porque yo ya estoy buscando el archivo

**Wagner Duenas:** no la que la voy a fregar. Ojalá que no se me cuelga la computadora. Pasa mucho que se me cuelga.

**Don Freddy:** Ya, igualmente para que quede acercado hay que darle también soporte a WM, ¿no? Obviamente no estoy hablando de un soporte de desarrollo, sino es que un soporte de seguimiento de tareas.

### **00:59:59**

**Don Freddy:** y también de puede que se le estén

**angie Núñez:** de tareas

**Don Freddy:** cruzando, puede que se le estando las ideas y estéando en conflicto interno. Eh, no estoy hablando nada de incoherencia, sino que hay que proteger al team. Yo hablo mucho de proteger al team. Si esto de aquí lo hubiese pasado en vivo con Vivi con eh con los directivos, entonces ahí sí ya es cómo salvar. Pero hay que hay que apoyarlo a Wner, hay que apoyarlo, eh, hay que estar eh no como un niño chiquito atrás de él, no, sino es que más dándole un soporte, preguntando qué es lo que necesita, cómo está. Yo yo quizás le molesto a él mis stickers porque yo también estoy a full. Entonces, puede ser el ahí también para que ayude.

**Wagner Duenas:** Ya, mira, aquí, por ejemplo,

**Don Freddy:** Eh,

**Wagner Duenas:** aquí en Medical ya importé el primer módulo, la primera hoja, pero el problema surge a partir,

**Don Freddy:** qué

**Wagner Duenas:** o sea,

**Don Freddy:** belleza.

**Wagner Duenas:** es que el sistema, yo estoy diseñando el sistema, el tema de los datos lo maneja ustedes. Por eso, mira, aquí viene el siguiente el problema. Cuando voy a importar el segundo libro, ¿qué pasa aquí? Que ahí se está cargando.

### **01:01:23**

**Wagner Duenas:** Ya, mira, aquí viene. Ya, aquí está el Ay, a ver qué pasó.

**Don Freddy:** M.

**Wagner Duenas:** Ya, aquí hay un tema. Entonces, acá ya dice name, va con name ya. Dob, fecha de nacimiento, teléfono. Perfecto. Email. Entonces, acá empiezan a surgir los conflictos. Eh, esto es lo que se llama el proceso de saneamiento, porque hay pacientes que tienen nombres repetidos entre las hojas y entonces acá el sistema ya los detecta y entonces acá tienes que tomar decisiones de de qué hacer con dichos datos. Eh, a ver, por ejemplo, acá hay un Ya, estos son los son los datos. Acá decide si se excluyen. Ah, aquí está la parte, por ejemplo, aquí hay datos duplicados por similitud. Entonces acá ya el sistema dice ya vamos a fusionar porque de lo contrario lo que va a pasar es que un mismo paciente va a tener dos o tres va a tener dos o tres filas entonces estaba trabajando yo en eso. Por ejemplo, esto y acá tú decides si lo fusiona estos datos o no o lo desmarca y no se fusionan.

**angie Núñez:** Y losamientos son que se

**Wagner Duenas:** eh para que no te no saneamiento es porque

**angie Núñez:** eliminan.

### **01:02:27**

**Wagner Duenas:** cuando yo importo el segundo la segunda hoja, resulta que el sistema detecta que hay pacientes, o sea, que en esta segunda hoja hay pacientes que ya están, digamos, registrados, que a ver, cuando yo importo, yo importo la primera hoja, ya se registra la tabla, perfecto. Pero cuando yo importo la segunda hoja del sistema, detecta que posiblemente hayan pacientes que ya están registrados, o sea, porque detecta que hay datos similares.

**angie Núñez:** Ah,

**Wagner Duenas:** Eh,

**angie Núñez:** ahí les hace skip.

**Wagner Duenas:** eh, claro. Entonces, mi idea es que yo poner una interfaz para que se acá puedan este resolver ver este tipo de conflicto, porque de lo contrario, si yo subo los tres libros seguidos, van a haber filas repetidas y por tanto el dashboard va a plamar datos eh que no son.

**Don Freddy:** Así es.

**Wagner Duenas:** Ya.

**Don Freddy:** Todo

**Wagner Duenas:** Entonces, entonces esto de aquí ya est esto de aquí todavía tengo que trabajarlo,

**Don Freddy:** bien.

**angie Núñez:** Ya.

**Wagner Duenas:** hay que mejorarlo. Esto de aquí yo, por ejemplo, me estoy basando una est aplic, no sé si ustedes han utilizado estas aplicaciones de genealogía de Family Search, qué s yo, no hay otra que era nunca.

**Don Freddy:** No te mentiría que no.

**angie Núñez:** No creo que

### **01:03:28**

**Wagner Duenas:** Bueno, bueno, ya, pero aquí, por ejemplo,

**angie Núñez:** no.

**Wagner Duenas:** aquí este es un panel de coincidencia parcial, por ejemplo, acá no está en mi poder decir que este es el mismo paciente. Entonces, yo lo coge en la infraestructura y ustedes deciden si efectivamente estas dos personas son el mismo paciente o no. Si son el mismo paciente, le dan funcionar con esto y ya el sistema no crea registros duplicados, sino que por ejemplo eh, qué sé yo, el apellido de Raúl lo corrige a Hernanda Hernández, qué sé yo, el email, por ejemplo, el email es un dato es un tipo de dato multivaluado. Entonces, mi idea es que cuando haya este tipo de coincidencia donde hay dos usuarios que probablemente sean el mismo pero tienen diferente email, la idea es que mejor agregue los emailes. Entonces, de forma indefinida porque es más útil, porque digamos que tendrían más información de un mismo usuario, diría yo. O sea, en vez de tener este un email principal y un email alternativo, que tengas más bien una piscina de emails de direcciones de email de un mismo paciente, creo que sería más útil. Ya. Entonces,

**angie Núñez:** S.

**Wagner Duenas:** todo eso estoy trabajando y esto de aquí todavía tengo que mejorarlo porque hay unos hay unos problemas, digamos, de de backén, pero bueno, digamos eso básicamente se me fue el fin de semana pasado y por desgracia no alcancé a hacer el dash por porque se me

### **01:04:47**

**Don Freddy:** Okay. Si subes, o sea,

**Wagner Duenas:** encontré

**Don Freddy:** si sube, si sube esta base de datos y tiene la opción de fusionar, que era también me mencionabas y de que hace esa champa,

**Wagner Duenas:** sí. Sí.

**Don Freddy:** lo

**Wagner Duenas:** Eh, esto de aquí,

**Don Freddy:** hace.

**Wagner Duenas:** este mercheo de conflicto no estoy seguro, tengo que revisarlo bien si lo hace bien, pero de que te sube los datos te lo sube. Sino que lo que pasó el domingo que me acuerdo que cuando mandé esta producción de pronto el sistema se puso lento. Yo pensé que era porque era había una carga masiva de datos,

**Don Freddy:** Ok.

**Wagner Duenas:** porque esto de aquí son como 3,000 pacientes según B. Entonces eh pensé que era por eso, pero luego el día lunes cuando tú me enviaste este que se ralentizaba, o sea, yo quité estos datos por ese problema y aparentemente se resolucionó el problema o o eso creía yo, pero luego todo el lunes me enviaste que el navegador se te se te ralentizaba y después ya descubrí que el problema no era estos datos, sino sino otro. Pero bueno,

**Don Freddy:** Ya,

**Wagner Duenas:** entonces estoy es por la razón estoy trabajando en esto todavía.

**Don Freddy:** aquí

**Wagner Duenas:** Si gusta, ¿no?

### **01:05:46**

**Wagner Duenas:** Pero tú dijiste que haga primero el tema de

**Don Freddy:** espera. Sí,

**Wagner Duenas:** Ok.

**Don Freddy:** pero hasta que yo te pase eso, puedes ir avanzando. Eso que me acabas de mostrar. Eh, esa es una Esa es una. Y te pregunto otra cosita más, porque Me parece que ya estamos chéveres con eso también, eh, como para presentarlo.

**Wagner Duenas:** O sea,

**Don Freddy:** Eh,

**Wagner Duenas:** mira,

**Don Freddy:** claro que le

**Wagner Duenas:** lo que puedo hacer es que provisionalmente cargo un libro y y hago el dashboard,

**Don Freddy:** faltaría

**Wagner Duenas:** digamos, presentamos el dashboard aunque sea un libro y le decimos que mira,

**Don Freddy:** Ya, ya lo que te iba Sí, sí. lo que te va a preguntar era igualmente la persona que va a llenar esto de aquí para que no cometa de nuevo esos errores. Se se le tendría que decir a la a los que son de Medical Center, en especial a la que está ahorita en sección, decirle,"Mira, tú tienes que llenar solo estos cabos, tienes que llenar muy bien para que ya venga así sea el 2% bien hecho de esa base de datos. Ya en este caso ahorita porque ya después lo tendrán que tendrán que subir eso directamente al sistema.

**Wagner Duenas:** No, no acabé de entender cuál era tu no acabé de entender tu, o sea, que alguien manualmente inserte los dos las dos hojas restantes.

### **01:07:05**

**Don Freddy:** No, no, no, no. A ver,

**Wagner Duenas:** A ver.

**Don Freddy:** digamos que esto ya está ya digamos que esto ya ya está corregido errores y está todo esta esta cuestión ya está todo bien a la hora de de de del asistente de la recepción que quiera

**Wagner Duenas:** Okay.

**Don Freddy:** llenar un nuevo paciente uno un uno porque acaba de llegar un nuevo paciente le va a dar

**Wagner Duenas:** Eso es

**Don Freddy:** clic le da clic en nuevo paciente hace toda esa chamba y se guarda

**Wagner Duenas:** acá

**Don Freddy:** ya entonces básicamente mente.

**Wagner Duenas:** y se se me ocurre que cuando vaya a intentar guardar que le salga una

**Don Freddy:** Mm.

**Wagner Duenas:** advertencia de posible coincidencia.

**Don Freddy:** Eh, exacto.

**Wagner Duenas:** Ya.

**Don Freddy:** Muy bien, muy bien.

**Wagner Duenas:** Sí,

**Don Freddy:** Buscarlo ahí en el C buscador de pacientes a ver si ya está

**Wagner Duenas:** pero eh eh sí puede ser también,

**Don Freddy:** también

**Wagner Duenas:** de hecho creo que sí puede ser también, pero el tema es que eso todavía hay que trabajarlo, o sea, no no está todavía, o sea, está una parte,

**Don Freddy:** ya.

**Wagner Duenas:** pero no está del todo porque el, o sea, literalmente subestimamos el módulo. O sea, yo pensé que iba a ser un copy paste de research, pero tiene necesidades muy diferentes a research.

### **01:08:06**

**Wagner Duenas:** Solo se parece en la apariencia no

**Don Freddy:** Ya. Okay. Mira, hasta ahí,

**Wagner Duenas:** más.

**Don Freddy:** hasta ahí, hasta ahí está está s está bien, se puede presentar con esos avances, no hay ningún problema. Hay que hay que mencionar mucho lo de la limpieza de la base de datos y todo eso.

**Wagner Duenas:** Claro. O sea, yo lo que estoy diseñando es una infraestructura que le facilita a quien sea que esté administrando esto para que no,

**Don Freddy:** Eh,

**Wagner Duenas:** o sea, arregle ese problema desde acá. Ya,

**Don Freddy:** ya dale.

**Wagner Duenas:** bicamente, o sea,

**Don Freddy:** Sí,

**Wagner Duenas:** ese problema lo haré el fin de semana que,

**Don Freddy:** sí.

**Wagner Duenas:** o sea, que bueno, trabajé fue el domingo porque el sábado no no pude trabajarlo. Sí, me acuerdo. Ya me

**Don Freddy:** Ya. A ver, para cerrar ya este tema,

**Wagner Duenas:** acuerdo.

**Don Freddy:** trabaja todo lo que puedas de esta de lo que estamos viendo ahorita e en la hora que te te mencioné que te que te voy enviar el documento.

**angie Núñez:** Amén.

**Don Freddy:** Posterior a eso, ya dejas de trabajar eso y te concentras hacer el módulo, ya el módulo de las de las reuniones y

**Wagner Duenas:** Pero de este apartado que priorizo lo que yo considere que sea lo mejor o alguien quiera

### **01:09:07**

**Don Freddy:** todo.

**Wagner Duenas:** priorizar de esto.

**Don Freddy:** priorizo lo que sea mejor porque después ya vienen algún tipo de actualización después, pero hay que decirle, hay que decirle a los clientes, en este caso a Medical, mira, este este cambio no va a ser de la noche a la mañana, va a ser de aquí a unas dos semanas,

**Wagner Duenas:** Pero que pero que quede claro que el conflicto es por el tema de los datos,

**Don Freddy:** una semana.

**Wagner Duenas:** porque los datos están duplicados o hay mucho ya dato es impreciso y entonces lo

**Don Freddy:** Exacto, exacto,

**Wagner Duenas:** que estoy trabajando es una una infraestructura tal que quienes administran en esto puedan deduplicar

**Don Freddy:** exact.

**Wagner Duenas:** los datos.

**Don Freddy:** Correcto. Muy bien. Así es.

**Wagner Duenas:** Ya.

**Don Freddy:** Así es.

**Wagner Duenas:** Okay. Ya,

**Don Freddy:** Ya.

**Wagner Duenas:** eso va eso va eso va a tardar todavía.

**Don Freddy:** Entonces,

**Wagner Duenas:** Pero bueno, a ver, entonces lo de la

**Don Freddy:** sí, sí. Ya. Entonces, sí, lo de las actividades, pues ya avanza esto en una hora,

**Wagner Duenas:** actividad.

**Don Freddy:** lo que más que puedas. Luego te paso eso y ahí te pones a hacer todo lo de las actividades y pregunto, fin de semana, ¿vas a trabajar?

### **01:10:11**

**Don Freddy:** ¿Vas a trabajar para poder considerar esas horas que no sé si te deba o no te deba?

**Wagner Duenas:** Yo diría que sí, porque, o sea, ya llevo acumulando dos días. Pensé que este mes iba a poder estar libre, pero bueno, parece ser que no. Pero bueno, mañana podría ser, la verdad, pero tampoco quiero que toda la semana sea así porque la verdad que estoy bastante climado con los en la universidad también.

**Don Freddy:** No, no, no. Ya ahorita hay que tener orden y prioridad porque no ya de esto de aquí ya no puede pasar de que estás trabajando otra cosa que no era prioridad y viene viene pido una cosa que que yo pensé que sí estaba estaba trabajando. Entonces yo a ver por mi lado por mi lado vas a tener un día más de si es que trabajas el fin de semana y posterior a eso hay que tener

**Wagner Duenas:** Ya.

**Don Freddy:** orden eh en tu trabajo. Si tú no puedes mantener el orden, pídele a Angi que Angi te apoye gestionando tiempos, te apoye en algo.

**Wagner Duenas:** Creo

**Don Freddy:** Ya te obviamente faltas ahí también en el CM de Stratis faltas tú. Eh, ¿qué más? ¿Qué más? Comunicación.

**Wagner Duenas:** que

**Don Freddy:** Necesito que se comunique. Está bien que me envíes sticker y toda esa vaina, pero champa es champa.

### **01:11:32**

**Wagner Duenas:** cómo te

**Don Freddy:** Ya sea si no es a mí, si no es a mí,

**Wagner Duenas:** envío

**Don Freddy:** comunícaselo a Angi ya para que Angi al finalizar el día sabes qué esto, esto pasó Wagner Wagner está haciendo, no hay ningún problema.

**Wagner Duenas:** de cosas le comunicó angi que el módulo de actividad A lo mejor no va a estar para es que no, seguramente no va a estar para hoy ahora.

**Don Freddy:** Sí, sí,

**Wagner Duenas:** No

**Don Freddy:** sí. Comunícale es. Mira,

**Wagner Duenas:** sé

**Don Freddy:** ya ahorita yo ya sé que eso va a estar ya, pero igual igual ya pues si lo

**Wagner Duenas:** va a quedar es un prototipo que posiblemente vaya a tener fricciones, pero bueno. Bueno, ahí vamos.

**Don Freddy:** trabajas.

**Wagner Duenas:** Eh, fin de semana ya que ya es el fin de semana digamos el sea, a ver, es que mañana no sé si puedo trabajar mañana. Eso me lo queda reconocido como un día más libre que después lo utilizo después.

**Don Freddy:** Sí,

**Wagner Duenas:** No,

**Don Freddy:** ya lo que no se alcanzó a usar en agosto va para septiembre.

**Wagner Duenas:** ¿verdad?

**Don Freddy:** ¿Me has pasado algún correo electrónico sobre los días que te

**Wagner Duenas:** ¿Sobre qué?

**Don Freddy:** debo?

**Wagner Duenas:** No recuerdo que no no he hecho ningún correo sobre eso, pero tengo que hacer un correo para

### **01:12:43**

**Don Freddy:** Sí,

**Wagner Duenas:** eso.

**Don Freddy:** ya ahorita. Angi ya hizo uno. Angi creo que le debo creo que dos días.

**Wagner Duenas:** Ah,

**angie Núñez:** Ya como tres.

**Wagner Duenas:** okay. Tres. Ah, ya, ya no vamos a ir volando. Muy

**Don Freddy:** Ya. Okay. Sencillo.

**Wagner Duenas:** bien.

**Don Freddy:** Me envías al al correo de Stratic que ya te ya les pasé. Freddy@stratic360.com. Ahí mencióname eso y dice ya ya los dejo porque

**Wagner Duenas:** Ahora vamos a necesitar un módulo para decir cuántos días acumula cada individuo

**Don Freddy:** ya

**Wagner Duenas:** también.

**Don Freddy:** hágale, no hay ningún problema. Este, pero bueno,

**Wagner Duenas:** un nuevo módulo para eso.

**Don Freddy:** de que se vea que hay

**Wagner Duenas:** Eh,

**Don Freddy:** trabajo,

**Wagner Duenas:** y y ¿qué pasa si mañana si mañana de pronto te digo,"¿Sabes qué? No terminé también toca trabajar el domingo por si quieres algo avanzado."

**Don Freddy:** yo realmente sí quiero que avances para llegar al día lunes y usar ese módulo de reuniones.

**Wagner Duenas:** M. Okay, pero te voy a estar molestando en tu

**Don Freddy:** Ese ese para para mí módulo de reuniones es como que ahorita es el más

### **01:13:47**

**Wagner Duenas:** clase.

**Don Freddy:** el más que tiene más prioridad para mí, para

**Wagner Duenas:** Okay, okay,

**Don Freddy:** Javier.

**Wagner Duenas:** okay, okay, okay. Bueno, ya este creo que deberíamos dejar la reunión porque si no te vas a tardar más en hacer esa vaina de de las ideas.

**Don Freddy:** Así es. Ya eh movemos igual estas reuniones de desarrollo para martes. Ahí coordinen igual el horario

**angie Núñez:** Ah

**Wagner Duenas:** Tengo problemas si no que eres tú que dice de Marte que no puede

**Don Freddy:** avalzar.

**angie Núñez:** ya.

**Don Freddy:** No, no es para, mira,

**Wagner Duenas:** que

**Don Freddy:** puede ser martes o miércoles, pero la idea, la idea es que no no lleguemos al día viernes y reciben enterarme lo que está pasando. Eso tampoco, eso tampoco puede ser.

**Wagner Duenas:** ya más que todo ha sido como un mal entendido, pero bueno, es no

**Don Freddy:** Sí, no te preocupes. Mira, por mi lado yo me pongo en tu zapatos problema y ya está justificado y yo ya sé qué es lo que tengo que hablar cuando me pregunto yo no le estoy echando el cuarto a nadie. Yeah. Para mí todo se puede se puede solucionar, pero eso sí necesito así como yo los apoyo también necesito apoyo.

**Wagner Duenas:** Eh,

**Don Freddy:** Bueno,

**Wagner Duenas:** ¿qué tipo de pollo?

### **01:15:08**

**Don Freddy:** yo ya los dejo ahí si quieren conversen ustedes dos, no sé, pero yo voy a avanzar con esas. Ya.

**Wagner Duenas:** Ya quiere ir a almorzar hace rato.

**Don Freddy:** Bueno, está bien. Buen provecho para todos. Ya.

**Wagner Duenas:** Sí, sí.

**Don Freddy:** Gracias.

**Wagner Duenas:** Pausa de alimentación,

**Don Freddy:** Gracias.

**Wagner Duenas:** muchachos. Pausa de alimentación. Gracias.

**angie Núñez:** Chao. Gracias.

**Wagner Duenas:** ¿Alguna inquietud? Angi. Nada. No, ya te quieres ir ya. Yo también.

**angie Núñez:** No, no, o sea, ya les voy a enviar más o menos en qué horario sería el el martes la reunión de

**Wagner Duenas:** sudar frío este Fredy. Yo digo,"Chuta, qué dice y dice que era otra

**angie Núñez:** qué,

**Wagner Duenas:** que me confundí, pero bueno, ni modo. Bueno, yo sé que estás recién llegada, entonces estás como no entiendo nada.

**angie Núñez:** o sea, no sabía como que cuál era el orden tampoco de prioridades en sí, porque aquí no es algo que revise todos los días a diferencia de de los chicos de video o de diseño como

**Wagner Duenas:** Sí,

**angie Núñez:** tal.

**Wagner Duenas:** es que soy estoy como ahí ahí de arrimado.

### **01:16:10**

**Wagner Duenas:** Estoy en el grupo. Debería estar con Raúl, pero no.

**angie Núñez:** Lo que se me venía a la mente en lo que estaban hablando del módulo de reuniones es que tal vez luzca como una tabla como esta de aquí,

**Wagner Duenas:** Es que esa es la idea, o sea, eventualmente, o sea, ahorita no se ve porque quien diseñó esto fue Freddy, o sea, el tema de las tablas,

**angie Núñez:** Porque

**Wagner Duenas:** pero eventualmente la idea es que es que Ría te da esta, bueno, sé que no eres programadora, pero esta tabla va a ser reutilizable para todos los módulos, así este diseño de tabla, pero bueno, por eso eso va después porque hay muchas cosas que acomodar porque don Freddy digamos eh hizo lo dejó que cloud codificara como quisiera, pero bueno.

**angie Núñez:** no Sí, o sea,

**Wagner Duenas:** Bueno, ya

**angie Núñez:** lo digo como lo digo como para más que nada ya cuando sea el uso porque me imagino que un un

**Wagner Duenas:** sí

**angie Núñez:** Javier, un Eric podría decir como que ah, ya necesito revisar qué quedamos en la última reunión y él más que nada seguiría por fechas. Entonces, creo que sería conveniente tenerlos

**Wagner Duenas:** es que es el tema que sí, pues que hay que arreglar varias cosas,

**angie Núñez:** así.

**Wagner Duenas:** pues. O sea, cuando digamos tú entras como Angi, tú solo ves la reunión que fueron contigo o ves todas las reuniones independientemente que hayan sido contigo, no que son cosas que hay que resolver son, o sea, claro,

### **01:17:28**

**Wagner Duenas:** pues son controles de acceso que se llama que no es como que yo le digo a Cloud,

**angie Núñez:** Ahí

**Wagner Duenas:** haz esto y es que te, o sea, si te va a hacer algo, pero te hace ahí por ahí una vaina media chapucera, entonces es lo que no quiero hacer tampoco.

**angie Núñez:** creería que serían todas las reuniones en las cuales tú hayas

**Wagner Duenas:** Por ahora puede ser.

**angie Núñez:** participado,

**Wagner Duenas:** Sí, puede ser. Sí, pero bueno, tengo

**angie Núñez:** que es que sea como una especie de drive,

**Wagner Duenas:** que

**angie Núñez:** cosa que sea que tú seas el dueño, el host de la reunión o que lo hayan compartido Yeah. contigo, o sea, que te hayan invitado a la reunión, que tú tengas acceso a eso. Ya si tú no estuviese en esa reunión, tendrías que pedirle a la persona que hizo la

**Wagner Duenas:** M. Sí, pero bueno,

**angie Núñez:** reunión.

**Wagner Duenas:** vamos, tengo que ver primero qué es lo que tiene Freddy en la cabeza para a través del documento para yo trabajar encima de eso. Sí, sí.

**angie Núñez:** Igual ahí lo que te envíe, Freddy, eh, igual me cuentas de qué no más envió y y según eso también cómo vas.

**Wagner Duenas:** Vale, ¿a qué hora te comunico eso,

### **01:18:30**

**angie Núñez:** Eh, dice que en eso de una hora te va a

**Wagner Duenas:** a ver?

**angie Núñez:** enviar,

**Wagner Duenas:** Okay. Bueno, yo voy a ver qué hago. Este, ¿hasta qué hora trabajas?

**angie Núñez:** eh, ya estoy de salida. Jeje.

**Wagner Duenas:** Ah, ya. ¿Trabajas tiempo completo o media jornada?

**angie Núñez:** No me dio tiempo nada más. Dijeron que me iban a cambiar a tiempo completo, pero en sí aún no me ha dicho

**Wagner Duenas:** No, no, no. O sea, o sea,

**angie Núñez:** Freddy.

**Wagner Duenas:** te van a cambiar la jornada, pero no el sueldo.

**angie Núñez:** Más o

**Wagner Duenas:** Sí, entiendo, entiendo, entiendo tu punto.

**angie Núñez:** menos.

**Wagner Duenas:** Claro. Dice,"Yo no, a mí nada, yo sigo media jornada mientras no se me cambia el

**angie Núñez:** Sí,

**Wagner Duenas:** sueldo."

**angie Núñez:** o sea, no he recibido ningún ningún correo, ninguna confirmación de nada, entonces no sé.

**Wagner Duenas:** Pues yo también. Bueno, bueno, este, bueno, ya sig almorzar no más anda tu pausa de alimentación.

**angie Núñez:** Sí, igual eh, o sea, si bien ya salgo, pero por ejemplo, no sé si más tarde o ya directamente el lunes me dices como que ah si el el fin de semana o el viernes Freddy me envió esto de aquí y avancé esto de aquí, cosa que igual yo pueda tener como que una idea, un contexto de qué está pasando.

### **01:19:43**

**Wagner Duenas:** Eh, sí. Bueno, pero tú ya estás utilizando el CRM como tal, este solution.us.

**angie Núñez:** Tengo cuenta, ya puse algunas tareas,

**Wagner Duenas:** Ese

**angie Núñez:** de hecho tengo que poner las otras tareas porque me dijo Freddy que ponga todas las tareas que yo he hecho en el mes en el CRM. Entonces eso lo tengo pendiente.

**Wagner Duenas:** módulo tiene todavía que hacerme, bueno, tengo que hacerle mejor según yo, pero bueno,

**angie Núñez:** Lo de

**Wagner Duenas:** es que sí, porque por ejemplo no tiene sentido que poner el mes,

**angie Núñez:** las

**Wagner Duenas:** por ejemplo, porque ya, o sea, el sistema internamente te registra en qué fecha pusiste la tarea, pero bueno, Freddy lo dejó así.

**angie Núñez:** editar es lo que necesitaría más.

**Wagner Duenas:** Eh eh ya está hecho.

**angie Núñez:** Ahí está.

**Wagner Duenas:** Ya hace rato que no pensé que se habían dado cuento. O sea,

**angie Núñez:** No avisaron nada.

**Wagner Duenas:** tengo que eh en la interfaz de

**angie Núñez:** Pues, ¿dónde está la comunicación?

**Wagner Duenas:** usuario está la comunicación, o sea, literal. Pero bueno, pues ay que no sé, es que yo soy de la idea que un buen diseño de aplicación tiene que ser tan bueno que no necesites un manual, o sea, que tú literalmente intuyas, o sea, que todos son intuitivos o como cualquier otra aplicación que tú descargues la Play Store, vas a una página web, tú cliqueas aquí, vas mi mundiando por aquí y ya entiendes cómo funciona.

### **01:20:53**

**Wagner Duenas:** Pero

**angie Núñez:** Es eso, sí, o sea, por eso es que ya si revisas ahorita hay algunas tareas,

**Wagner Duenas:** pero

**angie Núñez:** pero de mi lado fue como que yo dije, no puedo editar en el grupo pusieron como que ah,

**Wagner Duenas:** no.

**angie Núñez:** ya eso queda pendiente. Y de ahí no supe nada más.

**Wagner Duenas:** Ah, o sea, pensé que no sé que la habías utilizado para ya ya había se habían dado cuenta la funcionalidad, pero bueno, quiz error mío no haberlo comunicado. Ya está bien. Error mío.

**angie Núñez:** Sí,

**Wagner Duenas:** Sí, sí, ya está, ya está. Er rol mío.

**angie Núñez:** un mensaje de WhatsApp o un correo diciendo ya se puede editar @ol y

**Wagner Duenas:** Eh,

**angie Núñez:** ya.

**Wagner Duenas:** o no se me había ocurrido la ro, pero bueno, ya está bien. Este es, pero en todo caso pueden ir armando documentos para cualquier retroalimentación, fallas que necesiten, me lo envían por correo también.

**angie Núñez:** Ya sabé.

**Wagner Duenas:** Pero bueno, y ahora sí, ya quiero ir.

**angie Núñez:** Listo. No te quito más tiempo. Igual ya mismo te de decir Freddy alguna cosa.

**Wagner Duenas:** Ojalá se olvide.

**angie Núñez:** No creo que se vaya a olvidar.

**Wagner Duenas:** Ojalá se olvide. Así se si me llegan a quemar a mí. Fred, no me pasó el documento. Bueno,

**angie Núñez:** Bueno, ya ya me voy.

**Wagner Duenas:** chao.

**angie Núñez:** Sí, ahí me cuentan cualquier cosa de cómo van avanzando.

**Wagner Duenas:** Yeah.

**angie Núñez:** Ciao\!

### **La transcripción finalizó después de 01:22:22**

*Esta transcripción editable se generó por computadora y puede contener errores. Los usuarios también pueden cambiar el texto después de que se cree.*