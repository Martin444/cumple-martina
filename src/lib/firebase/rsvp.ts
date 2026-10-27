import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ensureUid, getDb } from './client';

export const MAX_NINOS = 10;
export const MAX_NINAS = 10;
export const MAX_NOMBRE = 60;

export type Rsvp = {
	nombre: string;
	ninos: number;
	ninas: number;
	asistira: boolean;
};

/**
 * `general` es para errores que no son de un campo concreto (red caída, rules
 * denegando). Sin él, la UI no tiene dónde poner "no pudimos guardar" y el
 * primer expediente es prodarle el error al campo del nombre, que es mentira.
 */
export type ErroresRsvp = Partial<Record<'nombre' | 'ninos' | 'ninas' | 'general', string>>;
export type ResultadoValidacion = { ok: true; valor: Rsvp } | { ok: false; errores: ErroresRsvp };

/**
 * Falla de validación con los errores ya atribuidos a su campo.
 *
 * Existe para que el form NO tenga que adivinar: si `guardarRsvp` tirara un
 * `Error` pelado, el componente no podria distinguir "escribiste tu nombre
 * mal" de "se cayó la red" y terminaria mostrando el error de red arriba del
 * input de nombre.
 */
export class RsvpInvalidoError extends Error {
	readonly errores: ErroresRsvp;

	constructor(errores: ErroresRsvp) {
		super('RSVP inválido');
		this.name = 'RsvpInvalidoError';
		this.errores = errores;
	}
}

/** Lo que puede mandar el form: los contadores llegan como string del input. */
export type RsvpCrudo = {
	nombre?: string | null;
	ninos?: number | string | null;
	ninas?: number | string | null;
	asistira?: boolean | null;
};

const esEnteroEnRango = (v: unknown, max: number): v is number =>
	typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max;

/**
 * Normaliza y valida. Es pura a propósito: es la misma lógica que hay que
 * replicar en `firestore.rules`, y testearla acá es lo que nos cubre los flancos
 * antes de tocar el emulador.
 *
 * Cuando `asistira` es `false` el nombre no se exige: el camino del "No" solo
 * necesita dejar constancia de que no viene, sin obligar a escribir nada.
 */
export function validarRsvp(crudo: RsvpCrudo): ResultadoValidacion {
	const errores: ErroresRsvp = {};
	const asistira = crudo.asistira === true;

	const nombre = (crudo.nombre ?? '').toString().trim().replace(/\s+/g, ' ');

	if (asistira) {
		if (nombre.length === 0) {
			errores.nombre = 'Escribí tu nombre';
		} else if (nombre.length > MAX_NOMBRE) {
			errores.nombre = `Máximo ${MAX_NOMBRE} caracteres`;
		} else if (/[\p{Cc}\p{Cf}]/u.test(nombre)) {
			errores.nombre = 'El nombre tiene caracteres inválidos';
		}
	}

	const aEntero = (v: number | string | null | undefined): unknown => {
		if (typeof v === 'number') return v;
		if (typeof v !== 'string') return NaN;
		const limpio = v.trim();
		if (limpio === '') return 0;
		if (!/^\d{1,2}$/.test(limpio)) return NaN;
		return Number(limpio);
	};

	const ninos = aEntero(crudo.ninos);
	if (!esEnteroEnRango(ninos, MAX_NINOS)) {
		errores.ninos = `Entre 0 y ${MAX_NINOS}`;
	}

	const ninas = aEntero(crudo.ninas);
	if (!esEnteroEnRango(ninas, MAX_NINAS)) {
		errores.ninas = `Entre 0 y ${MAX_NINAS}`;
	}

	if (Object.keys(errores).length > 0) return { ok: false, errores };

	return {
		ok: true,
		valor: {
			nombre: asistira ? nombre : '',
			ninos: ninos as number,
			ninas: ninas as number,
			asistira
		}
	};
}

/** Path del doc. El id es el uid de Anonymous Auth, no un campo del form. */
export const rsvpPath = (uid: string) => `rsvps/${uid}`;

/**
 * Guarda o **actualiza** el RSVP. El mismo uid puede llamar esto las veces que
 * quiera: por eso el RSVP es editable y no de una sola vez.
 */
export async function guardarRsvp(crudo: RsvpCrudo): Promise<Rsvp> {
	const resultado = validarRsvp(crudo);
	if (!resultado.ok) throw new RsvpInvalidoError(resultado.errores);

	const uid = await ensureUid();
	const valor = resultado.valor;

	await setDoc(
		doc(getDb(), rsvpPath(uid)),
		{
			...valor,
			// `createdAt` solo se escribe la primera vez; en un update no se pisa.
			actualizadoAt: serverTimestamp(),
			...((await yaRespondio(uid)) ? {} : { creadoAt: serverTimestamp() })
		},
		{ merge: true }
	);

	return valor;
}

/** Lee la respuesta previa de este dispositivo, si la hay. */
export async function leerRsvp(): Promise<(Rsvp & { uid: string }) | null> {
	const uid = await ensureUid();
	const snap = await getDoc(doc(getDb(), rsvpPath(uid)));
	if (!snap.exists()) return null;
	const data = snap.data() as Partial<Rsvp>;
	return {
		uid,
		nombre: data.nombre ?? '',
		ninos: data.ninos ?? 0,
		ninas: data.ninas ?? 0,
		asistira: data.asistira ?? true
	};
}

async function yaRespondio(uid: string): Promise<boolean> {
	const snap = await getDoc(doc(getDb(), rsvpPath(uid)));
	return snap.exists();
}


