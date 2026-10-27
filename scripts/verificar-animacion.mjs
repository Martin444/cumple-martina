/**
 * Verificación manual de la capa de animación en un browser real.
 *
 * No es un test del proyecto: es el script que uso para confirmar, contra el
 * build de producción servido por `vite preview`, que (a) la capa 2 de CSS
 * scroll-driven quedó PEGADA al elemento, (b) la capa 3 de GSAP tomó
 * ownership de los `data-gsap` y no de los `.revelar > *`, y (c) el confeti
 * aparece con un click.
 *
 *   node --experimental-strip-types scripts/verificar-animacion.mjs
 */
import { chromium } from 'playwright';

const URL_BASE = process.env.PREVIEW_URL ?? 'http://localhost:4173';

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1280, height: 900 } });

const errores = [];
pagina.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
pagina.on('pageerror', (e) => errores.push(String(e)));

await pagina.goto(URL_BASE, { waitUntil: 'networkidle' });

const informe = await pagina.evaluate(() => {
	const cs = (el) => (el ? getComputedStyle(el) : null);
	const readout = (sel) => {
		const el = document.querySelector(sel);
		if (!el) return { sel, existe: false };
		const s = cs(el);
		return {
			sel,
			existe: true,
			animationName: s.animationName,
			animationTimeline: s.animationTimeline,
			animationRange: s.animationRange,
			opacity: s.opacity,
			transform: s.transform
		};
	};

	return {
		soportaView: CSS.supports('animation-timeline', 'view()'),
		soportaScroll: CSS.supports('animation-timeline', 'scroll()'),
		reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
		decoraciones: document.querySelectorAll('.decoracion').length,
		formas: document.querySelectorAll('.decoracion .forma').length,
		gsapHalo: readout('[data-gsap="halo"]'),
		gsapFondo: readout('[data-gsap="fondo"]'),
		primerRevelar: readout('#intro .revelar > *'),
		progressBar: readout('.barra-progreso'),
		alturaDoc: document.documentElement.scrollHeight
	};
});

console.log(JSON.stringify(informe, null, 2));

// El confeti tiene que aparecer SOLO después de un click real.
await pagina.getByRole('button', { name: /Sí, ahí voy/ }).click();
await pagina.waitForTimeout(250);
const conConfeti = await pagina.evaluate(() => ({
	canvas: document.querySelectorAll('canvas').length,
	z: document.querySelector('canvas')?.style.zIndex ?? null,
	aria: document.querySelector('canvas')?.getAttribute('aria-hidden') ?? null
}));
console.log('tras click en "Sí":', conConfeti);

const rangos = await pagina.evaluate(() => {
	const out = [];
	document.querySelectorAll('#intro .decoracion .forma').forEach((el, i) => {
		const s = getComputedStyle(el);
		out.push({
			i,
			amp: s.getPropertyValue('--amp').trim(),
			indice: s.getPropertyValue('--i').trim(),
			range: s.animationRange,
			altoForma: Math.round(el.getBoundingClientRect().height)
		});
	});
	return {
		formas: out,
		altoIntro: Math.round(document.querySelector('#intro').getBoundingClientRect().height),
		altoViewport: window.innerHeight,
		decoracionOverflow: getComputedStyle(document.querySelector('#intro .decoracion')).overflow
	};
});
console.log('\nrangos calculados por el browser:');
console.log(JSON.stringify(rangos, null, 1));

/**
 * Barrido del scroll. Dos muestreos no alcanzan: hay que ver la CURVA para
 * saber si algo está clavado, saturado, o simplemente en un tramo quieto.
 */
const parsear = (m) => {
	if (!m || m === 'none') return null;
	const n = m.match(/matrix\(([^)]+)\)/);
	if (!n) return null;
	const [a, b, , , , ty] = n[1].split(',').map(Number);
	return {
		y: Math.round(ty * 10) / 10,
		rot: Math.round(((Math.atan2(b, a) * 180) / Math.PI) * 10) / 10
	};
};

