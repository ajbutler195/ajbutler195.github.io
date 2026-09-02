import * as THREE from 'three';
import { TOWER } from './world-layout.js';
import { getGroundHeight } from './terrain.js';

// ---------------------------------------------------------------------------
// A fieldstone observation tower, modelled on the New England trail towers:
// a narrow tapered shaft of rounded cobbles, a small arched door, slit windows,
// and a stair that climbs inside for the first stretch then breaks out through
// the wall to wrap the outside, finishing at a covered deck on top.
// ---------------------------------------------------------------------------

export const TOWER_FLOOR_Y = getGroundHeight(TOWER.center.x, TOWER.center.z);

const MORTAR = '#4a4640';
// Mixed river-cobble tones: warm tans, cool greys, the odd dark stone.
const STONE_TONES = [
  '#6b655c', '#77705f', '#5f594f', '#524d45', '#7d7161',
  '#61635c', '#6c6253', '#4b4841', '#726758', '#565045',
  '#837763', '#454239',
];

// three.js builds cylinder vertices as x = r·sin(theta), z = r·cos(theta), so
// its theta starts at +Z and runs toward +X, while our angles are ordinary
// atan2(z, x) angles from +X. Everything angular converts through here.
const toTheta = (angle) => Math.PI / 2 - angle;
const arcParams = (a0, a1) => ({ thetaStart: toTheta(a1), thetaLength: a1 - a0 });

// --- procedural cobblestone -------------------------------------------------
let stoneTexture = null;
function getStoneTexture() {
  if (stoneTexture) return stoneTexture;
  const S = 512;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = MORTAR;
  ctx.fillRect(0, 0, S, S);

  // Rounded fieldstones of mixed size, drawn wrapped so the texture tiles.
  const draw = (cx, cy, rx, ry, rot, fill) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(45,42,38,0.55)';
    ctx.stroke();
    // A soft highlight on the upper-left of each cobble gives them roundness.
    ctx.beginPath();
    ctx.ellipse(-rx * 0.25, -ry * 0.28, rx * 0.5, ry * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.055)';
    ctx.fill();
    ctx.restore();
  };

  for (let i = 0; i < 620; i++) {
    const rx = 6 + Math.random() * 12;
    const ry = rx * (0.62 + Math.random() * 0.34);
    const cx = Math.random() * S;
    const cy = Math.random() * S;
    const rot = Math.random() * Math.PI;
    const fill = STONE_TONES[(Math.random() * STONE_TONES.length) | 0];
    for (const ox of [-S, 0, S]) {
      for (const oy of [-S, 0, S]) {
        if (cx + ox > -40 && cx + ox < S + 40 && cy + oy > -40 && cy + oy < S + 40) {
          draw(cx + ox, cy + oy, rx, ry, rot, fill);
        }
      }
    }
  }

  stoneTexture = new THREE.CanvasTexture(canvas);
  stoneTexture.colorSpace = THREE.SRGBColorSpace;
  stoneTexture.wrapS = THREE.RepeatWrapping;
  stoneTexture.wrapT = THREE.RepeatWrapping;
  stoneTexture.anisotropy = 4;
  return stoneTexture;
}

function stoneMaterial(repeatX, repeatY, tint = 0xffffff) {
  const map = getStoneTexture().clone();
  map.needsUpdate = true;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);
  return new THREE.MeshStandardMaterial({
    map,
    color: tint,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
  });
}

// --- stair maths ------------------------------------------------------------
const TWO_PI = Math.PI * 2;
const stepRise = () => TOWER.risePerTurn / TOWER.stepsPerTurn;

// The flight leaves the ground just beside the doorway and climbs the outside
// of the tower for its whole length.
export const STAIR_START_ANGLE = TOWER.doorAngle + TOWER.stairStartOffset;
export const ARRIVE_ANGLE = STAIR_START_ANGLE + (TOWER.deckY / TOWER.risePerTurn) * TWO_PI;

// The doorway from the gallery into the covered room, set just past where the
// stair arrives so you step off the top tread and straight through it.
export const TOP_DOOR_ANGLE = ARRIVE_ANGLE;

