/**
 * Prerender: la invitación es 100% estática.
 *
 * Firebase corre solo en el navegador, así que no hay nada que el servidor
 * tenga que calcular. Prerenderando, Netlify sirve un HTML fijo desde su CDN:
 * más rápido, sin cold starts y sin función serverless que mantener.
 *
 * (Este archivo tiene que existir porque `adapter-netlify` lee el prerender
 * desde acá, no desde un `svelte.config.js` — ver vite.config.ts.)
 */
export const prerender = true;
