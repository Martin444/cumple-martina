## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: prettier, eslint, vitest, playwright, sveltekit-adapter

---

# AGENTS.md — Invitación web (Martina)

## Estado actual: proyecto vacío

- El repo **no tiene código todavía**. Solo existe `ideas/` con 2 capturas PNG.
- No hay `package.json`, no hay git (`git init` pendiente), no hay `AGENTS.md` previo.
- **Las 2 imágenes de `ideas/` son la referencia de diseño y no son parseables por agentes.** Pídele a la persona que las mire y te describa la referencia antes de maquetar.
- Este es el **primer proyecto Svelte del usuario**. Los proyectos hermanos en `../../` (`landing_page_lia_nails`, `Martina Pizzeria`) son HTML/CSS/JS plano sin build: **no heredan ninguna convención**. No los tomes como referencia de estilo.

## Alcance acordado (2026-09-26)

Decisiones tomadas por el usuario. No las re-litigues sin confirmar:

| Decisión               | Valor                              | Motivo                                                                       |
| ---------------------- | ---------------------------------- | ---------------------------------------------------------------------------- |
| Framework              | **SvelteKit 2 + Svelte 5 (runes)** | Rutas por archivo, adapter para Firebase Hosting, server de preview para e2e |
| Datos                  | **Cloud Firestore**                | Docs estructurados, security rules reales, emulador bien soportado           |
| Identidad del invitado | **Firebase Anonymous Auth**        | Sin fricción de login; las rules restringen escritura por `uid`              |

**Y todavía NO decidido** (no lo asumas, preguntá):

- Qué pasa si el invitado responde **"No"** — el roadmap solo define el camino del "Sí".
- Si el RSVP se puede editar después, o es de una sola vez.
- Deploy: se asume Firebase Hosting, sin confirmar.
- Si el 3D es un extra o si hay fallback 2D para móviles de gama baja / `prefers-reduced-motion`.

## Roadmap del producto (definido por el usuario 2026-09-26)

Flujo de **scroll libre vertical**, una sola página. **Cada sección tiene animación ligada al scroll** (el usuario lo marcó como requisito crítico, 2026-09-26).

| #   | Sección                                                                  | Notas                                                                                                 |
| --- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| 1   | Intro animada estilo Bluey + "Vamos a celebrar el cumpleaños de Martina" | Punto de entrada. **Ver la nota de IP abajo.**                                                        |
| 2   | "¿Nos acompañás?" con botón Sí / No                                      | **Si dice Sí → smooth-scroll a la sección 3.** El camino del "No" no está definido.                   |
| 3   | "Abrá música, juegos y mucha diversión"                                  | Teaser, sin interacción.                                                                              |
| 4   | Fecha y Lugar                                                            | **TBC — el usuario todavía no los tiene.** Sumar sección de mapa + botón "Cómo llegar" → Google Maps. |
| 5   | Form: nombre + cuántos niños y niñas van                                 | El usuario pidió **mucho cuidado de UX acá**.                                                         |
| 6   | Confirmación                                                             | Feedback de envío. Tras enviar, smooth-scroll hasta acá.                                              |

Como el scroll es libre, **el invitado puede llegar a la sección 5 sin haber pasado por el botón "Sí"**. El "Sí" es un atajo, no un gate.

Botón de Google Maps: usá la URL de intents, no un embed —
`https://www.google.com/maps/dir/?api=1&destination=<urlencoded>`.

### Datos del RSVP (derivados del roadmap)

Doc en `rsvps/{uid}` — el `uid` viene de Anonymous Auth, **no** del form.

- `nombre` (string) — adulto responsable
- `ninos` (int), `ninas` (int) — dos contadores separados, no un total
- `asistira` (bool) — ⚠️ con scroll libre **ya NO es implícito** por haber llegado al form (se llega por scroll). O el form pregunta sí/no, o el botón Sí de la sección 2 lo setea y el form lo lleva. **Decidir antes de escribir las rules.**
- `createdAt` (server timestamp)

Las security rules tienen que **acotar `ninos`/`ninas` a un rango sano** (ej. 0..10) y `nombre` a un largo máximo. Es el caso "campos inválidos / sobre el límite de tamaño" del plan de testing.

## Animación ligada al scroll (requisito crítico — leé esto antes de maquetar)

**"Scroll-scrubbed", no "scroll-triggered".** Es la distinción que más se falla: el progreso de la animación va **atado a la posición del scroll**, así que al volver para arriba la animación se revierte. Un reveal de una sola vez al entrar en viewport NO cumple el requisito.

