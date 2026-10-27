<script lang="ts">
	import { onMount } from 'svelte';
	import Boton from '../Boton.svelte';
	import Contador from '../Contador.svelte';
	import Seccion from '../Seccion.svelte';
	import { confeti } from '$lib/animacion';
	import { firebaseConfigurado } from '$lib/firebase/client';
	import {
		leerRsvp,
		guardarRsvp,
		MAX_NINAS,
		MAX_NINOS,
		RsvpInvalidoError,
		type ErroresRsvp
	} from '$lib/firebase/rsvp';
	import { irA } from '$lib/flujo.svelte';

	const CLAVE_BORRADOR = 'invitacion:rsvp:borrador';

	let nombre = $state('');
	let ninos = $state(0);
	let ninas = $state(0);
	let errores = $state<ErroresRsvp>({});
	let enviando = $state(false);
	let yaRespondio = $state(false);
	/** Snapshot de lo que se está por mandar, para detectarlo si ya hay respuesta. */
	let seEditando = $state(false);

	const hayAlgo = $derived(nombre.trim() !== '' || ninos > 0 || ninas > 0);
	const totalNinos = $derived(ninos + ninas);

	// Autoguardado: perder un form a medio llenar en el teléfono es de las
	// peores experiencias que puede tener un invitado. El deck no scrollea, pero
	// un paso más alto que la pantalla sí, y en Android cerrar la app a la
	// mitad del form es commonplace. Va a sessionStorage, que sobrevive al
	// refresh pero no al cierre de la pestaña.
	$effect(() => {
		if (!hayAlgo) return;
		sessionStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ nombre, ninos, ninas }));
	});

	onMount(async () => {
		// 1. Borrador local (por si quedó a medio llenar en otra pestaña).
		const crudo = sessionStorage.getItem(CLAVE_BORRADOR);
		if (crudo) {
			try {
				const b = JSON.parse(crudo);
				nombre = b.nombre ?? '';
				ninos = b.ninos ?? 0;
				ninas = b.ninas ?? 0;
			} catch {
				sessionStorage.removeItem(CLAVE_BORRADOR);
			}
		}

		// 2. Respuesta ya enviada desde este dispositivo (RSVP editable).
		if (!firebaseConfigurado()) return;
		try {
			const previo = await leerRsvp();
			if (!previo) return;
			yaRespondio = true;
			if (previo.asistira) {
				nombre = previo.nombre;
				ninos = previo.ninos;
				ninas = previo.ninas;
			}
		} catch {
			// Sin Firebase (o sin emulador) el form sigue siendo usable: solo
			// pierde la persistencia. Noitamos abajo con el aviso de config.
		}
	});

	async function enviar(e: SubmitEvent) {
		e.preventDefault();
		if (enviando) return;

		errores = {};
		enviando = true;
		try {
			await guardarRsvp({ nombre, ninos, ninas, asistira: true });
			sessionStorage.removeItem(CLAVE_BORRADOR);
			yaRespondio = true;
			seEditando = false;
			// El confeti va antes del salto, por la misma razón que en el "Sí":
			// si el paso cambia primero, la ráfaga nace con la confirmación
			// todavía sin aparecer.
			confeti();
			irA('listo');
		} catch (err) {
			errores = erroresDe(err);
		} finally {
			enviando = false;
		}
	}

	/**
	 * Separa "te equivocaste vos" de "no pudimos guardar". Un `RsvpInvalidoError`
	 * ya viene con los errores atribuidos a su campo; cualquier otra cosa es
	 * red, permisos o Firebase sin configurar, y no va arriba del input de
	 * nombre. Traducir el `message` crudo de Firebase al usuario le diría
	 * "Missing or insufficient permissions", que no le dice nada a una mamá.
	 */
	function erroresDe(err: unknown): ErroresRsvp {
		if (err instanceof RsvpInvalidoError) return err.errores;
		return { general: 'No pudimos guardar tu respuesta. Revisá la conexión y probá de nuevo.' };
	}
</script>

