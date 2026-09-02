import * as THREE from 'three';
import { EYE_HEIGHT } from './world-layout.js';

export const FOG_COLOR = 0x4b4368;
const FOG_DENSITY = 0.016;

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function createSkyDome() {
  const geo = new THREE.SphereGeometry(290, 24, 16);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  const low = new THREE.Color(0x241a3a);
  const horizonColor = new THREE.Color(0x8a6478);
  const upper = new THREE.Color(0x2c2350);
  const top = new THREE.Color(0x120c22);

  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const h = pos.getY(i) / 290; // -1..1
    if (h < 0.06) {
      c.copy(low).lerp(horizonColor, smoothstep(-0.5, 0.06, h));
    } else if (h < 0.4) {
      c.copy(horizonColor).lerp(upper, smoothstep(0.06, 0.4, h));
    } else {
      c.copy(upper).lerp(top, smoothstep(0.4, 1.0, h));
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false });
  const dome = new THREE.Mesh(geo, mat);
  dome.name = 'sky-dome';
  return dome;
}

// A painted panorama of distant ridges, sitting at the horizon inside the sky
// dome. From the ground the forest hides it; from the top of the tower it gives
// the view somewhere to land, instead of the world simply stopping.
// Beyond the forest the ground simply ends. Filling that band with water reads
// as a lake running out to the far hills, rather than as the world stopping.
function createWater() {
  // A ring, not a disc. As a full disc it spanned the whole playable area and
  // could sit between the camera and the ground; as a ring starting beyond the
  // furthest terrain it can only ever fill the gap out to the hills.
  const water = new THREE.Mesh(
    new THREE.RingGeometry(150, 248, 64, 1),
    new THREE.MeshStandardMaterial({
      color: 0x2d3352,
      roughness: 0.18,
      metalness: 0.45,
      fog: true,
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(-3, -3.6, 59); // centred on the world, below the lowest ground
  water.name = 'water';
  return water;
}

function createHorizonPanorama() {
  const W = 2048;
  const H = 384;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  // Receding ridge lines: each further range is paler and higher up the frame,
  // which is what sells distance more than detail does.
  const ranges = [
    { base: 0.52, amp: 26, rough: 5, color: '#6d5f86', alpha: 0.55 },
    { base: 0.60, amp: 34, rough: 4, color: '#5b5076', alpha: 0.7 },
    { base: 0.70, amp: 46, rough: 3, color: '#463c5e', alpha: 0.85 },
    { base: 0.82, amp: 58, rough: 2, color: '#2f2842', alpha: 1 },
  ];

  for (const range of ranges) {
    ctx.globalAlpha = range.alpha;
    ctx.fillStyle = range.color;
    ctx.beginPath();
    ctx.moveTo(0, H);
    const baseY = H * range.base;
    let y = baseY;
    const seedA = Math.random() * 100;
    for (let x = 0; x <= W; x += 8) {
      const t = x / W;
      // Sum a few sine waves for a ridgeline that doesn't repeat obviously.
      const ridge =
        Math.sin(t * Math.PI * 2 * range.rough + seedA) * range.amp +
        Math.sin(t * Math.PI * 2 * (range.rough * 2.7) + seedA * 1.7) * range.amp * 0.4 +
        Math.sin(t * Math.PI * 2 * (range.rough * 5.3) + seedA * 0.6) * range.amp * 0.16;
      y = baseY - ridge;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Haze pooling in the valleys, and a soft fade into the sky at the top.
  const haze = ctx.createLinearGradient(0, 0, 0, H);
  haze.addColorStop(0, 'rgba(120,104,150,0)');
  haze.addColorStop(0.22, 'rgba(118,102,148,0.32)');
  haze.addColorStop(0.5, 'rgba(103,90,132,0.14)');
  haze.addColorStop(1, 'rgba(60,52,84,0.5)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, W, H);

  // Feather the very top of the texture to nothing, so the rim of the
  // cylinder can't show as a seam against the sky dome.
  ctx.globalCompositeOperation = 'destination-out';
  const fade = ctx.createLinearGradient(0, 0, 0, H * 0.3);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, W, H * 0.3);
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

function createHorizon() {
  const radius = 250;
  const height = 96;
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 64, 1, true),
    new THREE.MeshBasicMaterial({
      map: createHorizonPanorama(),
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      fog: false, // must stay clear of the fog, or the distance reads as soup
    })
  );
  mesh.position.y = height * 0.32;
  mesh.renderOrder = -1;
  mesh.name = 'horizon';
  return mesh;
}

function createMoonHalo() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(226,230,255,0.55)');
  g.addColorStop(0.35, 'rgba(196,204,246,0.18)');
  g.addColorStop(1, 'rgba(170,182,236,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createMoon() {
  const group = new THREE.Group();
  group.name = 'moon';
  // Sits beyond and to the left of the tower, so it hangs behind the
  // silhouette as you walk up the trail.
  group.position.set(-118, 104, 236);

  const disc = new THREE.Mesh(
    new THREE.SphereGeometry(10, 18, 14),
    new THREE.MeshBasicMaterial({ color: 0xd8daea, fog: false })
  );
  group.add(disc);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createMoonHalo(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    fog: false,
  }));
  halo.scale.setScalar(78);
  group.add(halo);

  return group;
}

function createStars() {
  const count = 170;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.4;
    const r = 275;
    positions[i * 3] = Math.cos(theta) * Math.sin(phi) * r;
    positions[i * 3 + 1] = Math.cos(phi) * r * 0.85 + 55;
    positions[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xf5f2ff,
    size: 1.6,
    sizeAttenuation: false,
    fog: false,
    transparent: true,
    opacity: 0.8,
  });
  const stars = new THREE.Points(geo, mat);
  stars.name = 'stars';
  return stars;
}

export function createSceneSetup(canvas) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(FOG_COLOR, FOG_DENSITY);
  scene.background = new THREE.Color(FOG_COLOR);

  const camera = new THREE.PerspectiveCamera(
    62,
    window.innerWidth / window.innerHeight,
    0.1,
    420
  );
  camera.rotation.order = 'YXZ'; // yaw then pitch — prevents FPS-look roll drift
  camera.position.set(0, EYE_HEIGHT, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  const coarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  scene.add(createSkyDome());
  scene.add(createWater());
  scene.add(createHorizon());
  scene.add(createMoon());
  scene.add(createStars());

  // Sky-to-ground fill. Carries most of the visibility: without it the woods
  // read as flat black silhouettes and the dirt path disappears.
  const hemi = new THREE.HemisphereLight(0x7a6ea8, 0x3a4432, 2.1);
  scene.add(hemi);

  // Key light from the moon, which sits back-left, so trunks catch a cool rim.
  const moonLight = new THREE.DirectionalLight(0xbcc6e8, 1.5);
  moonLight.position.set(-118, 104, 236);
  scene.add(moonLight);

  // A weak warm bounce from the horizon glow, opposite the moon.
  const horizonBounce = new THREE.DirectionalLight(0xb98aa0, 0.5);
  horizonBounce.position.set(80, 14, -90);
  scene.add(horizonBounce);

  const ambient = new THREE.AmbientLight(0x4c4470, 0.55);
  scene.add(ambient);

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);

  return { scene, camera, renderer };
}