// The last stretch of stair runs beneath the gallery. Without an opening there
// a climber's head rises above the floor while their feet are still below it,
// and they see straight through it. The gap spans exactly the arc where the
// stair is within eye height of the deck.
const HEAD_CLEARANCE = 1.9;
export const DECK_GAP_HALF = (HEAD_CLEARANCE / TOWER.risePerTurn) * Math.PI + 0.12;
export const DECK_GAP_CENTER = ARRIVE_ANGLE - DECK_GAP_HALF + 0.18;

function relAngle(x, z, centre) {
  let rel = Math.atan2(z - TOWER.center.z, x - TOWER.center.x) - centre;
  while (rel > Math.PI) rel -= TWO_PI;
  while (rel < -Math.PI) rel += TWO_PI;
  return rel;
}
const isInArc = (x, z, centre, half) => Math.abs(relAngle(x, z, centre)) <= half;

export const isInDoorway = (x, z) => isInArc(x, z, TOWER.doorAngle, TOWER.doorHalfAngle);
export const isInTopDoorway = (x, z) => isInArc(x, z, TOP_DOOR_ANGLE, TOWER.topDoorHalfAngle);
export const isInDeckGap = (x, z) => isInArc(x, z, DECK_GAP_CENTER, DECK_GAP_HALF);

/** Phase (0..1) around the tower, measured from the foot of the stair. */
function stairPhase(x, z) {
  let rel = Math.atan2(z - TOWER.center.z, x - TOWER.center.x) - STAIR_START_ANGLE;
  while (rel < 0) rel += TWO_PI;
  while (rel >= TWO_PI) rel -= TWO_PI;
  return rel / TWO_PI;
}

/**
 * Height of the spiral beneath a point, choosing the flight nearest the
 * walker's current height — a spiral overlaps itself, so (x, z) alone is
 * ambiguous. Null when this point isn't on the stair.
 */
export const EXIT_ARC_START = -0.24;
export const EXIT_ARC_END = 0.85;
export const EXIT_PHASE = TOWER.exitHeight / TOWER.risePerTurn;
export const EXIT_ANGLE = STAIR_START_ANGLE + (EXIT_PHASE % 1) * TWO_PI;

/** True in the opening that carries the stair out through the wall. */
export function isOnExitPortal(x, z) {
  const rel = relAngle(x, z, EXIT_ANGLE);
  return rel >= EXIT_ARC_START && rel <= EXIT_ARC_END;
}

export function stairHeightAt(x, z, currentY) {
  const r = Math.hypot(x - TOWER.center.x, z - TOWER.center.z);
  const inInner = r >= TOWER.innerStairInner && r <= TOWER.innerStairOuter;
  const inOuter = r >= TOWER.stairInner && r <= TOWER.stairOuter;
  const inCrossing = r > TOWER.innerStairInner && r < TOWER.stairOuter;
  if (!inInner && !inOuter && !inCrossing) return null;

  const phase = stairPhase(x, z);
  const rise = stepRise();
  let best = null;
  let bestDelta = Infinity;
  for (let turn = 0; turn <= Math.ceil(TOWER.deckY / TOWER.risePerTurn); turn++) {
    const raw = (phase + turn) * TOWER.risePerTurn;
    if (raw < -0.01 || raw > TOWER.deckY + 0.01) continue;

    // Which side of the wall the flight is on at this height. The bands
    // overlap generously around the crossing so a walker is never caught
    // between them while stepping through the opening.
    let onBand;
    if (raw < TOWER.exitHeight - 2.4) onBand = inInner;
    else if (raw > TOWER.exitHeight + 2.4) onBand = inOuter;
    else onBand = inInner || inOuter || inCrossing;
    if (!onBand) continue;

    const y = TOWER_FLOOR_Y + Math.round(raw / rise) * rise;
    const delta = Math.abs(y - currentY);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = y;
    }
  }
  return best;
}

/**
 * Resolve any surface belonging to the tower. Null when the point has nothing
 * to do with the tower, so the caller falls through to open ground.
 */
