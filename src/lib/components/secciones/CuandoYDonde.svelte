<script lang="ts">
	import Boton from '../Boton.svelte';
	import Seccion from '../Seccion.svelte';
	import { evento, hayFecha, hayLugar, tbc, urlComoLlegar } from '$lib/config/evento';
	import { siguiente } from '$lib/flujo.svelte';
</script>

<Seccion tono="cielo">
	<h2>¿Cuándo y dónde?</h2>

	<div class="tarjetas">
		<article class="dato">
			<span class="icono" aria-hidden="true">🗓️</span>
			<h3>Fecha</h3>
			{#if hayFecha}
				<p class="valor">{evento.fecha.dia}</p>
				<p class="nota">{evento.fecha.hora}</p>
			{:else}
				<!-- TBC: sale del config, no está hardcodeado acá. Cuando lo
					confirmen se edita src/lib/config/evento.ts y esto se resuelve. -->
				<p class="valor tbc">{tbc.fecha}</p>
				<p class="nota">Te avisamos apenas esté</p>
			{/if}
		</article>

		<article class="dato">
			<span class="icono" aria-hidden="true">📍</span>
			<h3>Lugar</h3>
			{#if hayLugar}
				<p class="valor">{evento.lugar.nombre}</p>
				<p class="nota">{evento.lugar.direccion}</p>
			{:else}
				<p class="valor tbc">{tbc.lugar}</p>
				<p class="nota">Te avisamos apenas esté</p>
			{/if}
		</article>
	</div>

	<!--
		Mapa: sin embed de Google. El embed es un iframe pesado, con su propia
		política de cookies, y rompe la estética de la invitación. Con la URL de
		intents el invitado abre su app de mapas nativa, que es lo que quiere la
		gente cuando va a un cumple. Cuando se confirme la ubicación, se cambia
		una línea en el config y el botón funciona solo.
	-->
	<div class="mapa">
		<p class="mapa-texto">El lugar todavía se está confirmando</p>
		<Boton variante="fantasia" href={urlComoLlegar}>
			<span class="pin" aria-hidden="true">📍</span> Cómo llegar
		</Boton>
		<p class="mapa-nota">Te lo actualizamos en cuanto esté confirmado.</p>
	</div>

	<div class="acciones">
		<Boton variante="primario" onclick={siguiente}>Confirmar asistencia</Boton>
	</div>
</Seccion>

<style>
	h2 {
		font-size: clamp(2rem, 6vw, 3.6rem);
	}

	.tarjetas {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: clamp(0.75rem, 2.5vw, 1.25rem);
		width: 100%;
		max-width: 56rem;
	}

	.dato {
		background: var(--carta-fuerte);
		border: var(--borde);
		border-radius: var(--radio);
		padding: clamp(0.9rem, 2.5vw, 1.75rem);
		box-shadow: var(--sombra);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		transition:
			transform 0.2s var(--ease-bounce),
			box-shadow 0.2s var(--ease-out);
	}

	.dato:hover {
		transform: translateY(-4px) scale(1.02);
		box-shadow: var(--sombra-hover);
	}

	.icono {
		font-size: clamp(1.8rem, 5vw, 2.4rem);
		line-height: 1;
	}

	.dato h3 {
		font-size: clamp(1.15rem, 4vw, 1.4rem);
	}

	.valor {
		font-family: 'Fredoka Variable', system-ui, sans-serif;
		font-size: clamp(1rem, 3vw, 1.25rem);
		font-weight: 600;
	}

	.tbc {
		color: var(--tinta-suave);
		font-style: italic;
	}

	.nota {
		color: var(--tinta-suave);
		font-size: clamp(0.8rem, 2.5vw, 0.92rem);
	}

	.mapa {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.45rem;
		padding: clamp(1rem, 3vw, 2rem);
		border: 3px dashed rgba(31, 37, 68, 0.28);
		border-radius: var(--radio);
		background: var(--carta);
		width: 100%;
		max-width: 44rem;
	}

	.mapa-texto {
		font-family: 'Fredoka Variable', system-ui, sans-serif;
		font-size: clamp(1rem, 3vw, 1.2rem);
	}

	.mapa-nota {
		font-size: clamp(0.78rem, 2.5vw, 0.88rem);
		color: var(--tinta-suave);
	}

	@media (max-width: 30rem) {
		.tarjetas {
			grid-template-columns: 1fr;
			gap: 0.6rem;
		}

		.dato {
			padding: 0.85rem 1rem;
		}

		.mapa {
			padding: 0.85rem 1rem;
		}
	}

	.pin {
		font-size: 1.1em;
	}

	.acciones {
		display: flex;
		justify-content: center;
	}
</style>