**Estrategia por capas** (de abajo hacia arriba — la base tiene que funcionar sin JS):

1. **Base, sin JS:** contenido visible, sin animación. Es el estado por defecto y lo que ve `prefers-reduced-motion`.
2. **CSS scroll-driven, cero JS:** `animation-timeline: view()` / `scroll()`. En 2026 está en **Chrome 115+, Safari 26+ (iOS 26+), Firefox 158+**. Usalo para reveals, parallax y stagger: corre en el compositor y no cuesta un bundle.
   ```css
   @supports (animation-timeline: view()) {
   	.seccion > * {
   		animation: entrar linear both;
   		animation-timeline: view();
   		animation-range: entry 0% cover 40%;
   	}
   }
   ```
   El `@supports` no es opcional: sin él, un browser que no lo soporta queda con `opacity: 0` y **página en blanco**.
3. **GSAP ScrollTrigger** para lo que CSS no puede: pinning, coreografía multi-paso, y **la cámara 3D de Threlte atada al scroll** (ahí sí necesitás leer `scrollY` en JS).
   ```js
   lenis.on('scroll', ScrollTrigger.update);
   gsap.ticker.add((t) => lenis.raf(t * 1000));
   gsap.ticker.lagSmoothing(0);
   ```
   ScrollTrigger trabaja sobre **scroll nativo**, así que no pelees con el scroll del usuario.

**Gotchas de scroll (mueven el build, no son detalles):**

- ⚠️ **Nunca secuestres el scroll.** No `preventDefault` en `wheel`/`touchmove`, no `body { height: 100vh; overflow: hidden }` con scroll manejado a mano. Rompe el momentum de iOS, el scroll por teclado, la accesibilidad, y se siente horrible. Scroll libre = scroll nativo.
- **Lenis** (smooth scroll) es opcional y agrega riesgo: solo si el efecto lo justifies, y **desactivalo por completo** bajo `prefers-reduced-motion`.
- **Layout shift rompe la matemática del scroll.** Fijá `width`/`height` en imágenes y videos, y usá `font-display`. Si el layout cambia en runtime, llamá `ScrollTrigger.refresh()`.
- **iOS**: el scroll por momentum es asíncrono, así que el progreso leído de `scrollY` va laggeado. Suavizá el valor (lerp/damp) en lugar de usarlo crudo. Ojo también con la barra de direcciones que cambia el viewport y hace saltar el cálculo en porcentaje.
- **No leas `getBoundingClientRect()` en un handler de scroll sin throttle.** Leé en `requestAnimationFrame`, cacheá las medidas, y solo animá secciones dentro del viewport (`IntersectionObserver`).
- **El "Sí" de la sección 2 es un smooth-scroll,** no un cambio de estado: `scrollIntoView({ behavior: 'smooth' })`.
- Con `prefers-reduced-motion`, el intro animado es justo lo que dispara el motion sickness. Tiene que existir un atajo que salte a la sección 1 estática.

## Gotchas de producto (leelos antes de maquetar)

- **Fecha y lugar son TBC** → todo el copy de esos frames tiene que vivir en **un único objeto de config** (ej. `src/lib/config/evento.ts`), no hardcodeado en los componentes. El día que los pasen se edita un archivo, no se tocan 6 componentes.
- **Audio:** los browsers bloquean autoplay hasta un user gesture. El "Abrá música" de la sección 3 no puede sonar solo al entrar — tiene que dispararse desde el click/tap de la sección 2.
- **Form a medio llenar + refresh = se pierde todo.** Como no hay gate, tampoco hay estado que "desbloquear". Decidí si el form se autosavea en `sessionStorage` o si se acepta la pérdida.
- **Sin gate, el form es alcanzable sin autenticarse** (o al revés): decidí si `signInAnonymously()` se dispara al cargar la página o recién al enviar.

## Versiones investigadas (verificadas, no instaladas — installá lo que falte)

- `svelte` 5.x, `@sveltejs/kit` 2.70.x · CLI oficial: **`sv`** (`npx sv create`, `npx sv add`)
- **3D: Threlte** — `@threlte/core` + `@threlte/extras` (~9.21.x) sobre `three` ~0.185. Threlte es la capa declarativa e idiomática de Svelte; usala en vez de Three.js crudo. Extras útiles: `@threlte/gltf`, `@threlte/rapier`, `@threlte/theatre`, `@threlte/xr`.
- **2D / scroll: CSS primero, GSAP para lo difícil.** `gsap` + `ScrollTrigger` (plugin gratuito, owner: Webflow) para pinning, coreografía y la cámara 3D. `lenis` (ex-`@studio-freight/lenis`) solo si se justifica el smooth scroll. Alternativa declarative Svelte 5: `@humanspeak/svelte-motion` (MIT, `useScroll` + `useTransform`) — mucho más chica y menos battle-tested que GSAP.
- `firebase` JS SDK **12.18.x** — requiere **Node ≥ 20** y **ES2020** (ya cumplido con Node 22).
- `@firebase/rules-unit-testing` **5.x**
- `vitest` (unit + component), `playwright` (e2e) — ambos instalables con `npx sv add vitest` / `npx sv add playwright`.

