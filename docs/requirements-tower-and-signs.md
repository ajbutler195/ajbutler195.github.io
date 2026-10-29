# Requirements: sign lanterns, tower stair, and stone texture

Status: **not implemented.** This file defines four changes and how to tell when
each one is done. Line numbers refer to build `716e2b5` and will drift; the
function names are the stable reference.

Verification is visual: the owner checks in the browser and sends screenshots.

---

## 1. Lantern bracket mounted on the sign board

**Now:** `buildSign` in `js/signs.js` (≈ lines 416–445) sets
`armY = plankY + plankHeight / 2 + 0.12` and starts the arm exactly at the
board's right edge (`armX = plankWidth / 2`). The arm floats 12 cm above the
top-right corner, so the lantern looks like it hangs in the air rather than from
the sign.

| ID | Requirement |
| --- | --- |
| R1.1 | Lower the arm so it sits within the board's height, near the top of the right edge. Target: arm centre about 0.08–0.12 m *below* the top edge. That is a drop of about 0.2 m, which is "slightly lower". |
| R1.2 | Start the arm's inner end about 0.08 m inside the board edge, so it visibly comes out of the board. It must stay attached even with `roughenPlank` edge jitter (about ±5 cm) and the random board tilt (`plank.rotation.z`, about ±3.5 cm at the edge). |
| R1.3 | Move the hanger, lantern and halo down with the arm. Shorten the hanger if needed so the lantern stays level with the upper half of the board and hangs clear of its edge. |
| R1.4 | Nothing covers the lettering or the corner nails. |
| R1.5 | Applies to every lit sign: the four section signs, the trailhead, and Contact at the top of the tower. The hidden sign has no lantern and does not change. |
| R1.6 | The pooled lights follow the bulb automatically (`lightAnchor` in `createSigns`). Check that the boards are still lit after the lantern moves down. |

**Done when:** from the front and from an angle, on every lit sign and after
several reloads, the bracket comes out of the board's right edge below its top
edge.

---

## 2. Replace the landing wall with a railing that wraps the whole stair

**Now:**
- `buildDeck` in `js/tower.js` (≈ 678–703) builds `landingWall` and `landingCap`.
  This is a curved, waist-high stone wall at `r = TOWER.stairOuter` from
  `ARRIVE_ANGLE − 1.75` to `ARRIVE_ANGLE + topDoorHalfAngle + 0.1`, fixed at
  deck height. Where it starts, the treads are about 1.45 m lower, so the wall
  floats above the stair and its railing.
- The timber rail on the outside flight (`buildStairs`, ≈ 561–598) runs from
  `outer[0] − 0.9` to the last tread. It starts in mid-air in the middle of the
  wall portal, with no post at either end.

| ID | Requirement |
| --- | --- |
| R2.1 | Remove `landingWall` and `landingCap` entirely. |
| R2.2 | One continuous outer railing runs from the wall portal up the whole outside flight. At the top it carries on, level at deck height, round the top landing until it meets the tower parapet beside the top doorway. There is no gap where the stone wall was. |
| R2.3 | At the bottom, the railing starts against the tower wall on the downhill side of the portal and turns out to the stair's outer edge, so the open side of the portal landing is closed in. |
| R2.4 | Every railing end stops at a post. Keep the existing style: `timberDark` posts, `timberMat` rail, height about 0.92 m. |
| R2.5 | The stair should feel closed in, not just edged. Add infill between the posts, either a mid-rail at about 0.45 m or balusters. The owner picks which from screenshots. |
| R2.6 | (Should) Give the inner flight's well-side rail (≈ 523–559) the same post-at-each-end and infill treatment. It currently starts at tread 1 with no post. |
| R2.7 | Collision matches the railing. Nowhere on the outside flight or top landing can the player walk past the railing line. See D1 below. |

**Done when:** the stone wall is gone. From the ground and from on the stair,
the timber railing runs unbroken from the tower wall at the portal, up the
flight, round the landing, and back to the tower at the top doorway.

---

## 3. Stair treads reach the tower wall

**Assumed reading (to confirm, see Q1):** "the platform that allows the user to
walk up the stairs" means the treads of the inside (timber) flight.

**Now:**
- The inside treads stop at `r = innerStairOuter` (3.62).
- The shaft is drawn as a single, zero-thickness cylinder at `outerRadius`
  (4.2), so there is a visible gap of about 0.58 m between the treads and the
  wall.
- Collision stops the player at `wallInner = outerRadius − wallThickness`
  (3.65). The result is an invisible wall inside a gap that looks walkable.

