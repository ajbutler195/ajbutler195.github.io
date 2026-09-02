import * as THREE from 'three';
import { ALL_SECTIONS, TOWER, TRAIL_END } from './world-layout.js';
import { getGroundHeight } from './terrain.js';
import { TOWER_FLOOR_Y, TOP_DOOR_ANGLE } from './tower.js';

// ---------------------------------------------------------------------------
// Trail signs: rough sawn planks with hand-painted lettering. Both the board
// and the letters are deliberately irregular — a perfect rectangle with typeset
// text reads as a UI element dropped into the woods rather than an object
// someone made.
// ---------------------------------------------------------------------------

const WOOD_COLOR = 0x5c4632;
const LANTERN_COLOR = 0xffb454;
// Caveat is the intended brush face; the rest are hand-ish fallbacks in case
// the webfont is blocked or slow.
// Hand-lettered trail signage: someone with a brush and a steady hand marking
// a path for other walkers. Legibility comes first — this is how people find
// their way — so the variation is limited to weight and a slight wobble.
// Earlier versions layered on overspray and drips and became unreadable.
// Straight-sided, sharp-cornered caps — the look of letters cut with a chisel
// or routed into a board, rather than written with a pen.
const SIGN_FONT = '"Staatliches", "Haettenschweiler", "Impact", "Arial Narrow", sans-serif';
// Black lettering on dark wood. A thin warm keyline offset behind each glyph
// keeps it readable at distance without lifting it off the black.
const LETTER_INK = '#0c0908';
const LETTER_KEYLINE = 'rgba(206,162,104,0.7)';

// The pool of per-letter treatments. Mixing filled, outline-only and
// double-struck glyphs in one word is what gives it a scrawled hand.
const LETTER_STYLES = [
  { strokes: [0.03],  wobble: 0.5, keyline: 0.11 },
  { strokes: [0.045], wobble: 0.6, keyline: 0.12 },
  { strokes: [0.02],  wobble: 0.4, keyline: 0.10 },
  { strokes: [0.038], wobble: 0.5, keyline: 0.115 },
];

// Redrawn once the webfont arrives, since canvas text falls back to a system
// face if it's drawn before the font has loaded.
const pendingRedraws = [];

function drawPaintedText(ctx, label, cx, cy, fontSize, color) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  // Paint the lettering on its own layer first. The weathering step below
  // erases pixels, and it must only eat the paint — not the board underneath.
  const layer = document.createElement('canvas');
  layer.width = W;
  layer.height = H;
  const lc = layer.getContext('2d');

  const chars = [...label.toUpperCase()];
  lc.font = `800 ${fontSize}px ${SIGN_FONT}`;
  const widths = chars.map((ch) => lc.measureText(ch).width);
  const spacing = fontSize * 0.055;
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);

  // Whoever painted this wasn't using a ruler: the whole word sits at a slight
  // angle, and the baseline sags a little through the middle.
  const wordTilt = (Math.random() - 0.5) * 0.035;
  const sag = fontSize * (0.05 + Math.random() * 0.06);

  lc.save();
  lc.translate(cx, cy);
  lc.rotate(wordTilt);
  lc.translate(-cx, -cy);

  let x = cx - total / 2;
  chars.forEach((ch, i) => {
    const t = chars.length > 1 ? i / (chars.length - 1) : 0.5;
    const jitterSize = fontSize * (0.98 + Math.random() * 0.045);
    const dy = Math.sin(t * Math.PI) * sag + (Math.random() - 0.5) * fontSize * 0.035;
    const rot = (Math.random() - 0.5) * 0.028;
    const squash = 0.97 + Math.random() * 0.06;

    lc.save();
    lc.translate(x + widths[i] / 2, cy + dy);
    lc.rotate(rot);
    lc.transform(1, 0, (Math.random() - 0.5) * 0.05, squash, 0, 0); // slight lean
    lc.font = `800 ${jitterSize}px ${SIGN_FONT}`;
    lc.textAlign = 'center';
    lc.textBaseline = 'middle';

    // Each letter picks a treatment at random, so no two are inked the same
    // way. A row of identically-drawn glyphs is what reads as a font rather
    // than as something a person scrawled on a board.
    lc.lineJoin = 'miter';
    lc.miterLimit = 8;
    lc.lineCap = 'butt';

    const style = LETTER_STYLES[(Math.random() * LETTER_STYLES.length) | 0];

    // Warm keyline behind the glyph so black still reads against dark wood.
    // Its weight and offset vary, and some letters skip it entirely.
    if (style.keyline) {
      lc.strokeStyle = LETTER_KEYLINE;
      lc.lineWidth = jitterSize * style.keyline;
      lc.globalAlpha = 0.6 + Math.random() * 0.3;
      lc.strokeText(ch, (Math.random() - 0.5) * 3, 2.2 + (Math.random() - 0.5) * 2);
      lc.globalAlpha = 1;
    }

    lc.strokeStyle = LETTER_INK;
    lc.fillStyle = LETTER_INK;

    lc.fillText(ch, 0, 0);
    for (const w of style.strokes) {
      lc.lineWidth = jitterSize * w * (0.85 + Math.random() * 0.35);
      lc.strokeText(ch, (Math.random() - 0.5) * style.wobble, (Math.random() - 0.5) * style.wobble);
    }

    lc.globalAlpha = 1;
    lc.restore();

    x += widths[i] + spacing;
  });
  lc.restore();

  // Weathering: chip the paint with speckles and a few grain-following
  // scratches, so it looks like it has spent a winter outdoors.
  lc.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 70; i++) {
    lc.beginPath();
    lc.arc(Math.random() * W, Math.random() * H, Math.random() * 1.9, 0, Math.PI * 2);
    lc.fillStyle = `rgba(0,0,0,${0.2 + Math.random() * 0.45})`;
    lc.fill();
  }
  for (let i = 0; i < 4; i++) {
    const y0 = Math.random() * H;
    lc.strokeStyle = `rgba(0,0,0,${0.3 + Math.random() * 0.5})`;
    lc.lineWidth = 0.7 + Math.random() * 1.5;
    lc.beginPath();
    lc.moveTo(-5, y0);
    let cyy = y0;
    for (let px = 0; px <= W + 5; px += 30) {
      cyy += (Math.random() - 0.5) * 5;
      lc.lineTo(px, cyy);
    }
    lc.stroke();
  }
  lc.globalCompositeOperation = 'source-over';

  ctx.drawImage(layer, 0, 0);
}

