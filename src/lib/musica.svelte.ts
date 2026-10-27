/**
 * MÚSICA — el tema de Bluey de la invitación.
 *
 * La idea es que el tema arranque solo al abrir la invitación. El problema es
 * que ningún browser deja sonar audio con volumen antes de un gesto del usuario
 * (autoplay policy), así que "solo al abrir" no existe de verdad. Lo que sí se
 * puede es:
 *
 *   1. INTENTAR sonar en el mount de la página.
 *   2. Si el browser lo bloquea, quedar ARMADO y arrancar en el primer toque,
 *      click o tecla, sea donde sea.
 *
 * Ese es todo el contrato. `bloqueado` expone el estado para que la UI no mienta:
 * si el audio está esperando un gesto, el botón muestra "reproducir", no
 * "silenciar".
 *
 * ⚠️ SINGLETON EN `globalThis`, no en una variable del módulo.
 *
 * Esto no es estilo, es la diferencia entre uno y dos temas sonando a la vez. El
 * deck monta y desmonta los hijos del paso activo en cada cambio, así que el
 * audio NO puede vivir en el DOM de un paso. Y este módulo, además, puede
 * re-ejecutarse: el HMR de Vite lo vuelve a evaluar al guardar un archivo. Con
 * el elemento en una variable local, esa re-ejecución arrancaría en `null`,
 * crearía un SEGUNDO `<audio>` y el primero —al que ya nadie apunta— seguiría
 * sonando para siempre: dos copias encimadas. Guardándolo en `globalThis`, la
 * re-ejecución lo encuentra y lo reusa, así que nunca hay más de uno.
 */

const FUENTE = '/blueytheme.mp3';
/** 0.55 y no 1: es música de fondo, tiene que poder hablarse arriba. */
const VOLUMEN = 0.55;

/** `globalThis` con la ranura donde vive el único elemento de audio. */
const bolsillo = globalThis as typeof globalThis & { __invitacionAudio?: HTMLAudioElement };

/** Cache local del elemento (no autoritativo: la fuente de verdad es `bolsillo`). */
let audio: HTMLAudioElement | null = null;
let sonando = $state(false);
/** `true` cuando el autoplay fue rechazado y hace falta un gesto para arrancar. */
let bloqueado = $state(false);

function elemento(): HTMLAudioElement | null {
	// SSR: no hay `window` ni `Audio`. El módulo se usa solo desde onMount.
	if (typeof window === 'undefined') return null;
	if (audio) return audio;

	// Reusamos el elemento global si ya existe: es lo que evita el segundo
	// `<audio>` cuando el módulo se re-ejecuta (ver nota del encabezado).
	let el = bolsillo.__invitacionAudio;
	if (!el) {
		el = new Audio(FUENTE);
		el.loop = true;
		el.preload = 'auto';
		el.volume = VOLUMEN;
		bolsillo.__invitacionAudio = el;
	}

	// Adoptamos el estado real del elemento. Si venimos de una re-ejecución y ya
	// estaba sonando, el botón tiene que reflejarlo en vez de arrancar mintiendo.
	if (!el.paused && !el.ended) sonando = true;

	// El estado se lee de los eventos del propio elemento, no de nuestras
	// llamadas: si el browser pausa la música por su cuenta (una llamada
	// entrante, otro tab), el botón igual refleja la verdad.
	el.addEventListener('play', () => (sonando = true));
	el.addEventListener('pause', () => (sonando = false));

	audio = el;
	return el;
}

async function intentar(el: HTMLAudioElement) {
	try {
		await el.play();
		bloqueado = false;
	} catch {
		// `NotAllowedError` casi siempre: el browser exige un gesto. No es un
		// error para mostrar — es el estado normal de una página recién abierta
		// sin interacción, y es exactamente lo que dispara el modo "armado".
		bloqueado = true;
	}
}

/* =========================================================================
   ARRANQUE POR GESTO
   ========================================================================= */

/**
 * Un `pointerdown` cubre mouse y dedo; `touchstart` se deja por los browsers
 * viejos donde el pointer event llega tarde; `keydown` para quien navega con
 * teclado. Los tres son `passive`: acá nunca se hace `preventDefault`, solo se
 * escucha.
 */
const GESTOS = ['pointerdown', 'touchstart', 'keydown'] as const;

function alGesto(e: Event) {
	// El botón de música tiene su propio handler. Si no lo excluyéramos, el
	// `pointerdown` que lo abre dispararía el play y el click de después lo
	// apagaría: el invitado pediría prender y quedaría apagado.
	const objetivo = e.target;
	if (objetivo instanceof Element && objetivo.closest('[data-control-musica]')) return;

	desarmar();
	const el = elemento();
	if (el && !sonando) void intentar(el);
}

/** ¿La red de gestos está escuchando? Evita listeners duplicados. */
let armado = false;

function armar() {
	if (typeof window === 'undefined' || armado) return;
	armado = true;
	for (const gesto of GESTOS) window.addEventListener(gesto, alGesto, { passive: true });
}

function desarmar() {
	armado = false;
	if (typeof window === 'undefined') return;
	for (const gesto of GESTOS) window.removeEventListener(gesto, alGesto);
}

/**
 * Arranca el intento de autoplay y deja armado el primer gesto como red de
 * seguridad. Devuelve el cleanup para el `onMount`.
 */
export function iniciarMusica(): () => void {
	const el = elemento();
	if (!el) return () => {};

	// La red se arma YA, para no perder un gesto temprano mientras el `play()`
	// todavía está resolviendo.
	armar();

	// Pero si el autoplay SÍ salió, la red sobra y se desarma en el acto. Dejarla
	// armada era el bug del botón: el primer toque en cualquier lado —después de
	// apagar a mano— volvía a largar la música, así que apagarla parecía no servir.
	void intentar(el).then(() => {
		if (!bloqueado) desarmar();
	});

	return () => {
		desarmar();
		el.pause();
	};
}

export const musica = {
	get sonando() {
		return sonando;
	},
	get bloqueado() {
		return bloqueado;
	},
	/** Prender o apagar a mano. Lo usa el botón de la barra de música. */
	alternar() {
		const el = elemento();
		if (!el) return;
		// Manda el estado REAL del elemento, no la copia reactiva `sonando`: si
		// por lo que sea se desincronizaran, el botón quedaría muerto justo para
		// apagar. Y desarmamos siempre, para que apagar no lo revierta el
		// siguiente toque en la página.
		desarmar();
		if (!el.paused) {
			el.pause();
			return;
		}
		void intentar(el);
	}
};
