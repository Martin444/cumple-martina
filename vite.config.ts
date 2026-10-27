import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-netlify';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					// Los `.rules.test.ts` viven acá adentro pero son de otro tier:
					// necesitan el emulador. Si no se excluyen, `vitest run` a secas
					// los levanta sin emulador y los hace fallar por conexión.
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', 'src/**/*.rules.{test,spec}.{js,ts}']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'rules',
					environment: 'node',
					include: ['src/**/*.rules.{test,spec}.{js,ts}'],
					// Un archivo, un emulador, un `clearFirestore()` por test: correr
					// en paralelo entre workers pelearía por el mismo estado.
					fileParallelism: false,
					pool: 'forks',
					// El emulador va a disco y cada operación es un round trip HTTP.
					// Con los 5s por defecto, el primer test en frío secome el timeout
					// y el fallo parece un problema de permisos.
					testTimeout: 20_000,
					hookTimeout: 30_000
				}
			}
		]
	}
});
