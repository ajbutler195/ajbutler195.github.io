import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Six signs once meant six point lights, which is more than a mobile GPU
// wants to shade every fragment. Instead: a fixed pool of three lights that
// get parked on whichever lanterns are nearest the player. The count never
// changes, so three.js never has to recompile shaders mid-walk, and it looks
// identical — a lantern further away than its own falloff radius contributed
// nothing anyway.
// ---------------------------------------------------------------------------

const POOL_SIZE = 3;
const COLOR = 0xffb454;
const RANGE = 16;

export function createLanternLights(signRegistry) {
  const group = new THREE.Group();
  group.name = 'lantern-lights';

  const lights = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    const light = new THREE.PointLight(COLOR, 0, RANGE, 1.7);
    light.position.set(0, -100, 0); // parked below the world until assigned
    group.add(light);
    lights.push(light);
  }

  const scratch = [];

  function update(playerPosition, elapsed) {
    scratch.length = 0;
    for (const sign of signRegistry) {
      if (!sign.bulb) continue; // the hidden board has no lamp
      const dx = playerPosition.x - sign.lightAnchor.x;
      const dz = playerPosition.z - sign.lightAnchor.z;
      scratch.push({ sign, dist: Math.hypot(dx, dz) });
    }
    scratch.sort((a, b) => a.dist - b.dist);

    for (let i = 0; i < POOL_SIZE; i++) {
      const light = lights[i];
      const entry = scratch[i];
      if (!entry || entry.dist > RANGE * 2.2) {
        light.intensity = 0;
        continue;
      }
      light.position.copy(entry.sign.lightAnchor);
      // Small irregular flicker so the signs feel lit rather than lamped.
      const base = entry.sign.hidden ? 6.5 : 5.5;
      const seed = i * 1.7 + (entry.sign.hidden ? 3.1 : 0);
      light.intensity =
        base + Math.sin(elapsed * 2.1 + seed) * 0.65 + Math.sin(elapsed * 7.3 + seed) * 0.28;
    }
  }

  return { group, update };
}
