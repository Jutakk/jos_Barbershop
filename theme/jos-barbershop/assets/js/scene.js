import * as THREE from 'three';
import { RoomEnvironment } from './vendor/addons/environments/RoomEnvironment.js';
import { EffectComposer } from './vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/addons/postprocessing/OutputPass.js';
import { FACADE_LINES, FACADE_DRAW, FACADE_ARCHES, FACADE_ARCH } from './facade.js';

/*
 * Front page: the round shop sign of Jo's Barbershop on the facade of the shop.
 * An extruded black disc turns slowly on a vertical axis inside a C shaped bracket that is fixed to a wall
 * plate. Only the logo on both faces of the disc glows. The wall is the ground floor of the real facade
 * (images/fasada.jpg), drawn only as thin lines (facade.js, made by fasada/build_facade.py); the lines draw
 * themselves when the page loads.
 * The canvas stays fixed behind the whole front page. While scrolling, the camera goes down the street from
 * arch to arch, from right to left, and through each arch into its page. Behind the door is the shop itself.
 * motion.js (GSAP ScrollTrigger) owns the values and sends them as events, three.js only draws:
 *   'jos:path'     0 = hero, 1 to 4 = inside the arches of the route
 *   'jos:pan'      0 to 1 = one turn of the view inside the shop
 * Inside a window arch the screen is dark and covered by its page, so nothing is drawn there.
 */

// Logo position on the disc, measured on the real sign: disc centre and radius in the
// 2048 x 2048 logo canvas (logo/README.md).
const LOGO_CANVAS = 2048;
const DISC_CENTER = { x: 949.1, y: 1078.7 };
const DISC_RADIUS = 876.7;

const DISC_DEPTH = 0.26;         // thickness of the disc, disc radius = 1
const BRACKET_RADIUS = 1.16;     // radius of the C shaped bracket
const BRACKET_TUBE = 0.04;
const TURN_SPEED = 0.26;         // rad/s, always the same slow turn (one turn in about 24 s)
const BACKGROUND = 0x0d0c0c;     // same as --jos-bg
const FACADE_COLOR = 0xf3f0ea;   // same as --jos-ink
const FACADE_OPACITY = 0.34;
const FACADE_OPACITY_MOBILE = 0.24;   // on phones the wall runs behind the text
const FACADE_FADE = [1, 24];     // the lines fade out between these distances behind the framed view
const DRAW_DURATION = 5;         // s, the facade draws itself when the page loads, in the order of facade.js
const VIEW_YAW = 0.5;            // rad: sign and wall are seen at an angle, the street goes away to the left

// hero view: standing in the street at eye level, the sign above and the whole ground floor down to the
// ground. The camera stands back from the distance at which the sign alone would fill the screen.
const HERO_PULL = 2.7;           // times the distance that fits the sign alone
const HERO_PULL_MOBILE = 1.12;
const HERO_LIFT = 0.03;          // looks slightly up, times the distance

// route of the camera: arches from right to left (window, door, window, window), see FACADE_ARCHES
const ROUTE = [3, 2, 1, 0];
// in front of an arch the whole window or door is in view, from the ground to above the keystone
const FRAME = {
	bottom: FACADE_ARCH.ground - 0.5,
	top: FACADE_ARCH.top + 0.9,       // room for the header
	width: FACADE_ARCH.band * 2 + 1.2,
};
// eye level of a person in the street; the camera looks at the middle of an arch from here and goes in
const EYE_HEIGHT = (FRAME.bottom + FRAME.top) / 2;
const INSIDE = FACADE_ARCH.reveal + 1.4;          // how far behind the wall face the camera stops
const PANORAMA_RADIUS = 8;
const PANORAMA_YAW = 0;          // rad: turns the photo of the shop so the view starts at the right place
const PANORAMA_BRIGHTNESS = 0.86;   // below 1: the shop never blooms

const root = document.querySelector('[data-scene]');

