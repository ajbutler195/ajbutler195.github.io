// ---------------------------------------------------------------------------
// Watches the distance from the player to every sign each frame. When the
// player is close enough to one, shows the read prompt; opening a panel
// pauses movement and releases pointer lock so the mouse is free again.
// ---------------------------------------------------------------------------

export function createInteraction({ camera, signRegistry, controls, ui }) {
  const visited = new Set();
  let nearest = null;
  let panelOpen = false;

  function update() {
    if (panelOpen) return;

    let closest = null;
    let closestDist = Infinity;
    for (const sign of signRegistry) {
      const dx = camera.position.x - sign.position.x;
      const dz = camera.position.z - sign.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > sign.activationRadius || dist >= closestDist) continue;
      // Height matters inside the tower: the Contact sign sits on the landing,
      // directly above the floor you walk in on.
      if (Math.abs(camera.position.y - sign.activationY) > 3.2) continue;
      closest = sign;
      closestDist = dist;
    }

    if (closest !== nearest) {
      nearest = closest;
      if (nearest) ui.showPrompt(nearest, controls.isTouch);
      else ui.hidePrompt();
    }
  }

  function openSign(sign) {
    if (!sign || panelOpen) return;
    const isNew = !visited.has(sign.id);
    visited.add(sign.id);

    panelOpen = true;
    controls.setMovementEnabled(false);
    ui.hidePrompt();
    ui.openPanel(sign.id);
    // Keep the address bar in sync so any panel can be linked to directly.
    history.replaceState(null, '', `#${sign.id}`);

    const mainCount = [...visited].filter((id) => id !== 'secret').length;
    ui.updateDiscoveryCount(mainCount);
    if (isNew && sign.id === 'secret') ui.celebrateSecretFound();
  }

  function closePanel() {
    if (!panelOpen) return;
    panelOpen = false;
    controls.setMovementEnabled(true);
    ui.closePanel();
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE' && nearest && !panelOpen) openNearest();
    if (e.code === 'Escape' && panelOpen) closePanel();
  });

  function openNearest() {
    openSign(nearest);
  }

  return {
    update,
    openSign,
    openNearest,
    closePanel,
    visited,
    isPanelOpen: () => panelOpen,
  };
}
