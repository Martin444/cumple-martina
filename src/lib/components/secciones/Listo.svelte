<script lang="ts">
	import Boton from '../Boton.svelte';
	import Mascota from '../Mascota.svelte';
	import Seccion from '../Seccion.svelte';
	import { evento, hayFecha, hayLugar, tbc } from '$lib/config/evento';
	import { anterior } from '$lib/flujo.svelte';
</script>

<Seccion tono="crema">
	<div class="mascota-wrap">
		<Mascota tamano={190} />
	</div>

	<h2>¡Anotado!</h2>

	<p class="bajada">
		Gracias por confirmar. Cuando se definan los detalles te los pasamos por acá.
	</p>

	<ul class="resumen">
		{#if hayFecha}
			<li>🗓️ {evento.fecha.dia} · {evento.fecha.hora}</li>
		{:else}
			<li>🗓️ {tbc.fecha}</li>
		{/if}
		{#if hayLugar}
			<li>📍 {evento.lugar.nombre}</li>
		{:else}
			<li>📍 {tbc.lugar}</li>
		{/if}
	</ul>

	<div class="acciones">
		<Boton variante="secundario" onclick={anterior}>Cambiar mi respuesta</Boton>
	</div>

	<!--
		El crédito del arte va ACÁ, y no en un `<footer>` de la página.

		El deck es de altura fija: ni el html ni el body scrollean, así que un
		footer abajo de todo queda fuera de la pantalla y es inalcanzable — ni
		siquiera scrolleando. El aviso legal de un asset con copyright tiene que
		estar donde el invitado lo puede ver, y el final del recorrido es el
		lugar honesto: es donde la invitación se termina.

		Sale de `config/evento.ts` y no está hardcodeado, para que cambiar de
		ilustración no deje una línea de crédito que ya no corresponde.

		`&copy;` y no el carácter literal: el archivo se commitea en UTF-8 y el
		`©` sin escapar sobrevive, pero la entidad sobrevive siempre.
	-->
	{#if evento.arte.credito}
		<footer class="credito">
			<p>{evento.arte.credito}</p>
		</footer>
	{/if}
</Seccion>

<style>
	.mascota-wrap {
		margin-bottom: 0.5rem;
	}

	h2 {
		font-size: clamp(2.4rem, 7vw, 4rem);
		color: var(--bluey-oscuro);
	}

	.bajada {
		color: var(--tinta-suave);
		max-width: 36ch;
	}

	.resumen {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
	}

	.resumen li {
		padding: 0.6rem 1.2rem;
		border: 2px solid rgba(31, 37, 68, 0.16);
		border-radius: 999px;
		background: var(--carta);
		font-weight: 600;
	}

	.acciones {
		display: flex;
		justify-content: center;
	}

	/*
		El crédito se ve, pero no compite con el mensaje. Chiquito y con poco
		contraste a propósito: tiene que estar presente (es un aviso legal) sin
		convertir el final de la invitación en un pie de fotolegal.
	*/
	.credito {
		margin-top: auto;
		padding-top: 1rem;
		font-size: 0.75rem;
		color: var(--tinta-suave);
		opacity: 0.75;
		max-width: 46ch;
		text-wrap: balance;
	}
</style>
