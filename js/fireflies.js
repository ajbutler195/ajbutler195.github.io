import * as THREE from 'three';
import { WORLD_MIN_X, WORLD_MAX_X, WORLD_MIN_Z, WORLD_MAX_Z, PATH_SEGMENTS } from './world-layout.js';
import { getGroundHeight } from './terrain.js';

// ---------------------------------------------------------------------------
// Fireflies were originally low-poly icosahedra, which up close read as hard
// green hexagons rather than points of light. They are now additive sprites
// with a soft radial falloff, drawn from a small generated texture.
// ---------------------------------------------------------------------------

const AMBIENT_COUNT = 110;
const TRAIL_COUNT = 24;

function createGlowTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0.0, 'rgba(255, 250, 214, 1)');
  grad.addColorStop(0.18, 'rgba(226, 240, 150, 0.85)');
  grad.addColorStop(0.45, 'rgba(180, 214, 110, 0.28)');
  grad.addColorStop(1.0, 'rgba(150, 190, 90, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeFireflyData(x, z) {
  return {
    baseX: x,
    baseZ: z,
    baseY: getGroundHeight(x, z) + 0.6 + Math.random() * 1.8,
    phase: Math.random() * Math.PI * 2,
    freq: 0.25 + Math.random() * 0.35,
    wander: 0.8 + Math.random() * 1.6,
  };
}

export function createFireflies() {
  const data = [];

  for (let i = 0; i < AMBIENT_COUNT; i++) {
    const x = WORLD_MIN_X + Math.random() * (WORLD_MAX_X - WORLD_MIN_X);
    const z = WORLD_MIN_Z + Math.random() * (WORLD_MAX_Z - WORLD_MIN_Z);
    data.push(makeFireflyData(x, z));
  }

  // A trail of fireflies along the hidden branch path — a soft visual hint
  // that something is worth following off the main route.
  const branch = PATH_SEGMENTS.find((s) => s.hidden);
  if (branch) {
    for (let i = 0; i < TRAIL_COUNT; i++) {
      const t = Math.random();
      const x = THREE.MathUtils.lerp(branch.a.x, branch.b.x, t) + (Math.random() - 0.5) * 3;
      const z = THREE.MathUtils.lerp(branch.a.z, branch.b.z, t) + (Math.random() - 0.5) * 3;
      const fd = makeFireflyData(x, z);
      fd.baseY = getGroundHeight(x, z) + 0.4 + Math.random() * 1.2;
      data.push(fd);
    }
  }

  const positions = new Float32Array(data.length * 3);
  data.forEach((fd, i) => {
    positions[i * 3] = fd.baseX;
    positions[i * 3 + 1] = fd.baseY;
    positions[i * 3 + 2] = fd.baseZ;
  });

  const geometry = new THREE.BufferGeometry();
  const positionAttr = new THREE.BufferAttribute(positions, 3);
  positionAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', positionAttr);

  const material = new THREE.PointsMaterial({
    map: createGlowTexture(),
    size: 0.5,
    sizeAttenuation: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: true,
  });

  const mesh = new THREE.Points(geometry, material);
  mesh.name = 'fireflies';
  mesh.frustumCulled = false;

  function update(elapsed) {
    const arr = positionAttr.array;
    for (let i = 0; i < data.length; i++) {
      const fd = data[i];
      arr[i * 3] = fd.baseX + Math.sin(elapsed * fd.freq + fd.phase) * fd.wander;
      arr[i * 3 + 1] = fd.baseY + Math.sin(elapsed * fd.freq * 1.4 + fd.phase) * 0.4;
      arr[i * 3 + 2] = fd.baseZ + Math.cos(elapsed * fd.freq * 0.8 + fd.phase) * fd.wander;
    }
    positionAttr.needsUpdate = true;

    // Collective slow breathing — cheaper than per-point opacity and reads
    // the same at a glance.
    material.opacity = 0.7 + 0.3 * Math.sin(elapsed * 0.8);
  }

  return { mesh, update };
}