function paintSignCanvas(canvas, label, accent) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#4d3722';
  ctx.fillRect(0, 0, W, H);

  // Wood grain: long wavering strokes along the length of the board.
  for (let i = 0; i < 70; i++) {
    const y = Math.random() * H;
    const light = Math.random() > 0.5;
    ctx.strokeStyle = light ? 'rgba(140,110,78,0.20)' : 'rgba(38,26,16,0.26)';
    ctx.lineWidth = 0.7 + Math.random() * 2.4;
    ctx.beginPath();
    ctx.moveTo(-10, y);
    let cy = y;
    for (let x = 0; x <= W + 10; x += 26) {
      cy += (Math.random() - 0.5) * 4.5;
      ctx.lineTo(x, cy);
    }
    ctx.stroke();
  }

  // A couple of knots.
  for (let i = 0; i < 2; i++) {
    const kx = 40 + Math.random() * (W - 80);
    const ky = 20 + Math.random() * (H - 40);
    for (let ring = 5; ring > 0; ring--) {
      ctx.beginPath();
      ctx.ellipse(kx, ky, ring * 4.5, ring * 3.1, Math.random() * 0.4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(30,20,12,${0.05 + ring * 0.03})`;
      ctx.lineWidth = 1.7;
      ctx.stroke();
    }
  }

  // Darkening around the edges, where weather gets in first.
  const vign = ctx.createLinearGradient(0, 0, 0, H);
  vign.addColorStop(0, 'rgba(20,12,6,0.45)');
  vign.addColorStop(0.3, 'rgba(20,12,6,0)');
  vign.addColorStop(0.7, 'rgba(20,12,6,0)');
  vign.addColorStop(1, 'rgba(20,12,6,0.45)');
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, W, H);

  const fontSize = label.length > 9 ? 74 : 88;
  drawPaintedText(ctx, label, W / 2, H / 2 + 2, fontSize, accent ? '#ffd9a0' : '#efe3cb');

  if (accent) {
    ctx.font = `600 30px ${SIGN_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(239,227,203,0.72)';
    ctx.fillText('you found it', W / 2, H - 26);
  }
}

function createSignTexture(label, { accent = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 232;
  paintSignCanvas(canvas, label, accent);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  pendingRedraws.push(() => {
    paintSignCanvas(canvas, label, accent);
    texture.needsUpdate = true;
  });
  return texture;
}

/** Rough up a slab so its edges waver like sawn timber instead of extruded plastic. */
function roughenPlank(geometry, width, height) {
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const atEdgeX = Math.abs(Math.abs(v.x) - width / 2) < 0.001;
    const atEdgeY = Math.abs(Math.abs(v.y) - height / 2) < 0.001;
    if (atEdgeX) v.x += (Math.random() - 0.5) * width * 0.05;
    if (atEdgeY) v.y += (Math.random() - 0.5) * height * 0.16;
    // Slight cupping across the face, as boards do once they've weathered.
    v.z += (Math.random() - 0.5) * 0.022;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

const TWO_PI = Math.PI * 2;

// The Contact sign stands on the covered deck, a little way round from where
// the outside stair arrives.
function towerSignAnchor(section) {
  const a = TOP_DOOR_ANGLE + Math.PI;
  const r = TOWER.outerRadius * 0.55;
  return new THREE.Vector3(
    section.position.x + Math.cos(a) * r, 0, section.position.z + Math.sin(a) * r
  );
}
function towerApproachPoint(section) {
  const a = TOP_DOOR_ANGLE + Math.PI * 0.72;
  const r = TOWER.outerRadius * 0.62;
  return new THREE.Vector3(
    section.position.x + Math.cos(a) * r, 0, section.position.z + Math.sin(a) * r
  );
}

let haloTexture = null;
function getLanternHalo() {
  if (haloTexture) return haloTexture;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.25, 'rgba(255,220,150,0.45)');
  g.addColorStop(1, 'rgba(255,180,84,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  haloTexture = new THREE.CanvasTexture(canvas);
  haloTexture.colorSpace = THREE.SRGBColorSpace;
  return haloTexture;
}

function buildSign(section) {
  const group = new THREE.Group();
  group.name = `sign-${section.id}`;
  const isHidden = section.hidden;

  // No two boards the same size.
  const plankWidth = (isHidden ? 1.15 : 1.85) * (0.94 + Math.random() * 0.12);
  const plankHeight = (isHidden ? 0.44 : 0.64) * (0.94 + Math.random() * 0.12);
  const plankDepth = 0.1;
  const plankY = isHidden ? 1.28 : 1.66;
  const plankBottom = plankY - plankHeight / 2;

  // Post stops just inside the bottom edge of the board so it never crosses
  // the lettering, and sits back so its face can't poke through the front.
  const postOverlap = 0.1;
  const postHeight = plankBottom + postOverlap;
  const postTopRadius = isHidden ? 0.07 : 0.09;
  const postMat = new THREE.MeshStandardMaterial({
    color: WOOD_COLOR, flatShading: true, roughness: 1,
  });
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(postTopRadius, isHidden ? 0.11 : 0.15, postHeight, 6),
    postMat
  );
  post.position.set(0, postHeight / 2, -(postTopRadius - plankDepth / 2) - 0.01);
  post.rotation.y = Math.random() * Math.PI;
  group.add(post);

  const plankGeo = roughenPlank(
    new THREE.BoxGeometry(plankWidth, plankHeight, plankDepth, 6, 4, 1),
    plankWidth, plankHeight
  );
  const woodMat = new THREE.MeshStandardMaterial({
    color: WOOD_COLOR, flatShading: true, roughness: 1,
  });
  const texture = createSignTexture(section.label, { accent: isHidden });
  const textMat = new THREE.MeshStandardMaterial({
    map: texture,
    emissiveMap: texture,
    emissive: 0xffffff,
    emissiveIntensity: 0.5, // signs are the navigation — keep them readable
    flatShading: true,
    roughness: 0.9,
  });
  // Box face order: +x -x +y -y +z -z — paint the front and back faces.
  const plank = new THREE.Mesh(plankGeo, [woodMat, woodMat, woodMat, woodMat, textMat, textMat]);
  plank.position.y = plankY;
  plank.rotation.z = (Math.random() - 0.5) * 0.075;
  group.add(plank);

  const brace = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, plankHeight * 0.78, 0.05), postMat
  );
  brace.position.set(0, plankY, -(plankDepth / 2 + 0.02));
  group.add(brace);

  // Nail heads at the corners.
  const nailMat = new THREE.MeshStandardMaterial({
    color: 0x2a2622, roughness: 0.6, metalness: 0.5,
  });
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 5), nailMat);
      nail.rotation.x = Math.PI / 2;
      nail.position.set(
        sx * (plankWidth / 2 - 0.11),
        plankY + sy * (plankHeight / 2 - 0.1),
        plankDepth / 2 + 0.005
      );
      group.add(nail);
    }
  }

  // The hidden clearing is lit by its campfire alone, so that board gets no
  // lantern — finding it should mean spotting firelight through the trees.
  if (isHidden) {
    return { group, lantern: null };
  }

  // Lantern on an iron bracket off the side of the board.
  const armLength = 0.34;
  const armX = plankWidth / 2;
  const armY = plankY + plankHeight / 2 + 0.12;
  const armMat = new THREE.MeshStandardMaterial({
    color: 0x4a3f33, flatShading: true, roughness: 1,
  });
  const arm = new THREE.Mesh(new THREE.BoxGeometry(armLength, 0.075, 0.075), armMat);
  arm.position.set(armX + armLength / 2, armY, 0);
  group.add(arm);

  const hangerHeight = 0.16;
  const hanger = new THREE.Mesh(new THREE.BoxGeometry(0.055, hangerHeight, 0.055), armMat);
  hanger.position.set(armX + armLength, armY - hangerHeight / 2, 0);
  group.add(hanger);

  const lantern = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.09, 1),
    new THREE.MeshBasicMaterial({ color: LANTERN_COLOR, fog: false })
  );
  lantern.position.set(armX + armLength, armY - hangerHeight - 0.09, 0);
  group.add(lantern);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: getLanternHalo(), color: LANTERN_COLOR, blending: THREE.AdditiveBlending,
    depthWrite: false, transparent: true, opacity: 0.9, fog: false,
  }));
  halo.scale.setScalar(0.85);
  halo.position.copy(lantern.position);
  group.add(halo);

  // Face whoever walks up: back along the offshoot, or the top of the stair.
  let approachFrom;
  if (section.inTower) approachFrom = towerApproachPoint(section);
  else if (section.junction) approachFrom = section.junction;
  else approachFrom = TRAIL_END;

  const anchor = section.inTower
    ? towerSignAnchor(section)
    : section.signPosition || section.position;
  const facing = new THREE.Vector3().subVectors(approachFrom, anchor).setY(0).normalize();
  group.rotation.y = Math.atan2(facing.x, facing.z);

  if (section.inTower) {
    group.position.set(anchor.x, TOWER_FLOOR_Y + TOWER.deckY, anchor.z);
  } else {
    group.position.set(anchor.x, getGroundHeight(anchor.x, anchor.z), anchor.z);
  }

  return { group, lantern };
}

