# Floating XR panels: research and proposed design

Research date: 2026-09-15. Original scope: source inspection and primary-source research. Implementation status is recorded below.

## Recommendation

Replace the left-hand three-face wand with a floating workspace: a compact dock with Paint, Build, and Settings tabs, one active content panel above it, and a shared drag handle. Preserve all three tools and their navigation state. Offer a grouped three-panel layout later if simultaneous access proves useful.

Spawn the workspace in front of the user when summoned, then keep its position and orientation stable as the user moves their head or hands. Allow explicit repositioning and recall. Keep it independent of the model's God-mode scaling.

This is a proposed app design inspired by Meta's guidance, not a claim to reproduce every version of Quest's system menu.

## What the current code does

- [wand-input-overlay.tsx](../../src/xr/wand/wand-input-overlay.tsx) mounts the UI only on the left input source: controller grip space or the middle-finger metacarpal joint.
- [panel-layout.ts](../../src/xr/wand/panel-layout.ts) and [wand-panel-shell.tsx](../../src/xr/wand/wand-panel-shell.tsx) arrange three faces at 0, 120, and 240 degrees. Moving the left hand necessarily moves every face.
- [wand-panel.tsx](../../src/xr/wand/wand-panel.tsx) already separates Paint, Build, and Settings content from the shell. The [adapter](../../src/xr/wand/adapter.ts) separates editor behavior from presentation, making content reuse practical.
- [panel-settings.ts](../../src/xr/wand/panel-settings.ts) stores category, page, section, and panel-size state outside the individual panels. Preserve this state when switching tabs; also audit model effects when mounting/unmounting panels.
- [editor-input-bridge.tsx](../../src/integrations/pascal-editor/input/editor-input-bridge.tsx) independently raycasts the named wand root to prevent scene actions behind UI. Event propagation alone is insufficient.
- [player-mode-scene.tsx](../../src/xr/mode-switching/ui/player-mode-scene.tsx) places children under the transformable `xr-player-scene-root`. [session.tsx](../../src/session.tsx) also inserts `sceneContent` there. Simply moving the menu into `sceneContent` would make it inherit model transforms.
- The hand configuration disables default touch/grab pointers and supplies a custom ray pointer. Direct-touch interaction would require additional implementation. The left Y button already switches player mode, and the thumb mode gesture is disabled when an input overlay is installed; changing the overlay can change gesture availability.

## What the nearby room template provides

Inspected `../../../webxr/room-xr-template-main/src/`:

- `components/UI/BottomPanelUI.jsx`: compact floating dock, reset control, and a separate bottom drag handle.
- `components/UI/ContentPanelUI.jsx`: content panel with its own drag handle, reset, close, and scrollable texture choices.
- `components/Player.jsx`: parents the panel group under the player rigid body; selected-object changes influence its horizontal placement. It is player-relative rather than independently parked in world space.
- Both UI components continuously face a target derived from the player's rigid-body position and interpolate toward drag targets.

Reuse the dock/content/handle pattern, but implement manipulation in our own shell. Reasons not to copy the hook unchanged:

1. `hooks/useDragObject.js` shares the drag offset and pointer identifier at module scope across instances.
2. Pointer move does not verify the owning pointer, and the pointer-up guard uses `&&`, allowing a different pointer to terminate an active drag.
3. No pointer-cancel/lost-capture cleanup is implemented.
4. The UI frame guards use `!panel && !rigidBody`, then dereference both; either missing ref should stop processing.
5. Fixed per-frame interpolation depends on frame rate. Continuous facing also conflicts with a deliberately parked workspace.
6. The template uses Fiber 8, Drei 9, and UIKit 0.8; this project uses Fiber 9, Drei 10, and custom spatial controls. Copying the UI would introduce an unnecessary renderer/dependency migration.

These are source-level findings, not observed headset failures.

## Primary-source findings

