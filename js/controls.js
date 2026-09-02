import * as THREE from 'three';
import { EYE_HEIGHT, clampToWorldBounds, TRAIL_END } from './world-layout.js';
import { getGroundHeight } from './terrain.js';
import { getWalkSurface } from './walkable.js';

const WALK_SPEED = 7;
const RUN_SPEED = 12;
const MOUSE_SENSITIVITY = 0.0022;
const TOUCH_LOOK_SENSITIVITY = 0.0055;
const PITCH_LIMIT = Math.PI / 2 - 0.05;

export function isTouchDevice() {
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
  return 'ontouchstart' in window && navigator.maxTouchPoints > 0;
}

function initialYaw() {
  // Face straight up the trail. Camera forward for a yaw is (-sin, -cos), so
  // invert the direction we want to look in.
  const dir = new THREE.Vector3(TRAIL_END.x, 0, TRAIL_END.z).normalize();
  return Math.atan2(-dir.x, -dir.z);
}

export function createControls({ camera, lookLayer, joystickBase, joystickKnob }) {
  const touch = isTouchDevice();

  let yaw = initialYaw();
  let pitch = 0;
  let posX = 0;
  let posZ = 0;
  let eyeY = EYE_HEIGHT;
  let movementEnabled = true;
  let locked = false;

  const keys = { forward: false, back: false, left: false, right: false, run: false };

  // ---- desktop: keyboard -------------------------------------------
  function onKeyDown(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        keys.back = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        keys.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        keys.run = true;
        break;
      default:
        break;
    }
  }
  function onKeyUp(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        keys.back = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        keys.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        keys.run = false;
        break;
      default:
        break;
    }
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // ---- desktop: pointer lock + mouse look ---------------------------
  function requestLock() {
    if (touch || !movementEnabled) return;
    if (lookLayer.requestPointerLock) lookLayer.requestPointerLock();
  }
  function onPointerLockChange() {
    locked = document.pointerLockElement === lookLayer;
    lookLayer.dispatchEvent(new CustomEvent('lockchange', { detail: { locked } }));
  }
  function onMouseMove(e) {
    if (!locked || !movementEnabled) return;
    yaw -= e.movementX * MOUSE_SENSITIVITY;
    pitch -= e.movementY * MOUSE_SENSITIVITY;
    pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
  }
  if (!touch) {
    lookLayer.addEventListener('click', requestLock);
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mousemove', onMouseMove);
  }

  // ---- touch: joystick (movement) -----------------------------------
  let joystickTouchId = null;
  let joystickVec = { x: 0, y: 0 }; // x = strafe, y = forward
  const JOY_RADIUS = 46;

  function joystickStart(e) {
    if (joystickTouchId !== null) return;
    const t = e.changedTouches[0];
    joystickTouchId = t.identifier;
    updateJoystick(t);
    e.preventDefault();
  }
  function updateJoystick(t) {
    const rect = joystickBase.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = t.clientX - cx;
    let dy = t.clientY - cy;
    const dist = Math.min(JOY_RADIUS, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    dx = Math.cos(angle) * dist;
    dy = Math.sin(angle) * dist;
    joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    joystickVec.x = dx / JOY_RADIUS;
    joystickVec.y = -dy / JOY_RADIUS;
  }
  function joystickMove(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === joystickTouchId) {
        updateJoystick(t);
        e.preventDefault();
      }
    }
  }
  function joystickEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === joystickTouchId) {
        joystickTouchId = null;
        joystickVec = { x: 0, y: 0 };
        joystickKnob.style.transform = 'translate(0px, 0px)';
      }
    }
  }
  if (touch) {
    joystickBase.addEventListener('touchstart', joystickStart, { passive: false });
    joystickBase.addEventListener('touchmove', joystickMove, { passive: false });
    joystickBase.addEventListener('touchend', joystickEnd);
    joystickBase.addEventListener('touchcancel', joystickEnd);
  }

  // ---- touch: drag to look -------------------------------------------
  let lookTouchId = null;
  let lastLookX = 0;
  let lastLookY = 0;

  function lookStart(e) {
    if (!movementEnabled) return;
    const t = e.changedTouches[0];
    if (lookTouchId !== null) return;
    lookTouchId = t.identifier;
    lastLookX = t.clientX;
    lastLookY = t.clientY;
  }
  function lookMove(e) {
    if (!movementEnabled) return;
    for (const t of e.changedTouches) {
      if (t.identifier === lookTouchId) {
        const dx = t.clientX - lastLookX;
        const dy = t.clientY - lastLookY;
        lastLookX = t.clientX;
        lastLookY = t.clientY;
        yaw -= dx * TOUCH_LOOK_SENSITIVITY;
        pitch -= dy * TOUCH_LOOK_SENSITIVITY;
        pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
        e.preventDefault();
      }
    }
  }
  function lookEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === lookTouchId) lookTouchId = null;
    }
  }
  if (touch) {
    lookLayer.addEventListener('touchstart', lookStart, { passive: true });
    lookLayer.addEventListener('touchmove', lookMove, { passive: false });
    lookLayer.addEventListener('touchend', lookEnd);
    lookLayer.addEventListener('touchcancel', lookEnd);
  }

  // ---- movement with collision -------------------------------------------
  let surfaceY = getGroundHeight(0, 0);

  function tryMove(stepX, stepZ) {
    if (stepX === 0 && stepZ === 0) return false;
    const [cx, cz] = clampToWorldBounds(posX + stepX, posZ + stepZ);
    const surface = getWalkSurface(cx, cz, surfaceY);
    if (!surface.ok) return false;
    posX = cx;
    posZ = cz;
    surfaceY = surface.y;
    return true;
  }

  // ---- per-frame update ------------------------------------------------
  function update(dt) {
    if (movementEnabled) {
      let moveForward = 0;
      let moveRight = 0;
      if (touch) {
        moveForward = joystickVec.y;
        moveRight = joystickVec.x;
      } else {
        if (keys.forward) moveForward += 1;
        if (keys.back) moveForward -= 1;
        if (keys.right) moveRight += 1;
        if (keys.left) moveRight -= 1;
      }

      const len = Math.hypot(moveForward, moveRight);
      if (len > 0.001) {
        const norm = Math.max(len, 1); // analog joystick may be < 1; cap diagonals at 1
        moveForward /= norm;
        moveRight /= norm;

        const forwardX = -Math.sin(yaw);
        const forwardZ = -Math.cos(yaw);
        const rightX = Math.cos(yaw);
        const rightZ = -Math.sin(yaw);

        const speed = (keys.run ? RUN_SPEED : WALK_SPEED) * dt;
        const stepX = (forwardX * moveForward + rightX * moveRight) * speed;
        const stepZ = (forwardZ * moveForward + rightZ * moveRight) * speed;

        // Try the full move; if something blocks it, slide along each axis in
        // turn so brushing a trunk or a wall grazes past instead of stopping dead.
        if (!tryMove(stepX, stepZ)) {
          if (!tryMove(stepX, 0)) tryMove(0, stepZ);
        }
      }
    }

    const targetEyeY = surfaceY + EYE_HEIGHT;
    eyeY += (targetEyeY - eyeY) * Math.min(1, dt * 12);

    camera.position.set(posX, eyeY, posZ);
    camera.rotation.x = pitch;
    camera.rotation.y = yaw;
  }

  function setMovementEnabled(enabled) {
    movementEnabled = enabled;
    if (!enabled && locked) document.exitPointerLock();
  }

  function getState() {
    return { x: posX, z: posZ, y: surfaceY, yaw, locked, touch };
  }

  /** Place the walker at (x, z), optionally turned to face (faceX, faceZ). */
  function teleportTo(x, z, faceX, faceZ, y) {
    [posX, posZ] = clampToWorldBounds(x, z);
    if (typeof faceX === 'number' && typeof faceZ === 'number') {
      const dx = faceX - posX;
      const dz = faceZ - posZ;
      if (Math.hypot(dx, dz) > 0.001) {
        const len = Math.hypot(dx, dz);
        yaw = Math.atan2(-dx / len, -dz / len);
        pitch = 0;
      }
    }
    const landing = getWalkSurface(posX, posZ, y ?? getGroundHeight(posX, posZ));
    surfaceY = landing.ok ? landing.y : getGroundHeight(posX, posZ);
    eyeY = surfaceY + EYE_HEIGHT;
    camera.position.set(posX, eyeY, posZ);
    camera.rotation.x = pitch;
    camera.rotation.y = yaw;
  }

  return { update, setMovementEnabled, getState, teleportTo, requestLock, isTouch: touch };
}