export function towerSurface(x, z, currentY) {
  const r = Math.hypot(x - TOWER.center.x, z - TOWER.center.z);
  const deckY = TOWER_FLOOR_Y + TOWER.deckY;
  const localY = currentY - TOWER_FLOOR_Y;
  const wallInner = TOWER.outerRadius - TOWER.wallThickness;

  if (r > Math.max(TOWER.deckRadius, TOWER.stairOuter) + 0.4) return null;

  const candidates = [];
  const atDeckLevel = localY > TOWER.deckY - 0.05;

  // Covered room on top. Only a floor to someone already level with it —
  // inside the shaft it is a ceiling, and offering it there let a climber
  // near the top stand in mid-air above the ground-floor room.
  if (r <= TOWER.outerRadius) {
    if (atDeckLevel) candidates.push(deckY);
  } else if (r <= TOWER.deckRadius && !isInDeckGap(x, z)) {
    // Gallery ring, minus the stairwell opening the stair rises through.
    candidates.push(deckY);
  }

  const stair = stairHeightAt(x, z, currentY);
  if (stair !== null) candidates.push(stair);

  // Ground-floor room, reached through the door at the base.
  if (r <= wallInner && localY < 1.6) {
    candidates.push(TOWER_FLOOR_Y);
  }
  if (isInDoorway(x, z) && localY < TOWER.doorHeight) candidates.push(TOWER_FLOOR_Y);

  // Outside at ground level is just open ground — let the caller handle it,
  // unless a stair tread or the deck is genuinely underfoot.
  const outsideAtGround = r > TOWER.outerRadius && localY < 1.5;
  if (outsideAtGround && !candidates.some((c) => Math.abs(c - currentY) < 1.5)) {
    return null;
  }

  // The shaft wall is solid but for two openings: the door at the base, and
  // the small doorway from the gallery into the room on top.
  if (r > wallInner && r <= TOWER.outerRadius) {
    const throughDoor = isInDoorway(x, z) && localY < TOWER.doorHeight - 0.4;
    const throughTopDoor = isInTopDoorway(x, z) && atDeckLevel;
    const throughPortal =
      isOnExitPortal(x, z) && Math.abs(localY - TOWER.exitHeight) < 2.0;
    if (!throughDoor && !throughTopDoor && !throughPortal) return { ok: false };
  }

  // The waist-high parapet ringing the top room: solid except at its doorway.
  if (atDeckLevel && Math.abs(r - TOWER.outerRadius) < 0.45 && !isInTopDoorway(x, z)) {
    return { ok: false };
  }

  // Standing in the stair band, a reachable tread wins over the floor beneath
  // it. Picking purely by "nearest" meant the floor tied with the first tread
  // and won, and the stair could never be stepped onto.
  const onStairBand =
    (r >= TOWER.innerStairInner && r <= TOWER.innerStairOuter) ||
    (r >= TOWER.stairInner && r <= TOWER.stairOuter);
  if (onStairBand && stair !== null) {
    const d = stair - currentY;
    if (d <= 0.7 && d >= -1.4) return { ok: true, y: stair };
  }

  let best = null;
  let bestDelta = Infinity;
  for (const y of candidates) {
    const delta = y - currentY;
    if (delta > 0.7 || delta < -1.4) continue;
    if (Math.abs(delta) < bestDelta) {
      bestDelta = Math.abs(delta);
      best = y;
    }
  }
  if (best === null) return { ok: false };
  return { ok: true, y: best };
}

// --- geometry ---------------------------------------------------------------

