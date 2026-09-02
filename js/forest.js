import * as THREE from 'three';
import {
  distanceToVisiblePath,
  distanceToNearestClearingEdge,
  WORLD_MIN_X,
  WORLD_MAX_X,
  WORLD_MIN_Z,
  WORLD_MAX_Z,
} from './world-layout.js';
import { getGroundHeight } from './terrain.js';

// ---------------------------------------------------------------------------
// The forest. Rather than one pine shape repeated, there are several species
// with different silhouettes, mixed by weight — a monoculture of identical
// cones reads as wallpaper, and the eye picks that up immediately.
// ---------------------------------------------------------------------------

export const treeColliders = []; // { x, z, radius } — consumed by walkable.js

const TRUNK_TONES = [0x53402e, 0x4a382a, 0x5d4733, 0x453427];
const CONIFER_TONES = [0x2e5741, 0x3b6650, 0x35594c, 0x274c3a, 0x436e55];
const BROADLEAF_TONES = [0x3f5c39, 0x4a6840, 0x54703f, 0x3a5535];
const DEAD_TONES = [0x4b4238, 0x554a3e];
const ROCK_COLOR = new THREE.Color(0x6e6a62);
const BUSH_COLORS = [0x3a5740, 0x44614a, 0x4a6a50, 0x35533f].map((c) => new THREE.Color(c));

// Each species describes a trunk and a set of foliage tiers, in units that get
// multiplied by a per-instance scale.
const SPECIES = [
  {
    name: 'spire',            // tall, narrow, crowded-canopy pine
    weight: 0.3,
    trunk: { top: 0.09, bottom: 0.19, height: 3.0 },
    palette: CONIFER_TONES,
    tiers: [
      { radius: 1.25, height: 2.6, y: 3.1, sides: 7 },
      { radius: 1.0, height: 2.3, y: 4.7, sides: 7 },
      { radius: 0.72, height: 2.0, y: 6.1, sides: 7 },
      { radius: 0.42, height: 1.6, y: 7.3, sides: 6 },
    ],
    scale: [0.85, 1.4],
  },
  {
    name: 'broad-fir',        // classic wide fir
    weight: 0.28,
    trunk: { top: 0.11, bottom: 0.24, height: 2.1 },
    palette: CONIFER_TONES,
    tiers: [
      { radius: 1.75, height: 2.4, y: 2.7, sides: 8 },
      { radius: 1.3, height: 2.0, y: 4.2, sides: 8 },
      { radius: 0.8, height: 1.7, y: 5.4, sides: 7 },
    ],
    scale: [0.8, 1.25],
  },
  {
    name: 'squat',            // short, bushy, wind-beaten
    weight: 0.16,
    trunk: { top: 0.1, bottom: 0.22, height: 1.1 },
    palette: CONIFER_TONES,
    tiers: [
      { radius: 1.6, height: 1.7, y: 1.5, sides: 7 },
      { radius: 1.1, height: 1.4, y: 2.5, sides: 6 },
    ],
    scale: [0.7, 1.15],
  },
  {
    name: 'broadleaf',        // rounded deciduous canopy
    weight: 0.16,
    trunk: { top: 0.16, bottom: 0.28, height: 3.4 },
    palette: BROADLEAF_TONES,
    blobs: [
      { radius: 1.5, y: 4.3, detail: 0 },
      { radius: 1.05, y: 5.4, detail: 0 },
      { radius: 0.95, y: 3.7, detail: 0, offset: 1.0 },
    ],
    scale: [0.85, 1.3],
  },
  {
    name: 'snag',             // dead standing trunk, no canopy
    weight: 0.1,
    trunk: { top: 0.07, bottom: 0.26, height: 4.6 },
    palette: DEAD_TONES,
    tiers: [],
    scale: [0.7, 1.2],
  },
];

function pickSpecies() {
  const r = Math.random();
  let acc = 0;
  for (const s of SPECIES) {
    acc += s.weight;
    if (r <= acc) return s;
  }
  return SPECIES[0];
}

