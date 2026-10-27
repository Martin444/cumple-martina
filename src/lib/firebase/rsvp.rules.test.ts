import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment,
	type RulesTestContext,
	type RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import {
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	serverTimestamp,
	setDoc,
	Timestamp
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

/**
 * INTEGRATION / RULES — el tier que más valor aporta en este proyecto.
 *
 * `rsvp.test.ts` prueba que `validarRsvp` valida. Esto prueba que
 * `firestore.rules` valida LO MISMO. Son dos implementaciones de la misma
 * regla y nada las ata entre sí: un rules test que pasa en verde mientras el
 * rules se puede saltar no sirve de nada, y al revés.
 *
 * ⚠️ Esto NO corre sin emulador: el test env de `@firebase/rules-unit-testing`
 * habla el protocolo del emulador. Se levanta con `npm run test:rules`.
 *
 * ⚠️ La trampa conocida: si `firestore.rules` no está declarado en
 * `firebase.json`, el emulador trata TODOS los projects como abiertos y estos
 * tests pasan en verde sin probar nada. El describe "las rules están
 * realmente cargadas" existe justo para cazar eso.
 */

/**
 * `demo-*` es obligatorio para emulador: contra un projectId real el SDK
 * intenta pegarle a Google y los tests dependerían de la red.
 */
const PROJECT_ID = 'demo-invitacion-martina';

/**
 * Las rules se leen del archivo real, no de una copia pegada acá: si el rules
 * del repo cambia, estos tests tienen que cambiar con él.
 *
 * Se resuelve con `process.cwd()` y no con `new URL(..., import.meta.url)`
 * porque Vite intercepta ese patrón para resolver assets y en un test de node
 * termina tocando el path.
 */
const REGLAS = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');

const UID_A = 'invitado-a';
const UID_B = 'invitado-b';

const AHORA = Timestamp.fromDate(new Date('2026-09-26T12:00:00Z'));

let testEnv: RulesTestEnvironment;

/** Un RSVP que las rules tienen que aceptar, para partí de algo y romperlo de a un campo. */
const rsvpValido = (over: Record<string, unknown> = {}) => ({
	nombre: 'Familia García',
	ninos: 2,
	ninas: 1,
	asistira: true,
	creadoAt: AHORA,
	actualizadoAt: AHORA,
	...over
});

const docDe = (ctx: RulesTestContext, uid: string) => doc(ctx.firestore(), 'rsvps', uid);

/**
 * El emulador escucha en 127.0.0.1:8080 (ver firebase.json). Se pasa explícito
 * en vez de confiar en el descubrimiento por hub: si el host se resuelve a
 * `localhost` en Windows cae en ::1 y el emulador no escucha ahí, y el error
 * queda siendo de conexión — la confusión más cara de debuggear en este tier.
 */
const emulador = { host: '127.0.0.1', port: 8080 };

beforeAll(async () => {
	testEnv = await initializeTestEnvironment({
		projectId: PROJECT_ID,
		firestore: { ...emulador, rules: REGLAS }
	});
});

afterAll(async () => {
	await testEnv.cleanup();
});

/**
 * El emulador PERSISTE datos entre corridas y entre tests. Sin esto el estado
 * se filtra de un test al siguiente y aparece un fallo que depende del orden.
 */
afterEach(async () => {
	await testEnv.clearFirestore();
});

/** Siembra un doc saltándose las rules, para probar lecturas de ajenos. */
const sembrar = (uid: string, data: Record<string, unknown> = rsvpValido()) =>
	testEnv.withSecurityRulesDisabled(async (ctx) => {
		await setDoc(doc(ctx.firestore(), 'rsvps', uid), data);
	});

/**
 * `assertFails` también falla si la promesa RESUELVE, o si el error no es de
 * permisos — o sea, detecta un error de conexión y no lo disfraza de "denegado".
 * Devolvemos el código para poder afirmar sobre él en vez de conformarnos con
 * "no explotó".
 */
async function denegar(pr: Promise<unknown>): Promise<string> {
	const err = await assertFails(pr);
	return (err as { code?: string }).code ?? 'sin-code';
}

describe('las rules están realmente cargadas', () => {
	it('niega una escritura sin autenticar (si esto pasa, no hay rules)', async () => {
		// Si `firestore.rules` faltara en firebase.json el emulador abre todo y
		// este test falla. Es el centinela del tier.
		const anonimo = testEnv.unauthenticatedContext();
		expect(await denegar(setDoc(docDe(anonimo, UID_A), rsvpValido()))).toBe('permission-denied');
	});

	it('acepta la escritura canónica de un uid dueño de su doc', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		await assertSucceeds(setDoc(docDe(a, UID_A), rsvpValido()));
		expect((await getDoc(docDe(a, UID_A))).exists()).toBe(true);
	});

	it('un doc sembrado con rules off tampoco es legible para otro uid', async () => {
		// Complementa al centinela por el otro lado: la denegación anterior no
		// puede ser un falso negativo del transporte, porque el doc existe de
		// verdad y sin rules se lee perfecto.
		await sembrar(UID_B);
		const a = testEnv.authenticatedContext(UID_A);
		expect(await denegar(getDoc(docDe(a, UID_B)))).toBe('permission-denied');
	});
});

