# A walk through the woods

A personal portfolio built as a first-person walk through a low-poly pine forest at
twilight. One trail runs north through the woods, with diagonal offshoots leading
to signposted clearings and a stone tower at the far end. Climb the tower's spiral
stair to reach Contact. A sixth clearing is hidden off a faint side trail.

Built with [three.js](https://threejs.org) and [anime.js](https://animejs.com).
No build step, no framework, no bundler.

---

## Run it locally

The site uses ES modules, so it needs to be served over HTTP — opening
`index.html` directly from the file system will fail with a CORS error.

```bash
cd portfolio-woods
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Any static server works (`npx serve`,
`php -S localhost:8000`, VS Code's Live Server, etc.).

---

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Walk | `W` `A` `S` `D` or arrow keys | Left stick |
| Look | Move the mouse (click once to capture the cursor) | Drag anywhere |
| Run | Hold `Shift` | — |
| Climb the tower | Walk in the door and follow the stair | Same |
| Read a sign | `E` when the prompt appears | Tap the prompt |
| Close a panel | `Esc`, the `×`, or click outside | Tap the `×` |

---

## Customization

### Your content — start here

**`js/content.js` is the only file you need to edit.** Every word a visitor reads
lives there as placeholder copy. Keep the shape of each object (the keys and
arrays) and swap the strings; everything else picks it up automatically.

- Add or remove projects, skills, and roles by adding or removing array entries.
- Contact links: set both `value` (what's displayed) and `href` (where it goes).
- Put your resume at `resume.pdf` in the project root, or change `resumeUrl`
  under `experience`.

Replace `[Your Name]` in `index.html` too — it appears in the `<title>`, the
meta description, the intro heading, and the `<noscript>` fallback.

### Sections and world layout

`js/world-layout.js` is the single source of truth for where things are. The
terrain, tree scattering, signposts, collision and the compass all read from it,
so a change here propagates everywhere.

The layout is one main trail from `TRAIL_START` to `TRAIL_END`, with four
offshoots branching off it diagonally, and the tower beyond the end. Offshoot
angle and length are jittered by a **seeded** random number generator, so the
trail doesn't look mechanical but stays identical between reloads. Change the
seed passed to `mulberry32` to reshuffle the whole forest.

To **rename a section**, change its `label` in `OFFSHOOTS`. To **move one**,
change its `atZ` (how far along the trail it branches) and `side` (`-1` left,
`1` right). To **remove one**, delete its entry, plus the matching key in
`content.js` and its builder in `js/ui.js`.

To **add a section**, you need four things: an entry in `OFFSHOOTS`, a matching
key in `CONTENT`, a builder function in `BUILDERS` in `js/ui.js`, and a CSS rule
if it needs new markup. The `skills` section is the simplest one to copy.

| Constant | Effect |
| --- | --- |
| `TRAIL_END` | How long the main trail is. |
| `PATH_WIDTH` | Width of the visible dirt. |
| `WALKABLE_HALF_WIDTH` | How far off the centreline you may stray. Raise to loosen. |
| `CLEARING_SIZE` | Size of the open area at each sign. |
| `SIGN_ACTIVATION_RADIUS` | How close you must be for the read prompt to appear. |

### The tower

A narrow fieldstone observation tower, modelled on the New England trail towers:
a battered plinth, slit windows, an arched door, and a stair that climbs *inside*
for the first stretch then breaks out through the wall to wrap the exterior,
finishing at a covered deck.

The `TOWER` object in `world-layout.js` controls it. The values worth knowing:

| Constant | Effect |
| --- | --- |
| `outerRadius` | Shaft radius, and the collision radius. |
| `height` | Also the deck level. |
| `exitHeight` | Where the stair breaks out through the wall. |
| `risePerTurn` | How steep the spiral is. Lower = more turns, longer climb. |
| `innerStair*` / `outerStair*` | Radial band of the inside and outside flights. |
| `deckRadius` | The overhanging covered patio on top. |

The stone is a procedural cobble texture generated on a canvas in `tower.js` —
no image files. `stoneMaterial(repeatX, repeatY)` tiles it; the repeats are tuned
so a cobble lands around 20–25cm on each surface, so if you resize the tower,
rescale those to match.

Contact lives at the top because it's the payoff at the end of the walk. To put a
different section up there, swap the `id` and `label` on `TOWER_SECTION` and move
the displaced section into `OFFSHOOTS`.

### Movement and collision

`js/walkable.js` decides where you're allowed to stand. The forest is open
ground — you may wander anywhere within the world bounds. What stops you is
solid things: tree trunks, and the tower's walls and drops. An earlier version
also fenced you onto the trail, but that put invisible walls across gaps between
trees, which felt worse than being blocked by anything you could actually see.

Tree positions are collected into `treeColliders` as the forest is generated and
bucketed into a coarse spatial grid, so the per-frame check only tests the
handful of trunks in neighbouring cells rather than all 900. Rocks and
undergrowth deliberately don't collide — they're low enough to step over, and
colliding with them produced exactly the "why can't I get past that pebble"
problem the trail fence used to cause.

Inside the tower it also resolves the spiral stair. A spiral overlaps itself, so
`(x, z)` alone is ambiguous — `stairHeightAt` picks the flight nearest your
current height. `MAX_STEP_UP` and `MAX_STEP_DOWN` govern what counts as a
climbable step; they're also what stops you walking off the landing into the open
well in the middle of the tower.

If movement feels too tight, raise `WALKABLE_HALF_WIDTH`. If it feels too loose,
lower it.

### The hidden clearing

`HIDDEN_SECTION` in `world-layout.js` defines a bonus clearing reached by a
narrow side trail off the Skills path, marked by a trail of fireflies. Finding it
fires a toast and doesn't count toward the five-clearing progress meter. Its copy
is under `secret` in `content.js`. To remove it entirely, delete `HIDDEN_SECTION`
from the `ALL_SECTIONS` array and drop the last entry in `PATH_SEGMENTS`.

### Look and feel

- **Palette, type, panels:** `css/style.css`. The CSS custom properties at the
  top drive everything; `--lantern` is the single accent colour and is
  deliberately the only bright thing in the design.
- **Sky, fog, lighting:** `js/sceneSetup.js`. `FOG_DENSITY` controls how far you
  can see; the hemisphere light does most of the work making the ground legible.
  Turning it down makes the woods darker and more oppressive, quickly.
- **Trees, rocks, undergrowth:** `js/forest.js`. The `SPECIES` array defines five
  tree types — tall spires, broad firs, squat wind-beaten pines, round-canopy
  broadleaves and dead snags — mixed by `weight` (which should sum to 1). A
  monoculture of identical cones reads as wallpaper, so add species rather than
  raising the count if the forest feels artificial. `count` and `minSpacing` in
  each `scatterPoints` call control density.
- **Signs:** `js/signs.js`. The boards are deliberately irregular — `roughenPlank`
  jitters the slab's edges, and the lettering is painted onto a canvas with
  per-character wobble in size, baseline and angle, built up in several passes so
  the edges break like brushwork. The face is Caveat, loaded from Google Fonts;
  because canvas text falls back if it's drawn before the font arrives, the
  boards are repainted once `document.fonts.ready` resolves.
- **Movement feel:** `WALK_SPEED`, `RUN_SPEED`, and `MOUSE_SENSITIVITY` at the top
  of `js/controls.js`.

### Fonts

Loaded from Google Fonts in `index.html` (Fraunces for display, IBM Plex Sans and
Mono for body and labels). To self-host, download them, drop them in the project,
and swap the `<link>` for `@font-face` rules. The stack degrades to Georgia and
system sans if the request fails.

---

## Deployment

The site is fully static. Push the folder to any static host:

**Netlify or Vercel** — drag the folder onto their dashboard, or connect the
repo. No build command; the publish directory is the project root.

**GitHub Pages** — push to a repo, then Settings → Pages → deploy from branch,
root folder. If you deploy to `username.github.io/repo-name/`, the relative paths
all still work.

**Cloudflare Pages / S3 / any static host** — upload as-is.

Make sure the `vendor/` folder ships with it — that's where three.js and anime.js
live.

### About `vendor/`

three.js and anime.js are vendored locally rather than loaded from a CDN, so the
site works offline, doesn't break when a CDN changes, and isn't pinned to a
third party's uptime. Versions are three r185.1 and anime.js 4.5.0.

To use a CDN instead, replace the import map in `index.html`:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.185.1/build/three.module.js",
    "animejs": "https://unpkg.com/animejs@4.5.0/dist/modules/index.js"
  }
}
</script>
```

---

## Deep links

A 3D world is normally impossible to link into, which is a real problem when
someone asks you to send them your projects. Each panel has a URL:

```
yoursite.com/#projects
yoursite.com/#experience
```

Opening one drops the visitor at that clearing with the panel already open. The
address bar also updates as panels open and close, so any panel can be copied and
shared. Send recruiters `#projects` or `#experience` directly.

---

## Accessibility and fallbacks

- `prefers-reduced-motion` is respected: panel and intro animations are skipped,
  content appears immediately, and CSS transitions are cut.
- Panels are dialogs with focus management and a tab trap; `Esc` closes them.
- Focus outlines use the accent colour and are never removed.
- A `<noscript>` block gives your resume link and email to anyone without
  JavaScript or WebGL.

The one thing this design can't do is be fully usable without a pointer and a
keyboard. If that matters for your job search, consider adding a plain HTML
resume page and linking it from the intro screen.

---

## Project structure

```
index.html            Shell, import map, HUD and panel markup
css/style.css         All styling
js/
  content.js          ← your copy lives here
  world-layout.js     Positions of clearings, paths, and bounds
  terrain.js          Height field and vertex-painted ground
  forest.js           Instanced trees, rocks, undergrowth
  signs.js            Signpost meshes and canvas-rendered labels
  tower.js            Stone tower, spiral stair, doorway, sconces
  walkable.js         Collision: path limits, tree hits, stair heights
  lanternLights.js    Pooled point lights that follow the nearest signs
  fireflies.js        Additive glow particles
  sceneSetup.js       Renderer, camera, sky, fog, lighting
  controls.js         Keyboard/mouse and touch movement
  interaction.js      Sign proximity, panel open/close, URL hash
  ui.js               Panel markup and all anime.js animation
  main.js             Wires it together, runs the render loop
vendor/               three.js and anime.js
```

---

## Performance notes

The scene is modest by three.js standards — roughly ten draw calls thanks to
instancing, plus a ~12k-quad terrain. A few deliberate choices keep it cheap:

- **Pooled lights.** Six signs once meant six point lights, which is more than a
  mobile GPU wants to shade per fragment. Three lights now follow the nearest
  signs instead. The count never changes, so three.js never recompiles shaders
  mid-walk, and it looks identical — a lantern beyond its own falloff radius
  contributed nothing anyway.
- **Pixel ratio** is capped at 2 on desktop and 1.5 on touch, the single biggest
  fill-rate saving on phones.
- **Instancing** for all trees, rocks, bushes, and the tower's stair steps.
- **A spatial grid** for tree collision, so movement never scans every trunk.

**Test on your own hardware before shipping.** These numbers were never measured
on a real GPU — the development environment ran software rasterization at under
3 fps, which makes profiling meaningless. If it struggles on a target device, the
first knobs to turn are the tree `count` in `forest.js`, the terrain `segments`
in `terrain.js`, and `FOG_DENSITY` in `sceneSetup.js` (denser fog lets you pull
the camera's `far` plane in).