## Entorno local (verificado en esta máquina)

- Node **v22.20.0**, npm **10.9.3**, git 2.45.1
- **No hay pnpm ni yarn** → usá **npm** exclusivamente.
- `firebase` CLI global **13.28.0** (latest es 15.28.x; si algo del emulador falla, actualizá primero).
- ⚠️ **El path del proyecto contiene un espacio y acentos**: `...\Martina cumple 2\Invitacion`.Siempre entrecomillá rutas en comandos (`--config ".\firebase.json"`), y evitá scripts que asuman paths sin espacios.
- Firebase CLI necesita **Java** para correr emuladores. Verificá antes de prometer tests de integración.

## Gotchas de Firebase que muerden (leelos antes de debuggear)

- **Las security rules NO se están probando si el emulador corre sin `firestore.rules` declarado en `firebase.json`.** En ese caso el emulador trata **todos los projects como abiertos** y los tests pasan en verde sin probar nada. Si los rules tests pasan de entrada, sospechá esto primero.
- **El emulador persiste datos entre corridas.** Sin `clearFirestore()` entre tests, el estado se filtra de un test al siguiente.
- **La auth real NO funciona en rules tests.** Solo `@firebase/rules-unit-testing` puede mockear auth, vía `authenticatedContext(uid, claims)` / `unauthenticatedContext`. Nunca invoques `signInAnonymously()` ahí.
- Usá un projectId `demo-*` para local/test. El emulador de Auth emite tokens **sin firmar**; Firebase Admin los acepta solo si activás el flag de demo.
- El emulador de Auth **sí soporta `signInAnonymously()`** → eso habilita e2e de app real contra emulador (distinto de los rules tests).
- Anonymous Auth requiere estar **habilitado en Firebase Console → Authentication → Sign-in method**. Si falta: `auth/operation-not-allowed`.
- Firebase limita anonymous signups **por IP**. Con `Identity Platform` + auto-cleanup, las cuentas anónimas >30 días se borran solas y no cuentan contra quota.
- En SvelteKit, la config de Firebase va con prefijo **`PUBLIC_`** (`$env/static/public`). Cualquier otra variable es server-only.

## Plan de testing (3 tiers — el usuario pidió cubrir bien los flancos)

1. **Unit / component** — Vitest. Para lógica de derivación del RSVP, y para los componentes 2D/3D.
2. **Integration / rules** — Vitest + `@firebase/rules-unit-testing` contra el emulador de Firestore. **Es el tier que más valor aporta acá.** Casos que deben existir:
   - escritura sin autenticar → denegada
   - lectura de otro `uid` → denegada
   - escritura con campos inválidos / sobre el límite de tamaño → denegada
   - un guest no puede sobreescribir el RSVP de otro
   - lectura del conteo/agregado: decidir si es público o restringido, y testearlo explícitamente
3. **E2E** — Playwright contra `npm run build && npm run preview` **con los emuladores prendidos**, para el camino completo: abrir invitación → anonymously auth → enviar RSVP → ver confirmación.

Comandos previstos (a confirmar cuando exista el `package.json`):

- `npm run test:rules` → `firebase emulators:exec --only auth,firestore "vitest run"` (arranca emuladores, corre, y los apaga — preferible a dejarlos prendidos en background)
- `npm run test:e2e` → emuladores + `playwright test`
- Orden de verificación: **`check` (svelte-check) → `test` → `test:e2e`**.

## Notas de implementación 3D

- Threlte necesita `T` (Canvas) como contexto; los componentes 3D no renderizan en SSR. Si el build hace prerender, envolvé el canvas en `{#if browser}` o `onMount`, y seteá `ssr = false` en el route si hace falta.
- Mobile:WebGL es el punto de falla. Definí un presupuesto de performance early (cantidad de draw calls, `dpr` cap, `powerPreference`) y un fallback 2D.
- Respetá `prefers-reduced-motion`: es requisito de accesibilidad, no opcional.
