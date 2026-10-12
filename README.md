# MilSitios

Nueve microherramientas gratuitas, sin registro, hechas con HTML, CSS y JavaScript. `juegos-de-cartas.html` agrupa los cuatro juegos; no es una herramienta adicional.

## Abrir el proyecto

Descargá los archivos y abrí `index.html` en tu navegador. Conservá la carpeta `assets` junto a los HTML. No hace falta instalar paquetes ni compilar.

## Dónde editar el diseño

- `index.html`: portada, textos, enlaces y tarjetas de herramientas. Las tarjetas están en el HTML para que sean accesibles también sin ejecutar JavaScript.
- `assets/home.css`: diseño adaptable de la portada.
- `assets/home.js`: buscador y filtros por categoría. Reconoce palabras con o sin tildes.
- `assets/theme.css`: colores, tipografía y estilo compartido por todas las páginas. Cambiar este archivo actualiza todo el sitio.
- `assets/*.svg`: ilustraciones originales y favicon, sin imágenes ni fuentes externas.
- Cada HTML de herramienta conserva sus estilos específicos y su lógica JavaScript. La hoja compartida se carga después para actualizar la apariencia.

Los colores de cada categoría se definen al principio de `theme.css`. El atributo `data-category` del `body` selecciona la categoría de cada herramienta: `social`, `finance`, `text` o `games`.

## Agregar una herramienta a la portada

Copiá una tarjeta `.tool-card` de `index.html`, actualizá su enlace, imagen, título, descripción, `data-category` y `data-keywords`. El buscador y el contador la incorporan automáticamente. Actualizá también la descripción de la página y este documento si cambia el total de herramientas.

## GitHub y Netlify

El sitio sigue siendo estático y conserva las URLs existentes. No requiere un comando de build; el directorio publicado es la raíz del repositorio. Conservá la configuración de Netlify que ya utiliza el proyecto.

Las propuestas se preparan en una rama separada y Netlify genera una Deploy Preview desde el pull request. Integrar en `main` activa la publicación del proyecto en su dirección habitual.

## Verificación del rediseño

Se verificaron los enlaces y recursos locales de las once páginas, los IDs únicos, la sintaxis de JavaScript y SVG, y las interacciones del buscador y filtros con un DOM simulado. Los scripts de las herramientas se conservaron sin cambios. El propietario revisó la vista previa y autorizó publicar el rediseño el 12 de octubre de 2026. La comprobación visual automatizada y los recorridos completos en escritorio y móvil no se realizaron en el entorno de desarrollo; las verificaciones de código no los sustituyen.

## Continuar el proyecto desde ChatGPT

Preferencia del propietario (12 de octubre de 2026): pedir nuevas herramientas desde la conversación y que el asistente implemente e integre los cambios, sin que el propietario tenga que copiar código o editar GitHub manualmente.

Para cada pedido concreto:

1. Leer la versión actual de `main` y conservar HTML/CSS/JS vanilla, sin backend ni APIs externas.
2. Crear la herramienta completa, siguiendo `assets/theme.css`, con diseño adaptable y una URL descriptiva.
3. Sumar la tarjeta a la portada, su categoría, ilustración, palabras clave, metadescripción y los enlaces relacionados que correspondan. Actualizar los recuentos.
4. Verificar los cálculos o flujos relevantes, los enlaces y la versión móvil cuando haya un navegador disponible. Informar cualquier limitación de validación.
5. Preparar los cambios en una rama y un pull request; integrar y publicar lo solicitado una vez verificado, según la autorización del pedido y esta preferencia. No hace falta pedir nuevamente que el usuario copie código o pulse los botones de GitHub.
6. Confirmar el estado real de Netlify y devolver el enlace a la herramienta. No afirmar que está publicada si el despliegue no está confirmado.

Pedir aclaración si falta una definición esencial o se requieren servicios pagos, datos sensibles o cambios fuera del alcance. Este flujo se ejecuta cuando el usuario hace un pedido; no es una tarea programada en segundo plano. Requiere que el acceso a GitHub continúe disponible.
