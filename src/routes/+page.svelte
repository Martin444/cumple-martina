<script lang="ts">
	import { onMount } from 'svelte';
	import Fondo from '$lib/components/Fondo.svelte';
	import Navegacion from '$lib/components/Navegacion.svelte';
	import { entrarPaso } from '$lib/animacion';
	import { conectarNavegacion, flujo } from '$lib/flujo.svelte';
	import { iniciarMusica, musica } from '$lib/musica.svelte';
	import { PASOS } from '$lib/pasos';

	let escenario: HTMLElement;

	onMount(() => {
		const desconectar = conectarNavegacion(escenario);
		// La música arranca sola si el browser lo permite; si no, en el primer
		// gesto. Devuelve su propio cleanup, así que los dos conviven.
		const apagarMusica = iniciarMusica();
		return () => {
			desconectar();
			apagarMusica();
		};
	});

	/**
	 * Acción de entrada del paso.
	 *
	 * Corre en el mismo flush en que Svelte crea el nodo, antes del paint, que
	 * es lo que hace que `gsap.from()` aplique su estado inicial sin que se vea
	 * un flash del contenido ya en su posición final. Si se llamara desde un
	 * `requestAnimationFrame` o un `setTimeout`, ese frame intermediate se ve.
	 */
	function alEntrar(nodo: HTMLElement) {
		entrarPaso(nodo, flujo.direccion);
	}

	/**
	 * Salida del paso que se va.
	 *
	 * Se va por donde viene: cortando a la derecha si avanzamos, por la
	 * izquierda si volvemos. Lee `flujo.direccion` en vez de recibirla por
	 * parámetro porque para cuando Svelte corre la transición el índice YA
	 * cambió: la dirección útil es la del movimiento que acabamos de hacer, no
	 * una comparación de índices.
	 *
	 * 180ms a propósito. Más corto y el paso nuevo aparece encima del viejo, que
	 * se lee como parpadeo. Más largo y el deck se siente lento: entre esta
	 * salida y el stagger de entrada son ~850ms por paso, y seis pasos son
	 * cinco segundos de espera acumulada.
	 */
	function salir(nodo: Element, { duracion = 180 }: { duracion?: number } = {}) {
		return {
			duration: duracion,
			css: (t: number) =>
				`opacity: ${t}; transform: translate3d(${-32 * flujo.direccion * (1 - t)}px, 0, 0) scale(${
					0.98 + 0.02 * t
				})`
		};
	}
</script>

<svelte:head>
	<title>Invitación al cumpleaños de Martina</title>
	<meta name="description" content="Vamos a celebrar el cumpleaños de Martina. Te esperamos." />
	<meta name="theme-color" content="#eaf6ff" />
	<!--
		Compartir por WhatsApp: sin tags de Open Graph se ve un link pelado. No
		hay `og:image`: la imagen de preview debería subirse con el deploy, no
		quedar como un TODO.
	-->
	<meta property="og:title" content="¡Vamos a celebrar el cumpleaños de Martina!" />
	<meta
		property="og:description"
		content="Música, juegos y mucha diversión. Confirmá tu asistencia."
	/>
	<meta property="og:type" content="website" />
	<!--
		La imagen de preview para WhatsApp/Redes vive en /static. En producción
		el dominio se resuelve automáticamente; si querés una URL absoluta
		explícita, reemplazá el href por el del deploy.
	-->
	<meta property="og:image" content="/invitacion_videozas.png" />
	<meta property="og:image:width" content="636" />
	<meta property="og:image:height" content="900" />
</svelte:head>

<!--
	El skip link apunta acá. `#contenido` tiene `tabindex="-1"`, así que el
	anchor no necesita scrollear para cumplir: el body no scrollea (scrollean
	los pasos), pero el browser sí mueve el foco al elemento destino.