describe('lectura', () => {
	it('el dueño lee su propio RSVP', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		await assertSucceeds(setDoc(docDe(a, UID_A), rsvpValido()));
		const snap = await assertSucceeds(getDoc(docDe(a, UID_A)));
		expect(snap.data()?.nombre).toBe('Familia García');
	});

	it('no deja leer el RSVP de otro invitado', async () => {
		await sembrar(UID_B);
		const a = testEnv.authenticatedContext(UID_A);
		expect(await denegar(getDoc(docDe(a, UID_B)))).toBe('permission-denied');
	});

	it('no deja listar la colección: la query incluye el doc de otro', async () => {
		// Este es el flanco que se olvida: `allow read` por doc no alcanza si el
		// listado está abierto. Con rules por documento, `getDocs()` de la
		// colección tiene que fallar entero.
		await sembrar(UID_A);
		await sembrar(UID_B);
		const a = testEnv.authenticatedContext(UID_A);
		expect(await denegar(getDocs(collection(a.firestore(), 'rsvps')))).toBe('permission-denied');
	});

	it('no deja leer nada sin autenticar', async () => {
		const anonimo = testEnv.unauthenticatedContext();
		expect(await denegar(getDoc(docDe(anonimo, UID_A)))).toBe('permission-denied');
	});

	it('no deja leer un uid que no existe (mismo check, otro doc)', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		expect(await denegar(getDoc(docDe(a, 'nadie')))).toBe('permission-denied');
	});
});

