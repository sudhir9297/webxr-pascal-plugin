# First-person and mode-switching audit — 2026-09-18

Scope: original audit of plugin source, editor integration, existing QA notes, focused tests, and a synthetic collision reproduction. Findings below describe the original baseline; implementation status is tracked separately. This is not a physical-headset usability certification. Research references are in [the companion notes](first-person-ux-research.md).

## Implementation progress

- [x] **Item 1 — reachable mode switch:** compact inner-wrist ring with mode, panel visibility and panel recall actions; supports tracked hands and controllers. Controller placement corrected and checked in the Quest 3 emulator. Accepted complete by the user. Transition input locking remains item 3; broader locomotion arbitration remains item 13.
- [x] **Item 2 — safe standing destination: complete, accepted by the user.** Editor ground/slabs/terrain/roads supply explicit walkable geometry; roofs/items/walls supply obstacles. Entry requests open a destination preview; trigger/pinch places it and enables Enter/Replace/Cancel. Confirmation rechecks the exact placed point against current geometry. Entry preserves model-relative heading and floor elevation, including basements. Unit tests cover the query, classification, transforms, stale destinations and mode-request state; emulator checks cover placement, replacement, and entry/return. Physical Quest 3 and real multi-level testing remain unverified; user acceptance does not imply hardware certification. Fades and transition input locking remain item 3, grounded traversal remains item 6.

- [ ] **Item 3 — comfortable transitions: implemented, acceptance pending.** Shared fade/commit sequence in both directions, input lock, editor cancellation, and tracked-neutral release-to-rearm. Automated and emulator checks pass; physical headset comfort and broader mid-drag acceptance remain pending.

## Current controls

### Item 3 — comfortable transitions (implemented, acceptance pending)

- Both directions share fade-out → full black frame → validated pose/scale commit → fade-in.
  Each fade is approximately 180 ms; a long frame cannot skip the opaque commit boundary.
- Navigation, room-scale correction and spatial/editor pointer input remain locked through
  fade-in and until tracked inputs stay neutral for 150 ms. Hands require release of selection
  and locomotion pinches/palm grabs; controllers require released buttons/grips and centered sticks.
- Mode requests are ignored while locked. An in-headset release prompt remains readable near walls.
  The rig pauses on missing viewer tracking/focus and resets on session teardown.
- Editor interruption routes through Escape/cancel, abandons live terrain strokes, clears
  deferred releases and cancels pointer captures. Panel scroll/drag/resize interactions end too.
  It does not synthesize a commit-on-release event for active edits.
- Verification: 183 tests pass, including phase timing, exactly-once commit, repeated requests,
  neutral controller/hand poses, tracking gaps, and IWER null axis slots. Emulator checked
  entry/return, held-grip locking and release-to-rearm. Physical Quest 3 comfort/stereo checks,
  focus interruption on hardware, and a broader matrix of editor mid-drag operations remain
  manual acceptance work; do not interpret emulator results as headset certification.

### Item 2 explicit placement verification

Latest item 2 interaction: right trigger/pinch explicitly places the destination. The marker
locks and turns green; the popup then offers Enter / Replace / Cancel. Enter cannot confirm
an unplaced preview. Replace clears placement. World editing pointers are suspended during
targeting; UI-started presses cannot place a floor target. Click-time rays are queried afresh,
and confirmation still revalidates the exact placed point. Automatic spawn substitution is
disabled in this flow. Head poses come from animation frames, not input-event frames.

Verification: 168 tests pass. Quest emulator exercised trigger placement, moving aim without
losing placement, Replace clearing placement, replacement placement, and Enter via the shared
desktop action. Physical Quest 3 pinch/trigger and multi-level acceptance remain pending.
The final emulator regression confirmed placement on the first trigger press/release, then
successful Enter and return to God. Placement uses selectend because IWER emits select before
selectstart; UI press ownership is checked at both ends of the gesture.

### Earlier item 2 follow-up verification (before explicit placement)

