/**
 * ANIMACIÓN DEL DECK
 *
 * Antes esta página era scroll y la animación estaba atada a la posición del
 * scroll (`ScrollTrigger`, `animation-timeline: view()`). Con el slide deck ya
 * no hay scroll que escuchar: el reloj de la animación pasó a ser el CAMBIO DE
 * PASO. `entrarPaso` es el reemplazo, y hace lo mismo que hacía la capa de
 * scrub: escalonar la entrada de los hijos de `.revelar`.
 *
 * `ScrollTrigger` se desinstaló del bundle (~40kb) porque no queda nada que
 * scrollear. `gsap` core sigue: acá y para el confeti.
 */
import { gsap } from 'gsap';

/**
 * Entrada de un paso.
 *
 * Se dispara cuando el paso se monta, no cuando entra en pantalla. Con eso el
 * stagger es por TIEMPO y no por posición: el contenido aparece solo, sin que
 * el invitado tenga que scrollear para que se vea.
 *
 * ⚠️ `gsap.from()` y no `fromTo()`. La diferencia importa: `from()` deja el
 * estado final como el NATURAL del CSS, así que cuando la animación termina no
 * queda ni un `transform` inline. Si el módulo fallara, o si el usuario pide
 * `prefers-reduced-motion` y ni siquiera entramos acá, el contenido se ve
 * igual. Con `fromTo` el estado bueno quedaría escrito por JS, y un JS que no
 * corre deja la página en blanco — la trampa que el reveal por scroll nunca
 * tuvo porque su estado inicial vivía en el CSS.
 *
 * La posición de salida la da la `direccion` del flujo, así el paso entra por el
 * lado desde el que viene: avanzar entra desde la derecha, volver desde la
 * izquierda. Es lo que hace que el deck se lea como un mazo y no como un
 * paginado que reinicia.
 */
export function entrarPaso(raiz: HTMLElement, direccion: 1 | -1) {
	if (typeof window === 'undefined') return;
	if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	const hijos = raiz.querySelectorAll<HTMLElement>('.revelar > *');
	if (hijos.length === 0) return;

	const desde = direccion >= 0 ? 1 : -1;

	/*
		Presupuesto del stagger: 420ms en total, repartidos entre los hijos.
		Sin este techo, un paso con 8 hijos (el form tiene más) se Tardaría más
		de medio segundo solo en escalonar, y el invitado lo lee como que la
		página se trabó. Con el techo, un paso con 3 hijos conserva el ritmo
		jugoso de 75ms y uno con 10 aprieta a 47ms: ninguno de los dos se siente
		lento.
	*/
	const cadaHijo = Math.min(0.075, hijos.length > 1 ? 0.42 / (hijos.length - 1) : 0.075);

	try {
		gsap.from(hijos, {
			// `autoAlpha` en vez de `opacity`: además de opacidad escribe
			// `visibility`, así que durante el stagger los elementos que todavía
			// no entraron no son focusables. Sin eso, el teclado del invitado
			// puede aterrizar en un botón que está en pantalla pero invisible.
			autoAlpha: 0,
			x: 68 * desde,
			y: 22,
			scale: 0.97,
			rotate: -1.4 * desde,
			duration: 0.62,
			// `back.out` con un pequeño overshoot: el rebote es lo que separa
			// "cartoon" de "transición de office". Sin overshoot el stagger se
			// ve correcto y la invitación se ve aburrida.
			ease: 'back.out(1.4)',
			stagger: cadaHijo,
			overwrite: 'auto'
		});
	} catch {
		// El contenido ya está en su estado natural y visible. Una animación
		// que falla no puede romper la invitación.
	}
}

/* =========================================================================
   CONFETI
   Canvas 2D con rAF a mano, no GSAP: son ~90 partículas, y animar 90 elementos
   del DOM (o 90 tweens) por un efecto que dura 2 segundos es la forma más
   rápida de jankear un móvil de gama baja. Un canvas y un loop es lo más
   barato que existe.
   ========================================================================= */

type Particula = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	/** Tamaño del lado, en px de CSS. */
	tam: number;
	color: string;
	/** Giro en rad/frame y su velocidad. */
	rot: number;
	vrot: number;
	vida: number;
	/** Cuánto dura la vida total, en frames. */
	espera: number;
	/** Forma de la partícula: cuadrado, rectángulo o círculo. */
	forma: 'cuadrado' | 'rectangulo' | 'circulo';
};

const DURACION = 1900;
const CANTIDAD = 90;
/** Tope de DPR: en un móvil 3x un canvas a 3x con 90 partículas se nota. */
const DPR_MAX = 2;

let lienzo: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particulas: Particula[] = [];
let rafId = 0;
let ultimoCuadro = 0;

/** Los colores salen de los tokens: si se cambia la paleta, el confeti la sigue. */
function paleta(): string[] {
	const estilos = getComputedStyle(document.documentElement);
	const nombres = ['--coral', '--amarillo', '--menta', '--cielo', '--rosa'];
	return nombres.map((n) => estilos.getPropertyValue(n).trim()).filter(Boolean);
}

