import * as THREE from 'three';
import { HIDDEN_SECTION } from './world-layout.js';
import { getGroundHeight } from './terrain.js';

// ---------------------------------------------------------------------------
// The campfire in the hidden clearing. It is the only light source out here,
// so it has to do the work of finding the place as well as lighting it: the
// glow through the trees is what tells you there's something back there.
// ---------------------------------------------------------------------------

const EMBER_COLOR = 0xff7a2a;
const FLAME_COLOR = 0xffb347;

function radialTexture(stops) {
  const size = 96;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCampfire() {
  const group = new THREE.Group();
  group.name = 'campfire';
  const { x, z } = HIDDEN_SECTION.position;
  const baseY = getGroundHeight(x, z);
  group.position.set(x, baseY, z);

  // Ring of stones.
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x6b665e, flatShading: true, roughness: 1,
  });
  const ringCount = 11;
  for (let i = 0; i < ringCount; i++) {
    const a = (i / ringCount) * Math.PI * 2 + Math.random() * 0.2;
    const r = 1.05 + Math.random() * 0.12;
    const s = 0.17 + Math.random() * 0.12;
    const stone = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), stoneMat);
    stone.scale.set(s, s * 0.75, s);
    stone.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    stone.position.set(Math.cos(a) * r, s * 0.4, Math.sin(a) * r);
    group.add(stone);
  }

  // Ash bed.
  const ash = new THREE.Mesh(
    new THREE.CircleGeometry(0.95, 14),
    new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 1 })
  );
  ash.rotation.x = -Math.PI / 2;
  ash.position.y = 0.03;
  group.add(ash);

  // Logs leaned into a cone.
  const logMat = new THREE.MeshStandardMaterial({
    color: 0x4a3323, flatShading: true, roughness: 1,
  });
  const charMat = new THREE.MeshStandardMaterial({
    color: 0x1e1a17, flatShading: true, roughness: 1,
  });
  const logCount = 5;
  for (let i = 0; i < logCount; i++) {
    const a = (i / logCount) * Math.PI * 2 + 0.3;
    const log = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.1, 1.25, 5),
      i % 2 === 0 ? logMat : charMat
    );
    log.position.set(Math.cos(a) * 0.32, 0.5, Math.sin(a) * 0.32);
    log.rotation.set(Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5);
    group.add(log);
  }
  // One log fallen flat across the edge.
  const fallen = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.5, 5), logMat);
  fallen.rotation.set(0, 0.7, Math.PI / 2);
  fallen.position.set(0.15, 0.1, 0.5);
  group.add(fallen);

  // Embers glowing in the ash.
  const emberTex = radialTexture([
    [0, 'rgba(255,240,190,1)'],
    [0.3, 'rgba(255,140,50,0.75)'],
    [1, 'rgba(255,90,20,0)'],
  ]);
  const emberCount = 26;
  const emberPos = new Float32Array(emberCount * 3);
  const emberPhase = [];
  for (let i = 0; i < emberCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.7;
    emberPos[i * 3] = Math.cos(a) * r;
    emberPos[i * 3 + 1] = 0.08 + Math.random() * 0.12;
    emberPos[i * 3 + 2] = Math.sin(a) * r;
    emberPhase.push({ base: emberPos[i * 3 + 1], speed: 0.4 + Math.random() * 1.4, off: Math.random() * 6 });
  }
  const emberGeo = new THREE.BufferGeometry();
  const emberAttr = new THREE.BufferAttribute(emberPos, 3);
  emberAttr.setUsage(THREE.DynamicDrawUsage);
  emberGeo.setAttribute('position', emberAttr);
  const embers = new THREE.Points(emberGeo, new THREE.PointsMaterial({
    map: emberTex, size: 0.16, sizeAttenuation: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, fog: true,
  }));
  embers.frustumCulled = false;
  group.add(embers);

  // Flame: a few stacked billboards that breathe.
  const flameTex = radialTexture([
    [0, 'rgba(255,250,220,0.95)'],
    [0.25, 'rgba(255,180,80,0.6)'],
    [0.6, 'rgba(255,110,30,0.22)'],
    [1, 'rgba(200,60,10,0)'],
  ]);
  const flames = [];
  for (let i = 0; i < 3; i++) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flameTex, color: FLAME_COLOR, blending: THREE.AdditiveBlending,
      depthWrite: false, transparent: true, fog: true,
    }));
    sprite.position.y = 0.5 + i * 0.28;
    sprite.scale.setScalar(1.5 - i * 0.3);
    group.add(sprite);
    flames.push({ sprite, base: 1.5 - i * 0.3, off: i * 1.9 });
  }

  const light = new THREE.PointLight(EMBER_COLOR, 16, 26, 1.7);
  light.position.y = 0.85;
  group.add(light);

  // A soft ground-level glow so the clearing reads from between the trees.
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: flameTex, color: 0xff8c3a, blending: THREE.AdditiveBlending,
    depthWrite: false, transparent: true, opacity: 0.35, fog: true,
  }));
  glow.scale.setScalar(6);
  glow.position.y = 0.7;
  group.add(glow);

  function update(elapsed) {
    // Firelight never sits still: two offset sines plus a fast tremor.
    const flicker =
      1 + Math.sin(elapsed * 3.1) * 0.13 + Math.sin(elapsed * 9.7) * 0.07 +
      Math.sin(elapsed * 21.3) * 0.03;
    light.intensity = 16 * flicker;

    flames.forEach((f, i) => {
      const s = f.base * (0.86 + 0.2 * Math.sin(elapsed * (4.2 + i) + f.off));
      f.sprite.scale.set(s * 0.8, s, 1);
      f.sprite.material.opacity = 0.7 + 0.3 * Math.sin(elapsed * (5.5 + i) + f.off);
    });
    glow.material.opacity = 0.28 + 0.12 * Math.sin(elapsed * 2.4);

    const arr = emberAttr.array;
    for (let i = 0; i < emberCount; i++) {
      const p = emberPhase[i];
      const t = (elapsed * p.speed + p.off) % 3;
      arr[i * 3 + 1] = p.base + t * 0.55;      // drift upward
      arr[i * 3] += Math.sin(elapsed * 2 + p.off) * 0.002;
    }
    emberAttr.needsUpdate = true;
  }

  return { group, update };
}
