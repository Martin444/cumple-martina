<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Shell de un paso del deck.
	 *
	 * Antes esta componente era una `<section>` de alto completo dentro de una
	 * página que scrolleaba, y su trabajo era medir un rango de scroll para
	 * engancharle animaciones. Ahora no hay nada que medir: el paso es una caja
	 * que llena la pantalla y su contenido entra con una animación por tiempo.
	 *
	 * La única decisión de layout que queda acá es el `tono`: ya no es un fondo
	 * sólido (tapaba las olas), es una veladura radial que tiñe el paso para que
	 * dos pantallas consecutivas no se vean iguales.
	 */
	let {
		tono = 'crema',
		centrado = true,
		children
	}: {
		/**
		 * Tinte del paso. Todos translúcidos a propósito: el fondo real de la
		 * página es `Fondo.svelte`, esto solo le cambia la luz.
		 */
		tono?: 'crema' | 'crema-2' | 'menta' | 'cielo' | 'rosa';
		centrado?: boolean;
		children: Snippet;
	} = $props();
</script>

<!--
	`.revelar` es lo que `entrarPaso` (src/lib/animacion.ts) escalona al entrar el
	paso. Sus hijos DIRECTOS son los que se animan: por eso el contenido va solo
	dentro, sin envolturas intermedias.

	`id` se fue con el scroll. Ya no hay anclas que alinear porque la navegación
	no scrollea: cambia de índice. Los CTA usan `flujo.svelte.ts`.
-->
<section class="seccion tono-{tono}" class:centrado>
	<div class="revelar contenido">
		{@render children()}
	</div>
</section>

<style>
	.seccion {
		/*
			`display: flex` + `margin-block: auto` en el hijo, y NO
			`justify-content: center`. Parece lo mismo y no lo es: cuando el
			contenido es más alto que la pantalla (el form en un teléfono de
			360px), `justify-content: center` lo descentra y recorta la parte de
			arriba sin scrollear — el título queda debajo del notch. Con
			`margin-block: auto`, los márgenes absorben el espacio libre cuando
			sobra y valen 0 cuando falta, así que el contenido siempre arranca
			arriba y el paso scrollea.
		*/
		min-height: 100%;
		display: flex;
		flex-direction: column;
		padding: clamp(1.25rem, 4vh, 2.5rem) clamp(1.25rem, 5vw, 3rem);
		/*
			El padding de abajo deja libre la barra de navegación fija. Sin esto,
			el último elemento de cada paso queda debajo de la barra al scrollear.
		*/
		padding-block-end: calc(
			var(--nav-alto) + clamp(1.5rem, 4vh, 3rem) + env(safe-area-inset-bottom, 0px)
		);
	}

	/*
		Veladuras radiales, no fondos sólidos. Un `background: var(--crema)` opaco
		ocultaría las olas de `Fondo.svelte` y volveríamos a una página de
		parches de color, que es exactamente de donde venimos.
	*/
	.tono-crema {
		background: radial-gradient(
			ellipse 92% 58% at 50% 40%,
			rgba(255, 255, 255, 0.6),
			transparent 72%
		);
	}
	.tono-crema-2 {
		background: radial-gradient(
			ellipse 92% 58% at 50% 40%,
			rgba(255, 255, 255, 0.8),
			transparent 74%
		);
	}
	.tono-menta {
		background: radial-gradient(
			ellipse 92% 58% at 50% 40%,
			rgba(126, 211, 33, 0.18),
			transparent 72%
		);
	}
	.tono-cielo {
		background: radial-gradient(
			ellipse 92% 58% at 50% 40%,
			rgba(79, 184, 232, 0.2),
			transparent 72%
		);
	}
	.tono-rosa {
		background: radial-gradient(
			ellipse 92% 58% at 50% 40%,
			rgba(255, 107, 157, 0.16),
			transparent 72%
		);
	}

	.contenido {
		width: 100%;
		max-width: var(--ancho);
		margin-inline: auto;
		/* El que centra de verdad. Ver el comentario de `.seccion`. */
		margin-block: auto;
		position: relative;
		z-index: 1;
	}

	.centrado .contenido {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: clamp(0.75rem, 1.8vh, 1.5rem);
	}

	@media (max-height: 45rem) {
		.seccion {
			padding-block: clamp(0.75rem, 3vh, 1.5rem);
		}

		.centrado .contenido {
			gap: clamp(0.6rem, 1.5vh, 1rem);
		}
	}
</style>