describe('create', () => {
	it('acepta un RSVP bien formado', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		await assertSucceeds(setDoc(docDe(a, UID_A), rsvpValido()));
		expect((await getDoc(docDe(a, UID_A))).exists()).toBe(true);
	});

	it('acepta el camino del "No": nombre vacío y cero nenes', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		const no = rsvpValido({ nombre: '', ninos: 0, ninas: 0, asistira: false });
		await assertSucceeds(setDoc(docDe(a, UID_A), no));
		expect((await getDoc(docDe(a, UID_A))).data()?.asistira).toBe(false);
	});

	it('acepta los dos extremos de los contadores', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		await assertSucceeds(setDoc(docDe(a, UID_A), rsvpValido({ ninos: 0, ninas: 10 })));
		expect((await getDoc(docDe(a, UID_A))).data()?.ninas).toBe(10);
	});

	it('acepta acentos y ñ: el nombre real tiene que poder escribirse', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		await assertSucceeds(setDoc(docDe(a, UID_A), rsvpValido({ nombre: 'Ñuñez Muñoz' })));
		expect((await getDoc(docDe(a, UID_A))).data()?.nombre).toBe('Ñuñez Muñoz');
	});

	it('niega escribir en el doc de otro invitado', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		expect(await denegar(setDoc(docDe(a, UID_B), rsvpValido()))).toBe('permission-denied');
	});

	it('niega el nombre vacío cuando dice que asiste', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		expect(await denegar(setDoc(docDe(a, UID_A), rsvpValido({ nombre: '' })))).toBe(
			'permission-denied'
		);
	});

	it('niega un campo obligatorio faltante', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		const { ninas: _omitido, ...sinNinas } = rsvpValido();
		expect(await denegar(setDoc(docDe(a, UID_A), sinNinas))).toBe('permission-denied');
	});

	it('niega caracteres de control en el nombre', async () => {
		// NUL literal vía escape: en el source como byte crudo el archivo deja
		// de ser texto y las herramientas lo tratan como binario.
		const a = testEnv.authenticatedContext(UID_A);
		expect(await denegar(setDoc(docDe(a, UID_A), rsvpValido({ nombre: 'a\u0000b' })))).toBe(
			'permission-denied'
		);
	});

	it('niega zero-width characters (invisibles: hacen dos nombres que "se ven" iguales)', async () => {
		// El cliente (validarRsvp) filtra \p{Cf}. Si el rules no lo hiciera, un
		// cliente modificado podria colar lo que la app no deja pasar. Este test
		// es el que ata las dos validaciones.
		const a = testEnv.authenticatedContext(UID_A);
		expect(await denegar(setDoc(docDe(a, UID_A), rsvpValido({ nombre: 'a\u200bb' })))).toBe(
			'permission-denied'
		);
	});

	it('niega un nombre de 61 caracteres (límite 60)', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		expect(await denegar(setDoc(docDe(a, UID_A), rsvpValido({ nombre: 'a'.repeat(61) })))).toBe(
			'permission-denied'
		);
	});

	it('acepta un nombre de 60 caracteres (el límite es incluido)', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		await assertSucceeds(setDoc(docDe(a, UID_A), rsvpValido({ nombre: 'a'.repeat(60) })));
		expect((await getDoc(docDe(a, UID_A))).data()?.nombre).toHaveLength(60);
	});

	it('niega guardar PII en el camino del "No"', async () => {
		// El cliente normaliza a '' cuando asistira=false, pero la regla lo
		// exige: si alguien cuelga un nombre en un "no vengo", no se guarda.
		const a = testEnv.authenticatedContext(UID_A);
		expect(await denegar(setDoc(docDe(a, UID_A), rsvpValido({ asistira: false })))).toBe(
			'permission-denied'
		);
	});

	it('niega ninos negativo', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		expect(await denegar(setDoc(docDe(a, UID_A), rsvpValido({ ninos: -1 })))).toBe(
			'permission-denied'
		);
	});

	it('niega ninos = 11', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		expect(await denegar(setDoc(docDe(a, UID_A), rsvpValido({ ninos: 11 })))).toBe(
			'permission-denied'
		);
	});

	it('niega ninos decimal (2.5 se guarda como float, no como int)', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		expect(await denegar(setDoc(docDe(a, UID_A), rsvpValido({ ninos: 2.5 })))).toBe(
			'permission-denied'
		);
	});

	it('niega ninos como string (el input es controlado: no se confía en él)', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		expect(await denegar(setDoc(docDe(a, UID_A), rsvpValido({ ninos: '2' })))).toBe(
			'permission-denied'
		);
	});

	it('niega ninas fuera de rango', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		expect(await denegar(setDoc(docDe(a, UID_A), rsvpValido({ ninas: 11 })))).toBe(
			'permission-denied'
		);
	});

	it('niega asistira que no es booleano', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		expect(await denegar(setDoc(docDe(a, UID_A), rsvpValido({ asistira: 'sí' })))).toBe(
			'permission-denied'
		);
	});

	it('niega un campo extra (PII colada en cualquier key)', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		expect(await denegar(setDoc(docDe(a, UID_A), rsvpValido({ email: 'fuga@x.com' })))).toBe(
			'permission-denied'
		);
	});

	it('niega un create sin creadoAt', async () => {
		// Si no, "cuándo respondió" queda indefinido y después no se puede
		// chasing de respuestas viejas.
		const a = testEnv.authenticatedContext(UID_A);
		const { creadoAt: _omitido, ...sinCreado } = rsvpValido();
		expect(await denegar(setDoc(docDe(a, UID_A), sinCreado))).toBe('permission-denied');
	});

	it('niega sin actualizadoAt', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		const { actualizadoAt: _omitido, ...sinAct } = rsvpValido();
		expect(await denegar(setDoc(docDe(a, UID_A), sinAct))).toBe('permission-denied');
	});
});

