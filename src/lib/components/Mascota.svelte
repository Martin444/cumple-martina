<script lang="ts">
	import { evento } from '$lib/config/evento';

	/**
	 * Personaje de la invitación.
	 *
	 * Dos modos, y el que se usa sale de `config/evento.ts`:
	 *
	 *  - `arte.mascota === null` (default): el SVG inline de abajo. Es una
	 *    perrita azul estilo cartoon ORIGINAL (inspirada en el look de los
	 *    heelers australianos, tipo Bluey), con orejas animadas, cola waggeante,
	 *    ojos que parpadean y un gorrito de cumpleaños. No es una copia de
	 *    ningún personaje con copyright.
	 *  - `arte.mascota === '/ruta/en-static.webp'`: se renderiza esa imagen.
	 *    Para cambiar de ilustración hay que editar UNA línea y no
	 *    los componentes.
	 *
	 * Si se usa arte con licencia propia, el crédito va en `evento.arte.credito`
	 * y se imprime en el footer: el aviso legal va junto al asset.
	 */
	let { tamano = 220 }: { tamano?: number } = $props();

	const src = evento.arte.mascota;
</script>

{#if src}
	<img
		class="mascota-img"
		{src}
		width={tamano}
		height={tamano}
		alt="Personaje de la invitación de cumpleaños de Martina"
		decoding="async"
	/>
{:else}
	<svg
		viewBox="0 0 240 240"
		width={tamano}
		height={tamano}
		role="img"
		aria-label="Martina, una perrita azul estilo cartoon con gorro de cumpleaños, saluda con la mano"
		class="mascota"
	>
		<!-- Cola waggeante -->
		<g class="cola">
			<path
				d="M190 170 q28 -18 34 -48 q6 8 2 22 q-8 28 -36 38"
				fill="var(--bluey)"
				stroke="var(--tinta)"
				stroke-width="5"
				stroke-linejoin="round"
			/>
			<ellipse
				cx="226"
				cy="124"
				rx="10"
				ry="14"
				fill="#b8e6f5"
				stroke="var(--tinta)"
				stroke-width="4"
			/>
		</g>

		<!-- Orejas -->
		<g class="oreja oreja-izquierda">
			<path
				d="M78 78 L58 22 L102 58 Z"
				fill="var(--bluey)"
				stroke="var(--tinta)"
				stroke-width="5"
				stroke-linejoin="round"
			/>
			<path d="M74 68 L64 34 L92 58 Z" fill="#2a8fc4" />
		</g>
		<g class="oreja oreja-derecha">
			<path
				d="M162 78 L182 22 L138 58 Z"
				fill="var(--bluey)"
				stroke="var(--tinta)"
				stroke-width="5"
				stroke-linejoin="round"
			/>
			<path d="M166 68 L176 34 L148 58 Z" fill="#2a8fc4" />
		</g>

		<!-- Gorro de fiesta -->
		<path
			d="M120 18 L156 68 L84 68 Z"
			fill="var(--naranja)"
			stroke="var(--tinta)"
			stroke-width="5"
			stroke-linejoin="round"
		/>
		<path
			d="M88 64 q32 -10 64 0"
			fill="none"
			stroke="var(--tinta)"
			stroke-width="4"
			stroke-linecap="round"
		/>
		<circle cx="120" cy="16" r="10" fill="var(--amarillo)" stroke="var(--tinta)" stroke-width="5" />

		<!-- Cuerpo tipo heeler -->
		<path
			d="M120 62
			   C 166 60, 200 94, 199 136
			   C 198 178, 166 208, 122 209
			   C 78 210, 42 180, 41 138
			   C 40 96, 74 64, 120 62 Z"
			fill="var(--bluey)"
			stroke="var(--tinta)"
			stroke-width="6"
			stroke-linejoin="round"
		/>

		<!-- Manchas tipo heeler -->
		<path
			d="M62 110 q16 -8 28 4 q-6 16 -24 16 q-14 0 -18 -12 q4 -6 14 -8"
			fill="#2a8fc4"
			opacity="0.7"
		/>
		<path
			d="M170 160 q14 4 22 16 q-10 10 -24 6 q-12 -4 -12 -14 q6 -10 14 -8"
			fill="#2a8fc4"
			opacity="0.7"
		/>

		<!-- Panza más clara -->
		<ellipse cx="120" cy="155" rx="42" ry="34" fill="#b8e6f5" />

		<!-- Ojos -->
		<g fill="#fff" stroke="var(--tinta)" stroke-width="4">
			<ellipse cx="94" cy="118" rx="14" ry="18" />
			<ellipse cx="146" cy="118" rx="14" ry="18" />
		</g>
		<g class="ojo ojo-izquierdo">
			<ellipse cx="96" cy="118" rx="7" ry="10" fill="var(--tinta)" />
			<circle cx="99" cy="114" r="3" fill="#fff" />
		</g>
		<g class="ojo ojo-derecho">
			<ellipse cx="148" cy="118" rx="7" ry="10" fill="var(--tinta)" />
			<circle cx="151" cy="114" r="3" fill="#fff" />
		</g>

		<!-- Hocico -->
		<path
			d="M108 144 q12 10 24 0"
			fill="none"
			stroke="var(--tinta)"
			stroke-width="4"
			stroke-linecap="round"
		/>
		<ellipse cx="120" cy="138" rx="10" ry="7" fill="var(--tinta)" />

		<!-- Sonrisa + mejillas -->
		<path
			d="M92 158 q28 24 56 0"
			fill="none"
			stroke="var(--tinta)"
			stroke-width="5"
			stroke-linecap="round"
		/>
		<g fill="var(--rosa)" opacity="0.7">
			<ellipse cx="72" cy="154" rx="12" ry="8" />
			<ellipse cx="168" cy="154" rx="12" ry="8" />
		</g>

		<!-- Manito saludando -->
		<g class="mano">
			<path
				d="M182 170 q26 -8 30 -30"
				fill="none"
				stroke="var(--tinta)"
				stroke-width="5"
				stroke-linecap="round"
			/>
			<circle cx="214" cy="136" r="10" fill="var(--bluey)" stroke="var(--tinta)" stroke-width="5" />
		</g>

		<!-- Patas -->
		<ellipse
			cx="86"
			cy="205"
			rx="14"
			ry="10"
			fill="var(--bluey)"
			stroke="var(--tinta)"
			stroke-width="4"
		/>
		<ellipse
			cx="154"
			cy="205"
			rx="14"
			ry="10"
			fill="var(--bluey)"
			stroke="var(--tinta)"
			stroke-width="4"
		/>
	</svg>
{/if}

<style>
	/*
		Movimientos propios, independientes del flujo: rebote del cuerpo, orejas
		que se menan, cola que waggea, ojos que parpadean y mano que saluda.

		⚠️ Todo esto va DENTRO del guard de reduced-motion. El comentario viejo
		de este bloque decía "se apagan con prefers-reduced-motion vía la regla
		global de app.css", y no era verdad: no había tal regla, y las animaciones
		corrieron siempre. Un ojo que parpadea cada 3.5s es exactamente el tipo de
		movimiento perpetuo que dispara el motion sickness y el que un usuario de
		"reducir movimiento" pidió explícitamente que no pase.
	*/
	@media (prefers-reduced-motion: no-preference) {
		/*
			El rebote suave SIN escala deforme (solo translateY + scale uniforme)
			para que ni el SVG ni la imagen se vean aplastados al saltar.
		*/
		.mascota {
			animation: flotar 2.8s var(--ease-out) infinite;
		}

		:global(.mascota .oreja) {
			animation: wiggle 2.2s var(--ease-wiggle) infinite;
		}
		:global(.mascota .oreja-derecha) {
			animation-delay: -0.4s;
		}

		:global(.mascota .cola) {
			animation: wag 0.7s var(--ease-wiggle) infinite;
		}

		:global(.mascota .ojo) {
			animation: blink 3.5s ease-in-out infinite;
		}
		:global(.mascota .ojo-derecho) {
			animation-delay: -0.1s;
		}

		:global(.mascota .mano) {
			animation: saludar 2.8s var(--ease-out) infinite;
		}
	}

	/*
		`overflow: visible` está FUERA del guard a propósito: las orejas, la cola
		y la mano salen del viewBox. Es geometría, no animación, y tiene que
		aplicarse siempre.
	*/
	.mascota {
		overflow: visible;
		transform-origin: 120px 200px;
	}

	/*
		`width`/`height` HTML explícitos arriba (no solo el CSS) para que el
		browser reserve el espacio antes de descargar la imagen. Sin esto, el
		bloque crece cuando la imagen carga y el paso se recentra solo (con el
		deck, un salto de layout es un salto visible de todo el contenido).
	*/
	.mascota-img {
		display: block;
		overflow: visible;
		/* Para una <img> el origen tiene que ser el centro de abajo. */
		transform-origin: 50% 85%;
	}

	@media (prefers-reduced-motion: no-preference) {
		.mascota-img {
			animation: flotar 2.8s var(--ease-out) infinite;
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

	@keyframes saludar {
		0%,
		55%,
		100% {
			transform: rotate(0deg);
		}
		65% {
			transform: rotate(-10deg);
		}
		78% {
			transform: rotate(7deg);
		}
		88% {
			transform: rotate(-4deg);
		}
	}
</style>
