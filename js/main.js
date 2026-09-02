import * as THREE from 'three';
import { createSceneSetup } from './sceneSetup.js';
import { createTerrain } from './terrain.js';
import { createForest } from './forest.js';
import { refreshColliders } from './walkable.js';
import { createSigns } from './signs.js';
import { createFireflies } from './fireflies.js';
import { createLanternLights } from './lanternLights.js';
import { createTower, TOWER_FLOOR_Y } from './tower.js';
import { createCampfire } from './campfire.js';
import { TOWER } from './world-layout.js';
import { createControls } from './controls.js';
import { createInteraction } from './interaction.js';
import { createUI } from './ui.js';

const canvas = document.getElementById('scene');
const lookLayer = document.getElementById('look-layer');
const joystickBase = document.getElementById('joystick');
const joystickKnob = document.getElementById('joystick-knob');

const { scene, camera, renderer } = createSceneSetup(canvas);

scene.add(createTerrain());
scene.add(createForest());
refreshColliders(); // trunk positions only exist once the forest is generated

const tower = createTower();
scene.add(tower.group);

const campfire = createCampfire();
scene.add(campfire.group);

const { group: signGroup, registry: signRegistry } = createSigns();
scene.add(signGroup);

const fireflies = createFireflies();
scene.add(fireflies.mesh);

const lanternLights = createLanternLights(signRegistry);
scene.add(lanternLights.group);

const controls = createControls({ camera, lookLayer, joystickBase, joystickKnob });

let started = false;

const ui = createUI({
  signRegistry,
  onPanelClose: () => interaction.closePanel(),
  onPromptActivate: () => interaction.openNearest(),
});

const interaction = createInteraction({ camera, signRegistry, controls, ui });

if (controls.isTouch) {
  document.body.classList.add('is-touch');
} else {
  lookLayer.addEventListener('lockchange', (e) => {
    // Only nag about re-locking while the player is actually walking around.
    ui.setLockHint(started && !e.detail.locked && !interaction.isPanelOpen());
  });
}

// Deep links: yoursite.com/#projects drops the visitor at the Projects
// clearing with the panel already open, so the site is still shareable.
function requestedSign() {
  const id = window.location.hash.replace('#', '');
  return signRegistry.find((s) => s.id === id) || null;
}

ui.updateDiscoveryCount(0);
ui.playIntro(() => {
  started = true;

  const target = requestedSign();
  if (target) {
    if (target.inTower) {
      // Stand where the stair tops out, which is the way the sign is facing.
      const spot = target.approachPoint;
      controls.teleportTo(
        spot.x, spot.z, target.position.x, target.position.z, TOWER_FLOOR_Y + TOWER.deckY
      );
    } else {
      // Stand a few steps back down the offshoot so the sign stays visible.
      const back = target.junction
        ? target.position.clone().sub(target.junction)
        : new THREE.Vector3(0, 0, 1);
      const dir = back.setY(0).normalize();
      controls.teleportTo(
        target.position.x - dir.x * 3.4,
        target.position.z - dir.z * 3.4,
        target.position.x,
        target.position.z
      );
    }
    interaction.openSign(target);
    return;
  }

  if (!controls.isTouch) controls.requestLock();
});

// Hand-rolled clock: THREE.Clock is deprecated in recent three.js releases,
// and this keeps the vendored dependency list to three files.
const startTime = performance.now();
let lastTime = startTime;

function frame() {
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.1); // clamp so tab-switching doesn't teleport you
  const elapsed = (now - startTime) / 1000;
  lastTime = now;

  if (started) {
    controls.update(dt);
    interaction.update();

    const state = controls.getState();
    ui.updateCompass(state.x, state.z, state.yaw, interaction.visited);
  }

  fireflies.update(elapsed);
  campfire.update(elapsed);
  lanternLights.update(camera.position, elapsed);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

frame();
