/**
 * El deck: la lista ordenada de pasos de la invitación.
 *
 * Este archivo es el ÚNICO lugar donde existe el orden. Antes el orden vivía
 * implícito en el markup de `+page.svelte` y en el `id` de cada `<section>`;
 * con un slide deck eso ya no alcanza, porque el índice del paso ES el estado de
 * la navegación y tiene que poder compararse con un `id` para resolver un
 * `irA('formulario')`.
 *
 * Por eso el registro incluye el componente: el deck itera esta lista y no
 * escribe los `<section>` a mano. Agregar un paso es agregar una línea acá.
 */
import type { Component } from 'svelte';
import Acompanadas from '$lib/components/secciones/Acompanadas.svelte';
import CuandoYDonde from '$lib/components/secciones/CuandoYDonde.svelte';
import Formulario from '$lib/components/secciones/Formulario.svelte';
import Intro from '$lib/components/secciones/Intro.svelte';
import Listo from '$lib/components/secciones/Listo.svelte';
import Teaser from '$lib/components/secciones/Teaser.svelte';

export type Paso = {
	/** Ancla estable. La usan los CTA (`irA('formulario')`) y el config. */
	id: string;
	/**
	 * Etiqueta corta y legible: es lo que se lee en los puntos de progreso y
	 * lo que anuncia el lector de pantalla al cambiar de paso. Sin esto, un
	 * `aria-live` que dice "Paso 3 de 6" no le dice nada a nadie.
	 */
	titulo: string;
	Componente: Component;
	/**
	 * `false` bloquea el avance genérico en este paso: el botón "Siguiente" de
	 * la barra, las flechas del teclado y el swipe pasan a ser no-op.
	 *
	 * Existe para el form. Su CTA de adelante es "guardar", no "ir al paso
	 * siguiente": si el avance genérico funcionara ahí, un invitado con prisa
	 * podría saltear el RSVP sin dejar respuesta, que es justo el dato que la
	 * familia necesita. Los CTA explícitos (`irA('listo')` desde el submit) no
	 * pasan por esta bandera a propósito.
	 */
	avanza?: boolean;
};

export const PASOS: readonly Paso[] = [
	{ id: 'intro', titulo: 'La invitación', Componente: Intro },
	{ id: 'acompandas', titulo: '¿Nos acompañás?', Componente: Acompanadas },
	{ id: 'diversion', titulo: 'La fiesta', Componente: Teaser },
	{ id: 'cuando', titulo: 'Cuándo y dónde', Componente: CuandoYDonde },
	{ id: 'formulario', titulo: 'Confirmar asistencia', Componente: Formulario, avanza: false },
	{ id: 'listo', titulo: '¡Anotado!', Componente: Listo }
];
