# WebXR browser QA — 2026-09-16

Tested Chrome at `http://localhost:30002/?xrTest=1`, using the IWER Quest 3
emulator and real controller/hand XR events through the opt-in development UI.
Node reads verified that interactions changed the live editor scene.

## Host setup

- Editor branch: `t3code/add-webxr-project-structure`.
- Active worktree: `/Users/sudhir/.t3/worktrees/editor/t3code-ece3a598`.
- The running app resolves `apps/editor/vendor/webxr-plugin`. Plugin source
  changes were synchronized there as well as retained in this repository.
- The viewer resolves its built output; its build was refreshed.
- Existing unrelated changes in both repositories were preserved.

## Fixes

- Pass the plugin's immersive Session and Scene components through Editor
  into Viewer, retaining the plugin input bridge and floating workspace.
- Recreate the canvas when switching between desktop and immersive rendering
  so an emulated WebGL XR session cannot attach to the desktop WebGPU renderer.
- Keep editor tools, selection, and arrow handles mounted in immersive mode.
- Wait for a tracked XR pose before placing the floating workspace.
- Add the furniture catalog with pagination and a pinned Select action.
- Keep Select available in roof/MEP sections and fit their primary tool grids
  inside the floating panel.
- Route Select through the editor's cancellation action, preload selected
  objects' move tools, and deliver the final drag position before release.

## Browser results

| Check | Result |
| --- | --- |
| Enter, exit, re-enter VR | Passed; desktop rendering recovered |
| Initial workspace, recenter, hand workspace drag | Passed |
| Main build tool activation and pagination | Passed |
| Furniture catalog pagination with hand pinch | Passed; Select remains available |
| Catalog asset placement | Cactus loaded and placed |
| Controller and hand selection | Passed on scene objects |
| Controller object movement | Committed position changed; interaction returned to idle |
| Column height setting | Changed from 2.5 to 2.55 |
| Controller height arrow | Changed column height to approximately 3.05 |
| Hand radius arrow | Changed column radius to approximately 0.62 |
| Wall, fence, slab, ceiling, column, shelf, block | Created nodes through XR build tools |
| Elevator, spawn, stair, modular cabinet | Created nodes, including expected children/level |
| Door and window | Created nodes attached to test walls |
| Duct segment, duct terminal, HVAC, pipe, lineset, liquid line | All six created nodes |
| Gable, hip, flat, shed, gambrel, mansard, Dutch roof | All seven created roof nodes |
| Conical roof | Tool activated with its wall-based placement mode; creation not exercised |
| Browser error log after fixes | No new errors during the verification sessions |

Test objects remain in the local blank-canvas scene for inspection. Existing
scene objects were not deleted.

## Automated checks

- Plugin: `bun test` — 93 passed, 0 failed, 262 assertions.
- Plugin: `bun run check-types` — passed.
- Host viewer: `bun run build` — passed.
- Host editor package: `bun run check-types` — passed.
- Host editor app: `bun run check-types` — passed (route generation and TypeScript).

## Coverage limits

This verifies browser emulation, not a physical headset. Native session entry,
real controller profiles, tracking loss, and hardware performance still need
headset testing. Catalog assets were sampled rather than all downloaded.
Roof accessories, terrain sculpting, painting, and every individual parametric
setting were not exhaustively exercised. Resize handles follow the host node
definitions; this change does not add new resize capabilities to node types
that only expose rotation or movement handles.

## Scroll follow-up

- Long sub-item lists and contextual properties now scroll independently.
- Controller drag moved roof options by 0.321 panel units without changing the roof type.
- A short press selected Mansard after scrolling.
- Hand pinch-drag moved properties by 0.401 panel units without invoking an action.
- Dragging the scrollbar reached the final roof options, clamped at 0.95.
- Off-screen Gable returned zero raycast hits; text and tiles clipped at viewport bounds.
- Browser error log was empty during this verification.
- Plugin TypeScript and all 101 tests (386 assertions) passed; editor app TypeScript passed.

These input checks use the Quest 3 emulator; physical headset feel and performance
remain unverified.

## Paint panel follow-up

- Replaced six-item pages with a clipped four-column material scroller, larger
  previews, fixed controls, and a direct category picker (12 categories).
- Paint and Erase have exclusive active states. Paint restores the brush after
  erasing; Done returns to selection. Re-entering Erase after Done works.
- Hand drag scrolled materials by 0.289 panel units without choosing a material.
  Category navigation reset the viewport to the top.
- Hand selection opened Wood; native-aspect thumbnails rendered correctly.
- Controller/hand clicks painted a door panel with Charcoal. Whole-object scope
  applied it to panel, frame, glass, and hardware. Erase restored all four slots.
- Floor Plank 1 texture applied as `library:wood-floorplank1`; the test surface
  was erased afterward. Final browser session reported no console errors.
- Plugin TypeScript and 104 tests passed; editor app TypeScript passed.

The editor worktree lacked generated material assets. Existing generated files
were copied from the sibling editor; 235 remaining files were generated from
local originals. All 314 catalog asset references now exist. To prepare another
local checkout, run:

```sh
node scripts/prepare-local-material-assets.mjs /absolute/path/to/editor
```

The helper requires the editor's installed `sharp` and `ktx-parse` packages,
leaves existing assets untouched, and reports ambiguous/missing source images.
Its fallback KTX2 files use uncompressed RGBA at up to 512 pixels; production
GPU-compressed asset generation remains preferable for download size and memory.
Physical-headset performance has not been measured.

## Settings panel follow-up

- No selection shows workspace defaults. Selecting Wall or Column keeps Settings
  open and shows object properties; Deselect restores defaults.
- Fixed headers, collapsible sections, and a clipped scroll area replace dense
  pagination. Selection changes reset scroll position.
- Wall controls cover dimensions, top/bottom modes, curvature, 1–4 face bands,
  skirting, crown molding, and chair rail.
- Browser checks changed custom height with hand input, restored level-bound
  height, toggled terrain fill, enabled four bands, and edited skirting sides,
  profile, and height. Crown molding enabled; live node reads confirmed edits.
  Test wall styling remains available for inspection.
- Hand dragging scrolled properties by 0.482 panel units. Selecting Column reset
  the offset to zero. Column increment/decrement and workspace grid snap worked.
- Automated tests cover all trim profiles/sides, band visibility, nested values,
  curved length edits, height modes, and hosted-opening curve restrictions.
- Plugin: 118 tests, 651 assertions, no failures. Plugin and editor app TypeScript
  passed. Final browser session had no console errors.
- Host Tailwind excludes public assets from source scanning after generated
  materials stalled stylesheet compilation.

Browser coverage is representative, not exhaustive for every custom desktop
editor. Physical headset readability and input feel remain unverified.
