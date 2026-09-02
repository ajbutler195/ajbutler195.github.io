import { animate, createTimeline, stagger, utils } from 'animejs';
import { CONTENT } from './content.js';
import { SECTIONS } from './world-layout.js';

const prefersReducedMotion =
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const esc = (str) =>
  String(str).replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])
  );

// ---------------------------------------------------------------------------
// Panel markup — one builder per section shape
// ---------------------------------------------------------------------------
function panelHeader(data) {
  return `
    <p class="panel__eyebrow" data-reveal>${esc(data.eyebrow)}</p>
    <h2 class="panel__title" data-reveal>${esc(data.title)}</h2>`;
}

const BUILDERS = {
  about(d) {
    return `
      ${panelHeader(d)}
      ${d.body.map((p) => `<p class="panel__prose" data-reveal>${esc(p)}</p>`).join('')}
      <dl class="fact-list" data-reveal>
        ${d.facts
          .map(
            (f) => `
          <div class="fact">
            <dt>${esc(f.label)}</dt>
            <dd>${esc(f.value)}</dd>
          </div>`
          )
          .join('')}
      </dl>`;
  },

  projects(d) {
    return `
      ${panelHeader(d)}
      <ul class="project-list">
        ${d.items
          .map(
            (p) => `
          <li class="project" data-reveal>
            <a class="project__link" href="${esc(p.url)}"${
              p.url && p.url !== '#' ? ' target="_blank" rel="noopener noreferrer"' : ''
            }>
              <h3 class="project__name">${esc(p.name)}</h3>
              <p class="project__desc">${esc(p.description)}</p>
              <ul class="tag-row">${p.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
            </a>
          </li>`
          )
          .join('')}
      </ul>`;
  },

  skills(d) {
    return `
      ${panelHeader(d)}
      ${d.groups
        .map(
          (g) => `
        <section class="skill-group" data-reveal>
          <h3 class="skill-group__label">${esc(g.label)}</h3>
          <ul class="skill-row">${g.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
        </section>`
        )
        .join('')}`;
  },

  experience(d) {
    return `
      ${panelHeader(d)}
      <ol class="timeline">
        ${d.roles
          .map(
            (r) => `
          <li class="role" data-reveal>
            <p class="role__period">${esc(r.period)}</p>
            <h3 class="role__title">${esc(r.role)}</h3>
            <p class="role__org">${esc(r.org)}</p>
            <ul class="role__points">${r.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
          </li>`
          )
          .join('')}
      </ol>
      ${
        d.resumeUrl
          ? `<a class="panel__cta" data-reveal href="${esc(
              d.resumeUrl
            )}" target="_blank" rel="noopener noreferrer">Download resume</a>`
          : ''
      }`;
  },

  contact(d) {
    return `
      ${panelHeader(d)}
      <p class="panel__prose" data-reveal>${esc(d.intro)}</p>
      <ul class="contact-list">
        ${d.links
          .map(
            (l) => `
          <li class="contact-item" data-reveal>
            <span class="contact-item__label">${esc(l.label)}</span>
            <a class="contact-item__value" href="${esc(l.href)}"${
              l.href.startsWith('http') ? ' target="_blank" rel="noopener noreferrer"' : ''
            }>${esc(l.value)}</a>
          </li>`
          )
          .join('')}
      </ul>`;
  },

  secret(d) {
    return `
      ${panelHeader(d)}
      <p class="panel__prose" data-reveal>${esc(d.intro)}</p>
      <ul class="fun-facts">
        ${d.facts.map((f) => `<li data-reveal>${esc(f)}</li>`).join('')}
      </ul>`;
  },
};

export function createUI({ signRegistry, onPanelClose, onPromptActivate }) {
  const intro = document.getElementById('intro');
  const introButton = document.getElementById('intro-enter');
  const hud = document.getElementById('hud');
  const prompt = document.getElementById('prompt');
  const promptLabel = document.getElementById('prompt-label');
  const promptKey = document.getElementById('prompt-key');
  const scrim = document.getElementById('scrim');
  const panel = document.getElementById('panel');
  const panelBody = document.getElementById('panel-body');
  const panelClose = document.getElementById('panel-close');
  const compass = document.getElementById('compass');
  const progressLabel = document.getElementById('progress-label');
  const toast = document.getElementById('toast');
  const lockHint = document.getElementById('lock-hint');

  const totalMain = signRegistry.filter((s) => !s.hidden).length;
  let lastFocused = null;

  // ---- compass markers ------------------------------------------------
  const markers = new Map();
  const visibleSigns = signRegistry.filter((s) => !s.hidden);
  const ROWS = 3;
  visibleSigns.forEach((sign, i) => {
    const el = document.createElement('div');
    el.className = 'marker';
    // Trail layout means every clearing is roughly straight ahead, so labels
    // would otherwise overlap. Stagger them down a few rows.
    el.style.setProperty('--row', String(i % ROWS));
    el.innerHTML = `<span class="marker__pip"></span><span class="marker__label">${esc(
      sign.label
    )}</span>`;
    compass.appendChild(el);
    markers.set(sign.id, el);
  });

  function updateCompass(playerX, playerZ, yaw, visited) {
    const heading = Math.atan2(-Math.sin(yaw), -Math.cos(yaw));
    signRegistry.forEach((sign) => {
      const el = markers.get(sign.id);
      if (!el) return;
      const target = sign.compassPosition || sign.position;
      const dx = target.x - playerX;
      const dz = target.z - playerZ;
      let rel = Math.atan2(dx, dz) - heading;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      const screenAngle = -rel; // positive = to the player's right

      const limit = Math.PI * 0.62;
      if (Math.abs(screenAngle) > limit) {
        el.style.opacity = '0';
        return;
      }
      const t = screenAngle / limit; // -1..1
      const edgeFade = 1 - Math.pow(Math.abs(t), 3);
      el.style.opacity = String(0.25 + edgeFade * 0.75);
      el.style.transform = `translateX(${t * 50}vw) translateX(-50%)`;
      el.classList.toggle('marker--visited', visited.has(sign.id));
      const dist = Math.round(Math.hypot(dx, dz));
      el.dataset.distance = `${dist}m`;
    });
  }

  // ---- prompt ---------------------------------------------------------
  let promptVisible = false;
  function showPrompt(sign, isTouch) {
    promptLabel.textContent = sign.label;
    promptKey.textContent = isTouch ? 'Tap to read' : 'Press E to read';
    prompt.hidden = false;
    if (promptVisible) return;
    promptVisible = true;
    utils.set(prompt, { opacity: 0, translateY: 14 });
    animate(prompt, {
      opacity: 1,
      translateY: 0,
      duration: prefersReducedMotion ? 0 : 380,
      ease: 'outCubic',
    });
  }

  function hidePrompt() {
    if (!promptVisible) return;
    promptVisible = false;
    animate(prompt, {
      opacity: 0,
      translateY: 10,
      duration: prefersReducedMotion ? 0 : 220,
      ease: 'outQuad',
      onComplete: () => {
        prompt.hidden = true;
      },
    });
  }

  prompt.addEventListener('click', () => onPromptActivate());

  // ---- panel ----------------------------------------------------------
  function openPanel(id) {
    const data = CONTENT[id];
    const build = BUILDERS[id];
    if (!data || !build) return;

    lastFocused = document.activeElement;
    panelBody.innerHTML = build(data);
    panel.scrollTop = 0;
    scrim.hidden = false;
    panel.hidden = false;
    panel.setAttribute('aria-labelledby', 'panel-body');

    const rows = panelBody.querySelectorAll('[data-reveal]');

    if (prefersReducedMotion) {
      utils.set(scrim, { opacity: 1 });
      utils.set(panel, { opacity: 1, translateY: 0 });
      utils.set(rows, { opacity: 1, translateY: 0 });
    } else {
      utils.set(scrim, { opacity: 0 });
      utils.set(panel, { opacity: 0, translateY: 46 });
      utils.set(rows, { opacity: 0, translateY: 22 });

      createTimeline({ defaults: { ease: 'outCubic' } })
        .add(scrim, { opacity: 1, duration: 300 }, 0)
        .add(panel, { opacity: 1, translateY: 0, duration: 620, ease: 'outExpo' }, 40)
        .add(
          rows,
          { opacity: 1, translateY: 0, duration: 560, delay: stagger(65) },
          220
        );
    }

    panelClose.focus({ preventScroll: true });
  }

  function closePanel() {
    if (panel.hidden) return;
    if (prefersReducedMotion) {
      panel.hidden = true;
      scrim.hidden = true;
      panelBody.innerHTML = '';
    } else {
      animate(panel, {
        opacity: 0,
        translateY: 36,
        duration: 320,
        ease: 'inQuad',
        onComplete: () => {
          panel.hidden = true;
          panelBody.innerHTML = '';
        },
      });
      animate(scrim, {
        opacity: 0,
        duration: 340,
        ease: 'inQuad',
        onComplete: () => {
          scrim.hidden = true;
        },
      });
    }
    if (lastFocused && lastFocused.focus) lastFocused.focus({ preventScroll: true });
  }

  panelClose.addEventListener('click', () => onPanelClose());
  scrim.addEventListener('click', () => onPanelClose());

  // Keep tabbing inside the panel while it's open.
  panel.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const focusables = panel.querySelectorAll('a[href], button');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // ---- progress + toast -------------------------------------------------
  function updateDiscoveryCount(count) {
    progressLabel.textContent = `${count} / ${totalMain} clearings found`;
    if (count === totalMain && !prefersReducedMotion) {
      animate(progressLabel, {
        scale: [1, 1.12, 1],
        duration: 700,
        ease: 'outElastic(1, .5)',
      });
    }
  }

  function celebrateSecretFound() {
    toast.textContent = 'Secret clearing discovered';
    toast.hidden = false;
    if (prefersReducedMotion) {
      setTimeout(() => {
        toast.hidden = true;
      }, 3200);
      return;
    }
    createTimeline()
      .add(toast, { opacity: [0, 1], translateY: [16, 0], duration: 520, ease: 'outBack' })
      .add(toast, { opacity: 0, duration: 420, ease: 'inQuad' }, 3000)
      .add({
        duration: 1,
        onComplete: () => {
          toast.hidden = true;
        },
      });
  }

  // ---- intro ------------------------------------------------------------
  function playIntro(onEnter) {
    const introRows = intro.querySelectorAll('[data-intro]');
    if (!prefersReducedMotion) {
      utils.set(introRows, { opacity: 0, translateY: 20 });
      animate(introRows, {
        opacity: 1,
        translateY: 0,
        duration: 760,
        delay: stagger(120, { start: 180 }),
        ease: 'outExpo',
      });
    }

    introButton.addEventListener('click', () => {
      const finish = () => {
        intro.hidden = true;
        hud.hidden = false;
        if (!prefersReducedMotion) {
          utils.set(hud, { opacity: 0 });
          animate(hud, { opacity: 1, duration: 900, ease: 'outCubic' });
        }
        onEnter();
      };
      if (prefersReducedMotion) {
        finish();
        return;
      }
      animate(intro, {
        opacity: 0,
        duration: 620,
        ease: 'inQuad',
        onComplete: finish,
      });
    });
  }

  function setLockHint(visible) {
    lockHint.hidden = !visible;
  }

  return {
    playIntro,
    showPrompt,
    hidePrompt,
    openPanel,
    closePanel,
    updateCompass,
    updateDiscoveryCount,
    celebrateSecretFound,
    setLockHint,
  };
}
