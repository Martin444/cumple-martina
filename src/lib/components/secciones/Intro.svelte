<script lang="ts">
	import Boton from '../Boton.svelte';
	import Mascota from '../Mascota.svelte';
	import Seccion from '../Seccion.svelte';
	import { evento } from '$lib/config/evento';
	import { siguiente } from '$lib/flujo.svelte';
</script>

<Seccion tono="crema">
	<p class="arranque">Van a celebrar algo muy importante</p>

	<h1 class="titulo">
		Vamos a celebrar el cumpleaños de
		<span class="nombre">{evento.nombre}</span>
	</h1>

	<div class="mascota-wrap">
		<!--
			El halo y el blob van acá adentro y NO animados por GSAP.

			Antes eran de GSAP: su parallax estaba atado al scroll con
			ScrollTrigger. Ese scroll ya no existe, así que pasaron a breathe con
			keyframes de CSS, que es exactamente lo que corresponde para algo
			decorativo y por tiempo.

			También dejan de ser `data-gsap`: la convención de "un solo dueño por
			elemento" sigue valiendo, y ahora el dueño del bloque es `entrarPaso`.
		-->
		<div class="halo" aria-hidden="true"></div>
		<div class="fondo-mascota" aria-hidden="true"></div>

		<Mascota tamano={230} />
	</div>

	<p class="chiste">Ya cumple {evento.edad} años y no para quieta.</p>

	<div class="acciones">
		<Boton variante="primario" onclick={siguiente}>Ver la invitación</Boton>
	</div>

	<p class="hint" aria-hidden="true">Deslizá, o usá las flechas del teclado</p>
</Seccion>

<style>
	.arranque {
		font-family: 'Fredoka Variable', system-ui, sans-serif;
		font-size: clamp(0.95rem, 2.2vw, 1.15rem);
		color: var(--tinta-suave);
		letter-spacing: 0.02em;
	}

	.titulo {
		font-size: clamp(2.2rem, 8vw, 5rem);
		max-width: 18ch;
	}

	.nombre {
		display: inline-block;
		color: var(--bluey);
		/* Subrayado "a mano", con una leve inclinación para que no parezca recto. */
		text-decoration: underline wavy var(--bluey-oscuro) 0.08em;
		text-underline-offset: 0.18em;
		transform: rotate(-1.5deg);
	}

	.mascota-wrap {
		position: relative;
		margin-block: 0.5rem;
		display: grid;
		place-items: center;
	}

	/*
		El halo y el blob son decoración pura. Se quedan quietos y visibles si no
		hay animación: son formas, no información. Nunca `opacity: 0` de base,
		porque quedaría un agujero en la intro.
	*/
	.halo,
	.fondo-mascota {
		position: absolute;
		pointer-events: none;
	}

	.halo {
		width: 15rem;
		height: 15rem;
		border: 4px dashed rgba(79, 184, 232, 0.45);
		border-radius: 50%;
	}

	.fondo-mascota {
		width: 22rem;
		height: 22rem;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(79, 184, 232, 0.35) 0%, rgba(79, 184, 232, 0) 70%);
	}

	.chiste {
		color: var(--tinta-suave);
		font-size: 1.05rem;
		max-width: 36ch;
	}

	.acciones {
		display: flex;
		justify-content: center;
	}

	.hint {
		margin-top: 0.5rem;
		font-size: 0.85rem;
		color: var(--tinta-suave);
		opacity: 0.8;
	}

	/* En pantallas chicas el halo y el blob se achican: con el tamaño fijo de
	   arriba, en un mobile de 360px el blob de 22rem se comía el texto. */
	@media (max-width: 30rem) {
		.halo {
			width: 11rem;
			height: 11rem;
		}

		.fondo-mascota {
			width: 16rem;
			height: 16rem;
		}
	}

	/* El halo gira lento y continuo. Con el scroll no tenía sentido (se movía
	   con el scroll); ahora es un reloj, y 26s es lo bastante lento para que se
	   lea como vivo y no como girando. */
	@media (prefers-reduced-motion: no-preference) {
		.halo {
			animation: girar 26s linear infinite;
		}

		.fondo-mascota {
			animation: latir 7s var(--ease-wiggle) infinite;
		}
	}

	@keyframes girar {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes latir {
		0%,
		100% {
			transform: scale(1);
			opacity: 0.9;
		}
		50% {
			transform: scale(1.06);
			opacity: 1;
		}
	}
</style>
