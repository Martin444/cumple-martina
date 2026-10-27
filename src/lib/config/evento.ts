/**
 * Única fuente de verdad de los datos del evento.
 *
 * La fecha y el lugar estaban TBC al momento de escribir esto. Cuando los pasen,
 * se edita SOLO este archivo: ningún componente tiene el copy hardcodeado.
 */
export const evento = {
	nombre: 'Martina',
	edad: 2,

	/** `null` = todavía no está confirmado. La UI muestra "Próximamente". */
	fecha: {
		/** ISO completo, o `null` si no está confirmado. */
		iso: null as string | null,
		/** Textos ya formateados, o `null` para que la UI use el fallback. */
		dia: null as string | null,
		hora: null as string | null
	},

	lugar: {
		nombre: null as string | null,
		direccion: null as string | null,
		/**
		 * Placeholder-free: "Nombre, Calle 123, Ciudad". Se usa para el botón de
		 * Google Maps cuando todavía no hay coordenadas.
		 */
		consulta: null as string | null,
		/** "lat,lng" o `null`. Si está, tiene prioridad sobre `consulta`. */
		coordenadas: null as string | null
	},

	arte: {
		/**
		 * Ruta (en `/static`) a la imagen del personaje, o `null` para usar el
		 * SVG inline original de `Mascota.svelte`.
		 *
		 * Existe para que cambiar de ilustración sea editar UNA línea y no
		 * tocar componentes. Si apuntás esto a un archivo con licencia propia,
		 * `Mascota.svelte` lo renderiza con `<img>` y conserva el `alt`.
		 *
		 * OJO con el tamaño: fijá `width`/`height` en el archivo o declaralos
		 * acá, porque un shift de layout después de cargar mueve el alto de la
		 * sección y con él toda la matemática del scroll (ver AGENTS.md).
		 */
		/** Imagen principal del personaje (desde /static). */
		mascota: '/Bluey.png' as string | null,
		/**
		 * Atribución que va en el footer, o `null` si no hay nada que atribuir.
		 * Borrarla del footer sin borrar el arte con copyright no es una opción.
		 */
		credito:
			'Bluey™ © Ludo Studio / BBC Studios. Invitación no oficial, hecha a mano para una familia amiga.'
	} as const
} as const;

/** ¿Hay fecha confirmada? */
export const hayFecha = evento.fecha.iso !== null;

/** ¿Hay lugar confirmado? */
export const hayLugar = evento.lugar.consulta !== null || evento.lugar.coordenadas !== null;

/**
 * Destino para el botón "Cómo llegar".
 *
 * Usa la URL de intents de Google Maps en vez de un embed: el embed mete un
 * iframe pesado, con su propia política de cookies y que rompe el look de la
 * invitación. Con intents abre la app nativa del invitado, que es lo que quiere
 * la gente cuando va a un cumple.
 */
export const urlComoLlegar = (() => {
	const { coordenadas, consulta } = evento.lugar;
	const destino = coordenadas ?? consulta;
	if (!destino)
		return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Martina');
	return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`;
})();

/** Copy de relleno mientras la fecha/lugar no estén confirmados. */
export const tbc = {
	fecha: 'La fecha se está confirmando',
	lugar: 'El lugar se está confirmando'
} as const;
