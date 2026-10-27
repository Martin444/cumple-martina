<!--
	FONDO — malla + olas + grano.

	Reemplaza a la decoración de emojis que flotaban con el scroll. Tres capas,
	de atrás hacia adelante:

	  1. `.malla`  gradientes radiales que derivan lentísimo. Es la que aporta
	               el color de fondo y hace que ninguna pantalla se vea vacía.
	  2. `.ola`    tres SVG inline con curvas. La de arriba enmarcan, las dos de
	               abajo dan profundidad. Se mueven a velocidades distintas: eso
	               es lo que se lee como capas y no como "un fondo que se mueve".
	  3. `.grano`  ruido por `feTurbulence` en `soft-light`. Le saca el aspecto
	               de degradado plano de CSS y es lo que separa "hecho a
	               medida" de "gradiente de default".

	Por qué SVG inline y no un archivo en /static:
	  - 0 kb de red y 0 requests. La invitación se abre por WhatsApp, muchas
	    veces con datos móviles: cada request extra es latencia.
	  - Sin licencias. Un wave descargado de un generador arrastra el crédito
	    del autor; uno escrito acá es nuestro y no hay de qué responder.
	  - Animable con `transform`, que corre en el compositor. Un `background-position`
	    animado sobre un gradiente grande repinta en cada frame: se ve el
	    flicker en gama baja.

	El bucle de las olas es CONTINUO DE VERDAD, y ese detalle es la diferencia
	entre "se ve bien" y "se ve bien". Ver el comentario de periodicidad abajo.
-->
<div class="fondo" aria-hidden="true">
	<div class="malla"></div>

	<!--
		OLA DE ARRIBA — el marco. viewBox 0 0 2880 120, relleno hacia y=0.

		PERIODICIDAD (lo que hace que el loop no se vea):
		el <svg> mide 200% del ancho del viewport y se anima `translateX` de 0 a
		-50%, o sea un desplazamiento de exactamente 1 viewport de ancho. Como
		el viewBox (2880) mapea a esos 200% (2W), ese desplazamiento vale
		exactamente 1440 unidades del viewBox. Para que el loop cierre sin salto,
		el período de la curva tiene que dividir a 1440.

		Ola alta: período 1440 (1 vuelta). ✓
		Ola lejana: período 1440 (1 vuelta). ✓
		Ola cercana: período 720 (2 vueltas). ✓
		Las tres arrancan y terminan en el mismo `y`, con la tangente en el
		corte igual a la del arranque, así que el empalme es invisible.
	-->
	<svg class="ola ola-alta" viewBox="0 0 2880 120" preserveAspectRatio="none" focusable="false">
		<path
			d="M0,72 C240,26 480,26 720,72 C960,118 1200,118 1440,72
			   C1680,26 1920,26 2160,72 C2400,118 2640,118 2880,72
			   L2880,0 L0,0 Z"
		/>
	</svg>

	<!--
		OLA LEJANA — período 1440. Es la más alta y la más pálida: es el fondo
		del fondo, la que está más lejos.
	-->
	<svg class="ola ola-lejana" viewBox="0 0 2880 220" preserveAspectRatio="none" focusable="false">
		<path
			d="M0,130 C240,80 480,80 720,130 C960,180 1200,180 1440,130
			   C1680,80 1920,80 2160,130 C2400,180 2640,180 2880,130
			   L2880,220 L0,220 Z"
		/>
	</svg>

	<!--
		OLA CERCANA — período 720, el doble de vueltas: se ve más rápida aunque
		viaje más despacio. Es la de más contraste y la que pasa por detrás de
		la barra de navegación.
	-->
	<svg class="ola ola-cercana" viewBox="0 0 2880 220" preserveAspectRatio="none" focusable="false">
		<path
			d="M0,150 C120,192 240,192 360,150 C480,108 600,108 720,150
			   C840,192 960,192 1080,150 C1200,108 1320,108 1440,150
			   C1560,192 1680,192 1800,150 C1920,108 2040,108 2160,150
			   C2280,192 2400,192 2520,150 C2640,108 2760,108 2880,150
			   L2880,220 L0,220 Z"
		/>
	</svg>

	<div class="grano"></div>