function scatterPoints({ count, pathClearance, clearingClearance, minSpacing, placed, maxAttempts }) {
  const points = [];
  let attempts = 0;
  const limit = maxAttempts ?? count * 40;
  while (points.length < count && attempts < limit) {
    attempts++;
    const x = WORLD_MIN_X + Math.random() * (WORLD_MAX_X - WORLD_MIN_X);
    const z = WORLD_MIN_Z + Math.random() * (WORLD_MAX_Z - WORLD_MIN_Z);

    if (distanceToVisiblePath(x, z) < pathClearance) continue;
    if (distanceToNearestClearingEdge(x, z) < clearingClearance) continue;

    let tooClose = false;
    for (let i = 0; i < placed.length; i++) {
      const dx = placed[i][0] - x;
      const dz = placed[i][1] - z;
      if (dx * dx + dz * dz < minSpacing * minSpacing) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    points.push([x, z]);
    placed.push([x, z]);
  }
  return points;
}

function instanced(geometry, count, color) {
  const material = new THREE.MeshStandardMaterial({
    flatShading: true, roughness: 1, metalness: 0,
  });
  if (color !== undefined) material.color.setHex(color);
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  return mesh;
}

export function createForest() {
  const group = new THREE.Group();
  group.name = 'forest';
  const placed = [];
  treeColliders.length = 0;

  const treePoints = scatterPoints({
    count: 900,
    pathClearance: 3.4,
    clearingClearance: 3.0,
    minSpacing: 1.5,
    placed,
  });

  // Sort every tree into its species first, so each species can fill its own
  // instanced meshes in one pass.
  const buckets = new Map(SPECIES.map((s) => [s.name, { species: s, items: [] }]));
  for (const [x, z] of treePoints) {
    const species = pickSpecies();
    const [lo, hi] = species.scale;
    buckets.get(species.name).items.push({
      x, z,
      scale: lo + Math.random() * (hi - lo),
      rotY: Math.random() * Math.PI * 2,
      leanX: (Math.random() - 0.5) * 0.05,
      leanZ: (Math.random() - 0.5) * 0.05,
      tint: species.palette[(Math.random() * species.palette.length) | 0],
    });
  }

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  for (const { species, items } of buckets.values()) {
    if (!items.length) continue;

    const trunkGeo = new THREE.CylinderGeometry(
      species.trunk.top, species.trunk.bottom, species.trunk.height, 6
    );
    const trunks = instanced(trunkGeo, items.length);
    trunks.name = `trunks-${species.name}`;

    const tierMeshes = (species.tiers || []).map((tier, idx) => {
      const mesh = instanced(new THREE.ConeGeometry(tier.radius, tier.height, tier.sides), items.length);
      mesh.name = `${species.name}-tier-${idx}`;
      return mesh;
    });
    const blobMeshes = (species.blobs || []).map((blob, idx) => {
      const mesh = instanced(new THREE.IcosahedronGeometry(blob.radius, blob.detail), items.length);
      mesh.name = `${species.name}-blob-${idx}`;
      return mesh;
    });

    items.forEach((item, i) => {
      const groundY = getGroundHeight(item.x, item.z);
      const s = item.scale;
      dummy.rotation.set(item.leanX, item.rotY, item.leanZ);
      dummy.scale.setScalar(s);

      dummy.position.set(item.x, groundY + species.trunk.height * 0.5 * s, item.z);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      trunks.setColorAt(i, tint.setHex(TRUNK_TONES[(Math.random() * TRUNK_TONES.length) | 0]));

      tint.setHex(item.tint);
      (species.tiers || []).forEach((tier, t) => {
        dummy.position.set(item.x, groundY + tier.y * s, item.z);
        dummy.updateMatrix();
        tierMeshes[t].setMatrixAt(i, dummy.matrix);
        tierMeshes[t].setColorAt(i, tint);
      });
      (species.blobs || []).forEach((blob, bIdx) => {
        const off = blob.offset || 0;
        dummy.position.set(
          item.x + Math.cos(item.rotY + bIdx) * off * s,
          groundY + blob.y * s,
          item.z + Math.sin(item.rotY + bIdx) * off * s
        );
        dummy.scale.set(s, s * 0.85, s);
        dummy.updateMatrix();
        blobMeshes[bIdx].setMatrixAt(i, dummy.matrix);
        blobMeshes[bIdx].setColorAt(i, tint);
        dummy.scale.setScalar(s);
      });

      treeColliders.push({ x: item.x, z: item.z, radius: species.trunk.bottom * s + 0.34 });
    });

    [trunks, ...tierMeshes, ...blobMeshes].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      group.add(mesh);
    });
  }

  // --- rocks -----------------------------------------------------------
  const rockPoints = scatterPoints({
    count: 90, pathClearance: 1.5, clearingClearance: 1.4, minSpacing: 1.7, placed,
  });
  const rocks = instanced(new THREE.IcosahedronGeometry(1, 0), rockPoints.length);
  rocks.material.color.copy(ROCK_COLOR);
  rocks.name = 'rocks';
  rockPoints.forEach(([x, z], i) => {
    const groundY = getGroundHeight(x, z);
    const scale = 0.2 + Math.random() * 0.26;
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    dummy.scale.set(scale * (0.8 + Math.random() * 0.4), scale * 0.7, scale * (0.8 + Math.random() * 0.4));
    dummy.position.set(x, groundY + scale * 0.3, z);
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  });
  rocks.instanceMatrix.needsUpdate = true;
  group.add(rocks);

  // --- undergrowth ------------------------------------------------------
  const bushPoints = scatterPoints({
    count: 220, pathClearance: 1.8, clearingClearance: 1.7, minSpacing: 1.1, placed,
  });
  const bushes = instanced(new THREE.IcosahedronGeometry(0.6, 0), bushPoints.length);
  bushes.name = 'bushes';
  bushPoints.forEach(([x, z], i) => {
    const groundY = getGroundHeight(x, z);
    const scale = 0.4 + Math.random() * 0.5;
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.set(scale, scale * (0.6 + Math.random() * 0.5), scale);
    dummy.position.set(x, groundY + 0.3 * scale, z);
    dummy.updateMatrix();
    bushes.setMatrixAt(i, dummy.matrix);
    bushes.setColorAt(i, BUSH_COLORS[(Math.random() * BUSH_COLORS.length) | 0]);
  });
  bushes.instanceMatrix.needsUpdate = true;
  if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true;
  group.add(bushes);

  return group;
}
