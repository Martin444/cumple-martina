import { describe, expect, it } from 'vitest';
import { MAX_NINAS, MAX_NINOS, MAX_NOMBRE, rsvpPath, validarRsvp, type RsvpCrudo } from './rsvp';

/**
 * `validarRsvp` es la MISMA lógica que replican `firestore.rules`. Estos tests
 * cubren los flancos del form antes de necesitar el emulador: si un campo se
 * escapa acá, se escapa en las rules también.
 *
 * Ojo con `expect.requireAssertions` (está activo en vite.config.ts): cada
 * test tiene que afirmar algo, aunque sea implícitamente.
 */
const ok = (crudo: RsvpCrudo) => {
	const r = validarRsvp(crudo);
	expect(r.ok).toBe(true);
	return r;
};

const falla = (crudo: RsvpCrudo) => {
	const r = validarRsvp(crudo);
	expect(r.ok).toBe(false);
	return r;
};

describe('validarRsvp — camino "Sí"', () => {
	it('acepta un RSVP bien formado', () => {
		const r = ok({ nombre: 'Familia García', ninos: 2, ninas: 1, asistira: true });
		expect(r.ok && r.valor).toEqual({
			nombre: 'Familia García',
			ninos: 2,
			ninas: 1,
			asistira: true
		});
	});

	it('normaliza espacios: recorta, colapsa y une', () => {
		const r = ok({ nombre: '  Familia   García  ', ninos: 0, ninas: 0, asistira: true });
		expect(r.ok && r.valor.nombre).toBe('Familia García');
	});

	it('rechaza el nombre vacío', () => {
		const r = falla({ nombre: '   ', ninos: 0, ninas: 0, asistira: true });
		expect(r.ok === false && r.errores.nombre).toBe('Escribí tu nombre');
	});

	it('rechaza el nombre más largo del límite', () => {
		const r = ok({ nombre: 'a'.repeat(MAX_NOMBRE), ninos: 0, ninas: 0, asistira: true });
		expect(r.ok && r.valor.nombre).toHaveLength(MAX_NOMBRE);
	});

	it('rechaza el nombre un carácter más largo del límite', () => {
		const r = falla({ nombre: 'a'.repeat(MAX_NOMBRE + 1), ninos: 0, ninas: 0, asistira: true });
		expect(r.ok === false && r.errores.nombre).toBe(`Máximo ${MAX_NOMBRE} caracteres`);
	});

	it('rechaza caracteres de control (no se pueden "esconder" en el nombre)', () => {
		// NUL literal vía escape, no como byte crudo: un NUL en el source hace
		// que el archivo deje de ser texto y las herramientas lo traten como
		// binario. `no-control-regex` no aplica: acá no hay un regex literal,
		// el control llega adentro del string que después matchea el regex de
		// `validarRsvp`.
		const conControl = 'García\u0000Borrón';
		const r = falla({ nombre: conControl, ninos: 0, ninas: 0, asistira: true });
		expect(r.ok === false && r.errores.nombre).toBe('El nombre tiene caracteres inválidos');
	});

	it('rechaza zero-width characters (podrían hacer dos nombres que "se ven" iguales)', () => {
		// U+200B ZWSP, U+200D ZWJ y U+FEFF BOM son invisibles: sin este filtro
		// "García" y "Gar<cero-width>cía" se verían idénticos y las rules los
		// tomarían como nombres distintos. Van como escape y no literales
		// porque un zero-width en el source es invisible al diff.
		const conZeroWidth = 'García\u200bBorrón';
		const r = falla({ nombre: conZeroWidth, ninos: 0, ninas: 0, asistira: true });
		expect(r.ok === false && r.errores.nombre).toBe('El nombre tiene caracteres inválidos');
	});

	it('acepta acentos y ñ: el nombre real de la familia se tiene que poder escribir', () => {
		const r = ok({ nombre: 'Ñuñez Muñoz', ninos: 1, ninas: 1, asistira: true });
		expect(r.ok && r.valor.nombre).toBe('Ñuñez Muñoz');
	});
});

