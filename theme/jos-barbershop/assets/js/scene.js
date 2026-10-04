import * as THREE from 'three';
import { RoomEnvironment } from './vendor/addons/environments/RoomEnvironment.js';
import { EffectComposer } from './vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/addons/postprocessing/OutputPass.js';
import { FACADE_LINES } from './facade.js';

/*
 * Hero: the round shop sign of Jo's Barbershop.
 * An extruded black disc turns on a vertical axis inside a C shaped bracket that is fixed to a wall plate.
 * Only the logo on both faces of the disc glows. The disc turns slowly all the time; while the hero is
 * scrolled it turns faster and moves away towards the next section. The scroll progress comes from
 * motion.js as the 'jos:hero-progress' event.
 * The wall behind the plate is the ground floor of the real facade (images/fasada.jpg), drawn only as thin
 * lines (facade.js, made by fasada/build_facade.py). The sign hangs where it hangs on the building.
 */

// Logo position on the disc, measured on the real sign: disc centre and radius in the
// 2048 x 2048 logo canvas (logo/README.md).
const LOGO_CANVAS = 2048;
const DISC_CENTER = { x: 949.1, y: 1078.7 };
const DISC_RADIUS = 876.7;

const DISC_DEPTH = 0.26;         // thickness of the disc, disc radius = 1
const BRACKET_RADIUS = 1.16;     // radius of the C shaped bracket
const BRACKET_TUBE = 0.04;
const BASE_SPEED = 0.35;         // rad/s, slow constant turn
const SCROLL_SPEED = 4.2;        // extra rad/s at the end of the hero scroll
const BACKGROUND = 0x0d0c0c;     // same as --jos-bg
const FACADE_COLOR = 0xf3f0ea;   // same as --jos-ink
const FACADE_OPACITY = 0.34;
const FACADE_OPACITY_MOBILE = 0.24;   // on phones the wall runs behind the text
const FACADE_FADE = [1.5, 24];   // the lines fade out between these distances behind the sign
const VIEW_YAW = 0.5;            // rad: sign and wall are seen at an angle, the street goes away to the left

const root = document.querySelector('[data-scene]');

