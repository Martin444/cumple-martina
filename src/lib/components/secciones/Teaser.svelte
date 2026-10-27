<script lang="ts">
	import Seccion from '../Seccion.svelte';
	import Boton from '../Boton.svelte';
	import Personaje from '../Personaje.svelte';
	import { siguiente } from '$lib/flujo.svelte';

	const conceptos = [
		{ emoji: '🎵', titulo: 'Música', texto: 'La playlist la armar vos,obviously.' },
		{ emoji: '🎮', titulo: 'Juegos', texto: 'De todo, y algunos con premio.' },
		{ emoji: '🎈', titulo: 'Fiesta', texto: 'Cero estructura, cien por ciento caos.' }
	];
</script>

<Seccion tono="menta">
	<h2>Abrí música, juegos y mucha diversión</h2>

	<p class="bajada">Va a haber de todo. Este es el plan, y el plan es no tener plan.</p>

	<Personaje
		src="/Mf3.png"
		alt="Bluey, Muffin y Bingo listos para jugar"
		tamano={180}
		posicion="centro"
	/>

	<ul class="rejilla">
		{#each conceptos as concepto (concepto.titulo)}
			<li class="tarjeta">
				<span class="emoji" aria-hidden="true">{concepto.emoji}</span>
				<h3>{concepto.titulo}</h3>
				<p>{concepto.texto}</p>
			</li>
		{/each}
	</ul>

	<div class="acciones">
		<Boton variante="primario" onclick={siguiente}>Ver cuándo y dónde</Boton>
	</div>
</Seccion>

<style>
	h2 {
		font-size: clamp(2rem, 6vw, 3.6rem);
		max-width: 20ch;
	}

	.bajada {
		color: var(--tinta-suave);
		max-width: 40ch;
	}

	.rejilla {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: clamp(0.75rem, 2.5vw, 1.25rem);
		width: 100%;
		max-width: 60rem;
	}

	.tarjeta {
		background: var(--carta-fuerte);
		border: var(--borde);
		border-radius: var(--radio);
		padding: clamp(1rem, 2.5vw, 1.75rem);
		box-shadow: var(--sombra);
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		transition:
			transform 0.2s var(--ease-bounce),
			box-shadow 0.2s var(--ease-out);
	}

	.tarjeta:hover {
		transform: rotate(0deg) translateY(-4px) scale(1.02);
		box-shadow: var(--sombra-hover);
	}

	/* Rotación alternada: tarjetitas que parecen dibujadas a mano. */
	.tarjeta:nth-child(2) {
		transform: rotate(1.6deg);
	}
	.tarjeta:nth-child(2):hover {
		transform: translateY(-4px) scale(1.02);
	}
	.tarjeta:nth-child(3) {
		transform: rotate(-1.4deg);
	}
	.tarjeta:nth-child(3):hover {
		transform: translateY(-4px) scale(1.02);
	}

	.emoji {
		font-size: clamp(2rem, 6vw, 2.8rem);
		line-height: 1;
	}

	.tarjeta h3 {
		font-size: clamp(1.15rem, 4vw, 1.5rem);
	}

	.tarjeta p {
		color: var(--tinta-suave);
		font-size: clamp(0.85rem, 2.5vw, 0.98rem);
	}

	/* En mobile apilamos más compacto para que las 3 tarjetas entren. */
	@media (max-width: 30rem) {
		.rejilla {
			grid-template-columns: 1fr;
			gap: 0.6rem;
		}

		.tarjeta {
			padding: 0.85rem 1rem;
			gap: 0.2rem;
		}
	}

	.acciones {
		display: flex;
		justify-content: center;
	}
</style>
