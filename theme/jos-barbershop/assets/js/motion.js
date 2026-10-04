/*
 * Motion layer of the front page (GSAP). The arches of the facade are the menu: a click on an arch (scene.js
 * sends 'jos:open'), on a menu link or on any link to #leistungen, #ueber-uns, #galerie or #kontakt takes the
 * camera through that arch and opens its page over the whole screen. The X, Esc or the back button of the
 * browser lead back out to the street. Behind the door is the shop: there the page stands still and dragging
 * (or the arrow keys) turns the view around the shop.
 * GSAP owns all values and sends them to the three.js scene (scene.js), which only draws:
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
	const turnTo = (yaw, pitch, duration = 0.6) => gsap.to(look, {
		yaw,
		pitch: gsap.utils.clamp(-0.7, 0.7, pitch),
		duration: time(duration),
		ease: 'power3.out',
		overwrite: true,
		onUpdate: sendLook,
	});

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
		} else if (!url.hash && current) {
			// the name in the header leads back to the street
			event.preventDefault();
			close();
		}
	});

	exit.addEventListener('click', close);

	window.addEventListener('keydown', (event) => {
		if (!current || leaving) return;
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
