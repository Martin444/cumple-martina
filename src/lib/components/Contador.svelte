<script lang="ts">
	/**
	 * Stepper para contar niños/niñas.
	 *
	 * UX: en un form de cumple NO usamos `<input type="number">`. El spinner
	 * nativo es diminuto en mobile, obliga a hacer zoom para tocarlo, y el
	 * teclado numérico tapa medio form. Botones grandes de + y - son más
	 * fáciles de apretar con una mano y no abren teclado.
	 */
	let {
		etiqueta,
		emoji,
		valor = $bindable(0),
		max,
		error = '',
		id
	}: {
		etiqueta: string;
		emoji: string;
		valor?: number;
		max: number;
		error?: string;
		id: string;
	} = $props();

	function cambiar(delta: number) {
		valor = Math.min(max, Math.max(0, valor + delta));
	}

	/** El input real también es escribible: no todos usan los botones. */
	function alEscribir(e: Event) {
		const entrada = e.currentTarget as HTMLInputElement;
		const n = Number.parseInt(entrada.value, 10);
		valor = Number.isNaN(n) ? 0 : Math.min(max, Math.max(0, n));
	}
</script>

<div class="campo" class:con-error={Boolean(error)}>
	<span class="etiqueta" id="{id}-etiqueta">
		<span class="emoji" aria-hidden="true">{emoji}</span>
		{etiqueta}
	</span>

	<div class="stepper" role="group" aria-labelledby="{id}-etiqueta">
		<button
			type="button"
			class="paso"
			onclick={() => cambiar(-1)}
			disabled={valor <= 0}
			aria-label="Quitar uno de {etiqueta.toLowerCase()}"
		>
			<span aria-hidden="true">−</span>
		</button>

		<!--
			El input real sigue siendo enfocable y escribible (no todos usan
			los botones), pero visualmente lo reemplaza el número. Va antes del
			número en el DOM para que un lector de pantalla anuncie la etiqueta
			del grupo y luego el valor.
		-->
		<input
			{id}
			class="entrada-real"
			type="number"
			inputmode="numeric"
			min="0"
			{max}
			value={valor}
			oninput={alEscribir}
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error ? '{id}-error' : undefined}
		/>
		<span class="numero" aria-hidden="true">{valor}</span>

		<button
			type="button"
			class="paso"
			onclick={() => cambiar(1)}
			disabled={valor >= max}
			aria-label="Sumar uno a {etiqueta.toLowerCase()}"
		>
			<span aria-hidden="true">+</span>
		</button>
	</div>

	{#if error}
		<p class="error" id="{id}-error">{error}</p>
	{/if}
</div>

<style>
	.campo {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.etiqueta {
		font-family: 'Fredoka Variable', system-ui, sans-serif;
		font-size: 1.15rem;
		font-weight: 600;
	}

	.emoji {
		font-size: 1.3em;
	}

	.stepper {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		background: var(--crema);
		border: var(--borde);
		border-radius: 999px;
		padding: 0.35rem;
	}

	.paso {
		/* 48px: objetivo táctil comfortable, sobre el mínimo de 44px. */
		width: 48px;
		height: 48px;
		display: grid;
		place-items: center;
		border: 0;
		border-radius: 50%;
		background: var(--crema-2);
		font-size: 1.6rem;
		line-height: 1;
		transition:
			transform 0.15s var(--ease-bounce),
			background 0.15s;
	}

	.paso:hover:not(:disabled) {
		background: var(--bluey);
		color: #fff;
		transform: scale(1.1);
	}

	.paso:active:not(:disabled) {
		transform: scale(0.94);
	}

	.paso:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.numero {
		min-width: 2.2ch;
		text-align: center;
		font-family: 'Fredoka Variable', system-ui, sans-serif;
		font-size: 1.7rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	/* El input real queda accesible pero invisible: para teclado y screen
	   readers. El número que se ve es un aria-hidden, así que no se duplica. */
	.entrada-real {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.con-error .stepper {
		border-color: var(--coral-oscuro);
	}

	.error {
		color: var(--coral-oscuro);
		font-size: 0.9rem;
		font-weight: 600;
	}
</style>