export function createSigns() {
  const group = new THREE.Group();
  group.name = 'signs';
  const registry = [];

  ALL_SECTIONS.forEach((section) => {
    const { group: mesh, lantern } = buildSign(section);
    group.add(mesh);

    mesh.updateMatrixWorld(true);
    const bulbWorld = new THREE.Vector3();
    if (lantern) lantern.getWorldPosition(bulbWorld);
    else bulbWorld.set(section.position.x, -500, section.position.z); // parked away

    // Park the pooled light below and inboard of the bulb: sitting right on it
    // blew out the metal bracket under inverse-square falloff.
    const lightAnchor = bulbWorld.clone();
    lightAnchor.y -= 0.3;
    const inboard = new THREE.Vector3(section.position.x, 0, section.position.z)
      .sub(bulbWorld).setY(0);
    if (inboard.lengthSq() > 0.0001) lightAnchor.addScaledVector(inboard.normalize(), 0.35);

    const signPos = section.inTower
      ? towerSignAnchor(section)
      : section.signPosition || section.position;
    const baseY = section.inTower
      ? TOWER_FLOOR_Y + TOWER.deckY
      : getGroundHeight(signPos.x, signPos.z);

    registry.push({
      id: section.id,
      label: section.label,
      hidden: section.hidden,
      position: signPos,
      compassPosition: section.position,
      junction: section.junction || null,
      approachPoint: section.inTower ? towerApproachPoint(section) : null,
      activationRadius: section.activationRadius,
      activationY: baseY,
      inTower: !!section.inTower,
      mesh,
      bulb: lantern,
      bulbWorld,
      lightAnchor,
    });
  });

  // The webfont may not have arrived when the boards were first painted.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => pendingRedraws.forEach((fn) => fn()));
  }

  return { group, registry };
}
