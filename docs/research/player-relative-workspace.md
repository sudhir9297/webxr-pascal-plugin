# Player-relative workspace with a parked panel

Updated September 16, 2026. This supersedes the earlier behavior that moved the
panel itself to the viewing direction on every selection.

## Transform ownership

```text
xr-player-ui-anchor                 tracked translation + player-rig yaw; unit scale
  xr-workspace-recall-group          empty group at the recalled distance and heading
    xr-editor-wand-panel            manually chosen local offset; faces the viewer
      content, tool rail, drag bar  user-configured content scale
```

Walking carries the entire hierarchy. Head turns do not steer it. Player-rig
turns, including snap turns, carry it with the player. There is no torso tracker;
physical body turns cannot be distinguished from head turns.

Scene selection captures the viewing direction once and smoothly repositions
only the empty recall group. The child panel retains its local X/Y/Z offset,
including a drag target that has not yet finished settling. The recall group's
yaw keeps a right/left offset on the same side of the new viewing direction.
The panel adjusts pitch/yaw to face the eyes without rolling.

Both the rail's **Bring workspace here** button and controller Y recall the empty
group without clearing the panel offset. Settings → **Panel placement** provides
that action plus **Reset panel offset**, which clears only the child panel's local
offset without requesting a group recall. An already-running recall continues.
These settings remain available when an object is selected. Fresh XR sessions start with zero offset;
God/Human mode transitions preserve it. Persistence across separate XR sessions
is not implemented.

Dragging changes only the panel offset. Each grab locks the current eye-to-panel
distance: horizontal movement orbits around the viewer, and vertical movement
changes elevation on the same sphere. Pushing or pulling cannot change that
radius. Offset smoothing also follows the orbit, avoiding inward chord motion. Grabbing during an animated recall stops
the group at its current pose before recording the grab offset. A scene-selection
recall waits until the UI drag releases. Tracking loss, cancellation, input-source
loss, visibility changes, mode changes, and session end retain the existing
pointer cleanup. Manual recenter/reset can explicitly interrupt a drag.

## Placement and interaction

Initial/manual placement is 1.05 m ahead and 0.1 m below eye level. Selection
placement is 1.05 m along the captured gaze, with a 0.38 m downward adjustment.
These are positions of the empty group; the user's offset is added afterward.
Recall moves around the viewer by interpolating yaw, elevation and radius rather
than cutting through the eyes. Selection recall uses 7/s damping; manual recall
and panel-offset motion use 24/s. Facing uses 18/s with fixed roll.

The entire hierarchy stays outside model scaling. The player anchor cancels the
host parent's full world matrix, so transformed/nonuniformly scaled parents
cannot change the physical UI size. The fixed drag radius uses the eyes in
the recall group's coordinate system, not the empty group's origin.

The Pascal bridge listens for `selection:canvas-node-click`, the accepted,
resolved selection intent. It checks idle/select state and the resulting selected
ID. Panel controls, programmatic property updates, empty clicks, paint/build
operations and selection removal do not request a recall. Selection reveals the
Build panel's contextual controls without resetting the parked offset.

## Verification

Latest automated checks: `bun test` passed (121 tests, 1215 assertions),
`bun run check-types` passed, and `git diff --check` passed.

Automated scenarios cover:

- Repeated scene/manual recalls retain a sideways, vertical and depth offset.
- Recalling before drag smoothing finishes retains the intended final offset.
- Different recall headings rotate the offset frame while preserving local values.
- The panel faces the eyes correctly from the nested, rotated recall group.
- Walking, player-rig turns, mode-height changes and nonuniform host scale preserve
  the offset and physical size.
- Explicit reset and fresh-session initialization clear the offset.
- Grabbing during recall stops group motion without jumping the panel.
- Recall-store actions do not accidentally request offset resets.
- Existing drag ownership, fixed-radius orbits, selection filtering, yaw wraparound,
  head-turn independence and frame-rate-independent recall tests remain in place.

The opt-in emulator snapshot reports `workspace.localPosition` as the panel's
local offset and separately reports `recallPosition` and `recallQuaternion`.
The updated source and tests are synchronized to the active editor's vendor copy.

Live checks from the previous implementation established selection intents,
head-turn independence, first-person snap turns and UI-input isolation. The new
nested-offset behavior must additionally be checked in the live emulator and on
hardware; earlier live results are not evidence for this revision. The current
development preview stalled compiling its route during verification, including
a restart with a fresh development cache; the development process subsequently
stopped. Automated checks remain available.

Physical-headset comfort and readability need hardware testing. Existing scene
depth testing can occlude the panel behind geometry; this change does not add an
always-on-top rendering pass.

## References

- [Meta spatial UI rotation guidance](https://developers.meta.com/horizon/design/hands-3d-best-practices/)
- [Meta window controls](https://developers.meta.com/horizon/design/windows/)
