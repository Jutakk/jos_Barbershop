document.addEventListener('DOMContentLoaded', () => {
	if (!window.gsap) return;
	gsap.registerPlugin(ScrollTrigger);

	const mm = gsap.matchMedia();

	mm.add('(prefers-reduced-motion: no-preference)', () => {
		// hero text comes in once after load, line by line
		gsap.from('[data-reveal]', {
			y: 24,
			opacity: 0,
			duration: 0.9,
			ease: 'power3.out',
			stagger: 0.12,
			delay: 0.2,
		});

		// the hero stays pinned for one screen of scrolling: the text leaves upwards and the
		// progress goes to the three.js sign (scene.js), which turns faster and moves away
		const hero = document.querySelector('.hero');
		const content = document.querySelector('.hero__content');
		if (!hero) return;
		const timeline = gsap.timeline({
			scrollTrigger: {
				trigger: hero,
				start: 'top top',
				end: '+=100%',
				pin: true,
				scrub: true,
				onUpdate: (self) => {
					window.dispatchEvent(new CustomEvent('jos:hero-progress', { detail: self.progress }));
				},
			},
		});
		if (content) {
			timeline.to(content, { y: -48, opacity: 0, ease: 'none', duration: 0.6 }).to({}, { duration: 0.4 });
		}
	});
});
