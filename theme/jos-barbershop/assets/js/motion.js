document.addEventListener('DOMContentLoaded', () => {
	if (!window.gsap) return;
	gsap.registerPlugin(ScrollTrigger);

	// values for the three.js scene (scene.js), which only draws
	const send = (name, value) => window.dispatchEvent(new CustomEvent(name, { detail: value }));
	const scrollToY = (y) => window.scrollTo({ top: y, behavior: 'instant' });

	const mm = gsap.matchMedia();

	mm.add('(prefers-reduced-motion: no-preference)', () => {
		// hero text comes in once after load, line by line
		gsap.from('.hero [data-reveal]', {
			y: 24,
			opacity: 0,
			duration: 0.9,
			ease: 'power3.out',
			stagger: 0.12,
			delay: 0.2,
		});

		// the hero text leaves upwards while the camera sets off down the street
		const content = document.querySelector('.hero__content');
		if (content) {
			gsap.to(content, {
				y: -48,
				opacity: 0,
				ease: 'none',
				scrollTrigger: { trigger: '.hero', start: 'top top', end: '50% top', scrub: true },
			});
		}

		// a page fades in while the camera goes through its arch and fades out while the camera comes back out
		gsap.utils.toArray('.room').forEach((room) => {
			const inner = room.querySelector('.room__inner');
			if (!inner) return;
			let fadeIn = null;
			let fadeOut = null;
			const apply = () => {
				const shown = fadeIn ? fadeIn.progress : 0;
				const gone = fadeOut ? fadeOut.progress : 0;
				gsap.set(inner, { opacity: Math.min(shown, 1 - gone) });
			};
			fadeIn = ScrollTrigger.create({ trigger: room, start: 'top 90%', end: 'top 55%', onUpdate: apply });
			fadeOut = ScrollTrigger.create({ trigger: room, start: 'bottom bottom', end: 'bottom 55%', onUpdate: apply });
			apply();
		});

		// the content of a page comes in when it reaches the screen
		gsap.utils.toArray('.room [data-reveal]').forEach((el) => {
			gsap.from(el, {
				y: 32,
				opacity: 0,
				duration: 0.8,
				ease: 'power3.out',
				scrollTrigger: { trigger: el, start: 'top 85%', once: true },
			});
		});

		// the street: every spacer before a page is one leg of the camera route. The position on the
		// route is the sum of all legs (legs behind are 1, legs ahead are 0), so jumps stay right too.
		const streets = gsap.utils.toArray('[data-street]');
		let legs = [];
		const sendPath = () => send('jos:path', legs.reduce((sum, leg) => sum + leg.progress, 0));
		legs = streets.map((street) => ScrollTrigger.create({
			trigger: street,
			start: 'top bottom',
			end: 'bottom bottom',
			onUpdate: sendPath,
		}));

		// ---- the shop behind the door. Once the camera is inside, the page stands still: dragging turns the
		// view around the shop, the arrow keys too. The X or Esc leads back out in front of the door, on the
		// side one came from, and the scroll goes on from there.
		const html = document.documentElement;
		const shop = document.querySelector('[data-shop]');
		const shopPage = shop ? shop.nextElementSibling : null;
		const drag = document.querySelector('[data-shop-drag]');
		const hint = document.querySelector('[data-shop-hint]');
		const exit = document.querySelector('[data-shop-exit]');
		const doorLeg = legs[streets.findIndex((street) => street.classList.contains('street--door'))];
		const nextLeg = legs[legs.indexOf(doorLeg) + 1];
		if (!shop || !shopPage || !drag || !exit || !doorLeg) return undefined;

		const look = { yaw: 0, pitch: 0 };
		const sendLook = () => send('jos:look', { yaw: look.yaw, pitch: look.pitch });
		const turnTo = (yaw, pitch, duration = 0.6) => gsap.to(look, {
			yaw,
			pitch: gsap.utils.clamp(-0.7, 0.7, pitch),
			duration,
			ease: 'power3.out',
			overwrite: true,
			onUpdate: sendLook,
		});
		const pointOnLeg = (leg, part) => leg.start + (leg.end - leg.start) * part;

		let inShop = false;
		let leaving = false;
		let cameFrom = 'street';
		let dragStart = null;
		let jumping = false;   // a menu link scrolls past the shop: do not hold the page there
		let jumpTimer = 0;

		const showControls = (show) => {
			drag.hidden = !show;
			exit.hidden = !show;
			if (hint) {
				hint.hidden = !show;
				hint.classList.remove('is-gone');
			}
		};

		const enter = (from, y) => {
			// only when one walks in: not on a jump, not when the page opens further down
			if (leaving || inShop || jumping || Math.abs(window.scrollY - y) > window.innerHeight / 2) return;
			inShop = true;
			cameFrom = from;
			scrollToY(y);
			html.classList.add('is-in-shop');
			showControls(true);
			exit.focus({ preventScroll: true });
		};

		const leave = () => {
			if (!inShop) return;
			inShop = false;
			leaving = true;
			dragStart = null;
			html.classList.remove('is-in-shop');
			html.classList.add('is-leaving-shop');
			showControls(false);
			// look straight into the shop again while walking backwards out through the door
			turnTo(Math.round(look.yaw / (Math.PI * 2)) * Math.PI * 2, 0, 1.2);
			// in front of the door: after backing out (next leg) or before going in (door leg)
			const target = cameFrom === 'street' && nextLeg ? pointOnLeg(nextLeg, 0.18) : pointOnLeg(doorLeg, 0.72);
			const scroller = { y: window.scrollY };
			gsap.to(scroller, {
				y: target,
				duration: 1.6,
				ease: 'power2.inOut',
				onUpdate: () => scrollToY(scroller.y),
				onComplete: () => {
					leaving = false;
					html.classList.remove('is-leaving-shop');
				},
			});
		};

		const shopTrigger = ScrollTrigger.create({
			trigger: shop,
			start: 'top bottom',
			endTrigger: shopPage,
			end: 'bottom bottom',
			onEnter: () => enter('street', shopTrigger.start),
			onEnterBack: () => enter('back', shopTrigger.end),
		});

		const onDown = (event) => {
			dragStart = { x: event.clientX, y: event.clientY, yaw: look.yaw, pitch: look.pitch };
			drag.setPointerCapture(event.pointerId);
			drag.classList.add('is-dragging');
			if (hint) hint.classList.add('is-gone');
		};
		const onMove = (event) => {
			if (!dragStart) return;
			// grab the shop and pull it: dragging right turns the view to the left
			const yaw = dragStart.yaw + ((event.clientX - dragStart.x) * 2.4) / window.innerWidth;
			const pitch = dragStart.pitch + ((event.clientY - dragStart.y) * 1.4) / window.innerHeight;
			turnTo(yaw, pitch, 0.5);
		};
		const onUp = () => {
			dragStart = null;
			drag.classList.remove('is-dragging');
		};
		const onLink = (event) => {
			const link = event.target.closest('a[href*="#"]');
			if (!link || !link.hash || !document.querySelector(link.hash)) return;
			jumping = true;
			clearTimeout(jumpTimer);
			jumpTimer = setTimeout(() => {
				jumping = false;
			}, 2500);
		};
		const onKey = (event) => {
			if (!inShop) return;
			const turns = { ArrowLeft: [0.35, 0], ArrowRight: [-0.35, 0], ArrowUp: [0, 0.2], ArrowDown: [0, -0.2] };
			if (event.key === 'Escape') {
				event.preventDefault();
				leave();
			} else if (turns[event.key]) {
				event.preventDefault();
				turnTo(look.yaw + turns[event.key][0], look.pitch + turns[event.key][1]);
				if (hint) hint.classList.add('is-gone');
			}
		};

		drag.addEventListener('pointerdown', onDown);
		drag.addEventListener('pointermove', onMove);
		drag.addEventListener('pointerup', onUp);
		drag.addEventListener('pointercancel', onUp);
		exit.addEventListener('click', leave);
		window.addEventListener('keydown', onKey);
		document.addEventListener('click', onLink);

		return () => {
			drag.removeEventListener('pointerdown', onDown);
			drag.removeEventListener('pointermove', onMove);
			drag.removeEventListener('pointerup', onUp);
			drag.removeEventListener('pointercancel', onUp);
			exit.removeEventListener('click', leave);
			window.removeEventListener('keydown', onKey);
			document.removeEventListener('click', onLink);
			html.classList.remove('is-in-shop', 'is-leaving-shop');
			showControls(false);
			shopTrigger.kill();
		};
	});
});