| ID | Requirement |
| --- | --- |
| R3.1 | Every inside tread reaches the wall with no visible gap. |
| R3.2 | The visible wall and the collision wall agree. Recommended: draw the shaft's inner face at `wallInner` and extend the treads to it. Add reveals (the side faces of the wall's thickness) at the base door, the wall portal and the top doorway, so no opening shows a hollow wall. |
| R3.3 | Keep the collision wall about 0.55 m thick. Moving the inner face out to 4.2 would make the wall thin enough to tunnel through at run speed (frame steps up to about 0.2 m, or 1.2 m at the `dt` clamp). |
| R3.4 | (Should) Make the first tread visible. The ground-floor slab (`createTower`, ≈ 777–782) has its top at 0.26 m but the collision floor is at 0. That puts tread 1's top (also 0.26 m) flush with the slab, so the two surfaces z-fight and the first visible step is really tread 2. Put the slab top at the collision floor height. |

**Done when:** inside the ground floor, the treads visibly meet the wall.
Walking in through the door and onto the stair needs no hunting for the first
step, and the player never hits an invisible barrier.

---

## 4. "Whole-brick" stone texture

**Now:**
- `buildStoneCanvases` (`js/tower.js` ≈ 37–131) scatters about 500 random
  ellipses in loose courses on a 512² canvas. The stones overlap and cut each
  other off, so the wall reads as gravel.
- `stoneMaterial(repeatX, repeatY)` repeats per mesh UV range. Every piece of
  the split shaft in `buildShaft` uses `stoneMaterial(9, 7)`, including the
  narrow pieces above and below the openings. Stone size therefore differs
  between pieces (above the door it is squashed about 10× sideways), and the
  pattern doesn't line up at the seams.

| ID | Requirement |
| --- | --- |
| R4.1 | Every stone is whole: none overlaps or clips another. The only exception is the tile edge, and stones crossing it wrap seamlessly. |
| R4.2 | Coursed layout, laid like bricks: horizontal courses of slightly varied height, and blocks about 1.3–3× the course height wide. Joints are staggered from course to course, with even, recessed mortar lines. |
| R4.3 | Blocks are roughly rectangular dressed fieldstone, not machine brick: softened corners, slightly uneven edges. Colour per stone comes from `STONE_TONES`, with subtle mottling inside each stone. |
| R4.4 | The bump map matches the colour map: raised stone faces, bevelled edges, recessed mortar. |
| R4.5 | The tile repeats seamlessly in both directions. The texture height is a whole number of courses. |
| R4.6 | Stone size is consistent on every stone surface: shaft pieces, plinth, footing, parapet, coping, piers, floors and steps. Target is courses about 0.25–0.35 m tall. For the cylinder pieces, use world-space UVs (u = absolute angle × radius, v = absolute height) so courses line up across openings and seams. Size box faces to their own dimensions. |
| R4.7 | Still procedural, with no image files. Keep one shared canvas pair; per-surface material clones are fine. |
| R4.8 | Update the README "The tower" paragraph about cobbles and repeats to describe the new texture and how its scale is set. |

**Done when:** up close and from the trail, the tower reads as whole stone
blocks in clean, continuous courses. No surface shows squashed or stretched
stones, and no seam breaks the pattern.

---

## Related defects found while scoping

These are not in the original request but affect items 2 and 3. Fix them
alongside those items.

- **D1. Invisible treads around the wall portal.** `stairHeightAt` (≈ 225–228)
  accepts either band for any step within `exitHeight ± 2.4`. This has two
  effects:
  - Outside the wall, the player can step through the portal and walk *down*
    unseen outer-band treads (steps ~23–32) into the air.
  - Inside, the inner band stays walkable above the exit (steps 33–41, up to
    about 10.7 m), even though no treads are drawn there.

  Fix: the inner band is valid only up to the exit and the outer band only from
  the exit, with both bands valid only across the portal itself.
- **D2. Random top landing.** The three top-landing slabs (`buildStairs`,
  ≈ 600–617) take a random radial offset and width. On some loads their inner
  edge stops up to about 0.4 m short of the tower wall below the top doorway.
  Make them reach the wall every time.

## Open questions (answer with screenshots)

- **Q1.** In item 3, which "platform" was meant?
  - (a) the inside timber treads (assumed above)
  - (b) the landing slab that bridges the wall at the portal (`createTower`,
    ≈ 794–809)
  - (c) a new landing at the foot of the stair, running from the first tread to
    the wall by the door. The stair currently starts about 72° round from the
    door.
- **Q2.** For the railing infill (R2.5), a mid-rail or balusters?

## Shipping note

Every module import carries `?v=716e2b5`, and `index.html` stamps the same
build. Bump that string in every file when these changes ship, or browsers may
serve stale modules.