describe('update (el RSVP es editable)', () => {
	it('deja editar la propia respuesta', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		await assertSucceeds(setDoc(docDe(a, UID_A), rsvpValido()));
		const nuevo = { nombre: 'Familia Gómez', ninos: 3, ninas: 0, actualizadoAt: AHORA };
		await assertSucceeds(setDoc(docDe(a, UID_A), nuevo, { merge: true }));
		expect((await getDoc(docDe(a, UID_A))).data()?.nombre).toBe('Familia Gómez');
	});

	it('deja pasar de "Sí" a "No"', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		await assertSucceeds(setDoc(docDe(a, UID_A), rsvpValido()));
		const no = { nombre: '', ninos: 0, ninas: 0, asistira: false, actualizadoAt: AHORA };
		await assertSucceeds(setDoc(docDe(a, UID_A), no, { merge: true }));
		expect((await getDoc(docDe(a, UID_A))).data()?.asistira).toBe(false);
	});

	it('deja pasar de "No" a "Sí"', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		await assertSucceeds(
			setDoc(docDe(a, UID_A), rsvpValido({ nombre: '', ninos: 0, ninas: 0, asistira: false }))
		);
		const si = {
			nombre: 'Familia Pérez',
			ninos: 1,
			ninas: 1,
			asistira: true,
			actualizadoAt: AHORA
		};
		await assertSucceeds(setDoc(docDe(a, UID_A), si, { merge: true }));
		expect((await getDoc(docDe(a, UID_A))).data()?.nombre).toBe('Familia Pérez');
	});

	it('no deja pisar creadoAt en un update', async () => {
		// El `diff().affectedKeys()` de esMerge() existe por esto: sin él, un
		// update con merge podría reescribir el timestamp de creación.
		const a = testEnv.authenticatedContext(UID_A);
		await assertSucceeds(setDoc(docDe(a, UID_A), rsvpValido()));
		const antes = (await getDoc(docDe(a, UID_A))).data()?.creadoAt;
		const otro = Timestamp.fromDate(new Date('2020-01-01T00:00:00Z'));
		expect(
			await denegar(
				setDoc(
					docDe(a, UID_A),
					{ nombre: 'Otro', creadoAt: otro, actualizadoAt: AHORA },
					{ merge: true }
				)
			)
		).toBe('permission-denied');
		expect((await getDoc(docDe(a, UID_A))).data()?.creadoAt?.toMillis()).toBe(antes?.toMillis());
	});

	it('no deja que un invitado pise el RSVP de otro', async () => {
		await sembrar(UID_B);
		const a = testEnv.authenticatedContext(UID_A);
		expect(
			await denegar(setDoc(docDe(a, UID_B), rsvpValido({ nombre: 'Secuestrado' }), { merge: true }))
		).toBe('permission-denied');
		const b = testEnv.authenticatedContext(UID_B);
		expect((await assertSucceeds(getDoc(docDe(b, UID_B)))).data()?.nombre).toBe('Familia García');
	});

	it('valida la forma también en el update, no solo en el create', async () => {
		// Si formaValida() se invocara solo en create, un update podría mandar
		// 999 nenes.
		const a = testEnv.authenticatedContext(UID_A);
		await assertSucceeds(setDoc(docDe(a, UID_A), rsvpValido()));
		expect(
			await denegar(setDoc(docDe(a, UID_A), { ninos: 999, actualizadoAt: AHORA }, { merge: true }))
		).toBe('permission-denied');
	});

	it('niega el update sin autenticar', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		await assertSucceeds(setDoc(docDe(a, UID_A), rsvpValido()));
		const anonimo = testEnv.unauthenticatedContext();
		expect(await denegar(setDoc(docDe(anonimo, UID_A), rsvpValido(), { merge: true }))).toBe(
			'permission-denied'
		);
	});
});

describe('delete', () => {
	it('no deja borrar el propio RSVP (preferimos que quede el registro)', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		await assertSucceeds(setDoc(docDe(a, UID_A), rsvpValido()));
		expect(await denegar(deleteDoc(docDe(a, UID_A)))).toBe('permission-denied');
		expect((await getDoc(docDe(a, UID_A))).exists()).toBe(true);
	});
});

/**
 * El write REAL de `guardarRsvp()`.
 *
 * Los tests de arriba siembran con `Timestamp.fromDate`, que ya viene
 * resuelto. Eso prueba la forma del doc, pero NO prueba el shape exacto que
 * manda la app: `serverTimestamp()` viaja como un sentinel y lo resuelve el
 * backend. Si el rules lo viera como `null`, el `hasAll(['creadoAt'])` del
 * create lo negaria y el invitado perdería su respuesta en silencio — un
 * bug que los tests con timestamps fijos no detectan nunca.
 *
 * Acá se reproduce el `setDoc(..., { merge: true })` de `guardarRsvp` tal cual.
 */
