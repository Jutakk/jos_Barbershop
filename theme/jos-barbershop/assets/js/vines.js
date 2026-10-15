/*
 * Hanging plants (GSAP), the three plant shapes of a button on Uiverse.io by MuhammadHasann, kept once in
 * images/plants.svg (symbols plant-0, plant-1, plant-2).
 * 1. Creepers: green vines hang from the top edge of the screen in two thick green walls, at the left and the
 *    right edge, like the green on the walls of the shop; longest at the edge of the screen. Every vine is a chain
 *    of the shapes, each link hanging from the end of the one above and swinging a little around that point, so
 *    the vine sways like a rope. A wind runs across the screen: neighbouring vines swing together. They let every
 *    click through.
 *    Every page has its own vines, in its own random order (a seed per page, the same on every visit):
 *    - the street of the front page: the middle stays free for the menu on the cornice, the sign and the hero
 *      text; they grow from the top down when the page loads, together with the facade drawing itself, and fade
 *      out when the camera goes through an arch ('jos:view' from motion.js);
 *    - every page behind an arch: more and longer vines, left and right of the text in the middle, up to just
 *      before it (never behind a letter; on a phone only short ones in the corner of the X); they grow from the top
 *      down when the page opens (motion.js sets .is-open) and fade out when it closes;
 *    - the other pages of the site (Impressum, Datenschutz, Cookies): the same, grown when the page loads.
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
	// in parts of the screen height. Below 768 px (as $bp-tablet in style.scss) the menu of the header runs over the
	// top, so only the wall at the right edge, beginning MENU_GAP px right of the menu.
	// street: left above the hero text, the right wall wider (the order of the street as it has always been)
	const STREET = {
		wide: [{ from: 0, to: 0.25, length: 0.38 }, { from: 0.63, to: 1, length: 0.56 }],
		narrow: [{ from: 0.82, to: 1, length: 0.44 }],
		spacing: { wide: 22, narrow: 11 },   // px between two vines
	};
	// a page: thicker and longer walls on both sides of its text in the middle, each from the edge of the screen to
	// GAP px plus the reach of a leaf beside its stem (LEAF) before the text, at most MAX of the screen width, so no
	// leaf ever lies behind a letter; a wall with no room for two vines stays away. On a phone the text runs over
	// the whole width: short vines hang only in the corner of the X (CORNER px), above the text, as everywhere no
	// wall has room beside the text.
	const PAGE = { gap: 24, leaf: 50, max: 0.34, length: 0.62, spacing: { wide: 15, narrow: 8 }, corner: 96, cornerLength: 0.12 };
	const MENU_GAP = 44;
	const SCALE = [2.0, 3.4];    // px per unit of the shapes: far, near (on a phone 0.7 of it)
	const SWAY = [1.0, 1.2];     // degrees each link swings: the top link, every link further down adds the second
	const WIND = 3.4;            // s for the wind to cross the screen
	// growing: s for one link to grow out of the one above, s over which the vines start, and the latest start on
	// the front page when the scene never says it is ready (no WebGL)
	const GROW = { link: 0.5, spread: 1.6, wait: 4 };
	const FADE = 0.35;           // s for the vines of a page to go when it closes
	const STREET_SEED = 1060127; // the vines of the street as they have always been

	// a seed from the name of a page: every page its own order, the same on every visit
	const seedOf = (name) => {
		let hash = 2166136261;
		for (const char of name) hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
		return hash >>> 0;
	};

	// the seeded random of one build
	let seed = STREET_SEED;
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

	// a set of vines: the vines of one page, in their own layer; column: where its text stands (for a page)
	const makeSet = (name, seedValue, walls, column = null) => {
		const el = document.createElement('div');
		el.className = 'vines__set';
		box.appendChild(el);
		return { name, seed: seedValue, walls, column, el, tweens: [], growing: [], built: false, shown: false };
	};

	// the walls of a set at this width
	const wallsOf = (set, width, small) => {
		if (set.walls === 'street') return STREET[small ? 'narrow' : 'wide'];
		const corner = [{ from: 1 - PAGE.corner / width, to: 1, length: PAGE.cornerLength }];
		if (small) return corner;
		const rect = set.column ? set.column() : null;
		const room = (px) => Math.min(PAGE.max, Math.max(0, px - PAGE.gap - PAGE.leaf) / width);
		const left = rect && rect.width ? room(rect.left) : 0.22;
		const right = rect && rect.width ? room(width - rect.right) : 0.22;
		const walls = [];
		if (left * width >= 2 * PAGE.spacing.wide) walls.push({ from: 0, to: left, length: PAGE.length });
		if (right * width >= 2 * PAGE.spacing.wide) walls.push({ from: 1 - right, to: 1, length: PAGE.length });
		// no room beside the text: the short vines of the corner, as on a phone
		return walls.length ? walls : corner;
	};

	// builds the vines of a set; grown: they stand at once, else every link waits at 0 for grow()
	const build = (set, grown = true) => {
		set.tweens.forEach((tween) => tween.kill());
		set.tweens = [];
		set.growing = [];
		set.el.replaceChildren();
		set.built = true;
		const width = window.innerWidth;
		const height = window.innerHeight;
		seed = set.seed;
		const small = width < 768;
		const layout = small ? 'narrow' : 'wide';
		const spacing = (set.walls === 'street' ? STREET : PAGE).spacing[layout];
		// right end of the words of the header menu in the top row (only on a phone, on a computer it waits hidden)
		const menuEnd = !small ? 0 : Math.max(0, ...[...document.querySelectorAll('.site-header__nav li')]
			.map((item) => item.getBoundingClientRect())
			.filter((rect) => rect.width && rect.top < 0.15 * height)
			.map((rect) => rect.right));
		const vines = [];
		wallsOf(set, width, small).forEach((wall) => {
			const left = Math.min(0.92 * width, Math.max(wall.from * width, menuEnd ? menuEnd + MENU_GAP : 0));
			const span = wall.to * width - left;
			const count = Math.max(1, Math.round(span / spacing));
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
			// each link grows out of the end of the one above (scale along its length from its top), the next one
			// starts just before it is done; not from the seeded random, so the vines stay where they are
			const growth = grown ? null : gsap.timeline({ paused: true });
			const growStart = Math.random() * GROW.spread;
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
					set.el.appendChild(made.link);
				}
				gsap.set(made.link, { transformOrigin: `${made.top}px 0px` });
				if (growth) {
					gsap.set(made.link, { scaleY: 0 });
					growth.to(made.link, { scaleY: 1, duration: GROW.link, ease: level ? 'none' : 'power1.in' }, level ? '>-0.06' : growStart);
				}
				if (!reduced) {
					const amplitude = (SWAY[0] + SWAY[1] * level) * random(0.7, 1.3);
					const duration = random(2.6, 4.2);
					const tween = gsap.fromTo(made.link, { rotation: -amplitude }, { rotation: amplitude, duration, ease: 'sine.inOut', repeat: -1, yoyo: true });
					// the wind reaches the vines from left to right
					tween.totalTime(duration * 2 - ((vine.x / width) * WIND + random(0, 0.4) + level * 0.25) % (duration * 2));
					set.tweens.push(tween);
				}
				reach += previous ? made.end[1] : made.end[1] - 0.08 * made.height;
				parent = made.link;
				previous = made;
				mirrored = !mirrored;
				level += 1;
				if (last) break;
			}
			if (growth) {
				growth.eventCallback('onComplete', () => growth.kill());
				set.growing.push(growth);
				set.tweens.push(growth);
			}
		});
	};

	// grows the links that wait at 0
	const grow = (set) => {
		set.growing.forEach((growth) => growth.play());
		set.growing = [];
	};

	// shows a set: built (grown at once, or growing from the top when it may move), swaying
	const show = (set, growing) => {
		gsap.killTweensOf(set.el);
		gsap.set(set.el, { autoAlpha: 1 });
		set.shown = true;
		if (!set.built || growing) build(set, !growing || reduced);
		set.tweens.forEach((tween) => tween.resume());
		if (growing && !reduced) grow(set);
	};

	// hides a set: faded out (at once without motion), then its vines stop; the vines of a page are let go
	const hide = (set, release) => {
		if (!set.shown) return;
		set.shown = false;
		const done = () => {
			if (set.shown) return;
			if (release) {
				set.tweens.forEach((tween) => tween.kill());
				set.tweens = [];
				set.growing = [];
				set.el.replaceChildren();
				set.built = false;
			} else {
				set.tweens.forEach((tween) => tween.pause());
			}
		};
		if (reduced) {
			gsap.set(set.el, { autoAlpha: 0 });
			done();
		} else {
			gsap.to(set.el, { autoAlpha: 0, duration: FADE, ease: 'power1.in', overwrite: true, onComplete: done });
		}
	};

	const rooms = [...document.querySelectorAll('[data-room]')];
	const html = document.documentElement;
	const sets = [];
	let initial = null;   // the set that grows when the page loads

	if (box.hasAttribute('data-street')) {
		// ---- front page: the street, and every page behind an arch
		const street = makeSet('street', STREET_SEED, 'street');
		sets.push(street);
		const roomSets = new Map(rooms.map((room) => {
			const inner = room.querySelector('.room__inner');
			const set = makeSet(room.dataset.room, seedOf(room.dataset.room), 'page', () => (inner ? inner.getBoundingClientRect() : null));
			gsap.set(set.el, { autoAlpha: 0 });
			sets.push(set);
			return [room, set];
		}));
		// a page in the address is open before this script listens (motion.js runs first)
		const openRoom = rooms.find((room) => room.classList.contains('is-open'));
		if (openRoom) {
			build(street);
			gsap.set(street.el, { autoAlpha: 0 });
			street.tweens.forEach((tween) => tween.pause());
			initial = roomSets.get(openRoom);
		} else {
			initial = street;
		}

		// through an arch the vines of the street fade out, back on the street they are there again
		window.addEventListener('jos:view', (event) => {
			const t = event.detail.t;
			if (t >= 0.999) {
				if (street.shown) {
					gsap.set(street.el, { autoAlpha: 0 });
					street.shown = false;
					street.tweens.forEach((tween) => tween.pause());
				}
				return;
			}
			if (!street.built) build(street);
			if (!street.shown) {
				street.shown = true;
				street.tweens.forEach((tween) => tween.resume());
			}
			gsap.set(street.el, { autoAlpha: 1 - t });
		});
		// a page opens (motion.js sets .is-open): its vines grow; it closes: they go
		rooms.forEach((room) => {
			let open = room.classList.contains('is-open');
			new MutationObserver(() => {
				const now = room.classList.contains('is-open');
				if (now === open) return;
				open = now;
				const set = roomSets.get(room);
				if (open) show(set, true);
				else hide(set, true);
			}).observe(room, { attributes: true, attributeFilter: ['class'] });
		});
	} else {
		// ---- any other page: its own vines, from its name
		const text = document.querySelector('.site-main.page .page__article') || document.querySelector('.site-main.page');
		initial = makeSet(box.dataset.seed || 'page', seedOf(box.dataset.seed || 'page'), 'page', () => (text ? text.getBoundingClientRect() : null));
		sets.push(initial);
	}

	// the first vines grow when the page loads; on the front page when the facade begins to draw (the scene gets
	// .is-ready), at the latest after GROW.wait s
	initial.shown = true;
	gsap.set(initial.el, { autoAlpha: 1 });
	build(initial, reduced);
	if (!reduced) {
		const scene = document.querySelector('[data-scene]');
		let started = false;
		const start = () => {
			if (started) return;
			started = true;
			grow(initial);
		};
		if (scene && !scene.classList.contains('is-ready')) {
			const watch = new MutationObserver(() => {
				if (!scene.classList.contains('is-ready')) return;
				watch.disconnect();
				start();
			});
			watch.observe(scene, { attributes: true, attributeFilter: ['class'] });
			setTimeout(() => {
				watch.disconnect();
				start();
			}, GROW.wait * 1000);
		} else {
			start();
		}
	}

	// a new width: the vines that are there are hung again for it (grown); a phone hiding its address bar
	// changes only the height: the vines stay
	let builtWidth = window.innerWidth;
	let resizing = null;
	window.addEventListener('resize', () => {
		clearTimeout(resizing);
		resizing = setTimeout(() => {
			if (window.innerWidth === builtWidth) return;
			builtWidth = window.innerWidth;
			sets.forEach((set) => {
				if (!set.built) return;
				build(set);
				if (!set.shown) set.tweens.forEach((tween) => tween.pause());
			});
		}, 200);
	});
});