function buildShaft(group) {
  const wallMat = stoneMaterial(9, 7);

  // The shaft is solid but for the door at the base and the doorway on top.
  const norm = (a) => {
    let v = a % TWO_PI;
    if (v < 0) v += TWO_PI;
    return v;
  };
  const gaps = [
    { angle: norm(TOWER.doorAngle), half: TOWER.doorHalfAngle, y0: 0, y1: TOWER.doorHeight },
    {
      angle: EXIT_ANGLE + (EXIT_ARC_START + EXIT_ARC_END) / 2,
      half: (EXIT_ARC_END - EXIT_ARC_START) / 2,
      y0: TOWER.exitHeight - 1.5,
      y1: TOWER.exitHeight + 2.1,
    },
    {
      angle: norm(TOP_DOOR_ANGLE),
      half: TOWER.topDoorHalfAngle,
      y0: TOWER.deckY - 2.6,
      y1: TOWER.deckY,
    },
  ];

  // Full-height bands between the openings.
  const sorted = [...gaps].sort((a, b) => a.angle - b.angle);
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const next = sorted[(i + 1) % sorted.length];
    const a0 = cur.angle + cur.half;
    const a1 = next.angle - next.half + (i === sorted.length - 1 ? TWO_PI : 0);
    if (a1 - a0 < 0.02) continue;
    const arc = arcParams(a0, a1);
    const seg = Math.max(4, Math.round((arc.thetaLength / TWO_PI) * 30));
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(
        TOWER.outerRadius, TOWER.outerRadius, TOWER.height,
        seg, 1, true, arc.thetaStart, arc.thetaLength
      ),
      wallMat
    );
    band.position.y = TOWER.height / 2;
    group.add(band);
  }

  // Wall above and below each opening.
  for (const gap of gaps) {
    const arc = arcParams(gap.angle - gap.half, gap.angle + gap.half);
    if (gap.y0 > 0.02) {
      const below = new THREE.Mesh(
        new THREE.CylinderGeometry(
          TOWER.outerRadius, TOWER.outerRadius, gap.y0, 6, 1, true,
          arc.thetaStart, arc.thetaLength
        ), wallMat
      );
      below.position.y = gap.y0 / 2;
      group.add(below);
    }
    const aboveH = TOWER.height - gap.y1;
    if (aboveH > 0.02) {
      const above = new THREE.Mesh(
        new THREE.CylinderGeometry(
          TOWER.outerRadius, TOWER.outerRadius, aboveH, 6, 1, true,
          arc.thetaStart, arc.thetaLength
        ), wallMat
      );
      above.position.y = gap.y1 + aboveH / 2;
      group.add(above);
    }
  }

  // Flared plinth at the base.
  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(
      TOWER.outerRadius, TOWER.baseRadius, TOWER.plinthHeight, 30, 1, true
    ),
    stoneMaterial(10, 1.2)
  );
  plinth.position.y = TOWER.plinthHeight / 2;
  group.add(plinth);

  // Slit windows up the shaft.
  const slitMat = new THREE.MeshStandardMaterial({
    color: 0x1b1a2a, emissive: 0x2c3358, emissiveIntensity: 0.5, roughness: 1,
  });
  for (const sl of [
    { a: TOWER.doorAngle + 2.4, y: 6.2 },
    { a: TOWER.doorAngle - 2.2, y: 11.4 },
    { a: TOWER.doorAngle + 1.1, y: 15.6 },
  ]) {
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.42), slitMat);
    slit.position.set(
      Math.cos(sl.a) * (TOWER.outerRadius - 0.12), sl.y, Math.sin(sl.a) * (TOWER.outerRadius - 0.12)
    );
    slit.rotation.y = -sl.a;
    group.add(slit);
  }
}

/** An arched stone opening, used for both the base door and the top doorway. */
function buildArchedOpening(group, angle, halfAngle, sillY, height) {
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x565049, flatShading: true, roughness: 1,
  });
  const blocks = 7;
  for (let i = 0; i < blocks; i++) {
    const t = i / (blocks - 1);
    const spread = (t - 0.5) * halfAngle * 1.9;
    const lift = Math.cos((t - 0.5) * Math.PI) * 0.42;
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.42, 0.36), frameMat);
    const ba = angle + spread;
    block.position.set(
      Math.cos(ba) * (TOWER.outerRadius - 0.05),
      sillY + height - 0.5 + lift,
      Math.sin(ba) * (TOWER.outerRadius - 0.05)
    );
    block.rotation.set(0, -ba, (t - 0.5) * 0.75);
    group.add(block);
  }
  // No dark panel across the opening: it used to fill the doorway edge to
  // edge, which made the entrance read as a solid slab rather than a way in.
}

