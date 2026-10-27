/**
 * FLUJO — el estado del slide deck.
 *
 * La invitación dejó de ser una página de scroll: es un deck de N pasos, uno
 * por pantalla, y acá vive lo único que hay que saber del flujo: en qué paso
 * estamos y hacia dónde vamos.
 *
 * Dos reglas que este módulo existe para hacer explícitas:
 *
 * 1. El avance genérico (botón de la barra, flechas, swipe) es una FUNCIÓN
 *    distinta del salto explícito (`irA`). No se pueden mezclar: si compartieran
 *    el mismo camino, el form no podría bloquear el swipe sin bloquear
 *    también su propio submit. Ver `PASOS[i].avanza`.
 *
 * 2. La dirección se guarda como estado y no se deduce. La transición de
 *    entrada la necesita para saber de qué lado viene el paso, y en el momento
 *    en que la transición corre el índice ya cambió: si se dedujera comparando
 *    índices, siempre saldría "avanzando".
 */
import { PASOS } from './pasos';

const TOTAL = PASOS.length;

let indice = $state(0);
/** `1` = avanzamos, `-1` = retrocedemos. La transición lo lee al entrar. */
let direccion = $state<1 | -1>(1);
/**
 * El paso más lejano que se alcanzó. Es lo que hace que los puntos de progreso
 * sirvan para volver sobre tus pasos sin dejar saltarte al final: podés ir a
 * cualquier paso que ya viste, y a ninguno que no.
 */
let masLejos = $state(0);

export const flujo = {
	get indice() {
		return indice;
	},
	get total() {
		return TOTAL;
	},
	get paso() {
		return PASOS[indice];
	},
	get direccion() {
		return direccion;
	},
	get esPrimero() {
		return indice === 0;
	},
	get esUltimo() {
		return indice === TOTAL - 1;
	},
	/** El paso más lejano alcanzado. Lo leen los puntos de progreso. */
	get masLejos() {
		return masLejos;
	},
	/**
	 * ¿Se puede avanzar con los controles genéricos desde acá?
	 *
	 * Distingue "no hay más pasos" de "este paso exige una acción primero". Los
	 * dos casos se ven igual en la UI (no hay botón) pero por motivos distintos,
	 * y el que importa es el segundo: en el form, el bloqueo es la regla.
	 */
	get puedeAvanzar() {
		return !flujo.esUltimo && PASOS[indice].avanza !== false;
	},
	/** ¿El punto de progreso de este índice es clickeable? */
	puedeIrA(destino: number) {
		return destino <= masLejos;
	}
};

/** Mover acotado al rango. Es el único lugar que escribe `indice`. */
function mover(destino: number) {
	const acotado = Math.max(0, Math.min(TOTAL - 1, destino));
	if (acotado === indice) return;
	direccion = acotado > indice ? 1 : -1;
	indice = acotado;
	if (acotado > masLejos) masLejos = acotado;
}

/**
 * Salto explícito a un paso por id. Lo usan los CTA ("Ver la invitación",
 * "Confirmar asistencia", el submit del form) y los puntos de progreso.
 *
 * ⚠️ No consulta `puedeAvanzar`: saltar es saltar. Si lo consultara, el submit
 * del form no podría llevar a la confirmación, que es justamente a donde tiene
 * que llevar.
 */
export function irA(id: string) {
	const destino = PASOS.findIndex((p) => p.id === id);
	if (destino >= 0) mover(destino);
}

export function siguiente() {
	if (!flujo.puedeAvanzar) return;
	mover(indice + 1);
}

export function anterior() {
	mover(indice - 1);
}

/**
 * Salto por punto de progreso. A diferencia de `irA`, acá SÍ consulta si el
 * destino ya fue visto: es el control que restringe el flujo, y si no lo
 * hiciera los puntos de progreso serían un menú con seis entradas.
 */
export function ir(indiceDestino: number) {
	if (!flujo.puedeIrA(indiceDestino)) return;
	mover(indiceDestino);
}

/* =========================================================================
   ENTRADAS: teclado y gesto
   ========================================================================= */

/** Campos donde las flechas y el espacio son del control, no del deck. */
const ETIQUETAS_EDITABLES = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function esEditable(destino: EventTarget | null): boolean {
	if (!(destino instanceof HTMLElement)) return false;
	if (destino.isContentEditable) return true;
	return ETIQUETAS_EDITABLES.has(destino.tagName);
}

