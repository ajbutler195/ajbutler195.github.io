import * as THREE from 'three';

// ---------------------------------------------------------------------------
// WORLD LAYOUT
// One main trail running north, with diagonal offshoots left and right leading
// to the section clearings, and a stone tower at the far end holding Contact.
// This is the single source of truth for "where things are" — terrain, trees,
// signs, collision and the compass all read from here.
// ---------------------------------------------------------------------------

// Deterministic RNG so the offshoot jitter is randomised but stable between
// reloads; the terrain, tree scatter and signs must all agree on the layout.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260827);

export const EYE_HEIGHT = 1.7;
export const PATH_WIDTH = 4.0;        // width of the visible dirt
export const WALKABLE_HALF_WIDTH = 2.7; // how far off the centreline you may stray
export const CLEARING_SIZE = 8;
export const SIGN_ACTIVATION_RADIUS = 6;

// --- the main trail ---------------------------------------------------------
export const TRAIL_START = new THREE.Vector3(0, 0, -6);
export const TRAIL_END = new THREE.Vector3(0, 0, 96);

// --- the tower at the end ---------------------------------------------------
// A narrow fieldstone observation tower: flared plinth, slit windows, a stair
// that starts inside and breaks out through the wall to wrap the exterior,
// finishing at a covered deck on top.
export const TOWER = {
  center: new THREE.Vector3(0, 0, 103),
  outerRadius: 4.2,        // main shaft (also the collision radius)
  baseRadius: 5.2,         // flared plinth at the bottom
  plinthHeight: 3.2,
  wallThickness: 0.55,
  height: 15.6,            // top of the shaft = deck level
  doorAngle: -Math.PI / 2, // faces back down the trail
  doorHalfAngle: 0.185,   // ~1.55m opening — a doorway, not a gap in the wall
  doorHeight: 2.9,

  // One continuous spiral, outside the tower for its whole length, arriving
  // at the gallery on top.
  risePerTurn: 5.2,
  stepsPerTurn: 20,
  // Lower flight is inside the shaft (timber), then it breaks out through the
  // wall and climbs the outside in stone to the gallery.
  exitHeight: 8.32,
  innerStairInner: 1.35,
  innerStairOuter: 3.5,
  stairInner: 4.25,
  stairOuter: 5.9,
  stairStartOffset: 0.95,   // where the flight leaves the ground, beside the door
  topDoorHalfAngle: 0.42,   // the doorway from the gallery into the top room

  // Kept just wider than the shaft so the outside flight never runs underneath
  // the deck — otherwise your head clips up through the floor as you arrive.
  deckRadius: 4.45,      // barely past the shaft — the gallery ring is gone
  parapetHeight: 1.05,   // waist-high ledge the roof pillars stand on
  roofHeight: 5.4,
};
TOWER.deckY = TOWER.height;
TOWER.topY = TOWER.deckY; // where the Contact sign stands

// --- world extents ----------------------------------------------------------
export const WORLD_MIN_X = -52;
export const WORLD_MAX_X = 46;
export const WORLD_MIN_Z = -18;
export const WORLD_MAX_Z = 136;

// --- offshoot sections ------------------------------------------------------
// Each branches diagonally off the main trail. Angle and length are jittered so
// the trail doesn't read as a repeating pattern.
const OFFSHOOTS = [
  { id: 'about', label: 'About Me', atZ: 20, side: -1 },
  { id: 'projects', label: 'Projects', atZ: 39, side: 1 },
  { id: 'skills', label: 'Skills', atZ: 58, side: -1 },
  { id: 'experience', label: 'Experience', atZ: 77, side: 1 },
];

export const SECTIONS = OFFSHOOTS.map((o) => {
  const junction = new THREE.Vector3(0, 0, o.atZ + (rand() - 0.5) * 4);
  // Diagonal: roughly 50–68° off the main axis, jittered per offshoot.
  const spread = (50 + rand() * 18) * (Math.PI / 180);
  const length = 17 + rand() * 6;
  const dirX = Math.sin(spread) * o.side;
  const dirZ = Math.cos(spread);
  const position = new THREE.Vector3(
    junction.x + dirX * length,
    0,
    junction.z + dirZ * length
  );
  return {
    id: o.id,
    label: o.label,
    junction,
    position,
    hidden: false,
    clearingSize: CLEARING_SIZE,
    activationRadius: SIGN_ACTIVATION_RADIUS,
    activationY: 0, // ground level
  };
});

