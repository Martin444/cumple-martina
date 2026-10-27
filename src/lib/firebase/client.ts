import { browser } from '$app/environment';
import {
	PUBLIC_FIREBASE_API_KEY,
	PUBLIC_FIREBASE_APP_ID,
	PUBLIC_FIREBASE_AUTH_DOMAIN,
	PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	PUBLIC_FIREBASE_PROJECT_ID,
	PUBLIC_FIREBASE_STORAGE_BUCKET,
	PUBLIC_USE_FIREBASE_EMULATORS
} from '$env/static/public';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

/**
 * Firebase corre 100% en el cliente: la app no tiene secrets, solo config
 * pública. Por eso todo va con prefijo `PUBLIC_` y todo el control real vive
 * en las security rules.
 *
 * ⚠️ Por qué `$env/static/public` y no `$env/dynamic/public`: con el dynamic,
 * una página prerenderada NO recibe los valores — no hay server que se los
 * inyecte al cliente, y el RSVP se rompe en silencio en el hosting estático.
 * Verificado: los valores no aparecían en el bundle cliente. El static los
 * inlinea siempre. A cambio, el build exige que las variables existan, y por
 * eso hay un `.env` commiteado con valores centinela (ver más abajo).
 */
function getFirebaseApp(): FirebaseApp {
	if (!browser) throw new Error('Firebase solo se inicializa en el navegador');
	app ??= getApps().length ? getApp() : initializeApp(config());
	return app;
}

function config() {
	return {
		apiKey: PUBLIC_FIREBASE_API_KEY,
		authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
		projectId: PUBLIC_FIREBASE_PROJECT_ID,
		storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
		messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
		appId: PUBLIC_FIREBASE_APP_ID
	};
}

/** Los emuladores solo tienen sentido en dev; en prod conectar rompe todo. */
function usarEmuladores() {
	return import.meta.env.DEV && PUBLIC_USE_FIREBASE_EMULATORS === 'true';
}

export function getDb(): Firestore {
	if (!browser) throw new Error('Firestore solo se inicializa en el navegador');
	if (!db) {
		db = getFirestore(getFirebaseApp());
		// Hay que conectar los emuladores ANTES de cualquier operación.
		if (usarEmuladores()) {
			connectFirestoreEmulator(db, '127.0.0.1', 8080);
		}
	}
	return db;
}

export function getAuthClient(): Auth {
	if (!browser) throw new Error('Auth solo se inicializa en el navegador');
	if (!auth) {
		auth = getAuth(getFirebaseApp());
		if (usarEmuladores()) {
			connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
		}
	}
	return auth;
}

/**
 * El invitado no tiene login: entra con Anonymous Auth. Eso nos da un `uid`
 * estable por dispositivo, que es lo que usan las rules para deixar escribir
 * únicamente a "uno mismo" (y editar su propia respuesta más tarde).
 *
 * El uid persiste en localStorage, así que si el invitado vuelve al link puede
 * ver y editar lo que ya respondió.
 */
export async function ensureUid(): Promise<string> {
	const client = getAuthClient();
	if (client.currentUser) return client.currentUser.uid;
	const { user } = await signInAnonymously(client);
	return user.uid;
}

/**
 * ¿La config de Firebase está completa y real?
 *
 * El `.env` commiteado trae valores centinela "PONER-..." para que el build
 * nunca falle. Con esos valores Firestore no existe, así que si los aceptáramos
 * el invitado vería un form que "funciona" y perdería su respuesta. Por eso
 * chequeamos el prefijo explícitamente.
 */
export function firebaseConfigurado(): boolean {
	return (
		Boolean(PUBLIC_FIREBASE_API_KEY) &&
		Boolean(PUBLIC_FIREBASE_PROJECT_ID) &&
		Boolean(PUBLIC_FIREBASE_APP_ID) &&
		!PUBLIC_FIREBASE_API_KEY.startsWith('PONER-') &&
		!PUBLIC_FIREBASE_PROJECT_ID.startsWith('PONER-') &&
		!PUBLIC_FIREBASE_APP_ID.startsWith('PONER-')
	);
}