The first implementation incorrectly excluded `site` meshes, including the visible flat ground and sculpted terrain, so ordinary scenes could never enable Enter. Site surfaces now participate; presentation-only horizon geometry remains excluded. Targeting follows the right input's ray and preserves the displayed destination while aiming at UI or confirming. Retarget explicitly clears the previous point and disables automatic spawn reselection. Status text updates no longer clear a pending confirmation.

Regression tests reproduced the excluded-site and swallowed-confirmation failures before the fixes. All 165 plugin tests and TypeScript checks pass. The live Quest 3 emulator completed preview → Enter → God, then Retarget → move right input → Enter → God using the shared desktop action controls. Native Quest 3 hand/trigger activation and multi-level scene acceptance remain pending; no saved scene geometry was changed during these checks.

The following controls describe the original audit baseline:

- Controllers: left X toggles God/Human, left stick translates relative to headset yaw, right stick snaps by 30 degrees at default sensitivity.
- Hands: palm up in an activation zone, thumb–middle-finger pinch; left hand moves, right hand continuously turns. Thumb–index selection remains separate.
- A two-thumb hold gesture exists (4.5 cm proximity, 0.8 seconds), but `PlayerModeScene` disables it whenever `uiContent` or an input overlay is supplied. The Pascal editor supplies floating workspace UI, so this shortcut is disabled there.
- Hands can instead show/recall the panel from the left wrist and use Settings → XR scale. The wrist itself has no mode-switch button.

## Confirmed defects and high-priority gaps

1. **Direct hand switching disabled in the editor.** See [player-mode-scene.tsx](../src/xr/mode-switching/ui/player-mode-scene.tsx), `PlayerModeHandToggle` mounting; [inline-session.tsx](../src/integrations/pascal-editor/inline-session.tsx) supplies `uiContent`. Replace blanket disablement with shared input ownership and provide a permanently reachable, clearly labelled mode action. Do not merely re-enable an invisible gesture.
2. **Entry does not validate a standing destination.** [scene-scale-transition.ts](../src/xr/mode-switching/lib/scene-scale-transition.ts) projects to Y=0 and fixes origin Y=0. It does not resolve floor surfaces, upper levels, terrain height, head clearance, or a spawn node. Add a destination preview, walkable-surface query, clearance check and safe fallback. Preserve arrival heading relative to the model.
3. **Transition visibly changes scale and moves the camera.** [player-mode-scene.tsx](../src/xr/mode-switching/ui/player-mode-scene.tsx) resets the root immediately and then exponentially interpolates origin position/rotation. There is no transition fade or input lock. Use fade out → validated pose/scale change → fade in; release/cancel active operations and require neutral input before rearming. Test rapid repeated switching and switching mid-drag.
4. **Collision broad-phase misses low obstacles.** [capsule-collision.ts](../src/xr/human-mode/lib/capsule-collision.ts) tests a sphere against the eye's movement segment, inflating only by capsule radius; the body extends well below that segment. Reproduced with a 0.6×0.6×0.1 m box centered at Y=0.55, eye at Y=1.65, and a 2 m Z movement. With a computed bounding sphere it travels 2 m through the box; bypassing sphere rejection correctly stops at about 0.7 m. Use a swept capsule bound, not an eye-path bound.
5. **Collision membership becomes stale.** [human-collision-rig.tsx](../src/xr/human-mode/input/human-collision-rig.tsx) stops collecting as soon as any BVH colliders exist. Later-loaded/created meshes are absent; removed meshes can remain referenced until mode changes. It checks a mesh's visibility, not its ancestors, and has no explicit walkability/collision classification. Refresh membership from scene/geometry lifecycle events, including batching paths.
6. **No complete ground locomotion model.** Human movement is horizontal plus penetration correction. There is no gravity/ground probe, slope limit, step-up/down policy or ledge handling. `translateOrigin` clamps origin Y to zero or above, precluding intentional below-ground travel. Add explicit grounded traversal for terrain, stairs, ramps and basements; collision resolution alone is not walking physics.
7. **Physical collision moves the world against real head motion.** The room-scale rig adds penetration correction to the XR origin. This prevents virtual wall crossing but breaks one-to-one visual correspondence during physical walking. Evaluate proximity warning/occlusion and last-safe-position recovery instead of continuously pushing the view. Virtual collision is not protection against physical obstacles; retain platform boundary behavior.