function buildStairs(group) {
  const rise = stepRise();
  const stepAngle = TWO_PI / TOWER.stepsPerTurn;
  const dummy = new THREE.Object3D();

  const stoneStepMat = stoneMaterial(1.6, 0.8, 0xa9a294);
  // The lower flight is carpentry, not masonry — a timber stair fitted into
  // the shaft, which is how these towers are usually built out inside.
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0x6b4d31, flatShading: true, roughness: 1,
  });
  const timberDark = new THREE.MeshStandardMaterial({
    color: 0x533b26, flatShading: true, roughness: 1,
  });

  const totalSteps = Math.floor(TOWER.deckY / rise);
  const inner = [];
  const outer = [];
  for (let i = 1; i <= totalSteps; i++) {
    (i * rise <= TOWER.exitHeight ? inner : outer).push(i);
  }

  const innerMid = (TOWER.innerStairInner + TOWER.innerStairOuter) / 2;
  const innerWidth = TOWER.innerStairOuter - TOWER.innerStairInner;
  const outerMid = (TOWER.stairInner + TOWER.stairOuter) / 2;
  const outerWidth = TOWER.stairOuter - TOWER.stairInner;

  const makeFlight = (list, mid, width, mat, thickness) => {
    if (!list.length) return;
    const depth = mid * stepAngle * 1.4;
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(width, thickness, depth), mat, list.length
    );
    list.forEach((i, idx) => {
      const a = STAIR_START_ANGLE + i * stepAngle;
      dummy.position.set(Math.cos(a) * mid, i * rise - thickness / 2, Math.sin(a) * mid);
      dummy.rotation.set(0, -a, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  };

  makeFlight(inner, innerMid, innerWidth, timberMat, rise * 0.55);
  makeFlight(outer, outerMid, outerWidth, stoneStepMat, rise * 1.9);

  // Blocky timber railing on the inside flight: square newel posts carrying a
  // chunky square rail, rather than anything wrought or delicate.
  if (inner.length) {
    const railR = TOWER.innerStairInner + 0.16; // open side, over the well
    const railH = 1.0;
    const postEvery = 2;
    const postList = inner.filter((i) => i % postEvery === 0);
    const posts = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.14, railH, 0.14), timberDark, postList.length
    );
    postList.forEach((i, idx) => {
      const a = STAIR_START_ANGLE + i * stepAngle;
      dummy.position.set(Math.cos(a) * railR, i * rise + railH / 2, Math.sin(a) * railR);
      dummy.rotation.set(0, -a, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      posts.setMatrixAt(idx, dummy.matrix);
    });
    posts.instanceMatrix.needsUpdate = true;
    group.add(posts);

    const railPts = [];
    for (let i = inner[0]; i <= inner[inner.length - 1]; i += 0.5) {
      const a = STAIR_START_ANGLE + i * stepAngle;
      railPts.push(new THREE.Vector3(
        Math.cos(a) * railR, i * rise + railH, Math.sin(a) * railR
      ));
    }
    if (railPts.length > 1) {
      group.add(new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(railPts), railPts.length * 3, 0.055, 8, false
        ),
        timberMat
      ));
    }
  }

  // Matching rail on the outside flight, in weathered timber.
  if (outer.length) {
    const railR = TOWER.stairOuter - 0.16;
    const railH = 0.92;
    const postEvery = 2;
    const postList = outer.filter((i) => i % postEvery === 0);
    const posts = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.1, railH, 0.1), timberDark, postList.length
    );
    postList.forEach((i, idx) => {
      const a = STAIR_START_ANGLE + i * stepAngle;
      dummy.position.set(Math.cos(a) * railR, i * rise + railH / 2, Math.sin(a) * railR);
      dummy.rotation.set(0, -a, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      posts.setMatrixAt(idx, dummy.matrix);
    });
    posts.instanceMatrix.needsUpdate = true;
    group.add(posts);

    const railPts = [];
    for (let i = outer[0]; i <= outer[outer.length - 1]; i += 0.5) {
      const a = STAIR_START_ANGLE + i * stepAngle;
      railPts.push(new THREE.Vector3(
        Math.cos(a) * railR, i * rise + railH, Math.sin(a) * railR
      ));
    }
    if (railPts.length > 1) {
      group.add(new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(railPts), railPts.length * 3, 0.05, 8, false
        ),
        timberMat
      ));
    }
  }

  // The last few treads flatten into a rough landing where the stair meets the
  // gallery, its outer edge left jagged like broken stone rather than cut true.
  const landingSteps = 6;
  const landingY = TOWER.deckY;
  for (let k = 0; k < landingSteps; k++) {
    const a = ARRIVE_ANGLE - (landingSteps - k) * stepAngle * 0.9;
    const jag = 0.18 + Math.random() * 0.5;
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(outerWidth * (0.8 + Math.random() * 0.35), 0.34, outerMid * stepAngle * 1.5),
      stoneStepMat
    );
    slab.position.set(
      Math.cos(a) * (outerMid + jag * 0.3), landingY - 0.17, Math.sin(a) * (outerMid + jag * 0.3)
    );
    slab.rotation.set((Math.random() - 0.5) * 0.05, -a, (Math.random() - 0.5) * 0.05);
    group.add(slab);
  }
}

