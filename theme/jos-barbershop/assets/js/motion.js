document.addEventListener('DOMContentLoaded', () => {
	if (!window.gsap) return;
	gsap.registerPlugin(ScrollTrigger);

	// values for the three.js scene (scene.js), which only draws
	const send = (name, value) => window.dispatchEvent(new CustomEvent(name, { detail: value }));

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
		let legs = [];
		const sendPath = () => send('jos:path', legs.reduce((sum, leg) => sum + leg.progress, 0));
		legs = gsap.utils.toArray('[data-street]').map((street) => ScrollTrigger.create({
			trigger: street,
			start: 'top bottom',
			end: 'bottom bottom',
			onUpdate: sendPath,
		}));

		// behind the door: the view turns once around the shop, until the end of its page
		const shop = document.querySelector('[data-shop]');
		if (shop && shop.nextElementSibling) {
			ScrollTrigger.create({
				trigger: shop,
				start: 'top bottom',
				endTrigger: shop.nextElementSibling,
				end: 'bottom bottom',
				onUpdate: (self) => send('jos:pan', self.progress),
			});
		}
	});
});