describe('el write real de guardarRsvp()', () => {
	it('acepta el create con serverTimestamp() y merge, como en la primera vez que se responde', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		const data = {
			nombre: 'Familia García',
			ninos: 2,
			ninas: 1,
			asistira: true,
			creadoAt: serverTimestamp(),
			actualizadoAt: serverTimestamp()
		};
		await assertSucceeds(setDoc(docDe(a, UID_A), data, { merge: true }));

		const guardado = (await getDoc(docDe(a, UID_A))).data();
		// Si serverTimestamp() no llegara resuelto, esto seria null.
		expect(guardado?.creadoAt).toBeInstanceOf(Timestamp);
		expect(guardado?.actualizadoAt).toBeInstanceOf(Timestamp);
		expect(guardado?.nombre).toBe('Familia García');
	});

	it('acepta el update con serverTimestamp() y sin creadoAt, como al editar', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		await assertSucceeds(
			setDoc(
				docDe(a, UID_A),
				{
					nombre: 'Familia García',
					ninos: 2,
					ninas: 1,
					asistira: true,
					creadoAt: serverTimestamp(),
					actualizadoAt: serverTimestamp()
				},
				{ merge: true }
			)
		);
		const creado = (await getDoc(docDe(a, UID_A))).data()?.creadoAt;

		await assertSucceeds(
			setDoc(
				docDe(a, UID_A),
				{ nombre: 'Familia Gómez', actualizadoAt: serverTimestamp() },
				{ merge: true }
			)
		);
		const snap = (await getDoc(docDe(a, UID_A))).data();
		expect(snap?.nombre).toBe('Familia Gómez');
		expect(snap?.creadoAt?.toMillis()).toBe(creado?.toMillis());
	});

	it('acepta el write del camino "No" con serverTimestamp()', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		const no = {
			nombre: '',
			ninos: 0,
			ninas: 0,
			asistira: false,
			creadoAt: serverTimestamp(),
			actualizadoAt: serverTimestamp()
		};
		await assertSucceeds(setDoc(docDe(a, UID_A), no, { merge: true }));
		expect((await getDoc(docDe(a, UID_A))).data()?.asistira).toBe(false);
	});

	it('el edit posterior del "No" tampoco pisa creadoAt (el diff lo frena)', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		await assertSucceeds(
			setDoc(
				docDe(a, UID_A),
				{
					nombre: '',
					ninos: 0,
					ninas: 0,
					asistira: false,
					creadoAt: serverTimestamp(),
					actualizadoAt: serverTimestamp()
				},
				{ merge: true }
			)
		);
		// El invitado se arrepiente y responde "Sí". `guardarRsvp` manda merge
		// sin creadoAt, y como el doc YA existe, es update: esMerge() exige que
		// creadoAt no sea un affected key.
		await assertSucceeds(
			setDoc(
				docDe(a, UID_A),
				{
					nombre: 'Familia García',
					ninos: 1,
					ninas: 0,
					asistira: true,
					actualizadoAt: serverTimestamp()
				},
				{ merge: true }
			)
		);
		expect((await getDoc(docDe(a, UID_A))).data()?.nombre).toBe('Familia García');
	});
});

describe('el resto de la base', () => {
	it('está cerrada por defecto: no se puede crear en otra colección', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		expect(await denegar(setDoc(doc(a.firestore(), 'invitados', 'x'), { nombre: 'x' }))).toBe(
			'permission-denied'
		);
	});

	it('no deja leer otra colección', async () => {
		const a = testEnv.authenticatedContext(UID_A);
		expect(await denegar(getDocs(collection(a.firestore(), 'invitados')))).toBe(
			'permission-denied'
		);
	});

	it('no deja crear subcolecciones debajo del propio RSVP', async () => {
		// `match /rsvps/{uid}` no es recursivo: cubre el doc, no lo que cuelgue
		// de abajo. Sin este test, un guest podría colar subcolecciones en su
		// propio doc. Lo cierra el `match /{document=**}` final con `false`.
		const a = testEnv.authenticatedContext(UID_A);
		await assertSucceeds(setDoc(docDe(a, UID_A), rsvpValido()));
		const sub = doc(a.firestore(), 'rsvps', UID_A, 'notas', 'x');
		expect(await denegar(setDoc(sub, { texto: 'hola' }))).toBe('permission-denied');
	});

	it('no deja escribir en la raíz de la base', async () => {
		// `doc(db, 'config')` no existe en Firestore: un doc siempre tiene un
		// número par de segmentos. Lo que sí es alcanzable desde el cliente es
		// una colección nueva en la raíz, y eso ya está arriba.
		const a = testEnv.authenticatedContext(UID_A);
		expect(await denegar(setDoc(doc(a.firestore(), 'config', 'app'), { debug: true }))).toBe(
			'permission-denied'
		);
	});
});
