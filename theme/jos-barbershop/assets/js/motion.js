/*
 * Motion layer of the front page (GSAP). In the street, dragging (or the arrow keys) turns the building left
 * and right, up and down: turned up, the foundation with the footer lines comes to the front. Scrolling down
 * (two fingers pinched on a phone, Page Down) pushes the building away along the Z axis into the depth,
 * scrolling up brings it back. Sideways scrolling (or shift and the arrow keys) moves along the street.
 * The arches of the facade are the menu: a click on a window or door (scene.js sends 'jos:open'), on a menu link or on any link to #leistungen, #ueber-uns, #galerie or #kontakt takes the camera through that
 * arch and opens its page over the whole screen. The X, Esc or the back button of the browser lead back out
 * to the street. Behind the door is the shop: there the page stands still and dragging (or the arrow keys)
 * turns the view around the shop.
 * GSAP owns all values and sends them to the three.js scene (scene.js), which only draws:
 *   'jos:street'   { x, depth, yaw, pitch }: where the camera stands in the street, see moveStreet below
 *   'jos:view'     { arch, t }: arch index (-1 = street), t 0 = street view, 1 = inside the arch
 *   'jos:look'     { yaw, pitch }: the view inside the shop
 */
document.addEventListener('DOMContentLoaded', () => {
	if (!window.gsap) return;

	const html = document.documentElement;
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const send = (name, value) => window.dispatchEvent(new CustomEvent(name, { detail: value }));

	// hero text comes in once after load, line by line
	if (!reduced) {
		gsap.from('.hero [data-reveal]', {
			y: 24,
			opacity: 0,
			duration: 0.9,
			ease: 'power3.out',
			stagger: 0.12,
			delay: 0.2,
		});
	}

	const rooms = gsap.utils.toArray('[data-room]').map((el) => ({
		el,
		slug: el.dataset.room,
		arch: Number(el.dataset.arch),
		door: el.hasAttribute('data-door'),
		reveals: el.querySelectorAll('[data-reveal]'),
	}));
	const exit = document.querySelector('[data-exit]');
	if (!rooms.length || !exit) return;
	html.classList.add('has-arches');

	const heroContent = document.querySelector('.hero__content');
	const drag = document.querySelector('[data-shop-drag]');
	const hint = document.querySelector('[data-shop-hint]');
	const menuLinks = gsap.utils.toArray('[data-open]');
	const bySlug = (slug) => rooms.find((room) => room.slug === slug);
	const byArch = (arch) => rooms.find((room) => room.arch === arch);

	// durations in seconds; without motion everything happens at once
	const time = (seconds) => (reduced ? 0 : seconds);
	const FLY_IN = time(1.5);
	const FLY_OUT = time(1.3);
	const FADE_IN = time(0.5);
	const FADE_OUT = time(0.35);

	const view = { arch: -1, t: 0 };
	const look = { yaw: 0, pitch: 0 };
	const sendView = () => send('jos:view', { arch: view.arch, t: view.t });
	const sendLook = () => send('jos:look', { yaw: look.yaw, pitch: look.pitch });

	let current = null;    // the room that is open or on its way to open
	let leaving = false;   // on the way back out to the street
	let moving = null;     // the running camera timeline
	let opener = null;     // focus goes back there when the page closes
	let dragStart = null;

	// ---- the shop: drag to look around
	const showShopControls = (show) => {
		if (drag) drag.hidden = !show;
		if (hint) {
			hint.hidden = !show;
			hint.classList.remove('is-gone');
		}
	};
	// eases towards the new values; without motion they are there at once
	const glide = (target, values, duration, onUpdate) => {
		if (reduced) {
			gsap.killTweensOf(target);
			Object.assign(target, values);
			onUpdate();
			return;
		}
		gsap.to(target, { ...values, duration, ease: 'power3.out', overwrite: true, onUpdate });
	};
	const turnTo = (yaw, pitch, duration = 0.6) => glide(look, { yaw, pitch: gsap.utils.clamp(-0.7, 0.7, pitch) }, duration, sendLook);

	// ---- in the street: the camera goes around a point of the wall. That point moves along the street (x, from
	// a little to the right of the first view -0.25 down to the last arch 1); depth pushes the building away
	// along the Z axis into the depth (0 = first view, in disc radii); the building is turned left and right
	// (yaw) and up and down (pitch). The limits come from scene.js.
	const STREET_X = [-0.25, 1];
	const sceneRoot = document.querySelector('[data-scene]');
	const limit = (name, fallback) => {
		const value = sceneRoot ? Number(sceneRoot.dataset[name]) : NaN;
		return Number.isFinite(value) ? value : fallback;
	};
	const street = { x: 0, depth: 0, yaw: 0, pitch: 0 };
	const aim = { ...street };
	const sendStreet = () => send('jos:street', { ...street });
	const moveStreet = (change, duration = 0.9) => {
		const clamp = gsap.utils.clamp;
		aim.x = clamp(STREET_X[0], STREET_X[1], aim.x + (change.x || 0));
		aim.depth = clamp(0, limit('depthMax', 15), aim.depth + (change.depth || 0));
		aim.yaw = clamp(limit('yawMin', -1.9), limit('yawMax', 0.9), aim.yaw + (change.yaw || 0));
		aim.pitch = clamp(limit('pitchMin', -0.75), limit('pitchMax', 0.75), aim.pitch + (change.pitch || 0));
		glide(street, { ...aim }, duration, sendStreet);
	};
	// scrolled pixels into the depth: about 15 turns of the wheel from the first view to the deepest point
	const depthPerPixel = () => limit('depthMax', 15) / 1500;

	// ---- the page itself; its link in the menu is marked as the current one
	const markMenu = (slug) => menuLinks.forEach((link) => {
		if (link.dataset.open === slug) link.setAttribute('aria-current', 'true');
		else link.removeAttribute('aria-current');
	});
	const showRoom = (room) => {
		markMenu(room.slug);
		room.el.classList.add('is-open');
		room.el.scrollTop = 0;
		html.classList.add('is-room-open');
		html.classList.toggle('is-in-shop', room.door);
		showShopControls(room.door);
		exit.hidden = false;
		exit.focus({ preventScroll: true });
	};
	const hideRoom = (room) => {
		markMenu(null);
		room.el.classList.remove('is-open');
		gsap.set(room.el, { opacity: 0 });
		html.classList.remove('is-room-open', 'is-in-shop');
		showShopControls(false);
		exit.hidden = true;
		dragStart = null;
	};

	// camera through the arch, then the page fades in, its content line by line
	const openTimeline = (room) => {
		const tl = gsap.timeline();
		tl.call(() => {
			view.arch = room.arch;
			html.classList.add('is-away');
		});
		if (heroContent) tl.to(heroContent, { autoAlpha: 0, y: -24, duration: time(0.4), ease: 'power2.in' }, 0);
		tl.to(view, { t: 1, duration: FLY_IN, ease: 'power2.inOut', onUpdate: sendView }, 0);
		tl.call(() => showRoom(room), null, Math.max(FLY_IN - time(0.2), 0));
		tl.fromTo(room.el, { opacity: 0 }, { opacity: 1, duration: FADE_IN, ease: 'power1.out' }, '>');
		if (!reduced && room.reveals.length) {
			tl.fromTo(room.reveals, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.08 }, '<');
		}
		return tl;
	};

	// the page fades out, the camera comes back out of the arch (in the shop it first looks straight again)
	const leaveTimeline = (room, toStreet) => {
		const tl = gsap.timeline();
		tl.to(room.el, { opacity: 0, duration: room.el.classList.contains('is-open') ? FADE_OUT : 0, ease: 'power1.in' });
		tl.call(() => hideRoom(room));
		if (room.door) {
			tl.to(look, {
				yaw: Math.round(look.yaw / (Math.PI * 2)) * Math.PI * 2,
				pitch: 0,
				duration: FLY_OUT,
				ease: 'power2.inOut',
				onUpdate: sendLook,
			}, '>');
		}
		tl.to(view, { t: 0, duration: FLY_OUT, ease: 'power2.inOut', onUpdate: sendView }, room.door ? '<' : '>');
		tl.call(() => {
			view.arch = -1;
			sendView();
		});
		if (toStreet && heroContent) {
			tl.call(() => html.classList.remove('is-away'));
			tl.to(heroContent, { autoAlpha: 1, y: 0, duration: time(0.5), ease: 'power2.out' });
		}
		return tl;
	};

	const go = (room) => {
		if (room === current && !leaving) return;
		if (!current) opener = document.activeElement !== document.body ? document.activeElement : null;
		const from = leaving ? null : current;
		if (moving) moving.kill();
		gsap.killTweensOf(look);
		window.scrollTo({ top: 0, behavior: 'instant' });
		current = room;
		leaving = false;
		moving = gsap.timeline();
		if (from) moving.add(leaveTimeline(from, false));
		else if (view.arch !== -1 && view.arch !== room.arch) moving.add(leaveTimeline(byArch(view.arch) || room, false));
		moving.add(openTimeline(room));
		// without motion all of it happens at once, right now
		if (reduced) moving.progress(1, false);
	};

	const leave = () => {
		if (!current || leaving) return;
		const room = current;
		leaving = true;
		if (moving) moving.kill();
		gsap.killTweensOf(look);
		moving = leaveTimeline(room, true);
		moving.call(() => {
			current = null;
			leaving = false;
			if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
			opener = null;
		});
		if (reduced) moving.progress(1, false);
	};

	// ---- history: every open page is one step, the back button leads out to the street
	const open = (room) => {
		if (room === current && !leaving) return;
		const url = `#${room.slug}`;
		if (current && !leaving) window.history.replaceState({ jos: room.slug }, '', url);
		else window.history.pushState({ jos: room.slug }, '', url);
		go(room);
	};
	const close = () => {
		if (!current || leaving) return;
		if (window.history.state && window.history.state.jos) {
			window.history.back();
			return;
		}
		// a page opened by typing its address: no step to go back to, only the address is cleaned
		window.history.replaceState(null, '', window.location.pathname + window.location.search);
		leave();
	};
	window.addEventListener('popstate', () => {
		const room = bySlug(window.location.hash.slice(1));
		if (room) go(room);
		else leave();
	});

	// a page in the address (from another page of the site or a shared link) is open right away
	const first = bySlug(window.location.hash.slice(1));
	if (first) {
		window.history.replaceState(null, '', window.location.pathname + window.location.search);
		window.history.pushState({ jos: first.slug }, '', `#${first.slug}`);
		go(first);
		moving.progress(1, false);
	}

	// ---- ways in and out
	window.addEventListener('jos:open', (event) => {
		const room = byArch(event.detail);
		if (room) open(room);
	});

	document.addEventListener('click', (event) => {
		if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		const link = event.target.closest('a[href]');
		if (!link || (link.target && link.target !== '_self')) return;
		const url = new URL(link.href, window.location.href);
		if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
		const room = bySlug(url.hash.slice(1));
		if (room) {
			event.preventDefault();
			open(room);
		} else if (!url.hash && current && url.search === window.location.search) {
			// the name in the header leads back to the street
			event.preventDefault();
			close();
		}
	});

	exit.addEventListener('click', close);

	// a footer line in the foundation (scene.js) is a link like in the footer
	window.addEventListener('jos:link', (event) => {
		if (event.detail) window.location.assign(event.detail);
	});

	// ---- the wheel: scrolling down pushes the building away along the Z axis into the depth, up brings it back
	// to the first view; sideways (touchpad, or shift and wheel) moves along the street
	window.addEventListener('wheel', (event) => {
		if (current || event.ctrlKey) return;   // an open page scrolls itself; ctrl and wheel is the zoom
		event.preventDefault();
		const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
		const down = event.deltaY * unit;
		const sideways = event.deltaX * unit;
		if (Math.abs(sideways) > Math.abs(down)) moveStreet({ x: sideways / 1500 });
		else moveStreet({ depth: down * depthPerPixel() }, 0.6);
	}, { passive: false });

	// grab the building and turn it: it follows the pointer, and a quick throw turns on a little
	const scene = sceneRoot;
	const TURN_PER_WIDTH = 2.6;    // radians for a drag across the whole screen
	const TILT_PER_HEIGHT = 1.6;   // radians for a drag over the whole height
	let grab = null;
	let skipClick = false;
	// two fingers on a phone: pinched together, the building goes into the depth, spread apart it comes back
	const fingers = new Map();
	let pinch = null;
	if (scene) {
		scene.addEventListener('pointerdown', (event) => {
			if (current || event.button !== 0) return;
			if (event.pointerType === 'touch') {
				fingers.set(event.pointerId, { x: event.clientX, y: event.clientY });
				if (fingers.size === 2) {
					const [a, b] = [...fingers.values()];
					pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y) };
					if (grab && grab.moved) html.classList.remove('is-dragging-street');
					grab = null;
					skipClick = true;
					return;
				}
			}
			const now = performance.now();
			grab = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, time: now, vx: 0, vy: 0, moved: false };
		});
		window.addEventListener('pointermove', (event) => {
			if (fingers.has(event.pointerId)) {
				fingers.set(event.pointerId, { x: event.clientX, y: event.clientY });
				if (pinch && fingers.size === 2) {
					const [a, b] = [...fingers.values()];
					const distance = Math.hypot(a.x - b.x, a.y - b.y);
					moveStreet({ depth: ((pinch.distance - distance) / window.innerWidth) * limit('depthMax', 15) * 1.5 }, 0.25);
					pinch.distance = distance;
					return;
				}
			}
			if (!grab || event.pointerId !== grab.id) return;
			if (!grab.moved) {
				if (Math.hypot(event.clientX - grab.x, event.clientY - grab.y) < 6) return;
				grab.moved = true;
				html.classList.add('is-dragging-street');
			}
			const now = performance.now();
			// dragging to the right turns the building to the right; dragging up turns its foundation to the front
			const dyaw = (-(event.clientX - grab.lastX) / window.innerWidth) * TURN_PER_WIDTH;
			const dpitch = ((event.clientY - grab.lastY) / window.innerHeight) * TILT_PER_HEIGHT;
			const dt = Math.max((now - grab.time) / 1000, 0.001);
			grab.vx = grab.vx * 0.6 + (dyaw / dt) * 0.4;
			grab.vy = grab.vy * 0.6 + (dpitch / dt) * 0.4;
			grab.lastX = event.clientX;
			grab.lastY = event.clientY;
			grab.time = now;
			moveStreet({ yaw: dyaw, pitch: dpitch }, 0.45);
		});
		const release = (event) => {
			fingers.delete(event.pointerId);
			if (fingers.size < 2) pinch = null;
			if (!grab || event.pointerId !== grab.id) return;
			if (grab.moved) {
				skipClick = true;   // the end of a drag is no click on a window
				if (performance.now() - grab.time < 120) moveStreet({ yaw: grab.vx * 0.25, pitch: grab.vy * 0.25 }, 1.2);
				html.classList.remove('is-dragging-street');
			}
			grab = null;
		};
		window.addEventListener('pointerup', release);
		window.addEventListener('pointercancel', release);
		window.addEventListener('click', (event) => {
			if (!skipClick) return;
			skipClick = false;
			event.stopPropagation();
			event.preventDefault();
		}, true);
	}

	window.addEventListener('keydown', (event) => {
		if (!current) {
			// in the street the arrow keys turn the building (with shift they move along the street),
			// Page Down pushes the building into the depth and Page Up brings it back
			const steps = event.shiftKey
				? { ArrowLeft: { x: 0.08 }, ArrowRight: { x: -0.08 } }
				: { ArrowLeft: { yaw: 0.15 }, ArrowRight: { yaw: -0.15 }, ArrowUp: { pitch: -0.12 }, ArrowDown: { pitch: 0.12 } };
			steps.PageDown = { depth: limit('depthMax', 15) / 8 };
			steps.PageUp = { depth: -limit('depthMax', 15) / 8 };
			const typing = event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]');
			if (typing || event.altKey || event.metaKey || event.ctrlKey) return;
			if (steps[event.key]) {
				event.preventDefault();
				moveStreet(steps[event.key], 0.6);
			}
			return;
		}
		if (leaving) return;
		const turns = { ArrowLeft: [0.35, 0], ArrowRight: [-0.35, 0], ArrowUp: [0, 0.2], ArrowDown: [0, -0.2] };
		if (event.key === 'Escape') {
			event.preventDefault();
			close();
		} else if (current.door && html.classList.contains('is-in-shop') && turns[event.key]) {
			// arrow keys inside the text panel still scroll the text
			if (event.target instanceof Element && event.target.closest('.room__inner')) return;
			event.preventDefault();
			turnTo(look.yaw + turns[event.key][0], look.pitch + turns[event.key][1]);
			if (hint) hint.classList.add('is-gone');
		}
	});

	if (drag) {
		const onUp = () => {
			dragStart = null;
			drag.classList.remove('is-dragging');
		};
		drag.addEventListener('pointerdown', (event) => {
			dragStart = { x: event.clientX, y: event.clientY, yaw: look.yaw, pitch: look.pitch };
			drag.setPointerCapture(event.pointerId);
			drag.classList.add('is-dragging');
			if (hint) hint.classList.add('is-gone');
		});
		drag.addEventListener('pointermove', (event) => {
			if (!dragStart) return;
			// grab the shop and pull it: dragging right turns the view to the left
			const yaw = dragStart.yaw + ((event.clientX - dragStart.x) * 2.4) / window.innerWidth;
			const pitch = dragStart.pitch + ((event.clientY - dragStart.y) * 1.4) / window.innerHeight;
			turnTo(yaw, pitch, 0.5);
		});
		drag.addEventListener('pointerup', onUp);
		drag.addEventListener('pointercancel', onUp);
	}
});
