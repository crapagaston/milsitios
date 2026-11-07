# Amigo Invisible: activación y operación

La herramienta conserva el HTML/CSS/JS del sitio y agrega una función privada de Netlify. Los datos se guardan en un almacén Netlify Blobs del mismo sitio, con consistencia fuerte. Resend envía los correos. No se necesitan cuentas de participantes.

## Activar el envío real

1. Crear o usar una cuenta de Resend y verificar un dominio propio para enviar. El subdominio `milsitios.netlify.app` no permite verificar registros DNS de envío: hace falta un dominio controlado por el propietario. No contratar un plan pago sin revisar volumen y límites.
2. En Netlify, configurar estas variables con alcance **Functions**, solo para el contexto de producción. Nunca subir claves al repositorio ni pegarlas en el chat:
   - `AMIGO_ENABLED=true`
   - `AMIGO_SITE_URL=https://milsitios.netlify.app` (origen sin barra final)
   - `AMIGO_FROM=MilSitios <regalos@TU-DOMINIO>` (remitente verificado)
   - `RESEND_API_KEY`: clave restringida al envío del dominio.
   - `AMIGO_SECRET`: secreto aleatorio de al menos 32 caracteres, generado en un gestor de contraseñas. Cambiarlo invalida todos los enlaces de acceso existentes; la recuperación genera nuevos.
3. Volver a desplegar. Sin estas variables, la herramienta muestra “envíos en preparación”, permite explorar modelos y bloquea creación y recuperación.
4. Validar primero en un sitio de prueba separado, con su propio almacén, dominio/remitente de prueba y solo correos de personas que hayan autorizado participar. No habilitar Deploy Previews contra el almacén o servicio de producción.
5. Probar con tres correos controlados: creación, acceso del organizador, sorteo, corrección, reenvío, prueba, mensaje individual/grupal, recuperación y correo inválido/rebote. Los tests automatizados usan un servicio simulado: no prueban entrega real.

## Funcionamiento

- De 3 a 30 participantes, correos únicos y restricciones simétricas entre pares. Se rechazan restricciones sin solución.
- Crear guarda el grupo y envía **solo al organizador** un enlace de administración de siete días. Se valida el control de ese correo antes de habilitar envíos al grupo.
- Código público de referencia de 16 caracteres; no autoriza acceso por sí solo. La recuperación exige el código y el correo del organizador, y envía el acceso solamente a ese correo.
- El token va en el fragmento del enlace, se elimina inmediatamente de la barra y permanece únicamente en memoria. No se guarda en almacenamiento del navegador. Actualizar/cerrar la página requiere abrir el enlace otra vez o recuperarlo.
- Al sortear se guardan las asignaciones antes del envío. No hay acción para repetir el sorteo. Cambiar un correo y reenviar usa siempre la misma persona asignada.
- El organizador puede corregir nombres y correos, fecha, presupuesto, lugar y título. No puede agregar/quitar participantes ni cambiar restricciones de un grupo guardado; para eso crea otro sorteo.
- Los modelos se adaptan a la ocasión. Asunto y cuerpo son editables, con campos conocidos. Un borrador por sorteo se guarda en el servidor. Los mensajes son texto plano, enviados individualmente a destinatarios elegidos; no se comparten direcciones del grupo.
- Prueba al correo del organizador, vista previa y confirmación del envío grupal. No hay programación automática de recordatorios en esta versión: el organizador decide cuándo enviar.
- Historial de hasta 100 operaciones, con identificadores del proveedor. “Aceptado” no implica entrega, apertura ni llegada a la bandeja principal. Rebotes y eventos de entrega se consultan en Resend; no hay webhook ni seguimiento de aperturas.

## Reintentos y concurrencia

La escritura condicional por ETag protege las asignaciones y modificaciones simultáneas. Antes de enviar se guarda una operación pendiente con un UUID y su contenido exacto. Si ocurre un timeout, el panel bloquea ediciones y ofrece reintentar la misma operación con la misma clave de idempotencia de Resend, dentro de 23 horas (su ventana es de 24 horas). Esto cubre el caso en que el proveedor aceptó el correo pero la respuesta no llegó.

Después de 23 horas no se reintenta automáticamente: el organizador debe revisar el proveedor y cerrar la operación como “sin confirmar” antes de decidir un reenvío, que podría duplicar mensajes. Un cierre no cambia las asignaciones. Una respuesta fallida requiere actualizar el panel; no crear otro sorteo para resolver un envío pendiente.

## Límites y privacidad

- Creación: 5 grupos por IP por hora, 100 por sitio por día. Recuperación: 8 intentos por IP por hora y 3 enlaces por correo por hora.
- Correo: 180 destinatarios por sorteo por día y 1000 por sitio por día, sujetos también a las cuotas de Resend y Netlify. Los intentos fallidos consumen cuota; reintentar una operación pendiente no vuelve a consumirla.
- El enlace del organizador es una credencial: cualquiera que lo posea puede administrar ese sorteo. No reenviarlo.
- Se guardan nombres, direcciones, restricciones, asignaciones, borradores e historial en Netlify; Resend recibe los correos y su contenido. Las IP se usan en contadores con hash, no se almacenan en claro. No se registran tokens ni contenido en logs de aplicación.
- El organizador declara contar con permiso para usar los correos. No es una herramienta de marketing ni admite destinatarios arbitrarios fuera del grupo.
- No existe eliminación automática ni una promesa de conservación temporal en esta versión. Antes de abrir el servicio al público, el propietario debe definir su política de conservación/eliminación y canal de solicitudes; los registros se pueden eliminar en el almacén de Netlify y los correos según las opciones del proveedor. Las pruebas no deben usar datos personales reales sin consentimiento.

## Validación

Ejecutar `npm test` con Node 22.12 o posterior. Cubre asignaciones, restricciones imposibles, validación, acceso, privacidad de respuestas, corrección/reenvío, mensajes personalizados, recuperación, concurrencia y reintentos. Verificar visualmente escritorio y móvil. La publicación automática sigue el flujo GitHub → Netlify del proyecto.