-->
<main id="contenido" class="escenario" tabindex="-1" bind:this={escenario}>
	<Fondo />

	<!--
		`{#key flujo.indice}`: solo el paso activo está en el DOM.

		Eso resuelve de una la accesibilidad del deck. Con las seis secciones
		montadas y superpuestas habría que pelear con `inert`, `aria-hidden` y el
		orden de tabulación para que un lector de pantalla no lea las seis.
		Montando una a la vez no hay nada que esconder.

		Y de yapa la secuencia de Svelte sale sola: el `out:` corre antes de que
		se cree el bloque nuevo, así que sale el viejo (180ms), se monta el
		elegido, y la acción `alEntrar` dispara el stagger. No hay que coordinar
		dos animaciones a mano, que es donde estos decks suelen romperse.
	-->
	{#key flujo.indice}
		{@const Componente = PASOS[flujo.indice].Componente}
		{@const titulo = PASOS[flujo.indice].titulo}
		<div
			class="paso"
			role="group"
			aria-roledescription="paso"
			aria-label={titulo}
			out:salir
			use:alEntrar
		>
			<Componente />
		</div>
	{/key}

	<Navegacion />
</main>

<!--
	Control de música: siempre visible, porque si el tema arranca solo el
	invitado necesita poder apagarlo (y volver a prenderlo). El `aria-pressed`
	lo anuncia como un toggle, no como un botón que hace algo distinto cada vez.
-->
<button
	type="button"
	class="musica"
	data-control-musica
	onclick={() => musica.alternar()}
	aria-pressed={musica.sonando}
	aria-label={musica.sonando ? 'Silenciar la música' : 'Reproducir la música'}
>
	{#if musica.sonando}
		<!-- Parlante con ondas: suena. -->
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path d="M4 9 L8 9 L13 5 L13 19 L8 15 L4 15 Z" fill="currentColor" />
			<path
				d="M16.5 8.5 C18.5 10.5 18.5 13.5 16.5 15.5"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			/>
			<path
				d="M19 6 C22.5 9.5 22.5 14.5 19 18"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			/>
		</svg>
	{:else}
		<!-- Parlante con cruz: apagado o esperando un gesto. -->
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path d="M4 9 L8 9 L13 5 L13 19 L8 15 L4 15 Z" fill="currentColor" />
			<path
				d="M16.5 9.5 L21.5 14.5 M21.5 9.5 L16.5 14.5"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			/>
		</svg>
	{/if}
</button>

<style>
	/*
		El escenario es el viewport entero y NO scrollea. El scroll vive adentro
		del paso (`.paso`), por dos razones:

		  - La navegación tiene que saber en qué paso está. Si scrolleara el
		    body, "el paso actual" sería ambiguo: se podría estar a medio camino
		    entre dos.
		  - Un paso más alto que la pantalla (el form en un teléfono de 360px)
		    tiene que poder scrollear igual. Si el body fuera el scroller, el
		    layout del deck se rompe.

		`overflow: clip` y no `hidden`: `hidden` convierte al elemento en scroll
		container. acá ya no hay `animation-timeline: view()` a que apuntarle,
		pero `clip` recorta igual y no crea uno.
	*/
	.escenario {
		position: relative;
		z-index: 1;
		height: 100dvh;
		overflow: hidden;
		overflow: clip;
		isolation: isolate;
	}

	.escenario:focus {
		outline: none;
	}

	.paso {
		position: relative;
		z-index: 1;
		height: 100%;
		/*
			`overscroll-behavior: contain` le dice al browser que cuando este
			scroll llega al borde NO lo propague. Sin esto, scrollear hasta el
			final del form dispara pull-to-refresh en Android y el rubber-band de
			iOS, y el invitado pierde el paso.

			Es la mitad del contrato con el swipe: el scroll vertical se queda
			adentro del paso y el gesto horizontal cambia de paso. No se pisan
			porque uno es vertical y el otro horizontal — y además el umbral del
			gesto exige que el desplazamiento sea claramente apaisado.
		*/
		overflow-y: auto;
		overscroll-behavior: contain;
		-webkit-overflow-scrolling: touch;
		will-change: transform, opacity;
	}

	/*
		El control de música reusa el lenguaje del resto del cromo (círculo
		blanco, borde de tinta) para no meter un elemento nuevo al vocabulario
		visual. Fijo arriba a la derecha: es la esquina que ningún paso usa, así
		no compite con el contenido ni con la barra de abajo.
	*/
	.musica {
		position: fixed;
		inset-block-start: calc(0.75rem + env(safe-area-inset-top, 0px));
		inset-inline-end: calc(0.75rem + env(safe-area-inset-right, 0px));
		z-index: 20;
		width: 44px;
		height: 44px;
		display: grid;
		place-items: center;
		padding: 0;
		border: 2px solid var(--tinta);
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.9);
		color: var(--tinta);
		transition:
			transform 0.18s var(--ease-bounce),
			background 0.18s,
			color 0.18s;
	}

	.musica svg {
		width: 22px;
		height: 22px;
	}

	.musica:hover {
		background: var(--bluey);
		color: #fff;
		transform: scale(1.08);
	}

	.musica:active {
		transform: scale(0.94);
	}

	/* Suena: el botón se pinta para que "está pasando algo" se vea sin apretar. */
	.musica[aria-pressed='true'] {
		background: var(--bluey);
		color: #fff;
	}
</style>
