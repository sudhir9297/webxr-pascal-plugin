# Player-relative workspace with a parked panel

Updated September 17, 2026. This supersedes the earlier behavior that moved the
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

## Corner resizing

One curved bracket sits outside the narrow tool rail's top-left corner, clear of
the adjoining panels. It remains faint at rest and brightens on hover or while held.
Hold trigger or pinch over the bracket
and drag outward to enlarge the entire workspace, or inward to shrink it. The main
panel, rail, and contextual side panel share uniform scale, from 65% to 160%, using
the same value as the Panel size setting.

Resizing keeps the main panel center fixed and measures motion in its starting
plane, avoiding feedback as the contents change size. One pointer owns a move or
resize at a time. Selection recall waits for release; hiding, manual rescue, mode
changes, lost capture/tracking, and session end cancel the active interaction.
Live headset checks are still needed for handle discoverability and pinch comfort.

## Side-panel orientation

Selection details and the paint side panel have a fixed 30-degree inward fold,
like a second monitor. A small gap separates the side panel's left edge from the main panel's right
edge, and their top edges line up. Taller contextual content extends downward.
Both panels move and face the viewer as one assembly; the side panel does not
independently track the viewer or change its relative pitch, yaw, or roll.
Resizing preserves the fold and scales the gap with the panels.

## Visibility and recovery

- Press and release controller Y to hide the panel, or show it in front with its
  offset reset. Hold Y for 0.65 seconds to recover it immediately. Releasing after
  a hold does not toggle visibility.
- The rail has a Hide panel button. A separate left-wrist shortcut provides
  Show/Hide panel and Bring here for hand users, even when the panel is hidden.
- Bring workspace here, from the rail or Settings, resets the panel offset and
  immediately places the workspace in front of the current view.
- Switching God/Human mode recovers a visible panel. Hidden panels stay hidden.
  Scene selection also respects hidden state.
- Reset panel offset in Settings clears only the child offset without requesting
  a group recall. Fresh XR sessions show the panel with zero offset.

Dragging changes only the panel offset, with no distance lock. Moving the captured
hand/controller ray toward or away from the viewer changes panel depth; sideways
and vertical movement preserve the initial handle-to-panel offset. Panel-offset
smoothing follows a straight path in all three dimensions. The distance and orbit
behavior belong only to the empty recall group. Grabbing during an animated recall stops
the group at its current pose before recording the grab offset. A scene-selection
recall waits until the UI drag releases. Tracking loss, cancellation, input-source
loss, visibility changes, mode changes, and session end retain the existing
pointer cleanup. Manual recenter/reset can explicitly interrupt a drag.

## Placement and interaction

Initial/manual placement is 1.05 m ahead and 0.1 m below eye level. Selection
placement is 1.05 m along the captured gaze, with a 0.38 m downward adjustment.
These are positions of the empty group; the user's offset is added afterward.
Selection recall moves around the viewer by interpolating yaw, elevation and
radius with 7/s damping. Manual recovery snaps to the safe starting placement
and faces the viewer immediately. Panel-offset motion uses 24/s damping. Other
facing updates use 18/s with fixed roll.

The entire hierarchy stays outside model scaling. The player anchor cancels the
host parent's full world matrix, so transformed/nonuniformly scaled parents
cannot change the physical UI size. Drag points are converted into the recall
group's coordinate system before updating the child offset.

The Pascal bridge listens for `selection:canvas-node-click`, the accepted,
resolved selection intent. It checks idle/select state and the resulting selected
ID. Panel controls, programmatic property updates, empty clicks, paint/build
operations and selection removal do not request a recall. When visible, selection
reveals the Build panel's contextual controls without resetting the parked offset.

## Verification

Automated checks: `bun test` passed,
`bun run check-types` passed, and `git diff --check` passed.

Automated scenarios cover:

- Repeated selection recalls retain a sideways, vertical and depth offset.
- Recalling before drag smoothing finishes retains the intended final offset.
- Different recall headings rotate the offset frame while preserving local values.
- The panel faces the eyes correctly from the nested, rotated recall group.
- Walking, player-rig turns and nonuniform host scale preserve
  the offset and physical size.
- Explicit reset and fresh-session initialization clear the offset.
- Grabbing during recall stops group motion without jumping the panel.
- Manual rescue and visible mode switches reset placement; selection preserves offsets.
- Hidden state survives selection and mode switches.
- Short/long Y presses and cancellation dispatch the intended action.
- Wrist controls block scene input while the panel is hidden.
- Unrestricted near/far dragging, straight depth smoothing, drag ownership, selection filtering, yaw wraparound,
  head-turn independence and frame-rate-independent recall tests remain in place.

The opt-in emulator snapshot reports `workspace.localPosition` as the panel's
local offset and separately reports `recallPosition` and `recallQuaternion`.

The visibility controls and wrist shortcut still need live headset verification.
Automated checks do not establish wrist readability or physical comfort.

Physical-headset comfort and readability need hardware testing. Existing scene
depth testing can occlude the panel behind geometry; this change does not add an
always-on-top rendering pass.

## References

- [Meta spatial UI rotation guidance](https://developers.meta.com/horizon/design/hands-3d-best-practices/)
- [Meta window controls](https://developers.meta.com/horizon/design/windows/)