</div>

<style>
	.fondo {
		position: fixed;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		/*
			`isolation: isolate` abre un stacking context para que el
			`mix-blend-mode` del grano se funda con la malla y las olas de acá
			mismo, y no con lo que haya detrás de este elemento.
		*/
		isolation: isolate;
		background: var(--fondo-base);
		overflow: hidden;
		overflow: clip;
	}

	/* ---------------------------------------------------------------- MALLA */
	.malla {
		position: absolute;
		/*
			El overscan de -25% es lo que le da lugar a la deriva sin que se vea
			el borde del gradiente. Sin él, en los primeros segundos del ciclo
			aparece un borde recto abajo a la izquierda.
		*/
		inset: -25%;
		background:
			radial-gradient(ellipse 42% 36% at 20% 24%, rgba(126, 211, 33, 0.26), transparent 62%),
			radial-gradient(ellipse 40% 34% at 80% 20%, rgba(255, 217, 61, 0.3), transparent 64%),
			radial-gradient(ellipse 48% 40% at 74% 76%, rgba(79, 184, 232, 0.34), transparent 66%),
			radial-gradient(ellipse 44% 34% at 22% 80%, rgba(255, 107, 157, 0.22), transparent 62%);
		will-change: transform;
	}

	/* ----------------------------------------------------------------- OLAS */
	.ola {
		position: absolute;
		inset-inline-start: 0;
		/* 200% = el doble del viewport. El `-50%` del keyframe lo recorre. */
		width: 200%;
		display: block;
	}

	.ola-alta {
		inset-block-start: 0;
		height: 13vh;
		fill: #fff;
		opacity: 0.6;
	}

	.ola-lejana {
		inset-block-end: 0;
		height: 30vh;
		fill: var(--agua);
		opacity: 0.75;
	}

	.ola-cercana {
		inset-block-end: 0;
		height: 19vh;
		fill: var(--agua-alta);
		opacity: 0.85;
	}

	/* ---------------------------------------------------------------- GRANO */
	.grano {
		position: absolute;
		inset: 0;
		opacity: 0.42;
		mix-blend-mode: soft-light;
		background-size: 180px 180px;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23g)'/%3E%3C/svg%3E");
	}

	/* =======================================================================
	   MOVIMIENTO

	   Todo lo que se mueve acá es decorativo y por lo tanto TODO esto va
	   adentro del guard de reduced-motion. Pero —y esto es lo importante— el
	   estado BASE (las tres capas, con su color) se ve siempre, sin animación
	   y sin JS. Un fondo que sin animación queda invisible es peor que un
	   fondo feo: es una pantalla en blanco.
	   ======================================================================= */
	@media (prefers-reduced-motion: no-preference) {
		.malla {
			animation: deriva 44s var(--ease-wiggle) infinite alternate;
		}

		.ola-alta {
			animation: corre 38s linear infinite;
		}

		.ola-lejana {
			animation: corre 30s linear infinite;
		}

		.ola-cercana {
			animation: corre 21s linear infinite;
		}
	}

	/*
		El desplazamiento es exactamente `-50%` del elemento, que mide 200% del
		viewport: un viewport de ancho. Con los períodos del comentario de arriba
		eso cierra el loop sin costura.
	*/
	@keyframes corre {
		from {
			transform: translate3d(0, 0, 0);
		}
		to {
			transform: translate3d(-50%, 0, 0);
		}
	}

	/*
		`alternate` + `ease-wiggle` en vez de `linear`: la malla respira. Es un
		vaivén lento, no una traslación, así que no necesita ser lineal ni
		empalmar con nada.
	*/
	@keyframes deriva {
		from {
			transform: translate3d(-2.5%, 1.5%, 0) scale(1);
		}
		to {
			transform: translate3d(2.5%, -1.5%, 0) scale(1.06);
		}
	}
</style>
