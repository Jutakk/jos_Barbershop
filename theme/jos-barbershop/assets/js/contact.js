/*
 * Contact form of the page Kontakt (inc/contact.php): a two sided card in space, GSAP drives every angle.
 * - It floats: turns slowly a few degrees back and forth while its page is open.
 * - With the mouse over it, it stops floating and leans towards the pointer; grabbed by its paper (not on a field,
 *   link or button) it turns around in space with the pointer and swings back when let go.
 * - While one of its fields has the focus it stands straight and still, so typing is calm.
 * - Sent, it turns around to its back with the thanks; "Neue Nachricht" turns it back to an empty form.
 * The message goes with fetch to admin-post.php (ajax=1, the answer is JSON). Without motion the card stands
 * still and shows the other side at once; without JavaScript the form posts the usual way.
 */
document.addEventListener('DOMContentLoaded', () => {
	const box = document.querySelector('[data-contact]');
	if (!box) return;
	const card = box.querySelector('[data-contact-card]');
	const form = box.querySelector('[data-contact-form]');
	const thanks = box.querySelector('[data-contact-thanks]');
	const status = box.querySelector('[data-contact-status]');
	const submit = box.querySelector('[data-contact-submit]');
	const again = box.querySelector('[data-contact-again]');
	const room = box.closest('[data-room]');
	const gsap = window.gsap;
	const moving = Boolean(gsap) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const TILT = { x: 8, y: 12 };            // degrees towards the pointer at the edge of the card
	const FLOAT = { x: 2.5, y: 5 };          // degrees of the slow floating
	const DRAG = { max: 60, perPx: 0.35 };   // turning with the pointer: degrees per px, at most
	const FLIP = 1.1;                        // s to turn to the other side

	// all angles add up: the side (0 front, 180 back), leaning, floating (times its strength) and dragging
	const angle = { side: card.classList.contains('is-sent') ? 180 : 0, tiltX: 0, tiltY: 0, floatX: 0, floatY: 0, float: 1, dragX: 0, dragY: 0 };
	const apply = () => {
		if (!gsap) return;
		gsap.set(card, {
			rotationY: angle.side + angle.tiltY + angle.floatY * angle.float + angle.dragY,
			rotationX: angle.tiltX + angle.floatX * angle.float + angle.dragX,
		});
	};
	apply();

	// ---- floating, only while the page of the card is open
	let floating = null;
	if (moving) {
		floating = gsap.timeline({ paused: true });
		floating.fromTo(angle, { floatY: -FLOAT.y }, { floatY: FLOAT.y, duration: 4.2, ease: 'sine.inOut', repeat: -1, yoyo: true, onUpdate: apply }, 0);
		floating.fromTo(angle, { floatX: FLOAT.x }, { floatX: -FLOAT.x, duration: 5.6, ease: 'sine.inOut', repeat: -1, yoyo: true }, 0);
		const open = () => !room || room.classList.contains('is-open');
		const follow = () => (open() ? floating.play() : floating.pause());
		follow();
		if (room) new MutationObserver(follow).observe(room, { attributes: true, attributeFilter: ['class'] });
	}
	const ease = (values, duration = 0.6, how = 'power3.out') => {
		if (!moving) return;
		gsap.to(angle, { ...values, duration, ease: how, overwrite: 'auto', onUpdate: apply });
	};

	// ---- still while typing
	const typing = () => box.contains(document.activeElement) && document.activeElement.matches('input, textarea');
	box.addEventListener('focusin', () => {
		if (typing()) ease({ tiltX: 0, tiltY: 0, float: 0 });
	});
	box.addEventListener('focusout', () => {
		requestAnimationFrame(() => {
			if (!typing()) ease({ float: 1 }, 1.2, 'sine.inOut');
		});
	});

	// ---- leaning towards the mouse, turning it around by its paper
	const interactive = 'input, textarea, button, a, label, select';
	let drag = null;
	card.addEventListener('pointermove', (event) => {
		if (!moving || event.pointerType === 'touch') return;
		if (drag) {
			const clamp = gsap.utils.clamp(-DRAG.max, DRAG.max);
			angle.dragY = clamp((event.clientX - drag.x) * DRAG.perPx);
			angle.dragX = clamp(-(event.clientY - drag.y) * DRAG.perPx);
			apply();
			return;
		}
		if (typing()) return;
		const rect = card.getBoundingClientRect();
		const x = (event.clientX - rect.left) / rect.width - 0.5;
		const y = (event.clientY - rect.top) / rect.height - 0.5;
		ease({ tiltY: x * 2 * TILT.y, tiltX: -y * 2 * TILT.x });
	});
	card.addEventListener('pointerenter', (event) => {
		if (event.pointerType !== 'touch') ease({ float: 0 }, 0.8);
	});
	card.addEventListener('pointerleave', () => {
		if (drag) return;
		ease({ tiltX: 0, tiltY: 0 }, 0.9);
		if (!typing()) ease({ float: 1 }, 1.2, 'sine.inOut');
	});
	card.addEventListener('pointerdown', (event) => {
		if (!moving || event.pointerType === 'touch' || event.button !== 0) return;
		if (event.target instanceof Element && event.target.closest(interactive)) return;
		drag = { x: event.clientX, y: event.clientY };
		card.setPointerCapture(event.pointerId);
		card.classList.add('is-turning');
		gsap.killTweensOf(angle, 'dragX,dragY');
		ease({ tiltX: 0, tiltY: 0 }, 0.3);
		event.preventDefault();
	});
	const letGo = () => {
		if (!drag) return;
		drag = null;
		card.classList.remove('is-turning');
		ease({ dragX: 0, dragY: 0 }, 1.4, 'elastic.out(1, 0.45)');
	};
	card.addEventListener('pointerup', letGo);
	card.addEventListener('pointercancel', letGo);

	// ---- the two sides
	const show = (back) => {
		form.inert = back;
		thanks.inert = !back;
		card.classList.toggle('is-sent', back);
		const done = () => (back ? again : form.querySelector('input')).focus({ preventScroll: true });
		if (!moving) {
			angle.side = back ? 180 : 0;
			apply();
			done();
			return;
		}
		gsap.to(angle, { side: back ? 180 : 0, tiltX: 0, tiltY: 0, dragX: 0, dragY: 0, duration: FLIP, ease: 'power3.inOut', overwrite: 'auto', onUpdate: apply, onComplete: done });
	};

	// ---- sending
	let sending = false;
	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		if (sending) return;
		if (!form.checkValidity()) {
			form.reportValidity();
			return;
		}
		sending = true;
		submit.disabled = true;
		status.textContent = box.dataset.sending;
		const data = new FormData(form);
		data.append('ajax', '1');
		try {
			// getAttribute: the field named "action" (for admin-post.php) hides the property form.action
			const response = await fetch(form.getAttribute('action'), { method: 'POST', body: data, credentials: 'same-origin' });
			const answer = await response.json();
			if (answer.ok) {
				status.textContent = '';
				show(true);
			} else {
				status.textContent = answer.message || box.dataset.error;
			}
		} catch (error) {
			status.textContent = box.dataset.error;
		}
		sending = false;
		submit.disabled = false;
	});
	again.addEventListener('click', () => {
		form.reset();
		status.textContent = '';
		show(false);
	});
});
