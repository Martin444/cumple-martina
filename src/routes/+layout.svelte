<script lang="ts">
	import '@fontsource-variable/fredoka';
	import '@fontsource-variable/nunito';
	import '../app.css';

	let { children } = $props();
</script>

<!--
	El skip link es la primera cosa enfocable: sin esto, el invitado que navega
	con teclado tiene que atravesar toda la barra de navegación para llegar al
	contenido del paso.

	Va antes que todo y es lo único enfocable en el `body`: el resto de la
	navegación vive adentro de la página, y el fondo ni siquiera es enfocable.
-->
<a class="saltar" href="#contenido">Saltar al contenido</a>

{@render children()}

<style>
	.saltar {
		position: fixed;
		left: -9999px;
		top: 0;
		z-index: 100;
		padding: 0.75rem 1.25rem;
		background: var(--tinta);
		color: #fff;
		border-radius: 0 0 var(--radio-chico) 0;
		font-weight: 600;
	}

	.saltar:focus {
		left: 0;
	}
</style>
