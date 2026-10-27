<script lang="ts">
	/**
	 * Personaje decorativo de la invitación.
	 *
	 * Renderiza una imagen de /static con tamaño fijo, animación suave y
	 * posicionamiento opcional. Las ilustraciones son PNG con transparencia,
	 * así que no necesitan fondo: se superponen limpio sobre las olas.
	 */
	let {
		src,
		alt,
		tamano = 180,
		posicion = 'centro',
		animar = true
	}: {
		src: string;
		alt: string;
		tamano?: number;
		posicion?: 'izq' | 'centro' | 'der';
		animar?: boolean;
	} = $props();

	const align = {
		izq: 'flex-start',
		centro: 'center',
		der: 'flex-end'
	};
</script>

<!--
	`width`/`height` en el HTML reservan el espacio antes de que cargue la
	imagen: sin esto, un PNG grande hace que el paso salte de tamaño y el
	contenido se re-centra a media carga.
-->
<figure class="personaje" class:animar style:--tam="{tamano}px" style:--align={align[posicion]}>
	<img {src} {alt} width={tamano} height={tamano} decoding="async" loading="lazy" />
</figure>

<style>
	.personaje {
		margin: 0;
		display: flex;
		justify-content: var(--align, center);
	}

	.personaje img {
		width: var(--tam, 180px);
		height: auto;
		max-height: 34vh;
		object-fit: contain;
		display: block;
		/*
			Las ilustraciones de los personajes tienen las sombras incluidas en
			el arte; no hace falta (ni conviene) sumar una sombra de CSS que las
			desdibuje.
		*/
		filter: drop-shadow(0 6px 10px rgba(30, 58, 95, 0.12));
	}

	/* En pantallas bajas achicamos para que los botones no se pierdan. */
	@media (max-height: 45rem) {
		.personaje img {
			max-height: 26vh;
		}
	}

	@media (max-width: 30rem) {
		.personaje img {
			max-height: 28vh;
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		.personaje.animar img {
			/*
				Rebote suave SIN aplastar la ilustración. El keyframe anterior
				usaba scaleX/Y distintos, lo que deformaba los personajes al
				saltar. Acá solo sube/baja y hace un leve scale uniforme.
			*/
			animation: flotar 2.8s var(--ease-out) infinite;
			transform-origin: 50% 85%;
		}
	}

	@keyframes flotar {
		0%,
		100% {
			transform: translateY(0) scale(1);
		}
		50% {
			transform: translateY(-14px) scale(1.03);
		}
	}
</style>
