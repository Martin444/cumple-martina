/**
 * Smooth-scroll a una sección por id.
 *
 * En la versión de scroll libre esto era un `scrollIntoView`. Con el slide deck
 * ya no hay scroll que comandar: `irA` cambió de SIGNIFICADO, no de
 * implementación. Ahora "ir a 'formulario'" quiere decir "el paso activo pasa a
 * ser el del form", y lo resuelve el índice, no el documento.
 *
 * Se mantiene como módulo aparte y no se importa `flujo.svelte` en cada
 * sección por una razón práctica: `flujo.svelte.ts` es un módulo con runes, y
 * que TODOS los componentes dependan de él suma un módulo al grafo de cada uno
 * para ganar un alias. El alias vale la pena.
 */
export { irA } from './flujo.svelte';