if (root) {
	const canvas = root.querySelector('.scene__canvas');
	const hero = root.closest('.hero');
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const isMobile = window.matchMedia('(max-width: 767px)').matches;

	let renderer = null;
	try {
		renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
	} catch (e) {
		renderer = null;
	}

	if (renderer) {
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.NoToneMapping;
		renderer.toneMappingExposure = 1.0;
		renderer.setClearColor(BACKGROUND, 1);

		const scene = new THREE.Scene();
		scene.background = new THREE.Color(BACKGROUND);
		// fog only fades the facade lines into the dark; the sign itself ignores it
		scene.fog = new THREE.Fog(BACKGROUND, 10, 30);

		// reflections only on the metal parts; the black face of the disc stays matt
		const pmrem = new THREE.PMREMGenerator(renderer);
		const reflections = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
		pmrem.dispose();

		const key = new THREE.DirectionalLight(0xffffff, 1.4);
		key.position.set(-3, 4, 5);
		scene.add(key);
		scene.add(new THREE.AmbientLight(0xffffff, 0.15));

		const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

		// ---- materials
		const metal = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, metalness: 0.85, roughness: 0.3, envMap: reflections, envMapIntensity: 0.6, fog: false });
		const rim = new THREE.MeshStandardMaterial({ color: 0x0c0c0d, metalness: 0.9, roughness: 0.26, envMap: reflections, envMapIntensity: 0.6, fog: false });
		const face = new THREE.MeshLambertMaterial({ color: 0x0e0c0c, fog: false });   // matt black face, no highlight
		const logoMaterial = new THREE.MeshBasicMaterial({
			color: new THREE.Color(1.6, 1.6, 1.57),   // above 1: the logo is the only thing that blooms
			transparent: true,
			depthWrite: false,
			toneMapped: false,
			fog: false,
			polygonOffset: true,
			polygonOffsetFactor: -2,
		});
		const lineMaterial = new THREE.LineBasicMaterial({   // dim: the facade never blooms
			color: FACADE_COLOR,
			transparent: true,
			opacity: isMobile ? FACADE_OPACITY_MOBILE : FACADE_OPACITY,
			depthWrite: false,
		});

		const segments = isMobile ? 72 : 128;
		const sign = new THREE.Group();

		// ---- disc: extruded circle, faces towards +z and -z, turns on the y axis
		const disc = new THREE.Group();
		const discMesh = new THREE.Mesh(
			new THREE.CylinderGeometry(1, 1, DISC_DEPTH, segments, 1, false),
			[rim, face, face]
		);
		discMesh.rotation.x = Math.PI / 2;
		disc.add(discMesh);

		// logo planes: the whole 2048 canvas, scaled and shifted so the measured disc fits the mesh
		const planeSize = LOGO_CANVAS / DISC_RADIUS;
		const offsetX = (LOGO_CANVAS / 2 - DISC_CENTER.x) / DISC_RADIUS;
		const offsetY = (DISC_CENTER.y - LOGO_CANVAS / 2) / DISC_RADIUS;
		const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
		const front = new THREE.Mesh(planeGeometry, logoMaterial);
		front.position.set(offsetX, offsetY, DISC_DEPTH / 2 + 0.002);
		const back = new THREE.Mesh(planeGeometry, logoMaterial);
		back.rotation.y = Math.PI;
		back.position.set(-offsetX, offsetY, -(DISC_DEPTH / 2 + 0.002));
		disc.add(front, back);
		sign.add(disc);

		// ---- axis pins above and below the disc
		const pinGeometry = new THREE.CylinderGeometry(0.035, 0.035, BRACKET_RADIUS - 1 + 0.04, 24);
		[1, -1].forEach((side) => {
			const pin = new THREE.Mesh(pinGeometry, metal);
			pin.position.y = side * (1 + (BRACKET_RADIUS - 1) / 2);
			sign.add(pin);
		});

		// ---- C shaped bracket around the right side, in the plane of the disc at rest
		const bracket = new THREE.Mesh(
			new THREE.TorusGeometry(BRACKET_RADIUS, BRACKET_TUBE, 16, segments, Math.PI),
			metal
		);
		bracket.rotation.z = -Math.PI / 2;
		sign.add(bracket);

		// ---- two short arms from the middle of the bracket to a vertical wall plate
		const armLength = 0.34;
		const plateDepth = 0.05;
		const wallX = BRACKET_RADIUS + armLength + plateDepth;   // face of the wall
		const armGeometry = new THREE.BoxGeometry(armLength, 0.055, 0.055);
		[0.24, -0.24].forEach((y) => {
			const arm = new THREE.Mesh(armGeometry, metal);
			arm.position.set(BRACKET_RADIUS + armLength / 2, y, 0);
			sign.add(arm);
		});
		const plate = new THREE.Mesh(new THREE.BoxGeometry(plateDepth, 0.82, 0.17), metal);
		plate.position.set(wallX - plateDepth / 2, 0, 0);
		sign.add(plate);

		// ---- the wall: ground floor of the facade as lines, in the plane of the plate.
		// facade.js gives depth behind the wall face, height and position along the wall, in disc radii.
		const facadePositions = new Float32Array(FACADE_LINES.length);
		for (let i = 0; i < FACADE_LINES.length; i += 3) {
			facadePositions[i] = wallX + FACADE_LINES[i];
			facadePositions[i + 1] = FACADE_LINES[i + 1];
			facadePositions[i + 2] = FACADE_LINES[i + 2];
		}
		const facadeGeometry = new THREE.BufferGeometry();
		facadeGeometry.setAttribute('position', new THREE.BufferAttribute(facadePositions, 3));
		sign.add(new THREE.LineSegments(facadeGeometry, lineMaterial));

		sign.rotation.y = VIEW_YAW;
		scene.add(sign);

		// ---- post processing: bloom only lifts the logo. Multisampled target, so the thin lines stay smooth.
		const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
		composer.addPass(new RenderPass(scene, camera));
		const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.05, 1.0);
		// tight glow along the letters: the wide blur levels hardly contribute, so the disc stays black
		bloom.compositeMaterial.uniforms.bloomFactors.value = [1.0, 0.55, 0.18, 0.05, 0.0];
		composer.addPass(bloom);
		composer.addPass(new OutputPass());

		// ---- state, changed by time and scroll
		const state = { angle: reduced ? -0.42 : -0.25, scroll: 0 };
		const baseX = { value: 0 };

		const fit = () => {
			const w = root.clientWidth;
			const h = root.clientHeight;
			if (!w || !h) return;
			renderer.setSize(w, h, false);
			composer.setSize(w, h);
			bloom.resolution.set(w * (isMobile ? 0.5 : 1), h * (isMobile ? 0.5 : 1));
			camera.aspect = w / h;
			// keep the whole sign (disc, bracket and plate, about 3.3 wide and 2.5 high) in view
			const vFov = THREE.MathUtils.degToRad(camera.fov);
			const distH = (2.5 / 0.7) / (2 * Math.tan(vFov / 2));
			const distW = (3.4 / 0.86) / (2 * Math.tan(vFov / 2) * camera.aspect);
			const distance = Math.max(distH, distW);
			camera.position.set(0, 0, distance);
			camera.updateProjectionMatrix();
			scene.fog.near = distance + FACADE_FADE[0];
			scene.fog.far = distance + FACADE_FADE[1];
			// on wide screens the sign sits right of centre, next to the text
			baseX.value = camera.aspect > 1.25 ? 0.55 : -0.2;
		};

		const draw = () => {
			disc.rotation.y = state.angle;
			sign.position.x = baseX.value;
			sign.position.z = -state.scroll * 3.2;
			sign.position.y = state.scroll * 0.55;
			composer.render();
		};

		fit();
		new ResizeObserver(() => {
			fit();
			draw();
		}).observe(root);

		// ---- loop, only while the hero is on screen and the tab is visible
		let lastTime = null;
		let running = false;
		let visible = false;
		let ready = false;

		const loop = () => {
			if (!running) return;
			const now = performance.now();
			const dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.1);
			lastTime = now;
			state.angle += (BASE_SPEED + state.scroll * SCROLL_SPEED) * dt;
			draw();
			requestAnimationFrame(loop);
		};

		const update = () => {
			const shouldRun = ready && visible && !document.hidden && !reduced;
			if (shouldRun && !running) {
				running = true;
				lastTime = null;
				loop();
			} else if (!shouldRun && running) {
				running = false;
			}
		};

		new IntersectionObserver(([entry]) => {
			visible = entry.isIntersecting;
			update();
		}).observe(root);
		document.addEventListener('visibilitychange', update);

		// ---- scroll: motion.js (GSAP ScrollTrigger) pins the hero and sends its progress, three.js only draws
		if (!reduced) {
			window.addEventListener('jos:hero-progress', (event) => {
				state.scroll = event.detail;
				if (!running && ready) draw();
			});
		}

		// ---- logo texture, then first frame
		const logoUrl = root.dataset.logo;
		new THREE.TextureLoader().load(logoUrl, (texture) => {
			texture.colorSpace = THREE.SRGBColorSpace;
			texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
			logoMaterial.map = texture;
			logoMaterial.needsUpdate = true;
			ready = true;
			draw();
			root.classList.add('is-ready');
			update();
		});
	}
}