/**
 * Botones y links: el espacio y las flechas ya hacen algo. Si los capturamos
 * los ourselves, un "Siguiente" se dispararía dos veces (una por el click
 * nativo del browser y otra por el keydown) y avanzaría dos pasos.
 */
function esActivador(destino: EventTarget | null): boolean {
	return destino instanceof HTMLElement && ['BUTTON', 'A', 'SUMMARY'].includes(destino.tagName);
}

/** Umbral de recorrido del gesto, en px de CSS. */
const UMBRAL_SWIPE = 56;
/**
 * El gesto tiene que ser claramente horizontal. Es lo que separa "deslizar para
 * cambiar de paso" de "scrollear dentro del paso": un paso alto (el form en un
 * celular de 360px) scrollea en vertical, y sin este margen un scroll un poco
 * torcido saltaría de sección.
 */
const PROPORCION_SWIPE = 1.6;
/** Un swipe no es un "tirar y dejar" lento. Pasado esto, se presume scroll. */
const DURACION_MAX_SWIPE = 800;

/**
 * Conecta teclado y gesto al escenario. Devuelve el cleanup.
 *
 * Los listeners de touch son `passive` y NO hacen `preventDefault` en ningún
 * caso: el deck no toca el scroll nativo del paso. En una pantalla donde el
 * contenido no entra (el form en un teléfono chico), el paso scrollea normal y
 * el swipe horizontal sigue cambiando de paso — conviven, no compiten.
 */
export function conectarNavegacion(escenario: HTMLElement): () => void {
	let x0 = 0;
	let y0 = 0;
	let inicio = 0;
	let gestoValido = false;

	function alTeclado(e: KeyboardEvent) {
		// Con modificadores, el atajo es del browser o del sistema operativo.
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		if (esEditable(e.target)) return;

		switch (e.key) {
			case 'ArrowRight':
			case 'ArrowDown':
			case 'PageDown':
				e.preventDefault();
				siguiente();
				return;
			case 'ArrowLeft':
			case 'ArrowUp':
			case 'PageUp':
				e.preventDefault();
				anterior();
				return;
			case 'Home':
				e.preventDefault();
				mover(0);
				return;
			case 'End':
				e.preventDefault();
				mover(TOTAL - 1);
				return;
			case ' ': {
				// El espacio también es "activar el botón enfocado". Solo lo
				// tomamos si el foco no está en algo activable.
				if (esActivador(e.target)) return;
				e.preventDefault();
				siguiente();
				return;
			}
		}
	}

	function alTocar(e: TouchEvent) {
		// Más de un dedo = pinch o zoom. No lo confundimos con un cambio de paso.
		if (e.touches.length !== 1) {
			gestoValido = false;
			return;
		}
		const t = e.touches[0];
		if (!t) return;
		x0 = t.clientX;
		y0 = t.clientY;
		inicio = e.timeStamp;
		gestoValido = true;
	}

	function alSoltar(e: TouchEvent) {
		if (!gestoValido) return;
		gestoValido = false;

		const t = e.changedTouches[0];
		if (!t) return;
		if (e.timeStamp - inicio > DURACION_MAX_SWIPE) return;

		const dx = t.clientX - x0;
		const dy = t.clientY - y0;

		if (Math.abs(dx) < UMBRAL_SWIPE) return;
		if (Math.abs(dx) < Math.abs(dy) * PROPORCION_SWIPE) return;

		// Deslizar a la izquierda es el gesto de "volver": el contenido se va
		// para la derecha, igual que cuando pasás una página hacia atrás.
		if (dx < 0) siguiente();
		else anterior();
	}

	function alCancelar() {
		gestoValido = false;
	}

	window.addEventListener('keydown', alTeclado);
	escenario.addEventListener('touchstart', alTocar, { passive: true });
	escenario.addEventListener('touchend', alSoltar, { passive: true });
	escenario.addEventListener('touchcancel', alCancelar, { passive: true });

	return () => {
		window.removeEventListener('keydown', alTeclado);
		escenario.removeEventListener('touchstart', alTocar);
		escenario.removeEventListener('touchend', alSoltar);
		escenario.removeEventListener('touchcancel', alCancelar);
	};
}