- Meta recommends that complex wrist-summoned menus become static in world space rather than remaining on the moving wrist. This directly supports detaching our content from the left hand. [Hands UI best practices](https://developers.meta.com/horizon/design/hands-ui-best-practices/)
- Meta documents hinged layouts with two or three panels grouped at their edges and manipulated together with a handle underneath. A grouped three-panel variant is therefore a supported design pattern; tabs are our recommendation for reducing obstruction, not a Meta requirement. [Panels](https://developers.meta.com/horizon/design/panels/)
- Meta provides panel implementation guidance including Web tooling. These design patterns do not require migrating our existing renderer or grant WebXR native system window chrome. We would implement the analogous shell inside our scene. [Panel implementation](https://developers.meta.com/horizon/design/panels_implementation/)
- Meta documents window/group control bars, movement handles, and corner resizing. These are useful visual and interaction references. [Windows](https://developers.meta.com/horizon/design/windows/)
- Meta recommends clearly distinguishing touch and ray interaction distances, avoiding ambiguous intermediate placement around 0.5–0.8 m and favoring 1 m or more for ray-oriented UI. [Spatial UI inside interactive 3D scenes](https://developers.meta.com/horizon/design/hands-3d-best-practices/)
- WebXR's Gamepads specification excludes browser/platform-reserved buttons. Do not promise that Quest's Meta/Home or menu button can summon our UI; choose an exposed, conflict-free application control and validate it on the target headset. [Reserved buttons](https://www.w3.org/TR/webxr-gamepads-module-1/#ua-platform-reserved-buttons)

Exact Quest OS behavior varies with release and configuration. This research establishes the relevant first-party interaction patterns; the installed headset's system behavior remains to be checked.

## Proposed user experience

```text
       +---------+ +---------------------------+
       | Paint   | | Build                     |
       | Build   | |                           |
       | Settings| | Existing tools / settings |
       |         | |                           |
       | Center  | +---------------------------+
       +---------+      •    ━━━━━━━━━
                         drag handle
```

- **Open:** place the workspace ahead of the current view, slightly below eye level. Orient it toward the user once, keeping roll level.
- **Placement:** start testing around 1.0–1.2 m away with a roughly 0.5 m-wide content panel. These are prototype values, not official Quest dimensions. Tune font size, hit areas, and overall height together in-headset; uniformly enlarging the wand is insufficient.
- **Use:** either controller ray or hand ray/pinch selects tabs and content. Show a clear active-tab state. Preserve current tools, material selections, pagination, and contextual settings.
- **Move:** select and drag the dedicated handle. One pointer owns the gesture until release/cancellation; dragging content controls must not move the workspace. Keep distance/size bounded and provide explicit size controls initially.
- **Park:** release to leave it in place. Do not continuously follow head rotation.
- **Recall:** an exposed app shortcut brings the workspace back into view. Prototype left X only after checking the input profile and conflicts; keep Y for player mode. Provide an accessible hands-only summon control before allowing the UI to be fully hidden. A tiny wrist launcher is an option; it must not recreate a large hand-mounted panel.
- **Navigation:** recall after a mode transition or teleport, once the transition settles; avoid snapping UI during a press. During ordinary movement, let the user park and explicitly recall it. Reset placement on a fresh session rather than persisting raw world coordinates across sessions.
- **Three panels:** optional expanded mode can place Paint, Build, and Settings side by side with shallow inward angles and one shared handle. Avoid three independently drifting windows initially.

## Implementation plan

1. Add a floating workspace root outside `xr-player-scene-root`, within the XR session and scene-layer provider. Add an explicit UI slot to session/player-mode composition so its transform ownership is clear.
2. Reuse existing content and adapter models; introduce a floating shell and vertical tool rail. Keep current navigation state and separate workspace state: active tab, pose, bounded scale, and recall request.
3. Calculate placement from the tracked XR camera's world pose, with a safe horizontal direction fallback when looking straight up/down. Keep UI size independent of scene scaling. Use frame-rate-independent damping only where motion is intended.
4. Implement per-instance, per-pointer handle dragging with capture, cancellation, lost-tracking, session-end cleanup, and correct world/local conversion. Suppress a trailing click after a drag. Add depth adjustment explicitly rather than assuming a ray supplies arbitrary 3D movement.
5. Replace the wand-specific hit query with a spatial-UI root/target query. Include the dock and manipulation handle. Hidden content must not remain raycastable: merely hiding a Three.js group is insufficient for the bridge's manual raycast. Maintain existing scene-drag ownership when a scene drag crosses the menu.
6. Coordinate UI gesture ownership with editor actions, God-mode two-hand manipulation, and locomotion gestures. Do not freeze unrelated controls merely because the panel is open. Audit the thumb-gesture enablement change when removing the old input overlay.
7. Ship ray selection and dragging first. Add touch/poke or additional window layouts after baseline headset validation.

## Acceptance checks for implementation

- Left hand/controller remains visible and available while the menu is open.
- All Paint, Build, and Settings actions still work; tab switches preserve navigation and selections.
- Menu buttons, background, and handle do not paint, build, select, or sculpt through to the scene.
- Scene drags retain ownership across menu crossings; menu drags cannot scale the model or accidentally activate a tool on release.
- Pointer ownership works with two controllers, hand pinch, input switching, tracking loss, cancellation, and session exit.
- Menu size stays stable during God scaling; mode switches, snap turning, and navigation leave it recoverable.
- Hand-only users can recall the UI after it is hidden or out of view. Test the chosen controller shortcut on Quest Browser.
- Verify text readability, comfortable reach, manipulation, depth occlusion, and frame time on Quest 3, seated and standing. Emulator checks do not establish physical comfort.

Implementation should run the existing relevant input/model tests and type check, plus focused tests for placement, visibility/hit routing, and drag ownership. No runtime tests were run for this research-only change.

## Implementation and validation

Implemented on 2026-09-15 after approval to proceed:

- Floating Paint/Build/Settings tabs in a vertical tool rail, one active content panel, and a shared dot-and-bar drag control.
- Stationary UI root outside model scaling. Default opening distance is 1.05 m, with its center 0.1 m below eye level.
- Left-controller X and a small left-hand/controller Menu launcher recall the workspace. Following the user is deferred.
- Per-pointer drag ownership, tracking-loss and session-visibility cleanup, and input routing for both the workspace and launcher.
- Viewer placement reads the XR viewer pose directly, avoiding double application of the host renderer's camera-parent transform.

Validation: TypeScript passes; 88 tests pass. Tested the actual Pascal integration in the Quest 3 emulator: tab switching, controller and hand dragging, tracking-loss release, resizing, Y recall, and stable workspace position/size while the model pans and scales. Menu navigation preserved scene selection. Inspected the rendered layout in the browser. Physical Quest 3 comfort and readability remain to be checked.

Update: removed the hand/controller Menu pill at user request. Left-controller X switches God/Human mode. Recall remains available through left-controller Y and the workspace Recenter button.

Update: widened the main surface to a 1.32:0.92 landscape ratio, enlarged the invisible hit area around the visible drag bar, and matched the room template's direct pointer-offset dragging. Pointer points and initial placement are converted into the workspace parent's coordinate system, preventing jumps after the XR origin changes. Corrected Quest's raw WebXR fallback mapping to X at button index 4 and Y at index 5.
