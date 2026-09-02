import { TOWER, WORLD_MIN_X, WORLD_MAX_X, WORLD_MIN_Z, WORLD_MAX_Z } from './world-layout.js';
import { getGroundHeight } from './terrain.js';
import { TOWER_FLOOR_Y, towerSurface } from './tower.js';
import { treeColliders } from './forest.js';

// ---------------------------------------------------------------------------
// Where the visitor is allowed to stand.
//
// The forest is open ground: you may wander anywhere. What stops you is solid
// things — tree trunks, and the tower's walls and drops. An earlier version
// also fenced you onto the trail, but that put invisible walls across gaps
// between trees, which felt worse than being blocked by anything you could see.
// ---------------------------------------------------------------------------

export const MAX_STEP_UP = 0.7;
export const MAX_STEP_DOWN = 1.4;

// A coarse spatial grid over the trunks. Testing ~900 trees per frame would be
// wasteful; this narrows it to the handful in neighbouring cells.
const CELL = 6;
let grid = null;

function buildGrid() {
  grid = new Map();
  for (const t of treeColliders) {
    const key = `${Math.floor(t.x / CELL)},${Math.floor(t.z / CELL)}`;
    let cell = grid.get(key);
    if (!cell) grid.set(key, (cell = []));
    cell.push(t);
  }
}

/** Rebuild the collision grid — call after the forest is generated. */
export function refreshColliders() {
  grid = null;
}

function hitsTree(x, z, playerRadius) {
  if (!grid) buildGrid();
  const cx = Math.floor(x / CELL);
  const cz = Math.floor(z / CELL);
  for (let ix = cx - 1; ix <= cx + 1; ix++) {
    for (let iz = cz - 1; iz <= cz + 1; iz++) {
      const cell = grid.get(`${ix},${iz}`);
      if (!cell) continue;
      for (const t of cell) {
        const reach = t.radius + playerRadius;
        const dx = x - t.x;
        const dz = z - t.z;
        if (dx * dx + dz * dz < reach * reach) return true;
      }
    }
  }
  return false;
}

/**
 * Can the visitor stand at (x, z) given their current height?
 * Returns { ok, y } where y is the height of the floor beneath them.
 */
export function getWalkSurface(x, z, currentY, playerRadius = 0.34) {
  if (x < WORLD_MIN_X || x > WORLD_MAX_X || z < WORLD_MIN_Z || z > WORLD_MAX_Z) {
    return { ok: false };
  }

  // The tower owns everything within its footprint, at every height.
  const tower = towerSurface(x, z, currentY);
  if (tower) return tower;

  if (hitsTree(x, z, playerRadius)) return { ok: false };

  const y = getGroundHeight(x, z);
  if (y - currentY > MAX_STEP_UP) return { ok: false };
  if (currentY - y > MAX_STEP_DOWN) return { ok: false }; // don't step off the tower
  return { ok: true, y };
}