function crearLienzo(): HTMLCanvasElement {
	const c = document.createElement('canvas');
	c.setAttribute('aria-hidden', 'true');
	Object.assign(c.style, {
		position: 'fixed',
		inset: '0',
		width: '100%',
		height: '100%',
		// Por debajo del skip link (z-index 100) y por encima de la página: el
		// confeti se ve, pero nunca se come un click ni el foco.
		zIndex: '90',
		pointerEvents: 'none'
	});
	document.body.appendChild(c);
	return c;
}

function dimensionar(c: HTMLCanvasElement) {
	const dpr = Math.min(DPR_MAX, window.devicePixelRatio || 1);
	c.width = Math.floor(window.innerWidth * dpr);
	c.height = Math.floor(window.innerHeight * dpr);
	c.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/**
 * Ráfaga de confeti. Se llama desde un gesto del usuario (el "Sí", el
 * "Guardar"), NO al cambiar de paso: si se dispara en el mount, en un celular
 * se pierde entre la rotación y más tarde se ve como un bug.
 *
 * Con reduced motion no hace nada: el confeti ES movimiento decorativo, y el
 * usuario que lo pidió apagado no lo quiere. El feedback de que algo pasó lo
 * dan el salto al paso siguiente y el texto de confirmación.
 */
export function confeti() {
	if (typeof window === 'undefined') return;
	if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	lienzo ??= crearLienzo();
	dimensionar(lienzo);
	const contexto = lienzo.getContext('2d');
	if (!contexto) return;
	ctx = contexto;

	const colores = paleta();
	const ancho = window.innerWidth;
	const alto = window.innerHeight;
	// Sale del centro-arriba, que es de donde "cae" una fiesta en pantalla.
	const origenX = ancho / 2;
	const origenY = alto * 0.42;

	particulas = Array.from({ length: CANTIDAD }, () => {
		// Ángulo en un arco hacia arriba, no en círculo completo: si sale en
		// todas direcciones se lee como una explosión, no como confeti.
		const angulo = -Math.PI / 2 + (Math.random() - 0.5) * 2.1;
		const velocidad = 9 + Math.random() * 13;
		return {
			x: origenX,
			y: origenY,
			vx: Math.cos(angulo) * velocidad * (0.6 + Math.random() * 0.8),
			vy: Math.sin(angulo) * velocidad,
			tam: 5 + Math.random() * 9,
			color: colores[Math.floor(Math.random() * colores.length)] ?? '#4fb8e8',
			rot: Math.random() * Math.PI,
			vrot: (Math.random() - 0.5) * 0.38,
			vida: DURACION,
			espera: DURACION,
			forma: Math.random() > 0.6 ? 'rectangulo' : Math.random() > 0.5 ? 'cuadrado' : 'circulo'
		};
	});

	if (!rafId) {
		ultimoCuadro = performance.now();
		rafId = requestAnimationFrame(paso);
	}
}

function paso(ahora: number) {
	rafId = 0;
	if (!ctx || !lienzo) return;

	// Delta con techo: si la pestaña estuvo en background, el primer cuadro
	// vuelve con un delta de segundos y todas las partículas se teletransportan
	// fuera de pantalla en un frame.
	const delta = Math.min(ahora - ultimoCuadro, 48);
	ultimoCuadro = ahora;

	ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

	const gravedad = 0.42;
	particulas = particulas.filter((p) => {
		p.vida -= delta;
		if (p.vida <= 0) return false;

		p.vx *= 0.995;
		p.vy = p.vy * 0.995 + gravedad;
		p.x += p.vx * (delta / 16.67);
		p.y += p.vy * (delta / 16.67);
		p.rot += p.vrot * (delta / 16.67);

		// Se desvanece en el último 35% de la vida: si no, el confeti
		// desaparece de golpe al final y se nota el corte.
		const restante = p.vida / p.espera;
		ctx!.globalAlpha = restante > 0.35 ? 1 : restante / 0.35;

		ctx!.save();
		ctx!.translate(p.x, p.y);
		ctx!.rotate(p.rot);
		ctx!.fillStyle = p.color;
		if (p.forma === 'circulo') {
			ctx!.beginPath();
			ctx!.arc(0, 0, p.tam / 2, 0, Math.PI * 2);
			ctx!.fill();
		} else if (p.forma === 'rectangulo') {
			ctx!.fillRect(-p.tam / 2, -p.tam / 3, p.tam, (p.tam * 2) / 3);
		} else {
			ctx!.fillRect(-p.tam / 2, -p.tam / 2, p.tam, p.tam);
		}
		ctx!.restore();
		return true;
	});

	ctx.globalAlpha = 1;

	if (particulas.length > 0) {
		rafId = requestAnimationFrame(paso);
	} else {
		// Se borra el canvas cuando no queda nada: un <canvas> de 4 MB clavado
		// en el body después de un solo confeti es memoria que no vuelve.
		lienzo.remove();
		lienzo = null;
		ctx = null;
	}
}
