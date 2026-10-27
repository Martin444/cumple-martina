<script lang="ts">
	import Boton from '../Boton.svelte';
	import Personaje from '../Personaje.svelte';
	import Seccion from '../Seccion.svelte';
	import { confeti } from '$lib/animacion';
	import { firebaseConfigurado } from '$lib/firebase/client';
	import { guardarRsvp } from '$lib/firebase/rsvp';
	import { siguiente } from '$lib/flujo.svelte';

	let uriA = $state(false);

	/**
	 * El "Sí" dispara el confeti y después avanza al paso siguiente.
	 *
	 * El orden importa: primero el confeti, porque si el cambio de paso dispara
	 * primero la ráfaga nace con la sección nueva ya en pantalla y se ve como si
	 * explotara en cualquier lado.
	 *
	 * ⚠️ Este es el ÚNICO punto de la página donde se puede pedir audio: es un
	 * click real del usuario, y los browsers bloquearían cualquier autoplay
	 * aunque se dispare al cambiar de paso.
	 */
	function siVoy() {
		confeti();
		siguiente();
	}

	async function noVoy() {
		uriA = true;
		// El "No" también se guarda: sirve para saber a quién escribirle y para
		// distinguir "no viene" de "todavía no respondió". Si no hay Firebase
		// configurado, el mensaje igual se muestra: la UI nunca depende de la red.
		if (!firebaseConfigurado()) return;
		try {
			await guardarRsvp({ nombre: '', ninos: 0, ninas: 0, asistira: false });
		} catch {
			// Idempotente y no bloqueante: el invitado ya decidió, el registro es
			// un extra. Fallar en silencio acá es correcto.
		}
	}
</script>

<Seccion tono="rosa">
	<Personaje src="/bingo.png" alt="Bingo te invita a la fiesta" tamano={150} posicion="centro" />

	<p class="pregunta">¿Nos acompañás?</p>

	<p class="ayuda">Con un "sí" alcanza. Prometemos torta y cero aburrimiento.</p>

	<div class="acciones">
		<Boton variante="primario" tamano="grande" onclick={siVoy}>¡Sí, ahí voy!</Boton>
		<Boton variante="secundario" onclick={noVoy}>No puedo</Boton>
	</div>

	<!--
		Camino del "No": mensaje gracioso y sin culpa. No cierra la invitación ni
		bloquea el deck — el invitado puede seguir leyendo igual, y más adelante
		lo espera el form por si cambia de opinión (el RSVP es editable).
	-->
	{#if uriA}
		<div class="no" role="status">
			<p class="no-titulo">¡Ay, te la vas a perder!</p>
			<p class="no-texto">
				Martina va a estar celebrando con torta, juegos y un montón de caos. Ella va a estar feliz,
				pero nosotros te vamos a extrañar mucho.
			</p>
			<p class="no-chiste">Ojo: el que no va es el único que se queda sin el primer pedazo.</p>
			<div class="acciones-secundarias">
				<Boton
					variante="fantasia"
					onclick={() => {
						uriA = false;
						siVoy();
					}}>Bueno, reconsiderándolo...</Boton
				>
			</div>
		</div>
	{/if}
</Seccion>

<style>
	.pregunta {
		font-size: clamp(2.4rem, 7vw, 4.5rem);
	}

	.ayuda {
		color: var(--tinta-suave);
		font-size: 1.05rem;
		max-width: 34ch;
	}

	.acciones {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: center;
	}

	/* Un tilt leve en el segundo botón para que la fila no se vea mecánica. */
	.acciones :global(.boton:nth-child(2)) {
		transform: rotate(1.8deg);
	}

	.no {
		margin-top: 1rem;
		padding: clamp(1.25rem, 4vw, 2rem);
		border: var(--borde);
		border-radius: var(--radio);
		background: var(--carta-fuerte);
		max-width: 44ch;
		box-shadow: var(--sombra);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		animation: pop 0.45s var(--ease-bounce) both;
	}

	.no-titulo {
		font-size: clamp(1.4rem, 4vw, 2rem);
		color: var(--naranja-oscuro);
	}

	.no-texto,
	.no-chiste {
		color: var(--tinta-suave);
	}

	.no-chiste {
		font-style: italic;
		font-size: 0.95rem;
	}

	.acciones-secundarias {
		display: flex;
		justify-content: center;
		margin-top: 0.5rem;
	}
</style>