// Contact lives at the top of the tower, so its "position" is the tower centre
// but it only activates once the visitor has actually climbed up there.
export const TOWER_SECTION = {
  id: 'contact',
  label: 'Contact',
  position: TOWER.center.clone(),
  hidden: false,
  clearingSize: TOWER.outerRadius + 5,
  activationRadius: 4.6,
  activationY: TOWER.topY,
  inTower: true,
};

// The hidden clearing sits behind the tower and off to the left, through the
// trees. The path to it is barely a path, and nothing out there is lit except
// the campfire.
const secretJunction = new THREE.Vector3(-4.5, 0, TOWER.center.z + 5.5);
const secretPosition = new THREE.Vector3(-27, 0, TOWER.center.z + 13);

// The campfire sits at the centre of the clearing; the board stands a few
// paces off to the side so the two don't occupy the same ground.
const secretApproach = secretPosition.clone().sub(secretJunction).setY(0).normalize();
const secretSide = new THREE.Vector3(-secretApproach.z, 0, secretApproach.x);

export const HIDDEN_SECTION = {
  id: 'secret',
  label: 'Fun Facts',
  junction: secretJunction,
  position: secretPosition,
  signPosition: secretPosition
    .clone()
    .addScaledVector(secretSide, 3.1)
    .addScaledVector(secretApproach, -1.2),
  hidden: true,
  clearingSize: 6,
  activationRadius: 5,
  activationY: 0,
};

export const ALL_SECTIONS = [...SECTIONS, TOWER_SECTION, HIDDEN_SECTION];

// Clearings that flatten terrain and repel trees. The tower gets one too.
export const CLEARINGS = [
  ...SECTIONS.map((s) => ({ position: s.position, size: s.clearingSize })),
  { position: HIDDEN_SECTION.position, size: HIDDEN_SECTION.clearingSize },
  { position: TOWER.center, size: TOWER.outerRadius + 4 },
];

// --- path segments ----------------------------------------------------------
export const PATH_SEGMENTS = [
  { a: TRAIL_START, b: TRAIL_END, hidden: false, main: true },
  ...SECTIONS.map((s) => ({ a: s.junction, b: s.position, hidden: false, main: false })),
  { a: secretJunction, b: secretPosition, hidden: true, main: false },
];

function distancePointToSegment(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const apx = px - ax;
  const apz = pz - az;
  const abLenSq = abx * abx + abz * abz;
  let t = abLenSq > 0 ? (apx * abx + apz * abz) / abLenSq : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + abx * t;
  const cz = az + abz * t;
  return Math.hypot(px - cx, pz - cz);
}

/** Shortest distance from (x,z) to any path centreline. */
export function distanceToNearestPath(x, z) {
  let min = Infinity;
  for (const seg of PATH_SEGMENTS) {
    const d = distancePointToSegment(x, z, seg.a.x, seg.a.z, seg.b.x, seg.b.z);
    if (d < min) min = d;
  }
  return min;
}

/**
 * Distance to the *maintained* trails only. The route to the campfire is
 * deliberately excluded, so the ground isn't worn bare along it and the trees
 * are free to grow across it — it should read as a way through, not a path.
 */
export function distanceToVisiblePath(x, z) {
  let min = Infinity;
  for (const seg of PATH_SEGMENTS) {
    if (seg.hidden) continue;
    const d = distancePointToSegment(x, z, seg.a.x, seg.a.z, seg.b.x, seg.b.z);
    if (d < min) min = d;
  }
  return min;
}

/**
 * Nearest path, and whether it's a hidden one. The terrain paints hidden
 * traces far more faintly — they should read as somewhere people have walked,
 * not as a marked route.
 */
export function nearestPathInfo(x, z) {
  let min = Infinity;
  let hidden = false;
  for (const seg of PATH_SEGMENTS) {
    const d = distancePointToSegment(x, z, seg.a.x, seg.a.z, seg.b.x, seg.b.z);
    if (d < min) {
      min = d;
      hidden = !!seg.hidden;
    }
  }
  return { dist: min, hidden };
}

/** Distance to the edge of the nearest clearing (negative when inside one). */
export function distanceToNearestClearingEdge(x, z) {
  let min = Infinity;
  for (const c of CLEARINGS) {
    const d = Math.hypot(x - c.position.x, z - c.position.z) - c.size;
    if (d < min) min = d;
  }
  return min;
}

export function clampToWorldBounds(x, z, margin = 2) {
  return [
    Math.min(Math.max(x, WORLD_MIN_X + margin), WORLD_MAX_X - margin),
    Math.min(Math.max(z, WORLD_MIN_Z + margin), WORLD_MAX_Z - margin),
  ];
}
