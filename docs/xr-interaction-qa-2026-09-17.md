# XR wall interaction QA — 2026-09-17

Tested the running editor at `https://localhost:3002/?xrTest=1` in Chrome,
using the IWER emulator. The development-only command form drives controller
trigger and hand pinch events through the normal XR input paths. Scene reads
and intermediate live overrides verify the resulting geometry.

## Changes

- Resolve the host's actual grid input object and carry the controller ray into
  support-surface detection. A desktop/headset camera ray must not choose a
  different construction surface from the controller.
- Ignore hidden or pointer-disabled ancestors in XR target filtering.
- Capture panel-background presses until release/cancel, including when the
  pointer leaves the panel. The backing surface also blocks rays from its rear.
- Move arrow drags through a plane fixed at the grabbed height. Avoid converting
  XR rays to desktop mouse coordinates; ignore near-parallel intersections.
- Mount already-preloaded affordance tools directly, avoiding first-drag
  Suspense delays that discarded the early movement samples.
- Deliver the final controller pose before release. Stop the wall mover from
  accepting floor hover events while React is unmounting it after commit/cancel.

The host changes are applied in
`/Users/sudhir/.t3/worktrees/editor/t3code-ece3a598`. A portable copy is in
[`patches/editor-xr-interactions.patch`](patches/editor-xr-interactions.patch).
Apply that patch to a matching editor checkout when transferring these fixes;
the plugin changes alone cannot repair the host's handle implementation.

## Emulator results

| Scenario | Result |
| --- | --- |
| Wall tool → two floor points with controller | Wall created |
| Existing wall selection → Wall tool → floor drawing with hand | Wall created |
| Controller aimed from viewer/standing height | Wall created |
| Continued wall segment, then Select to cancel | Second segment created; returned to selection |
| Human mode: controller floor drawing | Wall created |
| Human mode: hand floor drawing after selection | Wall created; cancelled cleanly |
| Side-arrow controller drag with grid enabled | Followed 0.5 m steps; committed 1 m translation |
| Side-arrow hand drag | Committed; returned to idle |
| Side-arrow controller drag with structural snapping off | Ten uniform 0.1 m steps; no release jump |
| Wall height arrow with controller | Height changed; returned to idle |
| Wall endpoint with hand | Endpoint changed; returned to idle |
| Wall tool panel button | Activated once; zero leaked grid/node clicks |
| Press panel background, release over wall: controller and hand | Zero node clicks |
| Move workspace, repeat background press/release: both inputs | Zero node clicks |
| Reload and re-enter XR | Passed repeatedly |

The unsnapped movement trace was approximately 2.9, 2.8, 2.7, …, 2.0 m;
release retained 2.0 m and cleared its live override. Whole-wall movement uses
the host's `polygon` snapping context; wall drafting uses `wall`.

Before the fixes, a panel-background press released over a wall emitted a node
click. The side arrow failed to move, and a delayed tool mount could leave a
floor-driven preview after release. Both failures were reproduced in the emulator.

## Validation and local setup

- Plugin: 135 tests passed, zero failures; TypeScript passed.
- Host focused tests: 16 passed, including ray geometry, pointer ownership,
  support-surface selection, and preloaded affordance mounting.
- Host editor package and editor app type checks passed; nodes build passed.
- The temporary vendor copy and resolution aliases were removed. The running
  host uses its installed `@webxr/plugin`; changed plugin source files were
  synchronized into that local installation.
- The HTTPS server remains on port 3002. Test geometry remains in the local
  blank canvas; saved scenes were not deleted.

Coverage is specific to these wall, panel, and handle flows. Physical headset
tracking, perceived latency, and every other node/tool combination were not
exhaustively tested. The emulator cannot establish hardware smoothness.


## Headset follow-up fixes and verification

The host now resolves this plugin through the user's workspace symlink. Its
`packages/nodes` package was rebuilt because the app imports that package's
`dist` output. The editor and plugin source packages are consumed directly.
The portable patch above has been refreshed to include the following host fixes.

- Keep `SnapAwareGrid` mounted in VR: the old scene-content condition explicitly
  excluded XR. Show the lattice during immersive placement even with snapping off.
- Convert world placement points and normals into the grid parent's coordinates;
  the scalable XR root must not apply its transform twice.
- Preserve the grid layer across Three's base-camera-to-stereo camera update.
- Use published construction surfaces for controller floor events, independently
  of the grid's visual visibility; read the current input pose each time.
- Keep desktop pointer listeners out of active XR drags and floor events.
- Use continuous rotation for controller handles, and reject grazing ray/plane
  intersections in rotation and height movement.
- Convert wall-height movement into the frozen level frame, preserving scale;
  resume history before committing, and discard previews on cancellation/unmount.
- Seed wall move anchors without snapping a stationary wall. Skip geometry and
  room/surface recomputation when the preview endpoints have not changed.
- Expose polygon/surface and item snapping controls in the headset settings.

Follow-up emulator checks used the same port-3002 app through a temporary
loopback HTTP proxy on port 3003, because the T3 browser rejected the local
HTTPS certificate. The proxy also forwarded HMR. These are emulator results,
not physical-headset latency measurements:

| Scenario | Result |
| --- | --- |
| Controller wall drawing, God and Human modes | Walls created from both points |
| Side-arrow drag, snapping off | Ten 0.1 m steps; final pose retained |
| Stationary side-arrow grab, grid snapping on | No node change or initial snap |
| Wall height, scale 1 | Ten 0.05 m steps; 2.5 → 3.0 m |
| Wall height, scale 0.2, translated and yawed root | 0.1 world-metre lift → 0.5 model metres |
| Column rotation | Ten continuous angles, 0.0491 → 0.3830 radians; final value retained |
| Panel background press, release over wall, controller and hand | No leaked node clicks |
| Draw with scale 0.2, root at [2,1,-3], yaw 0.5 | Wall endpoints near [15,15] and [18,15] |
| Grid in that transformed scene, snapping off | Visible; local Y 0.001, world Y 1.0002; both eye masks include grid layer 8 |

Validation: 135 plugin tests, 18 focused editor tests, plugin/editor TypeScript
checks, and nodes build passed. Hardware tracking jitter, device frame timing,
and every catalog item's placement behavior still require headset coverage.
