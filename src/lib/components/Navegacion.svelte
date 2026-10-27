<script lang="ts">
	import { anterior, flujo, ir, siguiente } from '$lib/flujo.svelte';
	import { PASOS } from '$lib/pasos';

	/**
	 * Cromo del deck: atrás, puntos de progreso, adelante.
	 *
	 * Los puntos solo se activan para los pasos YA vistos. Es la pieza que
	 * hace que el flujo sea un flujo y no un menú: podés volver sobre lo que
	 * leíste, pero no saltear al final. Un `disabled` real (y no solo
	 * `aria-disabled`) porque un punto que no hace nada no debe ser tabulable:
	 * el teclado no debería pasar por algo que no le sirve.
	 *
	 * `role="progressbar"` no: no es una barra de progreso, es un índice. El
	 * avance real ya lo anuncia la región `aria-live` de +page.svelte.
	 */
	const tituloActual = $derived(PASOS[flujo.indice].titulo);
</script>

<nav class="barra" aria-label="Navegación de la invitación">
	<button
		type="button"
		class="flecha"
		onclick={anterior}
		disabled={flujo.esPrimero}
		aria-label="Volver al paso anterior"
	>
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path
				d="M15 5 L8 12 L15 19"
				fill="none"
				stroke="currentColor"
				stroke-width="3"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</button>

	<ol class="puntos">
		{#each PASOS as paso, i (paso.id)}
			{@const estado = i === flujo.indice ? 'actual' : i < flujo.masLejos ? 'visto' : 'futuro'}
			<li>
				<button
					type="button"
					class="punto"
					data-estado={estado}
					onclick={() => ir(i)}
					disabled={!flujo.puedeIrA(i)}
					aria-current={i === flujo.indice ? 'step' : undefined}
				>
					<!--
						El check del paso ya visto es un SVG, no el carácter "✓": el
						emoji se ve distinto en cada SO y rompe la línea de base
						del punto al lado.
					-->
					{#if estado === 'visto'}
						<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
							<path
								d="M5 12.5 L10 17.5 L19 7"
								fill="none"
								stroke="currentColor"
								stroke-width="3.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					{:else}
						<span class="gato" aria-hidden="true"></span>
					{/if}
					<span class="sr-only">
						{i + 1}. {paso.titulo}{estado === 'futuro' ? ' (todavía no llegaste)' : ''}
					</span>
				</button>
			</li>
		{/each}
	</ol>

	<!--
		El botón de adelante se oculta (no se deshabilita) en el form: acá no hay
		"el siguiente", hay "guardá tu respuesta", y un botón que no hace nada
		invita a probarlo. El padding del hueco lo hace el `<ol>` de al lado,
		así la barra no se descentra al desaparecer.
	-->
	{#if flujo.puedeAvanzar}
		<button type="button" class="flecha" onclick={siguiente} aria-label="Ir al paso siguiente">
			<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
				<path
					d="M9 5 L16 12 L9 19"
					fill="none"
					stroke="currentColor"
					stroke-width="3"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
	{:else}
		<span class="hueco" aria-hidden="true"></span>
	{/if}

	<span class="sr-only" aria-live="polite">
		Paso {flujo.indice + 1} de {flujo.total}: {tituloActual}
	</span>
</nav>

<style>
	.barra {
		position: fixed;
		inset-block-end: 0;
		inset-inline: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: clamp(0.5rem, 2vw, 1rem);
		padding: 0.65rem clamp(0.75rem, 3vw, 1.25rem);
		/*
			`env(safe-area-inset-bottom)`: en un iPhone con home indicator la barra
			queda arriba del palpador, y sin esto el último punto queda
			justo debajo. Es la razón de que el ancho de la barra no se pueda
			definir con un padding fijo.
		*/
		padding-block-end: calc(0.65rem + env(safe-area-inset-bottom, 0px));
		/*
			El degradado de arriba es lo que hace legible la barra sobre las olas.
			Sin él, las olas pasa por detrás de los puntos y el contraste depende
			de dónde esté la curva.
		*/
		background: linear-gradient(to top, rgba(234, 246, 255, 0.96) 40%, rgba(234, 246, 255, 0));
		pointer-events: none;
	}

	/* Los hijos sí reciben eventos: el contenedor no, para no tapar los clicks
	   del paso que quedan por encima del degradado. */
	.flecha,
	.puntos {
		pointer-events: auto;
	}

	.flecha {
		flex: 0 0 auto;
		/* 44px: el mínimo táctil comfortable, en un objetivo de 48 es mejor
		   pero acá la barra ya tiene los puntos y no queremos que ocupe media
		   pantalla en un teléfono de 360px. */
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
			background 0.18s;
	}

	.flecha svg {
		width: 22px;
		height: 22px;
	}

	.flecha:hover:not(:disabled) {
		background: var(--bluey);
		color: #fff;
		transform: scale(1.08);
	}

	.flecha:active:not(:disabled) {
		transform: scale(0.94);
	}

	.flecha:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	/* Mantiene la barra centrada cuando el botón de adelante no existe. */
	.hueco {
		flex: 0 0 auto;
		width: 44px;
		height: 44px;
	}

	.puntos {
		display: flex;
		align-items: center;
		gap: clamp(0.35rem, 1.5vw, 0.6rem);
		list-style: none;
		margin: 0;
		padding: 0.4rem 0.6rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.86);
		border: 2px solid var(--tinta);
	}

	.punto {
		width: 28px;
		height: 28px;
		display: grid;
		place-items: center;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--tinta);
		transition:
			transform 0.2s var(--ease-bounce),
			background 0.2s;
	}

	.punto svg {
		width: 15px;
		height: 15px;
	}

	/* El "gato" del punto vacío: un disco, no un anillo. El anillo se lee como
	   un botón deshabilitado; el disco, como un paso pendiente. */
	.gato {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: rgba(30, 58, 95, 0.22);
		transition:
			width 0.2s var(--ease-out),
			height 0.2s var(--ease-out),
			background 0.2s;
	}

	[data-estado='actual'] {
		background: var(--bluey);
		color: #fff;
		transform: scale(1.15);
	}

	/* El paso actual se estira en vez de ser un punto más grande: la diferencia
	   de forma (círculo → cápsula) se lee de un vistazo, y del color solo no. */
	[data-estado='actual'] .gato {
		width: 20px;
		height: 10px;
		border-radius: 999px;
		background: #fff;
	}

	[data-estado='visto'] {
		background: rgba(79, 184, 232, 0.2);
		color: var(--bluey-oscuro);
	}

	[data-estado='visto']:hover {
		transform: scale(1.15);
		background: var(--bluey);
		color: #fff;
	}

	[data-estado='futuro'] {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
