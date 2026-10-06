/*
 * Hanging plants on the front page (GSAP), the three plant shapes of a button on Uiverse.io by MuhammadHasann,
 * kept once in images/plants.svg (symbols plant-0, plant-1, plant-2).
 * 1. Creepers: green vines hang from the top edge of the screen in two thick green walls, at the left and the
 *    right edge, like the green on the walls of the shop; longest at the edge of the screen, the middle stays free
 *    for the menu on the cornice, the sign and the hero text. Every vine is a chain of the shapes, each link
 *    hanging from the end of the one above and swinging a little around that point, so the vine sways like a
 *    rope. A wind runs across the screen: neighbouring vines swing together. The vines hang in front of the
 *    facade, let every click through and fade out when the camera goes through an arch ('jos:view' from
 *    motion.js).
 * 2. The reservation button of the hero: three plants hang over its top edge and sway while it is pointed at or
 *    has the focus, as on the Uiverse button.
 * Without motion everything hangs still.
 */
document.addEventListener('DOMContentLoaded', () => {
	if (!window.gsap) return;

	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	// ---- 2. the plants on the reservation button: at rest a little turned, pointed at they swing between two
	// angles (degrees, seconds for one way, delay), around the point where they hang
	const PLANT_SWAY = [
		{ rest: 10, from: 10, to: -5, time: 1.5, delay: 0 },
		{ rest: 10, from: 0, to: 15, time: 1.5, delay: 0.5 },
		{ rest: -5, from: 0, to: -5, time: 1, delay: 0.5 },
	];
	document.querySelectorAll('[data-reserve]').forEach((button) => {
		const plants = [...button.querySelectorAll('[data-plant]')];
		plants.forEach((plant, i) => gsap.set(plant, { rotation: PLANT_SWAY[i].rest }));
		if (reduced) return;
		let swaying = [];
		const start = () => {
			if (swaying.length) return;
			swaying = plants.map((plant, i) => {
				const sway = PLANT_SWAY[i];
				return gsap.timeline({ delay: sway.delay })
					.to(plant, { rotation: sway.from, duration: 0.4, ease: 'sine.out' })
					.to(plant, { rotation: sway.to, duration: sway.time, ease: 'sine.inOut', repeat: -1, yoyo: true });
			});
		};
		const stop = () => {
			swaying.forEach((timeline) => timeline.kill());
			swaying = [];
			plants.forEach((plant, i) => gsap.to(plant, { rotation: PLANT_SWAY[i].rest, duration: 0.6, ease: 'sine.out', overwrite: true }));
		};
		button.addEventListener('pointerenter', start);
		button.addEventListener('pointerleave', stop);
		button.addEventListener('focus', start);
		button.addEventListener('blur', stop);
	});

	// ---- 1. the creepers
	const box = document.querySelector('[data-vines]');
	const sprite = box && box.dataset.plants;
	if (!box || !sprite) return;

	// the three shapes in their own units: width, height, where the stem leaves the top edge (x) and where the
	// next link hangs on (end: a point of the stem just above the last leaves)
	const SHAPES = [
		{ w: 26.3, h: 65.33, top: 5.8, end: [17, 57] },
		{ w: 11.67, h: 37.63, top: 3.15, end: [5.7, 34] },
		{ w: 25.29, h: 76.92, top: 16.7, end: [5.2, 70] },
	];
	const GREENS = ['#2c4a2b', '#355a32', '#3f6b3a', '#4b7c43', '#5a8d4e'];   // far (dark) to near (light)
	// where the vines hang, in parts of the screen width, and how long the longest (at the edge of the screen) is,
	// in parts of the screen height: left above the hero text; below 768 px (as $bp-tablet in style.scss) the menu
	// of the header runs over the top, so only the wall at the right edge, beginning MENU_GAP px right of the menu
	const WALLS = {
		wide: [{ from: 0, to: 0.25, length: 0.38 }, { from: 0.63, to: 1, length: 0.56 }],
		narrow: [{ from: 0.82, to: 1, length: 0.44 }],
	};
	const SPACING = { wide: 22, narrow: 11 };   // px between two vines
	const MENU_GAP = 44;
	const SCALE = [2.0, 3.4];    // px per unit of the shapes: far, near (on a phone 0.7 of it)
	const SWAY = [1.0, 1.2];     // degrees each link swings: the top link, every link further down adds the second
	const WIND = 3.4;            // s for the wind to cross the screen

	// the same vines on every visit
	let seed = 1060127;
	const random = (min = 0, max = 1) => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return min + (((t ^ (t >>> 14)) >>> 0) / 4294967296) * (max - min);
	};

	const NS = 'http://www.w3.org/2000/svg';

	// one link: the shape (mirrored or not) at its size, hung on at its top stem point
	const makeLink = (shapeIndex, mirrored, scale) => {
		const shape = SHAPES[shapeIndex];
		const width = shape.w * scale;
		const height = shape.h * scale;
		const top = (mirrored ? shape.w - shape.top : shape.top) * scale;
		const end = [(mirrored ? shape.w - shape.end[0] : shape.end[0]) * scale, shape.end[1] * scale];
		const link = document.createElement('span');
		link.className = 'vines__link';
		link.style.width = `${width}px`;
		link.style.height = `${height}px`;
		const svg = document.createElementNS(NS, 'svg');
		svg.setAttribute('viewBox', `0 0 ${shape.w} ${shape.h}`);
		if (mirrored) svg.classList.add('is-mirrored');
		const use = document.createElementNS(NS, 'use');
		use.setAttribute('href', `${sprite}#plant-${shapeIndex}`);
		svg.appendChild(use);
		link.appendChild(svg);
		return { link, top, end, height };
	};

	let tweens = [];
	let builtWidth = 0;

	const build = () => {
		tweens.forEach((tween) => tween.kill());
		tweens = [];
		box.replaceChildren();
		const width = window.innerWidth;
		const height = window.innerHeight;
		builtWidth = width;
		seed = 1060127;
		const small = width < 768;
		const layout = small ? 'narrow' : 'wide';
		// right end of the words of the header menu in the top row (only on a phone, on a computer it waits hidden)
		const menuEnd = !small ? 0 : Math.max(0, ...[...document.querySelectorAll('.site-header__nav li')]
			.map((item) => item.getBoundingClientRect())
			.filter((rect) => rect.width && rect.top < 0.15 * height)
			.map((rect) => rect.right));
		const vines = [];
		WALLS[layout].forEach((wall) => {
			const left = Math.min(0.92 * width, Math.max(wall.from * width, menuEnd ? menuEnd + MENU_GAP : 0));
			const span = wall.to * width - left;
			const count = Math.max(1, Math.round(span / SPACING[layout]));
			for (let i = 0; i < count; i++) {
				const x = left + ((i + 0.5 + random(-0.35, 0.35)) / count) * span;
				// 1 at the edge of the screen, 0 at the inner end of the wall
				const edge = wall.from === 0 ? 1 - (x - left) / span : (x - left) / span;
				const depth = random();   // 0 far, 1 near
				const scale = (SCALE[0] + depth * (SCALE[1] - SCALE[0])) * (small ? 0.7 : 1);
				const length = height * wall.length * (0.25 + 0.75 * Math.max(0, edge) ** 1.5) * random(0.75, 1.05);
				vines.push({ x, depth, scale, length });
			}
		});
		// far vines first, the near ones hang in front of them
		vines.sort((a, b) => a.depth - b.depth);
		vines.forEach((vine) => {
			const color = GREENS[Math.min(GREENS.length - 1, Math.floor(vine.depth * GREENS.length))];
			let parent = null;
			let reach = 0;
			let level = 0;
			let mirrored = random() < 0.5;
			let previous = null;
			// links down to the length of the vine: long stems in between (shapes 1 and 2), the leafy tip
			// (shape 0) or a stem at the end
			while (reach < vine.length || !parent) {
				const last = reach + 0.75 * SHAPES[2].h * vine.scale >= vine.length;
				const shapeIndex = last ? [0, 1, 2][Math.floor(random(0, 3))] : random() < 0.65 ? 2 : 1;
				const made = makeLink(shapeIndex, mirrored, vine.scale);
				if (parent) {
					made.link.style.left = `${previous.end[0] - made.top}px`;
					made.link.style.top = `${previous.end[1]}px`;
					parent.appendChild(made.link);
				} else {
					made.link.classList.add('vines__vine');
					made.link.style.left = `${vine.x - made.top}px`;
					made.link.style.top = `${-0.08 * made.height}px`;
					made.link.style.color = color;
					box.appendChild(made.link);
				}
				gsap.set(made.link, { transformOrigin: `${made.top}px 0px` });
				if (!reduced) {
					const amplitude = (SWAY[0] + SWAY[1] * level) * random(0.7, 1.3);
					const duration = random(2.6, 4.2);
					const tween = gsap.fromTo(made.link, { rotation: -amplitude }, { rotation: amplitude, duration, ease: 'sine.inOut', repeat: -1, yoyo: true });
					// the wind reaches the vines from left to right
					tween.totalTime(duration * 2 - ((vine.x / width) * WIND + random(0, 0.4) + level * 0.25) % (duration * 2));
					tweens.push(tween);
				}
				reach += previous ? made.end[1] : made.end[1] - 0.08 * made.height;
				parent = made.link;
				previous = made;
				mirrored = !mirrored;
				level += 1;
				if (last) break;
			}
		});
	};

	build();
	let resizing = null;
	window.addEventListener('resize', () => {
		clearTimeout(resizing);
		// a phone hiding its address bar changes only the height: the vines stay
		resizing = setTimeout(() => { if (window.innerWidth !== builtWidth) build(); }, 200);
	});

	// through an arch into a page or the shop the vines fade out, back on the street they are there again
	window.addEventListener('jos:view', (event) => {
		gsap.set(box, { autoAlpha: 1 - event.detail.t });
	});
});