<Seccion tono="crema-2">
	<h2>¿Quién viene?</h2>
	<p class="bajada">Dejanos tu nombre y cuántos chiquis te acompañan.</p>

	{#if yaRespondio && !seEditando}
		<div class="aviso" role="status">
			<p>Ya respondiste. Si querés cambiar algo, editá abajo y guardá de nuevo.</p>
			<Boton variante="fantasia" onclick={() => (seEditando = true)}>Editar respuesta</Boton>
		</div>
	{:else}
		<form class="form" onsubmit={enviar} novalidate>
			<div class="campo">
				<label for="nombre">Tu nombre</label>
				<input
					id="nombre"
					name="nombre"
					type="text"
					autocomplete="name"
					enterkeyhint="done"
					maxlength="60"
					placeholder="Ej: Familia García"
					bind:value={nombre}
					aria-invalid={errores.nombre ? 'true' : undefined}
					aria-describedby={errores.nombre ? 'nombre-error' : undefined}
				/>
				{#if errores.nombre}
					<p class="error" id="nombre-error">{errores.nombre}</p>
				{/if}
			</div>

			<div class="counters">
				<Contador
					id="ninos"
					etiqueta="niños"
					emoji="🧒"
					bind:valor={ninos}
					max={MAX_NINOS}
					error={errores.ninos}
				/>
				<Contador
					id="ninas"
					etiqueta="niñas"
					emoji="👧"
					bind:valor={ninas}
					max={MAX_NINAS}
					error={errores.ninas}
				/>
			</div>

			{#if totalNinos > 0}
				<p class="resumen" aria-live="polite">
					{#if totalNinos === 1}
						Vamos con 1 chiquin.
					{:else}
						Vamos con {totalNinos} chiquines.
					{/if}
				</p>
			{/if}

			<!-- `role="alert"` para que el lector de pantalla lo anuncie apenas
				aparece: si el fallo es de red, el invitado no va a notar nada
				en la pantalla y va a creer que se guardó. -->
			{#if errores.general}
				<p class="error-general" role="alert">{errores.general}</p>
			{/if}

			{#if !firebaseConfigurado()}
				<p class="aviso-config" role="alert">
					Falta configurar Firebase (ver <code>.env.example</code>). El form anda, pero la respuesta
					no se va a guardar.
				</p>
			{/if}

			<div class="acciones">
				<Boton tipo="submit" variante="primario" tamano="grande" disabled={enviando}>
					{enviando ? 'Guardando…' : yaRespondio ? 'Guardar cambios' : '¡Listo, ahí vamos!'}
				</Boton>
			</div>
		</form>
	{/if}

	<p class="pie">¿Podés venir de visita y no vas a poder quedarte? Avisanos igual.</p>
</Seccion>

<style>
	h2 {
		font-size: clamp(2rem, 6vw, 3.4rem);
	}

	.bajada {
		color: var(--tinta-suave);
		max-width: 38ch;
	}

	.form {
		width: 100%;
		max-width: 34rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.campo {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		text-align: left;
	}

	label {
		font-family: 'Fredoka Variable', system-ui, sans-serif;
		font-weight: 600;
		font-size: 1.1rem;
	}

	input[type='text'] {
		font: inherit;
		padding: 0.95rem 1.1rem;
		border: var(--borde);
		border-radius: var(--radio-chico);
		background: var(--crema);
		color: var(--tinta);
		/* 16px mínimo: con menos, iOS hace zoom al enfocar. */
		font-size: max(1rem, 16px);
		transition:
			box-shadow 0.15s var(--ease-out),
			transform 0.15s var(--ease-out);
	}

	input[type='text']:focus-visible {
		outline: 3px solid var(--bluey);
		outline-offset: 2px;
		box-shadow: 0 4px 0 rgba(30, 58, 95, 0.1);
		transform: translateY(-2px);
	}

	.counters {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
		gap: 1.25rem;
	}

	.resumen {
		font-weight: 600;
		color: var(--menta);
	}

	.error {
		color: var(--coral-oscuro);
		font-size: 0.9rem;
		font-weight: 600;
	}

	.error-general {
		padding: 0.85rem 1.1rem;
		border: 2px solid var(--coral);
		border-radius: var(--radio-chico);
		background: #ffeceb;
		color: var(--coral-oscuro);
		font-size: 0.95rem;
		font-weight: 600;
		text-align: left;
	}

	.aviso,
	.aviso-config {
		padding: 1rem 1.25rem;
		border-radius: var(--radio-chico);
		font-size: 0.95rem;
	}

	.aviso {
		background: #e6fbf8;
		border: 2px solid var(--menta);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.aviso-config {
		background: #fff3d6;
		border: 2px solid var(--amarillo);
		text-align: left;
	}

	.acciones {
		display: flex;
		justify-content: center;
	}

	.pie {
		color: var(--tinta-suave);
		font-size: 0.9rem;
		max-width: 36ch;
	}
</style>

