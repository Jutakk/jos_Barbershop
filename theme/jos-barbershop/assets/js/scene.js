import * as THREE from 'three';
import { RoomEnvironment } from './vendor/addons/environments/RoomEnvironment.js';
import { EffectComposer } from './vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/addons/postprocessing/OutputPass.js';
import { LineSegments2 } from './vendor/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from './vendor/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from './vendor/addons/lines/LineMaterial.js';
import { FACADE_LINES, FACADE_DRAW, FACADE_GROUP, FACADE_ARCHES, FACADE_ARCH } from 'jos-facade';

/*
 * Front page: the round shop sign of Jo's Barbershop on the facade of the shop.
 * An extruded black disc turns slowly on a vertical axis inside a C shaped bracket that is fixed to a wall
 * plate. Only the logo on both faces of the disc glows. The wall is the ground floor of the real facade
 * (images/fasada.jpg), drawn only as thin brown lines on the paper of the site (facade.js, made by
 * fasada/build_facade.py); the lines draw themselves when the page loads.
 * On the cornice at the top of the ground floor the menu is written in one row: the pages and DE, EN, AR.
 * Dragging turns the building (left and right, up and down: turned up, the foundation with the footer lines
 * comes to the front), scrolling down pushes the building away along the Z axis into the depth, up brings it back;
 * sideways scrolling moves along the street.
 * The arches are the menu: in the band of every arch the name of its page runs around (fast at first, then
 * slowly) on the brown band, the whole window or door is the button: pointing at it fills it with white,
 * a click takes the camera through it into the page. Behind the door is the shop.
 * motion.js (GSAP) owns the values and sends them as events, three.js only draws:
 *   'jos:street'   { x, depth, yaw, pitch }: the point of the wall the camera goes around, moved along the street
 *                  (x 0 = first view, 1 = the last arch); depth: the building pushed away along the Z axis into
 *                  the depth of the picture, in disc radii (0 = first view); yaw and pitch in radians: the building
 *                  turned left and right, up and down. scene.js writes the limits on the root element.
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
const FACADE_OPACITY = 1;
const FACADE_OPACITY_MOBILE = 0.9;   // on phones the wall runs behind the text
const LINE_WIDTH = 1.5;          // px on the screen, the facade lines drawn a little bold
const LINE_WIDTH_MOBILE = 1.3;
// the paper is a big sphere around the whole scene: turning the building turns the paper with it
const PAPER_RADIUS = 150;
const PAPER_REPEAT = [12, 6];    // the paper tile this many times around and from top to bottom: grain as on the page
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
// scrolling pushes the building away along the Z axis into the depth: the camera goes back along the
// direction it looks in, up to this many times its first distance from the wall
const DEPTH_BACK = 1.2;

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
const RIBBON_OPACITY = 1;
// the band is brown, the running text in the colour of the paper
const RIBBON_COLORS = { fill: '#5b3517', ink: '#cecece' };
const TEXT_FONT = '44px Arial, "Helvetica Neue", Helvetica, sans-serif';
const TEXT_CANVAS_HEIGHT = 72;
const HOVER_COLOR = 0.45;        // a pointed arch: its lines go towards dark ink ...
const HOVER_OPACITY = 0.3;       // ... and get this much more opaque
const OPENING_COLOR = 0xffffff;  // ... and the whole window or door fills with white
const OPENING_OPACITY = 0.8;

// the footer lines, cut into the foundation under the ground line, centred under the arches
const INSCRIPTION = { height: 0.42, top: FACADE_ARCH.ground - 0.2, depth: 0, gap: 0.8, opacity: 0.75 };
// the menu (the pages and the languages) in one close row standing on the top line of the cornice: the front
// edge of its crown, which is the highest line from the street (fasada/build_facade.py, CORNICE: 284.5 px,
// 0.78 in front of the wall). The row starts flush with the left corner of the building (X_LEFT, 70 px) and
// runs to the right; it is never faded by the fog. Every link is a button: light letters in a brown block.
const CORNICE_EDGE = { y: (430 - 284.5) / 37.5, depth: -0.78 };
const BUILDING_LEFT = (70 - 790) / 37.5;
const HERO_TEXT_GAP = 26;          // px (7 mm) between the ends of the hero lines and the left edge of the house
const MENU_ROW = { height: 0.4, top: CORNICE_EDGE.y + 0.13 + 0.4, depth: CORNICE_EDGE.depth - 0.01, gap: 0.14, opacity: 1, start: BUILDING_LEFT, fog: false, blocks: true };
// The buttons stretch like the Animated Top Dock of ThreeUI (MIT, vendor/threeui.LICENSE.txt): a proximity
// spring widens the button under the pointer and its neighbours while the row keeps its length
// (topDockController.js). Every button is plain brown with light letters in the font of the site.
const DOCK = { proximity: 132, spring: 0.19, damping: 0.7, widthGrowth: 54 };
const DOCK_COLOR = '#5b3517';      // brown, same as FACADE_COLOR
const DOCK_INK = '#ece8df';        // light paper colour
const BLOCK_PAD = 22;              // px of the canvas left and right of the letters

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
	const languages = readJson(root.dataset.languages);
	const rtl = root.dataset.dir === 'rtl';   // Arabic: rows of words read from right to left

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
		// the paper of the whole site all around the scene, on the inside of a big sphere: when the building
		// is turned, the paper turns with it. paper.webp is a tile without seams (tools/paper.py).
		const paperSphere = new THREE.Mesh(
			new THREE.SphereGeometry(PAPER_RADIUS, 48, 24),
			new THREE.MeshBasicMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false, toneMapped: false })
		);
		paperSphere.renderOrder = -10;   // first, behind everything
		paperSphere.visible = false;
		scene.add(paperSphere);
		if (root.dataset.paper) {
			new THREE.TextureLoader().load(root.dataset.paper, (texture) => {
				texture.colorSpace = THREE.SRGBColorSpace;
				texture.wrapS = THREE.RepeatWrapping;
				texture.wrapT = THREE.RepeatWrapping;
				texture.repeat.set(PAPER_REPEAT[0], PAPER_REPEAT[1]);
				texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
				paperSphere.material.map = texture;
				paperSphere.material.needsUpdate = true;
				paperSphere.visible = true;
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

		const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, PAPER_RADIUS * 2.5);

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

		// facade lines: bold brown lines (LineMaterial, LINE_WIDTH px on the screen), dim enough never to
		// bloom. Each segment is drawn from its start to its end while 'drawing' runs from its start time
		// to its end time (FACADE_DRAW). The lines of the arch under the pointer get darker (FACADE_GROUP).
		const drawing = { value: reduced ? 1 : 0 };
		const highlightArch = { value: -1 };
		const highlightAmount = { value: 0 };
		const lineMaterial = new LineMaterial({
			color: new THREE.Color(FACADE_COLOR),
			linewidth: isMobile ? LINE_WIDTH_MOBILE : LINE_WIDTH,
			transparent: true,
			opacity: isMobile ? FACADE_OPACITY_MOBILE : FACADE_OPACITY,
			depthWrite: false,
			fog: true,
		});
		lineMaterial.onBeforeCompile = (shader) => {
			shader.uniforms.drawProgress = drawing;
			shader.uniforms.highlightArch = highlightArch;
			shader.uniforms.highlightAmount = highlightAmount;
			// along the segment: 0 at its start, 1 at its end (the quad of a segment has its start at y < 0.5)
			shader.vertexShader = shader.vertexShader
				.replace('attribute vec3 instanceEnd;', 'attribute vec3 instanceEnd;\nattribute vec2 drawSpan;\nattribute float archGroup;\nuniform float highlightArch;\nuniform float highlightAmount;\nvarying float vDrawT;\nvarying vec2 vDrawSpan;\nvarying float vHighlight;')
				.replace('void main() {', 'void main() {\n\tvDrawT = position.y < 0.5 ? 0.0 : 1.0;\n\tvDrawSpan = drawSpan;\n\tvHighlight = abs(archGroup - highlightArch) < 0.5 ? highlightAmount : 0.0;');
			shader.fragmentShader = shader.fragmentShader
				.replace('#include <common>', '#include <common>\nuniform float drawProgress;\nvarying float vDrawT;\nvarying vec2 vDrawSpan;\nvarying float vHighlight;')
				.replace('float alpha = opacity;', `float drawn = clamp((drawProgress - vDrawSpan.x) / max(vDrawSpan.y - vDrawSpan.x, 1e-5), 0.0, 1.0);\n\t\t\tif (drawn < 1.0 && vDrawT >= drawn) discard;\n\t\t\tfloat alpha = min( opacity + vHighlight * ${HOVER_OPACITY.toFixed(2)}, 1.0 );`)
				.replace(
					'vec4 diffuseColor = vec4( diffuse, alpha );',
					`vec4 diffuseColor = vec4( mix( diffuse, vec3( 0.06, 0.03, 0.015 ), vHighlight * ${HOVER_COLOR.toFixed(2)} ), alpha );`
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
		const facadePositions = new Float32Array(FACADE_LINES.length);
		for (let v = 0; v < FACADE_LINES.length / 3; v++) {
			facadePositions[v * 3] = wallX + FACADE_LINES[v * 3];
			facadePositions[v * 3 + 1] = FACADE_LINES[v * 3 + 1];
			facadePositions[v * 3 + 2] = FACADE_LINES[v * 3 + 2];
		}
		const facadeGeometry = new LineSegmentsGeometry();
		facadeGeometry.setPositions(facadePositions);
		// one value per segment: when it is drawn, and which arch it outlines
		facadeGeometry.setAttribute('drawSpan', new THREE.InstancedBufferAttribute(new Float32Array(FACADE_DRAW), 2));
		facadeGeometry.setAttribute('archGroup', new THREE.InstancedBufferAttribute(new Float32Array(FACADE_GROUP), 1));
		sign.add(new LineSegments2(facadeGeometry, lineMaterial));

		// ---- texts on the wall: white letters on a transparent canvas, coloured by the material (block: with room
		// left and right for a button); with colors the canvas is filled and the letters drawn in their own colours
		const textCanvas = (label, block = false, colors = null) => {
			const context = document.createElement('canvas').getContext('2d');
			// Arabic letters are joined: no spacing between them
			const arabic = /[\u0600-\u06ff]/.test(label);
			const spacing = arabic ? '0px' : '6px';
			const setFont = () => {
				context.font = TEXT_FONT;
				if ('letterSpacing' in context) context.letterSpacing = spacing;
			};
			setFont();
			const pad = block ? BLOCK_PAD : 0;
			const width = Math.max(1, Math.ceil(context.measureText(label).width)) + pad * 2;
			context.canvas.width = width;
			context.canvas.height = TEXT_CANVAS_HEIGHT;
			setFont();
			if (colors) {
				context.fillStyle = colors.fill;
				context.fillRect(0, 0, width, TEXT_CANVAS_HEIGHT);
			}
			context.fillStyle = colors ? colors.ink : '#ffffff';
			context.textBaseline = 'middle';
			context.fillText(label, pad, TEXT_CANVAS_HEIGHT / 2 + 2);
			const texture = new THREE.CanvasTexture(context.canvas);
			texture.colorSpace = THREE.SRGBColorSpace;
			texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
			return { texture, width };
		};
		const textMaterial = (texture, fog = true) => new THREE.MeshBasicMaterial({
			map: texture,
			color: FACADE_COLOR,
			transparent: true,
			opacity: 0,
			depthWrite: false,
			side: THREE.DoubleSide,
			fog,
		});
		// ---- a button of the dock: plain brown, the label centred and never stretched when the button widens
		const dockMaterial = (label) => new THREE.ShaderMaterial({
			uniforms: {
				uLabel: { value: label },
				uScale: { value: 1 },
				uOpacity: { value: 0 },
				uColor: { value: new THREE.Color(DOCK_COLOR) },
				uInk: { value: new THREE.Color(DOCK_INK) },
			},
			vertexShader: `
				varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}`,
			fragmentShader: `
				uniform sampler2D uLabel;
				uniform float uScale;
				uniform float uOpacity;
				uniform vec3 uColor;
				uniform vec3 uInk;
				varying vec2 vUv;
				void main(){
					float u = (vUv.x - 0.5) * uScale + 0.5;
					float ink = (u >= 0.0 && u <= 1.0) ? texture2D(uLabel, vec2(u, vUv.y)).a : 0.0;
					gl_FragColor = vec4(mix(uColor, uInk, ink), uOpacity);
				}`,
			transparent: true,
			depthWrite: false,
			side: THREE.DoubleSide,
		});
		const unitPlane = new THREE.PlaneGeometry(1, 1);

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

		// ---- the arches of the menu: the band between the opening and the outer line of the wedge stones is
		// brown, the running text on it in the colour of the paper, its top towards the outside; the opening
		// itself fills with white when pointed at
		const bandMiddle = (FACADE_ARCH.radius + FACADE_ARCH.band) / 2;
		const bandHalf = (FACADE_ARCH.band - FACADE_ARCH.radius) / 2;   // the whole band, from line to line
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
				const { texture, width } = textCanvas(`${String(item.name).toLocaleUpperCase('de')}   ·   `, false, RIBBON_COLORS);
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
				const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
					map: texture,
					transparent: true,
					opacity: 0,
					depthWrite: false,
					side: THREE.DoubleSide,
				}));
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

		// ---- rows of words written along the facade, centred over the arches or starting at row.start: the
		// footer lines in the foundation (a dot between the lines) and the menu on the cornice (buttons). A piece
		// with an address (url) or an arch is a link. In Arabic the row runs from right to left.
		const writeRow = (items, row) => {
			const pieces = [];
			items.forEach((item, i) => {
				if (i > 0 && !row.blocks) pieces.push({ text: '·' });   // buttons stand apart without dots
				pieces.push({ ...item, text: String(item.text || '').toLocaleUpperCase('de') });
			});
			const words = pieces.filter((piece) => piece.text.trim()).map((piece) => {
				const block = Boolean(row.blocks) && (piece.arch !== undefined || piece.url !== undefined);
				const { texture, width } = textCanvas(piece.text, block);
				const length = (row.height * width) / TEXT_CANVAS_HEIGHT;
				return {
					...piece, row, block, texture, length, base: length, glow: { value: piece.current ? 1 : 0 },
					value: 0, velocity: 0, target: 0,
				};
			});
			if (rtl) words.reverse();
			const length = words.reduce((sum, piece) => sum + piece.length, 0) + row.gap * Math.max(words.length - 1, 0);
			let along = row.start !== undefined
				? row.start
				: (FACADE_ARCHES[0].z + FACADE_ARCHES[FACADE_ARCHES.length - 1].z) / 2 - length / 2;
			words.forEach((piece) => {
				const mesh = piece.block
					? new THREE.Mesh(unitPlane, dockMaterial(piece.texture))
					: new THREE.Mesh(new THREE.PlaneGeometry(piece.length, row.height), textMaterial(piece.texture, row.fog !== false));
				if (piece.block) mesh.scale.set(piece.length, row.height, 1);
				mesh.rotation.y = -Math.PI / 2;   // in the wall, reading along it to the right
				mesh.position.set(wallX + row.depth - 0.012, row.top - row.height / 2, along + piece.length / 2);
				mesh.visible = false;
				sign.add(mesh);
				piece.mesh = mesh;
				piece.from = along;
				piece.to = along + piece.length;
				along += piece.length + row.gap;
			});
			return words;
		};
		const inscription = writeRow(footer.map((item) => ({ text: item.text, url: item.url || '' })), INSCRIPTION);
		const words = [...inscription];
		const isLink = (piece) => Boolean(piece.url) || piece.arch !== undefined;

		// ---- the menu: its buttons are the cells of the dock (placeDock)
		const menuRow = writeRow([
			...menu.filter((item) => FACADE_ARCHES[item.arch]).map((item) => ({ text: item.name, arch: item.arch, slug: item.slug })),
			...languages.map((item) => ({ text: item.label, url: item.current ? '' : item.url, current: item.current, code: item.code })),
		], MENU_ROW);
		words.push(...menuRow);
		const dock = { cells: menuRow.filter((piece) => piece.block), strip: 0, pointer: null, focus: -1 };
		dock.strip = dock.cells.reduce((sum, cell) => sum + cell.base, 0);
		const finePointer = window.matchMedia('(hover:hover) and (pointer:fine)');

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
		let fogNear = 10;
		let fogFar = 30;
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
			lineMaterial.resolution.set(w, h);   // line width in screen px
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
			// scrolling pushes the building into the depth, at most DEPTH_BACK times the first distance
			root.dataset.depthMax = (cameraFromPivot.length() * DEPTH_BACK).toFixed(3);

			// in front of an arch: the whole window or door with its wedge joints fills the screen
			const frontDistance = Math.max((FRAME.top - FRAME.bottom) / (2 * tan), FRAME.width / (2 * tan * camera.aspect));
			FACADE_ARCHES.forEach((arch, i) => {
				onWall(stops[i].front, -frontDistance, 0, arch.z);
				onWall(stops[i].inside, INSIDE, INSIDE + 10, arch.z);
			});

			const framed = Math.max(heroDistance, frontDistance);
			fogNear = framed + FACADE_FADE[0];
			fogFar = framed + FACADE_FADE[1];
			placeHeroText();
		};

		// ---- the hero text is stuck to the house in space. In the first view it stands upright and flat next to
		// the bottom left corner of the house: set flush right, every line ends HERO_TEXT_GAP px (7 mm) left of
		// the house, the last line on the ground line. That rectangle is fixed as a plane in space, facing the
		// first view; when the building is turned or moved, the plane goes with it and the text is drawn in
		// perspective onto it (a CSS matrix3d, the text stays real text). Where there is no room for it in the
		// first view (narrow screens) it keeps its place at the bottom left of the screen (style.scss).
		const heroCamera = new THREE.PerspectiveCamera();
		const corner = new THREE.Vector3();
		const heroContent = document.querySelector('.hero__content');
		const heroHolder = heroContent ? heroContent.parentElement : null;
		const heroPlate = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];   // top left, top right, bottom right, bottom left
		const heroPlateSize = { w: 0, h: 0, on: false };
		const plane = new THREE.Plane();
		const facing = new THREE.Vector3();
		const ndc = new THREE.Vector2();
		const unproject = new THREE.Raycaster();
		const placeHeroText = () => {
			if (!heroContent) return;
			const w = root.clientWidth;
			const h = root.clientHeight;
			heroCamera.copy(camera);
			heroCamera.fov = FOV;
			heroCamera.position.copy(hero.position);
			heroCamera.lookAt(hero.target);
			heroCamera.updateProjectionMatrix();
			heroCamera.updateMatrixWorld();
			corner.set(wallX, FACADE_ARCH.ground, BUILDING_LEFT).applyMatrix4(sign.matrixWorld);
			const screen = corner.clone().project(heroCamera);
			const x = (screen.x + 1) * 0.5 * w;
			const y = (1 - screen.y) * 0.5 * h;
			const textW = heroContent.offsetWidth;
			const textH = heroContent.offsetHeight;
			const fits = x - HERO_TEXT_GAP - textW >= 16 && y > textH + 80 && y <= h;
			heroPlateSize.on = fits;
			document.documentElement.classList.toggle('has-house-corner', fits);
			if (!fits) {
				heroContent.style.transform = '';
				if (heroHolder) heroHolder.style.visibility = '';
				return;
			}
			// the rectangle of the text in the first view, put onto the plane through the corner that faces it
			heroPlateSize.w = textW;
			heroPlateSize.h = textH;
			heroCamera.getWorldDirection(facing);
			plane.setFromNormalAndCoplanarPoint(facing, corner);
			const right = x - HERO_TEXT_GAP;
			[[right - textW, y - textH], [right, y - textH], [right, y], [right - textW, y]].forEach(([px, py], i) => {
				ndc.set((px / w) * 2 - 1, -(py / h) * 2 + 1);
				unproject.setFromCamera(ndc, heroCamera);
				unproject.ray.intersectPlane(plane, heroPlate[i]);
			});
			drawHeroText();
		};

		// every frame: the corners of the plane on the screen, and the projective map of the text onto them
		const heroPlateScreen = new THREE.Vector3();
		const drawHeroText = () => {
			if (!heroContent || !heroPlateSize.on) return;
			const w = root.clientWidth;
			const h = root.clientHeight;
			const q = [];
			for (const point of heroPlate) {
				heroPlateScreen.copy(point).applyMatrix4(camera.matrixWorldInverse);
				if (heroPlateScreen.z > -camera.near) {
					// behind the camera (inside an arch): not shown
					if (heroHolder) heroHolder.style.visibility = 'hidden';
					return;
				}
				heroPlateScreen.applyMatrix4(camera.projectionMatrix);
				q.push([(heroPlateScreen.x + 1) * 0.5 * w, (1 - heroPlateScreen.y) * 0.5 * h]);
			}
			if (heroHolder) heroHolder.style.visibility = '';
			// unit square (0,0) (1,0) (1,1) (0,1) to the quad (Heckbert), then scaled to the size of the text
			const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
			const dx1 = x1 - x2;
			const dx2 = x3 - x2;
			const dx3 = x0 - x1 + x2 - x3;
			const dy1 = y1 - y2;
			const dy2 = y3 - y2;
			const dy3 = y0 - y1 + y2 - y3;
			const den = dx1 * dy2 - dx2 * dy1;
			const g = den ? (dx3 * dy2 - dx2 * dy3) / den : 0;
			const k = den ? (dx1 * dy3 - dx3 * dy1) / den : 0;
			const a = x1 - x0 + g * x1;
			const b = x3 - x0 + k * x3;
			const d = y1 - y0 + g * y1;
			const e = y3 - y0 + k * y3;
			const tw = heroPlateSize.w;
			const th = heroPlateSize.h;
			const m = [a / tw, d / tw, 0, g / tw, b / th, e / th, 0, k / th, 0, 0, 1, 0, x0, y0, 0, 1];
			heroContent.style.transform = `matrix3d(${m.map((v) => +v.toFixed(8)).join(',')})`;
		};
		if (heroContent) {
			new ResizeObserver(() => placeHeroText()).observe(heroContent);
			if (document.fonts) document.fonts.ready.then(() => placeHeroText());
		}

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
			// the building into the depth: camera and target go back along the Z axis of the camera, and the fog
			// goes back with them, so the building stays as clear as before, only further away
			forward.subVectors(street.target, street.position).normalize();
			street.position.addScaledVector(forward, -depth);
			street.target.addScaledVector(forward, -depth);
			scene.fog.near = fogNear + depth;
			scene.fog.far = fogFar + depth;
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
			words.forEach((piece) => {
				const opacity = (piece.row.opacity + (1 - piece.row.opacity) * piece.glow.value) * shown * gone;
				if (piece.block) {
					piece.mesh.material.uniforms.uOpacity.value = opacity;
					piece.mesh.visible = opacity > 0.002;
				} else {
					setOpacity(piece.mesh, opacity);
				}
			});
		};

		// ---- the dock (topDockController.js): every button springs towards its target, the pointer's closeness
		// along the row (smoothstep over DOCK.proximity screen px) or the keyboard focus (1, neighbours 0.24);
		// the buttons share the row's length in proportion to their widths plus DOCK.widthGrowth px each
		const dockScreen = new THREE.Vector3();
		const toScreen = (z, y) => {
			dockScreen.set(wallX + MENU_ROW.depth, y, z).applyMatrix4(sign.matrixWorld).project(camera);
			return { x: (dockScreen.x + 1) * 0.5 * root.clientWidth, y: (1 - dockScreen.y) * 0.5 * root.clientHeight };
		};
		const dockMoves = () => !reduced && window.innerWidth > 600 && finePointer.matches;
		const placeDock = () => {
			const { cells } = dock;
			if (!cells.length) return;
			const middle = MENU_ROW.top - MENU_ROW.height / 2;
			const moves = dockMoves();
			const screen = cells.map((cell) => {
				const from = toScreen(cell.from, middle);
				const to = toScreen(cell.to, middle);
				const width = Math.max(1, Math.hypot(to.x - from.x, to.y - from.y));
				return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, perUnit: width / Math.max(cell.to - cell.from, 1e-4) };
			});
			// the strip's own axis on the screen
			const first = screen[0];
			const last = screen[screen.length - 1];
			const axis = Math.hypot(last.x - first.x, last.y - first.y) > 1
				? { x: (last.x - first.x) / Math.hypot(last.x - first.x, last.y - first.y), y: (last.y - first.y) / Math.hypot(last.x - first.x, last.y - first.y) }
				: { x: 1, y: 0 };
			cells.forEach((cell, i) => {
				if (!moves) cell.target = 0;
				else if (dock.pointer) {
					const d = Math.abs((dock.pointer.x - screen[i].x) * axis.x + (dock.pointer.y - screen[i].y) * axis.y);
					const x = THREE.MathUtils.clamp(1 - d / Math.max(1, DOCK.proximity), 0, 1);
					cell.target = x * x * (3 - 2 * x);
				} else if (dock.focus >= 0) {
					cell.target = i === dock.focus ? 1 : Math.abs(i - dock.focus) === 1 ? 0.24 : 0;
				} else {
					cell.target = 0;
				}
				cell.velocity += (cell.target - cell.value) * DOCK.spring;
				cell.velocity *= DOCK.damping;
				cell.value += cell.velocity;
				if (Math.abs(cell.target - cell.value) < 1e-3 && Math.abs(cell.velocity) < 1e-3) {
					cell.value = cell.target;
					cell.velocity = 0;
				}
			});
			const wanted = cells.map((cell, i) => cell.base + (DOCK.widthGrowth / screen[i].perUnit) * THREE.MathUtils.clamp(cell.value, 0, 1.08));
			const total = wanted.reduce((sum, w) => sum + w, 0);
			let along = MENU_ROW.start;
			cells.forEach((cell, i) => {
				const length = (dock.strip * wanted[i]) / total;
				cell.from = along;
				cell.to = along + length;
				cell.mesh.scale.x = length;
				cell.mesh.position.z = along + length / 2;
				cell.mesh.material.uniforms.uScale.value = length / cell.base;
				along += length + MENU_ROW.gap;
			});
		};
		const dockAt = (clientX, clientY) => {
			if (!dock.cells.length) return null;
			const rect = canvas.getBoundingClientRect();
			pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
			ray.setFromCamera(pointer, camera);
			ray.ray.applyMatrix4(toSign);
			const { origin, direction } = ray.ray;
			if (direction.x <= 1e-6) return null;
			const distance = (wallX + MENU_ROW.depth - origin.x) / direction.x;
			const z = origin.z + direction.z * distance;
			const y = origin.y + direction.y * distance;
			const end = dock.cells[dock.cells.length - 1].to;
			const inside = y <= MENU_ROW.top + 0.12 && y >= MENU_ROW.top - MENU_ROW.height - 0.12 && z >= MENU_ROW.start - 0.12 && z <= end + 0.12;
			return inside ? { x: clientX - rect.left, y: clientY - rect.top } : null;
		};

		const draw = () => {
			disc.rotation.y = state.angle;
			placeCamera();
			camera.updateMatrixWorld();
			drawHeroText();
			placeDock();
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
			// the rows of words: where the ray meets the plane of each row
			const piece = words.find((item) => {
				if (!isLink(item)) return false;
				const along = (wallX + item.row.depth - origin.x) / direction.x;
				const wz = origin.z + direction.z * along;
				const wy = origin.y + direction.y * along;
				return wy <= item.row.top + 0.05 && wy >= item.row.top - item.row.height - 0.05
					&& wz >= item.from - 0.1 && wz <= item.to + 0.1;
			});
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
			words.forEach((item) => tweenTo(item.glow, item === piece || item.current ? 1 : 0, 0.3));
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
			dock.pointer = atStreet() && lastPointer.free ? dockAt(event.clientX, event.clientY) : null;
		});
		html.addEventListener('pointerleave', () => {
			lastPointer = null;
			dock.pointer = null;
			point(null);
		});
		// keyboard focus on the menu of the header mirrors the pointer on the cornice
		document.addEventListener('focusin', (event) => {
			const link = event.target instanceof Element ? event.target.closest('.site-header__nav a') : null;
			if (!link) return;
			const slug = link.dataset.open;
			const code = link.dataset.lang;
			dock.focus = dock.cells.findIndex((cell) => (slug && cell.slug === slug) || (code && cell.code === code));
		});
		document.addEventListener('focusout', () => requestAnimationFrame(() => {
			if (!(document.activeElement instanceof Element && document.activeElement.closest('.site-header__nav'))) dock.focus = -1;
		}));
		window.addEventListener('click', (event) => {
			if (!atStreet() || !free(event)) return;
			const target = targetAt(event.clientX, event.clientY);
			if (!target) return;
			point(null);
			if (target.ribbon) window.dispatchEvent(new CustomEvent('jos:open', { detail: target.ribbon.arch }));
			else if (target.piece.arch !== undefined) window.dispatchEvent(new CustomEvent('jos:open', { detail: target.piece.arch }));
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
