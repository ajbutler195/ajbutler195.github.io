import * as THREE from 'three';
import {
  nearestPathInfo,
  distanceToNearestPath,
  distanceToNearestClearingEdge,
  PATH_WIDTH,
  WORLD_MIN_X,
  WORLD_MAX_X,
  WORLD_MIN_Z,
  WORLD_MAX_Z,
} from './world-layout.js';

// ---------------------------------------------------------------------------
// Tiny self-contained value-noise (no external noise library needed).
// Deterministic hash -> smooth 2D noise -> a few octaves summed (fbm).
// ---------------------------------------------------------------------------
function hash2(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function smoothLerp(a, b, t) {
  const ft = t * t * (3 - 2 * t);
  return a + (b - a) * ft;
}
function valueNoise(x, z) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const h00 = hash2(xi, zi);
  const h10 = hash2(xi + 1, zi);
  const h01 = hash2(xi, zi + 1);
  const h11 = hash2(xi + 1, zi + 1);
  const top = smoothLerp(h00, h10, xf);
  const bottom = smoothLerp(h01, h11, xf);
  return smoothLerp(top, bottom, zf); // 0..1
}
export function fbm(x, z, octaves = 3) {
  let total = 0;
  let amp = 0.5;
  let freq = 1;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    total += valueNoise(x * freq, z * freq) * amp;
    max += amp;
    amp *= 0.5;
    freq *= 2.17;
  }
  return total / max; // 0..1
}
function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// ---------------------------------------------------------------------------
// Height field: gentle rolling hills, flattened to (near) zero along the
// dirt paths and inside clearings so signs sit level and walking feels calm.
// ---------------------------------------------------------------------------
const HILL_AMPLITUDE = 2.3;
const HILL_SCALE = 0.045;

export function getGroundHeight(x, z) {
  const raw = fbm(x * HILL_SCALE, z * HILL_SCALE) * 2 - 1; // -1..1
  let height = raw * HILL_AMPLITUDE;

  const pathDist = distanceToNearestPath(x, z);
  const pathFlatten = smoothstep(PATH_WIDTH * 0.5, PATH_WIDTH * 2.4, pathDist);

  const clearingDist = distanceToNearestClearingEdge(x, z);
  const clearingFlatten = smoothstep(-2, 6, clearingDist);

  height *= Math.min(pathFlatten, clearingFlatten);
  return height;
}

// ---------------------------------------------------------------------------
// Mesh: low segment density for a faceted look, vertex-painted moss / dirt.
// ---------------------------------------------------------------------------
const MOSS_A = new THREE.Color(0x46573f);
const MOSS_B = new THREE.Color(0x556a49);
const DIRT = new THREE.Color(0xa8895f);
const DIRT_EDGE = new THREE.Color(0x7d6547);
const CLEARING_FLOOR = new THREE.Color(0x6b7a52);

export function createTerrain() {
  const pad = 30;
  const width = WORLD_MAX_X - WORLD_MIN_X + pad * 2;
  const depth = WORLD_MAX_Z - WORLD_MIN_Z + pad * 2;
  const centerX = (WORLD_MIN_X + WORLD_MAX_X) / 2;
  const centerZ = (WORLD_MIN_Z + WORLD_MAX_Z) / 2;
  // ~1.3m between vertices, enough to hold the path edges without a huge mesh.
  const segX = Math.round(width / 1.3);
  const segZ = Math.round(depth / 1.3);
  const geometry = new THREE.PlaneGeometry(width, depth, segX, segZ);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(centerX, 0, centerZ);

  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, getGroundHeight(x, z));

    const pathInfo = nearestPathInfo(x, z);
    const pathDist = pathInfo.dist;
    const clearingDist = distanceToNearestClearingEdge(x, z);

    const mossMix = hash2(x * 0.6 + 100, z * 0.6 - 40);
    c.copy(MOSS_A).lerp(MOSS_B, mossMix);

    if (clearingDist < 3) {
      c.lerp(CLEARING_FLOOR, 1 - smoothstep(-3, 3, clearingDist));
    }

    // Hidden traces are narrower and barely tinted, so they don't advertise.
    const width = pathInfo.hidden ? PATH_WIDTH * 0.34 : PATH_WIDTH;
    const strength = pathInfo.hidden ? 0.3 : 1;
    const pathCore = (1 - smoothstep(0, width * 0.5, pathDist)) * strength;
    const pathT = (1 - smoothstep(width * 0.5, width * 1.15, pathDist)) * strength;
    if (pathT > 0) {
      c.lerp(DIRT_EDGE, pathT);
      c.lerp(DIRT, pathCore);
    }

    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  pos.needsUpdate = true;
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 1,
    metalness: 0,
    fog: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'terrain';
  return mesh;
}