## Hand movement and input arbitration

8. **Movement can start from a stationary pinch.** [hand-locomotion.tsx](../src/xr/human-mode/input/hand-locomotion.tsx) seeds `pinchOrigin` from the zone center, not the pinching hand. Pinching off-center inside the zone immediately commands movement/turning on the next frame. At a 6 cm offset, the default normalization commands about 0.64 m/s without subsequent hand displacement. Prefer a joystick anchored at pinch onset, or an explicit center-before-activation rule.
9. **Activation zones do not follow physical facing direction.** [hand-locomotion.ts](../src/xr/human-mode/lib/hand-locomotion.ts) offsets only the head position in origin coordinates. Physically turning the head/body does not rotate those offsets, although motion direction is headset-relative. Use an intentional, stable yaw anchor, without making the activation target chase every glance. Test 90/180-degree physical turns.
10. **Hover stops hand locomotion.** `spatialUIInputOwnership.busy()` includes hovering, not just pressing. A hand ray crossing a floating panel stops the hand controls, reproducing the class of UX conflict previously addressed for God navigation. Establish ownership on gesture onset; distinguish UI selection from a dedicated locomotion pinch. Controller locomotion has no equivalent gate, so the policies also differ.
11. **No release-to-rearm after interruption.** A still-pinched hand can reactivate after leaving UI hover or after tracking returns. Clear locomotion on interruption and require a new intentional pinch. Also handle session focus changes and reference-space resets explicitly, rather than treating jumps as room-scale movement.
12. **Ready feedback is immediately cleared.** In hand controls, `setHandLocomotionState(..., 'ready')` is followed by `hideHandLocomotionJoystick` whenever not pinching; that helper sets state back to idle. The component's local state can remain 'ready', preventing a subsequent update. Keep readiness separate from active joystick visibility.
13. **No unified locomotion/input owner.** Controller and left-hand controls both write one global artificial-speed variable; one can overwrite the other's contribution. Simultaneously exposed hand/controller sources also lack explicit movement arbitration. Aggregate committed movement once per frame, with one active locomotion owner and a consistent UI/tool/transition policy.

## Comfort and accessibility

14. **No teleport alternative.** Add arc/point teleport with valid/invalid destination feedback, headroom checks, orientation preview, cancel and a comfortable transition. Support controllers and hands; keep smooth locomotion optional.
15. **Hand/controller turning differs.** Controllers snap, hands turn continuously. Offer snap, smooth and physical-only turning consistently, including selectable snap angle and independent smooth angular speed. Current `turnSensitivity` scales both unrelated concepts.
16. **The vignette is uniform dimming.** [comfort-vignette.tsx](../src/xr/human-mode/ui/comfort-vignette.tsx) renders an unmasked translucent black plane, not a peripheral mask. It reads translation speed only, so turning alone produces no effect. Replace with a stereo-correct peripheral vignette, optional and adjustable, driven by actual artificial linear/angular movement and tested per eye.
17. **Settings exist but are not exposed in the panel.** `useLocomotionSettings` has speed/sensitivity setters, but the current panel does not consume them. Settings are not persisted. Expose a simple comfort preset plus advanced controls, and save user preferences locally.
18. **No seated/height or handedness profile.** The body capsule uses fixed eye-relative dimensions; hands are hard-coded left=move/right=turn, controller shortcut left X, wrist panel left only. Provide seated/standing calibration, handedness swapping and a one-hand-capable alternative. Avoid scaling the architectural world to solve seated eye height.
19. **Abrupt velocity and turn activation.** Linear input maps directly to speed; snap threshold has no separate release hysteresis. Consider a short configurable ramp, a dead-zone response curve and deliberate snap rearming, verified for comfort rather than assuming more smoothing is always better.
20. **No hands-only onboarding for these gestures.** MOVE/TURN rings do not explain palm-up plus middle-finger pinch or switching. Provide a brief interactive rehearsal, visible active/ready states, gesture-hold progress/cancellation, and a replayable help panel. Hand haptics are not a reliable feedback channel; use visual and optional audio confirmation.

