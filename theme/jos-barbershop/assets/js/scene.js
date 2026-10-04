import * as THREE from 'three';
import { RoomEnvironment } from './vendor/addons/environments/RoomEnvironment.js';
import { EffectComposer } from './vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/addons/postprocessing/OutputPass.js';
import { FACADE_LINES, FACADE_DRAW, FACADE_GROUP, FACADE_ARCHES, FACADE_ARCH } from 'jos-facade';

/*
 * Front page: the round shop sign of Jo's Barbershop on the facade of the shop.
 * An extruded black disc turns slowly on a vertical axis inside a C shaped bracket that is fixed to a wall
 * plate. Only the logo on both faces of the disc glows. The wall is the ground floor of the real facade
 * (images/fasada.jpg), drawn only as thin brown lines on the paper of the site (facade.js, made by
 * fasada/build_facade.py); the lines draw themselves when the page loads.
 * Dragging turns the building (left and right, up and down: turned up, the foundation with the footer lines
 * comes to the front), scrolling moves the camera along its Z axis into the depth of the picture and back;
 * sideways scrolling moves along the street.
 * The arches are the menu: in the band of every arch the name of its page runs around (fast at first, then
 * slowly), the whole window or door is the button: pointing at it fills it with a transparent pale yellow,
 * a click takes the camera through it into the page. Behind the door is the shop.
 * motion.js (GSAP) owns the values and sends them as events, three.js only draws:
 *   'jos:street'   { x, depth, yaw, pitch }: the point of the wall the camera goes around, moved along the street
 *                  (x 0 = first view, 1 = the last arch); depth: the camera moved along its own Z axis into the
 *                  picture, in disc radii (0 = first view); yaw and pitch in radians: the building turned left and
 *                  right, up and down. scene.js writes the limits on the root element.
 *   'jos:view'     { arch, t }: arch index in FACADE_ARCHES (-1 = street), t 0 = street view, 1 = inside
 *   'jos:look'     { yaw, pitch } in radians: the view inside the shop, turned by dragging
 * The scene itself only reports clicks: 'jos:open' with the arch index, 'jos:link' with the address of a
 * footer line.
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
const BACKGROUND = 0xcecece;     // the paper (paper.webp, data-paper) while it loads and in the fog, same as --jos-bg
const FACADE_COLOR = 0x5b3517;   // brown ink, same as --jos-line
const FACADE_OPACITY = 0.9;
const FACADE_OPACITY_MOBILE = 0.8;   // on phones the wall runs behind the text
const FACADE_FADE = [1, 24];     // the lines fade out between these distances behind the framed view
const DRAW_DURATION = 5;         // s, the facade draws itself when the page loads, in the order of facade.js
const VIEW_YAW = 0.5;            // rad: sign and wall are seen at an angle, the street goes away to the left

// hero view: standing in the street at eye level, the sign above and the whole ground floor down to the
// ground. The camera stands back from the distance at which the sign alone would fill the screen.
const HERO_PULL = 2.7;           // times the distance that fits the sign alone
const HERO_PULL_MOBILE = 1.12;
const HERO_LIFT = 0.03;          // looks slightly up, times the distance

// along the street: x 1 brings the last arch on the left to where the sign is in the first view
const STREET_LENGTH = -FACADE_ARCHES[0].z;
// turning the building: the camera goes around the point of the wall in the middle of the view.
// Left and right up to this angle from straight in front of the wall, up and down up to TILT.
const TURN_LIMIT = 1.4;
const TILT = [-0.75, 0.75];
// scrolling moves the camera along its Z axis into the picture, until it is this far from the wall
const DEPTH_STOP = 1.2;

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
// 360 photo of the shop (lokal-360.webp, 2:1, 8192 px wide, the photo as it is). Coming in through
// the door the camera looks straight into the shop, at this part of the photo width (0 = left edge):
// the chairs and mirrors, with the entrance behind.
const PANORAMA_VIEW = 0.82;
const PANORAMA_BRIGHTNESS = 0.8;   // below 1: the shop never blooms and stays calm behind the text
const PANORAMA_FOV = 70;         // wider view inside the shop: the photo is stretched less
const FOV = 30;                  // view on the street

// running text in the band of every arch: the name of its page, up the left jamb, over the arch and
// down the right jamb. When the texts come in they run once around fast, then slow down to a calm ticker.
const RIBBON_SPEED = 0.22;       // disc radii per second along the band
const RIBBON_SPIN = 16;          // speed when the texts come in
const RIBBON_SPIN_TIME = 3.5;    // s, from the fast start down to the calm speed
const RIBBON_OPACITY = 0.85;
const TEXT_FONT = '44px Arial, "Helvetica Neue", Helvetica, sans-serif';
const TEXT_CANVAS_HEIGHT = 72;
const HOVER_COLOR = 0.45;        // a pointed arch: its lines go towards dark ink ...
const HOVER_OPACITY = 0.3;       // ... and get this much more opaque
const OPENING_COLOR = 0xffd23c;  // ... and the whole window or door fills with a transparent yellow
const OPENING_OPACITY = 0.45;

// the footer lines, cut into the foundation under the ground line, centred under the arches
const INSCRIPTION = { height: 0.42, below: 0.2, gap: 0.8, opacity: 0.75 };

const root = document.querySelector('[data-scene]');

const readJson = (value) => {
	try {
		const data = JSON.parse(value || '[]');
		return Array.isArray(data) ? data : [];
	} catch (e) {
		return [];
	}
};

if (root) {
	const canvas = root.querySelector('.scene__canvas');
	const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const isMobile = window.matchMedia('(max-width: 767px)').matches;

	// the menu: which page lies behind which arch; the footer lines (front-page.php)
	const menu = readJson(root.dataset.arches);
	const footer = readJson(root.dataset.footer);

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
		// the paper of the whole site behind the scene, cut to fill the screen like background-size: cover
		let paper = null;
		const coverPaper = () => {
			if (!paper || !paper.image) return;
			const view = root.clientWidth / Math.max(root.clientHeight, 1);
			const image = paper.image.width / paper.image.height;
			const wide = view > image;
			paper.repeat.set(wide ? 1 : view / image, wide ? image / view : 1);
			paper.offset.set((1 - paper.repeat.x) / 2, (1 - paper.repeat.y) / 2);
		};
		if (root.dataset.paper) {
			new THREE.TextureLoader().load(root.dataset.paper, (texture) => {
				texture.colorSpace = THREE.SRGBColorSpace;
				paper = texture;
				coverPaper();
				scene.background = texture;
				if (!running && ready) draw();
			});
		}
		// fog only fades the facade lines and the texts into the dark; the sign and the shop ignore it
		scene.fog = new THREE.Fog(BACKGROUND, 10, 30);

		// reflections only on the metal parts; the black face of the disc stays matt
		const pmrem = new THREE.PMREMGenerator(renderer);
		const reflections = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
		pmrem.dispose();

		const key = new THREE.DirectionalLight(0xffffff, 1.4);
		key.position.set(-3, 4, 5);
		scene.add(key);
		scene.add(new THREE.AmbientLight(0xffffff, 0.15));

		const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 100);

		// ---- materials
		// the sign in very dark brown like the page: bracket and rim as metal, the face matt
		const metal = new THREE.MeshStandardMaterial({ color: 0x18120e, metalness: 0.85, roughness: 0.3, envMap: reflections, envMapIntensity: 0.6, fog: false });
		const rim = new THREE.MeshStandardMaterial({ color: 0x1b1410, metalness: 0.9, roughness: 0.26, envMap: reflections, envMapIntensity: 0.6, fog: false });
		const face = new THREE.MeshLambertMaterial({ color: 0x19130f, fog: false });   // matt face, no highlight
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
		// while 'drawing' runs from its start time to its end time (FACADE_DRAW). The lines of the
		// arch under the pointer light up (FACADE_GROUP).
		const drawing = { value: reduced ? 1 : 0 };
		const highlightArch = { value: -1 };
		const highlightAmount = { value: 0 };
		const lineMaterial = new THREE.LineBasicMaterial({
			color: FACADE_COLOR,
			transparent: true,
			opacity: isMobile ? FACADE_OPACITY_MOBILE : FACADE_OPACITY,
			depthWrite: false,
		});
		lineMaterial.onBeforeCompile = (shader) => {
			shader.uniforms.drawProgress = drawing;
			shader.uniforms.highlightArch = highlightArch;
			shader.uniforms.highlightAmount = highlightAmount;
			shader.vertexShader = shader.vertexShader
				.replace('#include <common>', '#include <common>\nattribute float drawEnd;\nattribute vec2 drawSpan;\nattribute float archGroup;\nuniform float highlightArch;\nuniform float highlightAmount;\nvarying float vDrawEnd;\nvarying vec2 vDrawSpan;\nvarying float vHighlight;')
				.replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvDrawEnd = drawEnd;\n\tvDrawSpan = drawSpan;\n\tvHighlight = abs(archGroup - highlightArch) < 0.5 ? highlightAmount : 0.0;');
			shader.fragmentShader = shader.fragmentShader
				.replace('#include <common>', '#include <common>\nuniform float drawProgress;\nvarying float vDrawEnd;\nvarying vec2 vDrawSpan;\nvarying float vHighlight;')
				.replace('void main() {', 'void main() {\n\tfloat drawn = clamp((drawProgress - vDrawSpan.x) / max(vDrawSpan.y - vDrawSpan.x, 1e-5), 0.0, 1.0);\n\tif (drawn < 1.0 && vDrawEnd >= drawn) discard;')
				.replace(
					'vec4 diffuseColor = vec4( diffuse, opacity );',
					`vec4 diffuseColor = vec4( mix( diffuse, vec3( 0.06, 0.03, 0.015 ), vHighlight * ${HOVER_COLOR.toFixed(2)} ), min( opacity + vHighlight * ${HOVER_OPACITY.toFixed(2)}, 1.0 ) );`
				);
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
		const archGroups = new Float32Array(vertexCount);
		for (let v = 0; v < vertexCount; v++) {
			facadePositions[v * 3] = wallX + FACADE_LINES[v * 3];
			facadePositions[v * 3 + 1] = FACADE_LINES[v * 3 + 1];
			facadePositions[v * 3 + 2] = FACADE_LINES[v * 3 + 2];
			const s = v >> 1;   // two vertices per segment: start, end
			drawEnds[v] = v & 1;
			drawSpans[v * 2] = FACADE_DRAW[s * 2];
			drawSpans[v * 2 + 1] = FACADE_DRAW[s * 2 + 1];
			archGroups[v] = FACADE_GROUP[s];
		}
		const facadeGeometry = new THREE.BufferGeometry();
		facadeGeometry.setAttribute('position', new THREE.BufferAttribute(facadePositions, 3));
		facadeGeometry.setAttribute('drawEnd', new THREE.BufferAttribute(drawEnds, 1));
		facadeGeometry.setAttribute('drawSpan', new THREE.BufferAttribute(drawSpans, 2));
		facadeGeometry.setAttribute('archGroup', new THREE.BufferAttribute(archGroups, 1));
		sign.add(new THREE.LineSegments(facadeGeometry, lineMaterial));

		// ---- texts on the wall: white letters on a transparent canvas, coloured by the material
		const textCanvas = (label) => {
			const context = document.createElement('canvas').getContext('2d');
			const setFont = () => {
				context.font = TEXT_FONT;
				if ('letterSpacing' in context) context.letterSpacing = '6px';
			};
			setFont();
			const width = Math.max(1, Math.ceil(context.measureText(label).width));
			context.canvas.width = width;
			context.canvas.height = TEXT_CANVAS_HEIGHT;
			setFont();
			context.fillStyle = '#ffffff';
			context.textBaseline = 'middle';
			context.fillText(label, 0, TEXT_CANVAS_HEIGHT / 2 + 2);
			const texture = new THREE.CanvasTexture(context.canvas);
			texture.colorSpace = THREE.SRGBColorSpace;
			texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
			return { texture, width };
		};
		const textMaterial = (texture) => new THREE.MeshBasicMaterial({
			map: texture,
			color: FACADE_COLOR,
			transparent: true,
			opacity: 0,
			depthWrite: false,
			side: THREE.DoubleSide,
		});
		// a flat shape drawn with x along the wall and y up, moved into the wall plane at this depth
		const onWallPlane = (geometry, depth) => {
			const position = geometry.attributes.position;
			for (let i = 0; i < position.count; i++) {
				position.setXYZ(i, wallX + depth, position.getY(i), position.getX(i));
			}
			position.needsUpdate = true;
			geometry.computeBoundingSphere();
			return geometry;
		};

		// ---- the arches of the menu: the running text in the band between the opening and the outer line
		// of the wedge stones, its top towards the outside, and the opening itself, filled when pointed at
		const bandMiddle = (FACADE_ARCH.radius + FACADE_ARCH.band) / 2;
		const bandHalf = ((FACADE_ARCH.band - FACADE_ARCH.radius) / 2) * 0.92;
		const jamb = FACADE_ARCH.spring - FACADE_ARCH.ground;
		const arcLength = Math.PI * bandMiddle;
		const pathLength = jamb * 2 + arcLength;

		// point and outward direction on the band at distance s from the foot of the left jamb, (z, y) on the wall
		const bandPoint = (s) => {
			if (s <= jamb) return { z: -bandMiddle, y: FACADE_ARCH.ground + s, nz: -1, ny: 0 };
			if (s >= jamb + arcLength) return { z: bandMiddle, y: FACADE_ARCH.spring - (s - jamb - arcLength), nz: 1, ny: 0 };
			const angle = Math.PI - ((s - jamb) / arcLength) * Math.PI;
			return {
				z: Math.cos(angle) * bandMiddle,
				y: FACADE_ARCH.spring + Math.sin(angle) * bandMiddle,
				nz: Math.cos(angle),
				ny: Math.sin(angle),
			};
		};

		const openingShape = new THREE.Shape();
		openingShape.moveTo(-FACADE_ARCH.radius, FACADE_ARCH.ground);
		openingShape.lineTo(-FACADE_ARCH.radius, FACADE_ARCH.spring);
		openingShape.absarc(0, FACADE_ARCH.spring, FACADE_ARCH.radius, Math.PI, 0, true);
		openingShape.lineTo(FACADE_ARCH.radius, FACADE_ARCH.ground);
		openingShape.closePath();
		const openingGeometry = onWallPlane(new THREE.ShapeGeometry(openingShape, 32), 0.02);

		const ribbons = menu
			.filter((item) => FACADE_ARCHES[item.arch])
			.map((item) => {
				const archZ = FACADE_ARCHES[item.arch].z;
				const { texture, width } = textCanvas(`${String(item.name).toLocaleUpperCase('de')}   ·   `);
				texture.wrapS = THREE.RepeatWrapping;
				const repeat = (bandHalf * 2 * width) / TEXT_CANVAS_HEIGHT;
				const steps = 160;
				const positions = new Float32Array((steps + 1) * 2 * 3);
				const uvs = new Float32Array((steps + 1) * 2 * 2);
				const index = [];
				for (let i = 0; i <= steps; i++) {
					const s = (i / steps) * pathLength;
					const p = bandPoint(s);
					[-1, 1].forEach((side, k) => {
						const v = i * 2 + k;
						positions[v * 3] = wallX - 0.012;   // just in front of the wall face
						positions[v * 3 + 1] = p.y + p.ny * bandHalf * side;
						positions[v * 3 + 2] = archZ + p.z + p.nz * bandHalf * side;
						uvs[v * 2] = s / repeat;
						uvs[v * 2 + 1] = k;   // 0 inner edge, 1 outer edge: the top of the letters points outwards
					});
					if (i < steps) {
						const a = i * 2;
						index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
					}
				}
				const geometry = new THREE.BufferGeometry();
				geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
				geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
				geometry.setIndex(index);
				const mesh = new THREE.Mesh(geometry, textMaterial(texture));
				mesh.visible = false;
				sign.add(mesh);

				const fill = new THREE.Mesh(openingGeometry, new THREE.MeshBasicMaterial({
					color: OPENING_COLOR,
					transparent: true,
					opacity: 0,
					depthWrite: false,
					side: THREE.DoubleSide,
				}));
				fill.position.z = archZ;
				fill.visible = false;
				sign.add(fill);

				return { arch: item.arch, z: archZ, mesh, fill, texture, repeat, glow: { value: 0 } };
			});

		// ---- the footer lines in the foundation, one piece per line with a dot between them
		const inscriptionTop = FACADE_ARCH.ground - INSCRIPTION.below;
		const pieces = [];
		footer.forEach((item, i) => {
			if (i > 0) pieces.push({ text: '·', url: '' });
			pieces.push({ text: String(item.text || '').toLocaleUpperCase('de'), url: item.url || '' });
		});
		const inscription = pieces.filter((piece) => piece.text).map((piece) => {
			const { texture, width } = textCanvas(piece.text);
			return { ...piece, texture, length: (INSCRIPTION.height * width) / TEXT_CANVAS_HEIGHT, glow: { value: 0 } };
		});
		const inscriptionLength = inscription.reduce((sum, piece) => sum + piece.length, 0) + INSCRIPTION.gap * Math.max(inscription.length - 1, 0);
		let along = (FACADE_ARCHES[0].z + FACADE_ARCHES[FACADE_ARCHES.length - 1].z) / 2 - inscriptionLength / 2;
		inscription.forEach((piece) => {
			const mesh = new THREE.Mesh(new THREE.PlaneGeometry(piece.length, INSCRIPTION.height), textMaterial(piece.texture));
			mesh.rotation.y = -Math.PI / 2;   // in the wall, reading along it to the right
			mesh.position.set(wallX - 0.012, inscriptionTop - INSCRIPTION.height / 2, along + piece.length / 2);
			mesh.visible = false;
			sign.add(mesh);
			piece.mesh = mesh;
			piece.from = along;
			piece.to = along + piece.length;
			along += piece.length + INSCRIPTION.gap;
		});

		// ---- the shop behind the door: a photo all around the camera, shown only once the camera is inside
		const doorArch = FACADE_ARCHES.find((arch) => arch.door);
		const doorIndex = FACADE_ARCHES.indexOf(doorArch);
		// 8192 px wide photo on computers, 4096 px on phones and on graphics cards that cannot take more
		const smallPanorama = isMobile || renderer.capabilities.maxTextureSize < 8192;
		const panoramaUrl = (smallPanorama && root.dataset.panoramaMobile) || root.dataset.panorama || '';
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
			panorama.rotation.y = PANORAMA_VIEW * Math.PI * 2;   // that part of the photo lies in front, into the shop
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

		// ---- state: the angle and the running texts come from time, everything else from motion.js
		const state = { angle: reduced ? -0.42 : -0.25, street: { x: 0, depth: 0, yaw: 0, pitch: 0 }, view: { arch: -1, t: 0 }, yaw: 0, pitch: 0 };
		const ribbonSpeed = { value: RIBBON_SPEED };

		// ---- camera poses: the hero view and, for every arch, in front of it and inside it
		const hero = { position: new THREE.Vector3(), target: new THREE.Vector3() };
		const street = { position: new THREE.Vector3(), target: new THREE.Vector3() };
		const stops = FACADE_ARCHES.map(() => ({
			front: { position: new THREE.Vector3(), target: new THREE.Vector3() },
			inside: { position: new THREE.Vector3(), target: new THREE.Vector3() },
		}));
		const onWall = (pose, depth, lookDepth, z) => {
			pose.position.set(wallX + depth, EYE_HEIGHT, z).applyMatrix4(sign.matrixWorld);
			pose.target.set(wallX + lookDepth, EYE_HEIGHT, z).applyMatrix4(sign.matrixWorld);
		};
		const toSign = new THREE.Matrix4();
		const up = new THREE.Vector3(0, 1, 0);
		// the first view in the wall's own space: the point of the wall it looks at, and camera and target from there
		const pivot0 = new THREE.Vector3();
		const cameraFromPivot = new THREE.Vector3();
		const targetFromPivot = new THREE.Vector3();

		const fit = () => {
			const w = root.clientWidth;
			const h = root.clientHeight;
			if (!w || !h) return;
			renderer.setSize(w, h, false);
			composer.setSize(w, h);
			coverPaper();
			bloom.resolution.set(w * (isMobile ? 0.5 : 1), h * (isMobile ? 0.5 : 1));
			camera.aspect = w / h;
			camera.updateProjectionMatrix();
			const tan = Math.tan(THREE.MathUtils.degToRad(FOV) / 2);

			// hero: the sign (disc, bracket and plate, about 3.4 wide and 2.5 high) and the facade behind it,
			// on wide screens the sign right of centre, next to the text
			const signDistance = Math.max((2.5 / 0.7) / (2 * tan), (3.4 / 0.86) / (2 * tan * camera.aspect));
			const heroDistance = signDistance * (isMobile ? HERO_PULL_MOBILE : HERO_PULL);
			sign.position.x = camera.aspect > 1.25 ? 0.55 : -0.2;
			sign.updateMatrixWorld(true);
			toSign.copy(sign.matrixWorld).invert();
			hero.position.set(0, EYE_HEIGHT, heroDistance);
			hero.target.set(0, EYE_HEIGHT + heroDistance * HERO_LIFT, 0);

			// the building turns around the point of the wall in the middle of the first view
			const heroLocal = hero.position.clone().applyMatrix4(toSign);
			const sight = hero.target.clone().applyMatrix4(toSign).sub(heroLocal);
			pivot0.copy(heroLocal).addScaledVector(sight, (wallX - heroLocal.x) / sight.x);
			cameraFromPivot.copy(heroLocal).sub(pivot0);
			targetFromPivot.copy(hero.target).applyMatrix4(toSign).sub(pivot0);
			// turn limits for motion.js: never further round than TURN_LIMIT from straight in front
			const base = Math.atan2(cameraFromPivot.z, -cameraFromPivot.x);
			root.dataset.yawMin = (-TURN_LIMIT - base).toFixed(3);
			root.dataset.yawMax = (TURN_LIMIT - base).toFixed(3);
			root.dataset.pitchMin = String(TILT[0]);
			root.dataset.pitchMax = String(TILT[1]);
			// scrolling goes along the Z axis of the camera into the picture, up to DEPTH_STOP before the wall
			root.dataset.depthMax = Math.max(cameraFromPivot.length() - DEPTH_STOP, 0).toFixed(3);

			// in front of an arch: the whole window or door with its wedge joints fills the screen
			const frontDistance = Math.max((FRAME.top - FRAME.bottom) / (2 * tan), FRAME.width / (2 * tan * camera.aspect));
			FACADE_ARCHES.forEach((arch, i) => {
				onWall(stops[i].front, -frontDistance, 0, arch.z);
				onWall(stops[i].inside, INSIDE, INSIDE + 10, arch.z);
			});

			const framed = Math.max(heroDistance, frontDistance);
			scene.fog.near = framed + FACADE_FADE[0];
			scene.fog.far = framed + FACADE_FADE[1];
		};

		// ---- camera: in the street the hero view turned and moved along the wall; through an arch one smooth
		// curve from there past the framed view in front of the arch straight in through it. The view turns
		// towards the arch in the first half and then looks straight through it.
		const smooth = (t) => t * t * (3 - 2 * t);
		const phase = (t, from, to) => smooth(THREE.MathUtils.clamp((t - from) / (to - from), 0, 1));
		const look = new THREE.Vector3();
		const ahead = new THREE.Vector3();
		const side = new THREE.Vector3();
		const local = new THREE.Vector3();
		const position = new THREE.Vector3();

		// in the street: the camera goes around a point of the wall (turning the building) and that point
		// moves along the street
		const pivot = new THREE.Vector3();
		const across = new THREE.Vector3();
		const forward = new THREE.Vector3();
		const placeStreet = () => {
			const { x, depth, yaw, pitch } = state.street;
			pivot.copy(pivot0);
			pivot.z -= x * STREET_LENGTH;
			street.position.copy(cameraFromPivot).applyAxisAngle(up, yaw);
			street.target.copy(targetFromPivot).applyAxisAngle(up, yaw);
			across.crossVectors(street.position, up).normalize();
			street.position.applyAxisAngle(across, THREE.MathUtils.clamp(pitch, TILT[0], TILT[1])).add(pivot).applyMatrix4(sign.matrixWorld);
			street.target.applyAxisAngle(across, THREE.MathUtils.clamp(pitch, TILT[0], TILT[1])).add(pivot).applyMatrix4(sign.matrixWorld);
			// into the depth: camera and target move along the Z axis of the camera, the direction it looks in
			forward.subVectors(street.target, street.position).normalize();
			street.position.addScaledVector(forward, depth);
			street.target.addScaledVector(forward, depth);
		};

		const placeCamera = () => {
			placeStreet();
			const { arch, t } = state.view;
			const stop = stops[arch];
			look.subVectors(street.target, street.position).normalize();
			if (!stop || t <= 0) {
				position.copy(street.position);
			} else {
				// cubic curve street, front, front, inside: leaves towards the arch, arrives along its axis
				const u = 1 - t;
				position.copy(street.position).multiplyScalar(u * u * u)
					.addScaledVector(stop.front.position, 3 * u * u * t + 3 * u * t * t)
					.addScaledVector(stop.inside.position, t * t * t);
				ahead.subVectors(stop.inside.target, stop.inside.position).normalize();
				look.lerp(ahead, phase(t, 0, 0.55)).normalize();
			}
			// inside the shop the view is turned by dragging: left and right, up and down (0 everywhere else)
			look.applyAxisAngle(up, state.yaw);
			if (state.pitch) {
				side.crossVectors(look, up).normalize();
				look.applyAxisAngle(side, state.pitch);
			}
			camera.position.copy(position);
			camera.lookAt(look.add(position));

			// the shop appears while the camera passes through the door
			if (panorama) {
				local.copy(camera.position);
				sign.worldToLocal(local);
				const atDoor = Math.abs(local.z - doorArch.z) < FACADE_ARCH.radius;
				const opacity = atDoor ? smooth(THREE.MathUtils.clamp((local.x - wallX) / INSIDE, 0, 1)) : 0;
				panorama.material.opacity = opacity;
				panorama.visible = opacity > 0.001;
				// inside the shop the view opens up
				const fov = FOV + (PANORAMA_FOV - FOV) * (panoramaReady ? opacity : 0);
				if (Math.abs(camera.fov - fov) > 0.01) {
					camera.fov = fov;
					camera.updateProjectionMatrix();
				}
			}
		};

		// the texts come in at the end of the drawing and leave when the camera sets off through an arch
		const placeTexts = () => {
			const shown = phase(drawing.value, 0.85, 1);
			const { arch, t } = state.view;
			const gone = 1 - phase(t, 0, 0.2);
			const setOpacity = (mesh, opacity) => {
				mesh.material.opacity = opacity;
				mesh.visible = opacity > 0.002;
			};
			ribbons.forEach((ribbon) => {
				const away = ribbon.arch === arch ? 1 - phase(t, 0.55, 0.85) : gone;
				setOpacity(ribbon.mesh, (RIBBON_OPACITY + (1 - RIBBON_OPACITY) * ribbon.glow.value) * shown * away);
				setOpacity(ribbon.fill, OPENING_OPACITY * ribbon.glow.value * shown * away);
			});
			inscription.forEach((piece) => {
				setOpacity(piece.mesh, (INSCRIPTION.opacity + (1 - INSCRIPTION.opacity) * piece.glow.value) * shown * gone);
			});
		};

		const draw = () => {
			disc.rotation.y = state.angle;
			placeCamera();
			placeTexts();
			composer.render();
		};

		// inside a window arch only darkness is to be seen: one frame is enough
		const darkInside = () => state.view.t >= 0.999 && !(panoramaReady && state.view.arch === doorIndex);
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
			ribbons.forEach((ribbon) => {
				ribbon.texture.offset.x = (ribbon.texture.offset.x + (ribbonSpeed.value / ribbon.repeat) * dt) % 1;
			});
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
		const redraw = () => {
			if (!running && ready) draw();
		};

		new IntersectionObserver(([entry]) => {
			visible = entry.isIntersecting;
			update();
		}).observe(root);
		document.addEventListener('visibilitychange', update);

		// ---- values from motion.js
		window.addEventListener('jos:street', (event) => {
			const { x, depth, yaw, pitch } = event.detail;
			state.street = { x, depth, yaw, pitch };
			redraw();
		});
		window.addEventListener('jos:view', (event) => {
			state.view = { arch: event.detail.arch, t: event.detail.t };
			if (state.view.arch === doorIndex && state.view.t > 0) loadPanorama();
			redraw();
		});
		window.addEventListener('jos:look', (event) => {
			state.yaw = event.detail.yaw;
			state.pitch = event.detail.pitch;
			redraw();
		});

		// ---- pointing: a window or door (its opening and its band) lights up and opens its page on a
		// click; a footer line in the foundation lights up and follows its link
		const IGNORE = 'a, button, input, textarea, select, summary, label, .room.is-open, .site-header, .site-footer';
		const pointer = new THREE.Vector2();
		const ray = new THREE.Raycaster();
		let pointed = null;

		const targetAt = (clientX, clientY) => {
			const rect = canvas.getBoundingClientRect();
			pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
			ray.setFromCamera(pointer, camera);
			ray.ray.applyMatrix4(toSign);
			const { origin, direction } = ray.ray;
			if (direction.x <= 1e-6) return null;
			// where the ray meets the wall face, on the wall: along it (z) and up (y)
			const distance = (wallX - origin.x) / direction.x;
			const z = origin.z + direction.z * distance;
			const y = origin.y + direction.y * distance;
			const reach = FACADE_ARCH.band + 0.08;
			const ribbon = ribbons.find((item) => {
				const dz = z - item.z;
				return y >= FACADE_ARCH.ground && Math.abs(dz) <= reach
					&& (y <= FACADE_ARCH.spring || Math.hypot(dz, y - FACADE_ARCH.spring) <= reach);
			});
			if (ribbon) return { ribbon };
			if (y > inscriptionTop + 0.05 || y < inscriptionTop - INSCRIPTION.height - 0.05) return null;
			const piece = inscription.find((item) => item.url && z >= item.from - 0.1 && z <= item.to + 0.1);
			return piece ? { piece } : null;
		};

		const tweenTo = (target, value, duration) => {
			if (reduced || !window.gsap) {
				target.value = value;
				redraw();
				return;
			}
			window.gsap.to(target, { value, duration, ease: 'power2.out', overwrite: true, onUpdate: redraw });
		};

		const point = (target) => {
			const ribbon = target && target.ribbon;
			const piece = target && target.piece;
			if ((pointed && pointed.ribbon) === ribbon && (pointed && pointed.piece) === piece) return;
			pointed = target;
			document.body.classList.toggle('is-pointing', Boolean(target));
			if (ribbon) {
				highlightArch.value = ribbon.arch;
				if (ribbon.arch === doorIndex) loadPanorama();
			}
			tweenTo(highlightAmount, ribbon ? 1 : 0, ribbon ? 0.35 : 0.5);
			ribbons.forEach((item) => tweenTo(item.glow, item === ribbon ? 1 : 0, 0.35));
			inscription.forEach((item) => tweenTo(item.glow, item === piece ? 1 : 0, 0.3));
		};

		const html = document.documentElement;
		const atStreet = () => ready && drawing.value >= 0.85 && state.view.t <= 0.001
			&& !html.classList.contains('is-room-open') && !html.classList.contains('is-dragging-street');
		const free = (event) => !(event.target instanceof Element && event.target.closest(IGNORE));

		let lastPointer = null;   // where the mouse stands, so the street can move under it
		window.addEventListener('pointermove', (event) => {
			if (event.pointerType === 'touch') return;
			lastPointer = { x: event.clientX, y: event.clientY, free: free(event) };
			point(atStreet() && lastPointer.free ? targetAt(event.clientX, event.clientY) : null);
		});
		html.addEventListener('pointerleave', () => {
			lastPointer = null;
			point(null);
		});
		window.addEventListener('click', (event) => {
			if (!atStreet() || !free(event)) return;
			const target = targetAt(event.clientX, event.clientY);
			if (!target) return;
			point(null);
			if (target.ribbon) window.dispatchEvent(new CustomEvent('jos:open', { detail: target.ribbon.arch }));
			else window.dispatchEvent(new CustomEvent('jos:link', { detail: target.piece.url }));
		});
		window.addEventListener('jos:view', () => {
			if (state.view.t > 0) point(null);
		});
		// the street moves under a resting mouse (wheel, keys): what lies under it now
		window.addEventListener('jos:street', () => {
			if (!lastPointer || !lastPointer.free || !atStreet()) {
				point(null);
				return;
			}
			placeCamera();
			camera.updateMatrixWorld();
			point(targetAt(lastPointer.x, lastPointer.y));
		});

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
			// the shop photo follows once the facade stands, so it never slows down the first view
			const later = () => setTimeout(loadPanorama, 1500);
			if (!reduced && window.gsap) {
				window.gsap.to(drawing, { value: 1, duration: DRAW_DURATION, ease: 'none', delay: 0.3, onComplete: later });
				// the running texts come in fast, once around the arch, and slow down to their calm speed
				window.gsap.fromTo(ribbonSpeed, { value: RIBBON_SPIN }, {
					value: RIBBON_SPEED,
					duration: RIBBON_SPIN_TIME,
					ease: 'power3.out',
					delay: 0.3 + DRAW_DURATION * 0.85,
					immediateRender: false,
				});
			} else {
				drawing.value = 1;
				draw();
				later();
			}
		});
	}
}