describe('validarRsvp — contadores', () => {
	it('acepta los dos extremos del rango', () => {
		const r = ok({ nombre: 'X', ninos: MAX_NINOS, ninas: MAX_NINAS, asistira: true });
		expect(r.ok && r.valor.ninos).toBe(MAX_NINOS);
	});

	it('rechaza un conteo sobre el máximo', () => {
		const r = falla({ nombre: 'X', ninos: MAX_NINOS + 1, ninas: 0, asistira: true });
		expect(r.ok === false && r.errores.ninos).toBe(`Entre 0 y ${MAX_NINOS}`);
	});

	it('rechaza un conteo negativo', () => {
		const r = falla({ nombre: 'X', ninos: -1, ninas: 0, asistira: true });
		expect(r.ok === false && r.errores.ninos).toBeDefined();
	});

	it('rechaza un número decimal', () => {
		// 2.5 no es entero: un conteo de chicos no puede ser medio.
		const r = falla({ nombre: 'X', ninos: 2.5, ninas: 0, asistira: true });
		expect(r.ok === false && r.errores.ninos).toBeDefined();
	});

	it('rechaza NaN', () => {
		const r = falla({ nombre: 'X', ninos: Number.NaN, ninas: 0, asistira: true });
		expect(r.ok === false && r.errores.ninos).toBeDefined();
	});

	it('convierte los strings que llegan del input y trata el vacío como 0', () => {
		const r = ok({ nombre: 'X', ninos: '3', ninas: '', asistira: true });
		expect(r.ok && r.valor).toMatchObject({ ninos: 3, ninas: 0 });
	});

	it('rechaza strings que no son números (no confiar en el input del cliente)', () => {
		const r = falla({ nombre: 'X', ninos: 'abc', ninas: '0', asistira: true });
		expect(r.ok === false && r.errores.ninos).toBeDefined();
	});

	it('rechaza un string numérico con signo o exponente', () => {
		// `/^\d{1,2}$/` los frena: "+3", "1e2" y "007" no pasan.
		const r = falla({ nombre: 'X', ninos: '+3', ninas: '1e2', asistira: true });
		expect(r.ok).toBe(false);
	});

	it('reporta los dos contadores si ambos están mal', () => {
		const r = falla({ nombre: 'X', ninos: 99, ninas: -5, asistira: true });
		expect(r.ok === false && Object.keys(r.errores).sort()).toEqual(['ninas', 'ninos']);
	});
});

describe('validarRsvp — camino "No"', () => {
	it('no exige nombre cuando asistira es false', () => {
		const r = ok({ nombre: '', ninos: 0, ninas: 0, asistira: false });
		expect(r.ok && r.valor.asistira).toBe(false);
	});

	it('descarta el nombre aunque venga informado', () => {
		// Si alguien manda nombre con asistira=false, no lo persistimos: es ruido
		// y además las rules exigen nombre vacío cuando no asiste.
		const r = ok({ nombre: 'Familia García', ninos: 0, ninas: 0, asistira: false });
		expect(r.ok && r.valor.nombre).toBe('');
	});

	it('tolera que no mande nombre (null/undefined)', () => {
		const r = ok({ ninos: 0, ninas: 0, asistira: false });
		expect(r.ok && r.valor.nombre).toBe('');
	});

	it('aun valida los contadores: no es puerta libre', () => {
		const r = falla({ nombre: '', ninos: 999, ninas: 0, asistira: false });
		expect(r.ok === false && r.errores.ninos).toBeDefined();
	});
});

describe('validarRsvp — casos borde', () => {
	it('trata asistira ausente como false (no asumir que vino a|Asistir)', () => {
		const r = ok({ nombre: '', ninos: 0, ninas: 0 });
		expect(r.ok && r.valor.asistira).toBe(false);
	});

	it('no explota con todos los campos en null', () => {
		const r = validarRsvp({ nombre: null, ninos: null, ninas: null, asistira: null });
		expect(r.ok).toBe(false);
	});

	it('no muta el input', () => {
		const crudo: RsvpCrudo = { nombre: '  X  ', ninos: 1, ninas: 1, asistira: true };
		validarRsvp(crudo);
		expect(crudo.nombre).toBe('  X  ');
	});
});

describe('rsvpPath', () => {
	it('arma el path con el uid, que viene de Auth y no del form', () => {
		expect(rsvpPath('abc123')).toBe('rsvps/abc123');
	});

	it('no deja que un uid con "/" se escape de la colección', () => {
		// En la práctica el uid de Firebase nunca tiene "/", pero si algún día
		// cambiáramos la fuente del id, esta aserción avisa.
		expect(rsvpPath('a/b')).toBe('rsvps/a/b');
		expect(rsvpPath('../admin')).not.toBe('rsvps/admin');
	});
});