function buildDeck(group) {
  const deckY = TOWER.deckY;

  // Room floor over the shaft.
  const roomFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(TOWER.outerRadius, TOWER.outerRadius, 0.5, 26),
    stoneMaterial(7, 7)
  );
  roomFloor.position.y = deckY - 0.25;
  group.add(roomFloor);

  // Gallery ring with the stairwell opening cut out of it.
  const gapC = DECK_GAP_CENTER;
  const gapH = DECK_GAP_HALF;
  const galleryArc = arcParams(gapC + gapH, gapC - gapH + TWO_PI);
  const gallery = new THREE.Mesh(
    new THREE.CylinderGeometry(
      TOWER.deckRadius, TOWER.deckRadius, 0.5, 30, 1, false,
      galleryArc.thetaStart, galleryArc.thetaLength
    ),
    stoneMaterial(9, 9)
  );
  gallery.position.y = deckY - 0.25;
  group.add(gallery);

  const railMat = new THREE.MeshStandardMaterial({
    color: 0x2b2b30, roughness: 0.65, metalness: 0.45,
  });

  // Railing around the gallery rim, following the same opening.
  const rimPts = [];
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const a = gapC + gapH + (i / steps) * (TWO_PI - gapH * 2);
    rimPts.push(new THREE.Vector3(
      Math.cos(a) * (TOWER.deckRadius - 0.18), deckY + 1.0, Math.sin(a) * (TOWER.deckRadius - 0.18)
    ));
  }
  group.add(new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts), 140, 0.055, 6, false), railMat
  ));
  for (let i = 0; i <= steps; i += 3) {
    const a = gapC + gapH + (i / steps) * (TWO_PI - gapH * 2);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.0, 6), railMat);
    post.position.set(
      Math.cos(a) * (TOWER.deckRadius - 0.18), deckY + 0.5, Math.sin(a) * (TOWER.deckRadius - 0.18)
    );
    group.add(post);
  }

  // Waist-high stone parapet ringing the top room, broken only by its doorway.
  // The pillars stand on this ledge, and the gaps between them are the windows.
  const parapetArc = arcParams(
    TOP_DOOR_ANGLE + TOWER.topDoorHalfAngle,
    TOP_DOOR_ANGLE - TOWER.topDoorHalfAngle + TWO_PI
  );
  const parapet = new THREE.Mesh(
    new THREE.CylinderGeometry(
      TOWER.outerRadius, TOWER.outerRadius, TOWER.parapetHeight, 28, 1, true,
      parapetArc.thetaStart, parapetArc.thetaLength
    ),
    stoneMaterial(11, 0.5)
  );
  parapet.position.y = deckY + TOWER.parapetHeight / 2;
  group.add(parapet);

  // Coping course along the top of the ledge.
  const coping = new THREE.Mesh(
    new THREE.CylinderGeometry(
      TOWER.outerRadius + 0.14, TOWER.outerRadius + 0.14, 0.18, 28, 1, true,
      parapetArc.thetaStart, parapetArc.thetaLength
    ),
    stoneMaterial(11, 0.2, 0x9a9284)
  );
  coping.position.y = deckY + TOWER.parapetHeight + 0.09;
  group.add(coping);

  // Pillars rising from the ledge, with the openings between them as windows.
  const pierMat = stoneMaterial(1.4, 2.4);
  const pierHeight = TOWER.roofHeight - 0.4; // roofHeight was raised for headroom
  const pierBase = deckY + TOWER.parapetHeight + 0.18;
  const piers = 8;
  for (let i = 0; i < piers; i++) {
    const a = TOP_DOOR_ANGLE + 0.75 + (i / piers) * (TWO_PI - 1.5);
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.62, pierHeight, 0.62), pierMat);
    pier.position.set(
      Math.cos(a) * (TOWER.outerRadius - 0.08),
      pierBase + pierHeight / 2,
      Math.sin(a) * (TOWER.outerRadius - 0.08)
    );
    pier.rotation.y = -a;
    group.add(pier);
  }

  // Timber roof over the room.
  const roofY = pierBase + pierHeight;
  const eave = new THREE.Mesh(
    new THREE.CylinderGeometry(TOWER.outerRadius + 1.7, TOWER.outerRadius + 1.7, 0.4, 26),
    new THREE.MeshStandardMaterial({ color: 0x4b3b2c, flatShading: true, roughness: 1 })
  );
  eave.position.y = roofY + 0.17;
  group.add(eave);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(TOWER.outerRadius + 2.0, 3.0, 26),
    new THREE.MeshStandardMaterial({ color: 0x3f3125, flatShading: true, roughness: 1 })
  );
  roof.position.y = roofY + 1.8;
  group.add(roof);
}