if (root) {
	const canvas = root.querySelector('.scene__canvas');
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const isMobile = window.matchMedia('(max-width: 767px)').matches;

	let renderer = null;
	try {
		renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
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
		// fog only fades the facade lines into the dark; the sign and the shop ignore it
		scene.fog = new THREE.Fog(BACKGROUND, 10, 30);

		// reflections only on the metal parts; the black face of the disc stays matt
		const pmrem = new THREE.PMREMGenerator(renderer);
		const reflections = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
		pmrem.dispose();

		const key = new THREE.DirectionalLight(0xffffff, 1.4);
		key.position.set(-3, 4, 5);
		scene.add(key);
		scene.add(new THREE.AmbientLight(0xffffff, 0.15));

		const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);

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

		// facade lines: dim, so they never bloom. Each segment is drawn from its start to its end
		// while 'drawing' runs from its start time to its end time (FACADE_DRAW).
		const drawing = { value: reduced ? 1 : 0 };
		const lineMaterial = new THREE.LineBasicMaterial({
			color: FACADE_COLOR,
			transparent: true,
			opacity: isMobile ? FACADE_OPACITY_MOBILE : FACADE_OPACITY,
			depthWrite: false,
		});
		lineMaterial.onBeforeCompile = (shader) => {
			shader.uniforms.drawProgress = drawing;
			shader.vertexShader = shader.vertexShader
				.replace('#include <common>', '#include <common>\nattribute float drawEnd;\nattribute vec2 drawSpan;\nvarying float vDrawEnd;\nvarying vec2 vDrawSpan;')
				.replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvDrawEnd = drawEnd;\n\tvDrawSpan = drawSpan;');
			shader.fragmentShader = shader.fragmentShader
				.replace('#include <common>', '#include <common>\nuniform float drawProgress;\nvarying float vDrawEnd;\nvarying vec2 vDrawSpan;')
				.replace('void main() {', 'void main() {\n\tfloat drawn = clamp((drawProgress - vDrawSpan.x) / max(vDrawSpan.y - vDrawSpan.x, 1e-5), 0.0, 1.0);\n\tif (drawn < 1.0 && vDrawEnd >= drawn) discard;');
		};

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
		const vertexCount = FACADE_LINES.length / 3;
		const facadePositions = new Float32Array(FACADE_LINES.length);
		const drawEnds = new Float32Array(vertexCount);
		const drawSpans = new Float32Array(vertexCount * 2);
		for (let v = 0; v < vertexCount; v++) {
			facadePositions[v * 3] = wallX + FACADE_LINES[v * 3];
			facadePositions[v * 3 + 1] = FACADE_LINES[v * 3 + 1];
			facadePositions[v * 3 + 2] = FACADE_LINES[v * 3 + 2];
			const s = v >> 1;   // two vertices per segment: start, end
			drawEnds[v] = v & 1;
			drawSpans[v * 2] = FACADE_DRAW[s * 2];
			drawSpans[v * 2 + 1] = FACADE_DRAW[s * 2 + 1];
		}
		const facadeGeometry = new THREE.BufferGeometry();
		facadeGeometry.setAttribute('position', new THREE.BufferAttribute(facadePositions, 3));
		facadeGeometry.setAttribute('drawEnd', new THREE.BufferAttribute(drawEnds, 1));
		facadeGeometry.setAttribute('drawSpan', new THREE.BufferAttribute(drawSpans, 2));
		sign.add(new THREE.LineSegments(facadeGeometry, lineMaterial));

		// ---- the shop behind the door: a photo all around the camera, shown only once the camera is inside
		const doorArch = FACADE_ARCHES.find((arch) => arch.door);
		const panoramaUrl = root.dataset.panorama || '';
		let panorama = null;
		let panoramaRequested = false;
		let panoramaReady = false;
		if (panoramaUrl && doorArch) {
			const sphere = new THREE.SphereGeometry(PANORAMA_RADIUS, isMobile ? 48 : 64, isMobile ? 24 : 32);
			sphere.scale(-1, 1, 1);   // seen from inside
			panorama = new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({
				color: new THREE.Color(PANORAMA_BRIGHTNESS, PANORAMA_BRIGHTNESS, PANORAMA_BRIGHTNESS),
				transparent: true,
				opacity: 0,
				depthTest: false,
				depthWrite: false,
				fog: false,
			}));
			panorama.renderOrder = 10;   // over the facade lines and the sign
			panorama.visible = false;
			panorama.position.set(wallX + INSIDE, EYE_HEIGHT, doorArch.z);
			panorama.rotation.y = PANORAMA_YAW;
			sign.add(panorama);
		}
		const loadPanorama = () => {
			if (!panorama || panoramaRequested) return;
			panoramaRequested = true;
			new THREE.TextureLoader().load(panoramaUrl, (texture) => {
				texture.colorSpace = THREE.SRGBColorSpace;
				texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
				panorama.material.map = texture;
				panorama.material.needsUpdate = true;
				panoramaReady = true;
				if (!running && ready) draw();
			});
		};

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

		// ---- state: the angle comes from time, path and pan from motion.js
		const state = { angle: reduced ? -0.42 : -0.25, path: 0, pan: 0 };

		// ---- camera poses: the hero view and, for every arch of the route, in front of it and inside it
		const hero = { position: new THREE.Vector3(), target: new THREE.Vector3() };
		const stops = ROUTE.map(() => ({
			front: { position: new THREE.Vector3(), target: new THREE.Vector3() },
			inside: { position: new THREE.Vector3(), target: new THREE.Vector3() },
		}));
		const onWall = (pose, depth, lookDepth, z) => {
			pose.position.set(wallX + depth, EYE_HEIGHT, z).applyMatrix4(sign.matrixWorld);
			pose.target.set(wallX + lookDepth, EYE_HEIGHT, z).applyMatrix4(sign.matrixWorld);
		};

		const fit = () => {
			const w = root.clientWidth;
			const h = root.clientHeight;
			if (!w || !h) return;
			renderer.setSize(w, h, false);
			composer.setSize(w, h);
			bloom.resolution.set(w * (isMobile ? 0.5 : 1), h * (isMobile ? 0.5 : 1));
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
			const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);

			// hero: the sign (disc, bracket and plate, about 3.4 wide and 2.5 high) and the facade behind it,
			// on wide screens the sign right of centre, next to the text
			const signDistance = Math.max((2.5 / 0.7) / (2 * tan), (3.4 / 0.86) / (2 * tan * camera.aspect));
			const heroDistance = signDistance * (isMobile ? HERO_PULL_MOBILE : HERO_PULL);
			sign.position.x = camera.aspect > 1.25 ? 0.55 : -0.2;
			sign.updateMatrixWorld(true);
			hero.position.set(0, EYE_HEIGHT, heroDistance);
			hero.target.set(0, EYE_HEIGHT + heroDistance * HERO_LIFT, 0);

			// in front of an arch: the whole window or door with its wedge joints fills the screen
			const frontDistance = Math.max((FRAME.top - FRAME.bottom) / (2 * tan), FRAME.width / (2 * tan * camera.aspect));
			ROUTE.forEach((index, i) => {
				const z = FACADE_ARCHES[index].z;
				onWall(stops[i].front, -frontDistance, 0, z);
				onWall(stops[i].inside, INSIDE, INSIDE + 10, z);
			});

			const framed = Math.max(heroDistance, frontDistance);
			scene.fog.near = framed + FACADE_FADE[0];
			scene.fog.far = framed + FACADE_FADE[1];
		};

		// ---- camera along the route
		const smooth = (t) => t * t * (3 - 2 * t);
		const phase = (t, from, to) => smooth(THREE.MathUtils.clamp((t - from) / (to - from), 0, 1));
		const pose = { position: new THREE.Vector3(), target: new THREE.Vector3() };
		const blend = (a, b, t) => {
			pose.position.lerpVectors(a.position, b.position, t);
			pose.target.lerpVectors(a.target, b.target, t);
		};
		const up = new THREE.Vector3(0, 1, 0);
		const look = new THREE.Vector3();
		const local = new THREE.Vector3();

		const placeCamera = () => {
			const path = THREE.MathUtils.clamp(state.path, 0, ROUTE.length);
			const leg = Math.min(Math.floor(path), ROUTE.length - 1);
			const t = path - leg;
			const to = stops[leg];
			if (leg === 0) {
				// from the hero view to the first arch, then in
				if (t < 0.62) blend(hero, to.front, phase(t, 0, 0.62));
				else blend(to.front, to.inside, phase(t, 0.62, 1));
			} else {
				// out of the last arch, along the wall to the next one, then in
				const from = stops[leg - 1];
				if (t < 0.22) blend(from.inside, from.front, phase(t, 0, 0.22));
				else if (t < 0.68) blend(from.front, to.front, phase(t, 0.22, 0.68));
				else blend(to.front, to.inside, phase(t, 0.68, 1));
			}
			// inside the shop the view turns around once (a full turn ends where it started)
			const turn = panoramaReady ? state.pan * Math.PI * 2 : 0;
			look.subVectors(pose.target, pose.position).applyAxisAngle(up, turn);
			camera.position.copy(pose.position);
			camera.lookAt(look.add(pose.position));

			// the shop appears while the camera passes through the door
			if (panorama) {
				local.copy(camera.position);
				sign.worldToLocal(local);
				const atDoor = Math.abs(local.z - doorArch.z) < FACADE_ARCH.radius;
				const opacity = atDoor ? smooth(THREE.MathUtils.clamp((local.x - wallX) / INSIDE, 0, 1)) : 0;
				panorama.material.opacity = opacity;
				panorama.visible = opacity > 0.001;
			}
		};

		const draw = () => {
			disc.rotation.y = state.angle;
			placeCamera();
			composer.render();
		};

		// inside a window arch only darkness is to be seen: one frame is enough
		const darkInside = () => {
			const stop = Math.round(state.path);
			if (stop < 1 || Math.abs(state.path - stop) > 1e-4) return false;
			return !(panoramaReady && FACADE_ARCHES[ROUTE[stop - 1]].door);
		};
		let drawnDark = false;

		fit();
		new ResizeObserver(() => {
			fit();
			draw();
		}).observe(root);

		// ---- loop, only while something is to be seen and the tab is visible
		let lastTime = null;
		let running = false;
		let visible = false;
		let ready = false;

		const loop = () => {
			if (!running) return;
			const now = performance.now();
			const dt = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.1);
			lastTime = now;
			state.angle += TURN_SPEED * dt;
			const dark = darkInside();
			if (!dark || !drawnDark) draw();
			drawnDark = dark;
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

		// ---- scroll values from motion.js
		if (!reduced) {
			window.addEventListener('jos:path', (event) => {
				state.path = event.detail;
				if (state.path > 0.5) loadPanorama();
				if (!running && ready) draw();
			});
			window.addEventListener('jos:pan', (event) => {
				state.pan = event.detail;
				if (!running && ready) draw();
			});
		}

		// ---- logo texture, then the first frame and the drawing of the facade
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
			if (!reduced) {
				if (window.gsap) {
					window.gsap.to(drawing, { value: 1, duration: DRAW_DURATION, ease: 'none', delay: 0.3 });
				} else {
					drawing.value = 1;
				}
			}
		});
	}
}