const barrido = async (sel, etiqueta, pasos, desde = 0) => {
	const filas = [];
	for (let f = 0; f <= pasos; f += 1) {
		const y = desde + Math.round((1000 * f) / pasos);
		await pagina.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
		// Dos rAF: las animaciones de scroll-timeline se actualizan en el
		// frame siguiente al cambio de offset, no en el mismo task.
		await pagina.evaluate(
			() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
		);
		const m = await pagina.evaluate((s) => {
			const el = document.querySelector(s);
			if (!el) return 'AUSENTE';
			const s2 = getComputedStyle(el);
			return `${s2.transform}|${s2.opacity}`;
		}, sel);
		const [mat, op] = m.split('|');
		const p = parsear(mat);
		filas.push(
			`y=${String(y).padStart(5)}  ${etiqueta.padEnd(22)} y=${String(p?.y).padStart(6)}  rot=${String(p?.rot).padStart(5)}  op=${op}`
		);
	}
	console.log('\n' + filas.join('\n'));
};

const tops = await pagina.evaluate(() => {
	const t = (s) =>
		Math.round(document.querySelector(s).getBoundingClientRect().top + window.scrollY);
	return { intro: t('#intro'), acompanadas: t('#acompandas'), diversion: t('#diversion') };
});
console.log('\ntops de seccion:', tops);

await barrido('#intro .decoracion .forma:nth-child(1)', 'forma[0] amp1.3 intro', 1000);
await barrido('#intro .decoracion .forma:nth-child(4)', 'forma[3] amp1.15 intro', 1000);
await barrido('#intro .revelar > *:nth-child(1)', 'revelar[0] intro', 1000);
await barrido(
	'#diversion .decoracion .forma:nth-child(1)',
	'forma[0] seccion3',
	10,
	tops.diversion
);
await barrido(
	'#diversion .revelar > *:nth-child(2)',
	'revelar[1] seccion3',
	10,
	tops.diversion - 900
);
await barrido(
	'#diversion .revelar > *:nth-child(4)',
	'revelar[3] seccion3',
	10,
	tops.diversion - 900
);
await pagina.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));

// ¿Está PEGADO al scroll y no disparado por el? La prueba es leer el mismo
// elemento en tres posiciones de scroll distintas: si los valores cambian y al
// volver al origen se RESTAURAN, la animación es scrubbed (el requisito) y no
// un reveal de una sola vez.
const leer = () =>
	pagina.evaluate(() => {
		const g = (sel) => {
			const el = document.querySelector(sel);
			return el ? getComputedStyle(el).transform : null;
		};
		return {
			scrollY: Math.round(window.scrollY),
			halo: g('[data-gsap="halo"]'),
			fondo: g('[data-gsap="fondo"]'),
			formaA: g('#intro .decoracion .forma:nth-child(1)'),
			formaB: g('#intro .decoracion .forma:nth-child(4)')
		};
	});

// Volver al inicio ANTES de medir: el click en "Sí" hizo un smooth-scroll a
// la sección siguiente, y medir desde ahí daría lecturas de dos páginas
// distintas como si fueran la misma.
await pagina.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await pagina.waitForTimeout(600);

const y0 = await leer();
await pagina.evaluate(() =>
	window.scrollTo({ top: window.innerHeight * 0.35, behavior: 'instant' })
);
await pagina.waitForTimeout(400);
const y35 = await leer();
await pagina.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await pagina.waitForTimeout(400);
const yVuelta = await leer();

console.log('\nscroll 0   :', JSON.stringify(y0));
console.log('scroll 35% :', JSON.stringify(y35));
console.log('vuelta a 0 :', JSON.stringify(yVuelta));
console.log('\n¿el halo se movió?       ', y0.halo !== y35.halo);
console.log('¿el fondo se movió?      ', y0.fondo !== y35.fondo);
console.log('¿forma A se movió?       ', y0.formaA !== y35.formaA);
console.log('¿forma B se movió?       ', y0.formaB !== y35.formaB);
console.log('¿A y B se mueven distinto?', y35.formaA !== y35.formaB);
console.log(
	'¿vuelve al origen?        ',
	JSON.stringify({ ...y0, scrollY: 0 }) === JSON.stringify({ ...yVuelta, scrollY: 0 })
);

await pagina.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
await pagina.waitForTimeout(300);
await pagina.screenshot({ path: 'scripts/captura-intro.png' });
await pagina.evaluate(() => window.scrollTo({ top: window.innerHeight * 3, behavior: 'instant' }));
await pagina.waitForTimeout(300);
await pagina.screenshot({ path: 'scripts/captura-diversion.png' });

console.log('errores de consola:', errores.length ? errores : 'ninguno');
await navegador.close();