## Navigation, recovery and validation

21. **No remembered first-person location or accessible player rescue.** Each entry recomputes from the God view; returning to God restores the model transform but resets the origin to its fixed default. Store safe per-mode poses and distinguish Enter here, Resume walkthrough and Reset view. The existing Bring here action rescues the panel, not the player.
22. **Mode switch is not coordinated with editing.** Player mode toggles do not consult active tool/drag state, and the editor input bridge continues to operate in Human mode. First-person editing may be intentional, but switching must finish/cancel safely. Offer an explicit walk-only toggle rather than silently disabling all editing.
23. **Switch naming and reachability are weak.** 'XR scale' / 'Human' is less clear than 'Walkthrough — life size' / 'God — overview'. Put the switch in a permanent toolbar/wrist action, not only settings. Keep the current mode and return action obvious without persistent visual clutter.
24. **Lifecycle and hardware validation are incomplete.** Panel code handles focus loss, but movement/transition rigs do not explicitly share that suspension/reset policy. The [WebXR specification](https://www.w3.org/TR/webxr/) defines visibility changes and reference-space reset discontinuities; cancel input and resynchronize anchors around those events. Existing QA is emulator-based. Measure frame time, hand occlusion, lighting sensitivity, re-entry, physical turning, seated use and long-session comfort on devices. Quality presets already exist; do not label performance support absent.

## What already works / should be retained

Distinct middle-pinch locomotion and index-pinch selection; pinch hysteresis; controller snap turns; speed normalization; capped movement delta; swept collision substeps; rotate-about-head compensation; saved God model transform; wrist panel recovery; panel recall after mode change; quality presets and substantial emulator tests.

## Verification performed this audit

`npx --yes bun test src/xr/human-mode src/xr/mode-switching src/xr/spatial-ui.test.ts`: 18 passed, 0 failed, 59 assertions. These unit tests do not mount the integrated editor, so they cannot detect the disabled hand-toggle path. A read-only Bun diagnostic reproduced the low-obstacle collision failure above. No new headset or browser interaction test was claimed.

## Suggested implementation sequence

1. Reliable always-reachable mode switch, shared input owner, release-to-rearm and safe fade transition.
2. Safe floor-aware entry, collision fixes, grounded traversal and player rescue.
3. Teleport plus consistent turning/comfort choices, persisted preferences.
4. Hand anchoring/readiness, onboarding, seated/one-handed profiles.
5. Headset acceptance matrix and performance/comfort measurements before release.

## External design baseline

- [VRChat's hand-tracking update](https://docs.vrchat.com/docs/vrchat-202441) documents alternative wrist menu openers in response to conflicts with system gestures. This supports alternative, discoverable menu access; it does not prove a particular gesture is optimal for this editor.
- [Meta locomotion preferences](https://developers.meta.com/horizon/design/locomotion-user-preferences/) recommends teleport/snap defaults, opt-in continuous movement, configurable direction mapping, accessible in-session settings and persistence. Our current implementation also lacks a choice between head-relative, initial-heading and hand-relative movement.
- [Unity Hands Interaction Demo](https://docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.0/manual/samples-hands-interaction-demo.html) demonstrates input-modality and gesture arbitration, including suppression around system gestures. The native implementation is a reference, not an API available automatically in WebXR.
- [Unity tunneling vignette](https://docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.0/manual/tunneling-vignette-controller.html) provides configurable aperture and transition behavior, unlike our uniform dimming plane.

The research skill was used to collect first-party references separately from the code audit. Recommendations still require representative headset/user testing; no reviewed VRChat source establishes controlled UX-study results or an optimal universal gesture mapping.
