<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		variante = 'primario',
		tamano = 'normal',
		tipo = 'button',
		href,
		onclick,
		disabled = false,
		children
	}: {
		variante?: 'primario' | 'secundario' | 'fantasia';
		tamano?: 'normal' | 'grande';
		tipo?: 'button' | 'submit';
		href?: string;
		onclick?: (e: MouseEvent) => void;
		disabled?: boolean;
		children: Snippet;
	} = $props();
</script>

{#if href}
	<!--
		El `href` de acá siempre es una URL ABSOLUTA externa (hoy, la de intents
		de Google Maps desde `config/evento.ts`). `resolve()` es para rutas
		internas de SvelteKit: aplicarlo a una URL absoluta la rompe. Por eso la
		regla no aplica acá, y el `target`/`rel` de abajo tampoco hacen falta
		porque no vamos a otra pestaña.
	-->
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
	<a {href} class="boton {variante} {tamano}">
		{@render children()}
	</a>
{:else}
	<button type={tipo} class="boton {variante} {tamano}" {onclick} {disabled}>
		{@render children()}
	</button>
{/if}

<style>
	/* Botón "de dibujo a mano alzada": borde grueso cartoon, sombra dura y
	   rebote al hover. Cada variante tiene su propio color del universo Bluey. */
	.boton {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.95rem 2rem;
		border: var(--borde);
		border-radius: 999px;
		background: var(--bluey);
		color: #fff;
		font-family: 'Fredoka Variable', system-ui, sans-serif;
		font-weight: 600;
		font-size: 1.1rem;
		text-decoration: none;
		box-shadow: var(--sombra);
		transition:
			transform 0.18s var(--ease-bounce),
			box-shadow 0.18s var(--ease-out),
			background 0.2s;
		will-change: transform;
		text-shadow: 0 1px 0 rgba(30, 58, 95, 0.2);
	}

	.grande {
		padding: 1.2rem 2.8rem;
		font-size: 1.35rem;
	}

	.secundario {
		background: var(--crema);
		color: var(--tinta);
		text-shadow: none;
	}

	.fantasia {
		background: var(--naranja);
	}

	.boton:hover:not(:disabled) {
		transform: translateY(-4px) rotate(-2deg) scale(1.03);
		box-shadow: var(--sombra-hover);
	}

	.boton:active:not(:disabled) {
		transform: translateY(3px) scale(0.98);
		box-shadow: 0 2px 0 rgba(30, 58, 95, 0.18);
	}

	.boton:disabled {
		opacity: 0.55;
		cursor: not-allowed;
		box-shadow: none;
	}
</style>