function buildLights(group) {
  const lights = [];
  const sconceMat = new THREE.MeshBasicMaterial({ color: 0xffb454, fog: false });
  const spots = [
    { a: TOWER.doorAngle + 0.2, r: TOWER.outerRadius - 0.7, y: 2.4 },
    { a: STAIR_START_ANGLE + 2.6, r: TOWER.stairOuter - 0.4, y: 8.0 },
    { a: TOP_DOOR_ANGLE - 0.5, r: TOWER.outerRadius - 0.9, y: TOWER.deckY + 2.0 },
  ];
  for (const sp of spots) {
    const sconce = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 1), sconceMat);
    sconce.position.set(Math.cos(sp.a) * sp.r, sp.y, Math.sin(sp.a) * sp.r);
    group.add(sconce);
    const light = new THREE.PointLight(0xffb454, 8, 17, 1.7);
    light.position.copy(sconce.position);
    group.add(light);
    lights.push(light);
  }
  return lights;
}

export function createTower() {
  const group = new THREE.Group();
  group.name = 'tower';
  group.position.set(TOWER.center.x, TOWER_FLOOR_Y, TOWER.center.z);

  // Footing sinks well below grade: its top face used to sit exactly at ground
  // level, and the two coplanar surfaces flickered as you walked up.
  const footing = new THREE.Mesh(
    new THREE.CylinderGeometry(TOWER.baseRadius, TOWER.baseRadius + 0.9, 3.0, 28),
    stoneMaterial(11, 1.1)
  );
  footing.position.y = -1.4;
  group.add(footing);

  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(TOWER.outerRadius, TOWER.outerRadius, 0.4, 26),
    stoneMaterial(7, 7, 0x8f887c)
  );
  floor.position.y = 0.06;
  group.add(floor);

  buildShaft(group);
  buildArchedOpening(group, TOWER.doorAngle, TOWER.doorHalfAngle, 0, TOWER.doorHeight);
  buildArchedOpening(group, TOP_DOOR_ANGLE, TOWER.topDoorHalfAngle, TOWER.deckY - 2.6, 2.6);
  buildStairs(group);
  buildDeck(group);
  const lights = buildLights(group);

  return { group, lights };
}
