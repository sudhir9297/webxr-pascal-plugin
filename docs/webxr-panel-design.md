# WebXR panel design

The Build palette keeps the same four-column grid, page, tile sizes, and position
when opening a category. Roof, MEP, and Items open an adjacent area. Closing or
paging that area never rearranges the primary palette. A navigation regression
test covers preserving the main page while browsing sub-items.

Tool defaults and selected-object properties now appear in the Build area's
inspector. Roof options, footprint actions, and parametric controls stay together.
Paint opens its material controls alongside Build; Terrain opens its brush
controls there. Settings shows workspace defaults when nothing is selected and
the selected object's properties otherwise. Collapsible sections and scrolling
keep long lists in the same panel. Changing selection resets the scroll without
switching tabs.

The detail area is absent when there is no relevant content. Category-only
content uses a shorter area; categories with properties expand downward, keeping
the main palette and top edge fixed. Category and property lists scroll independently by holding the trigger or
pinching and dragging vertically. Each overflowing list has a draggable scrollbar. All textures fit within their icon bounds using their native aspect
ratio, and tiles are no longer compressed by nonuniform parent scaling.

The visual pass uses the editor's neutral dark palette: charcoal panels,
gray cards, off-white selection borders, consistent gaps, readable labels, and separate hover/press
states. Action rows size their buttons directly instead of stretching the text.

## References

- [Meta Horizon OS components](https://developers.meta.com/horizon/design/components/)
- [Meta layout guidance](https://developers.meta.com/horizon/design/styles_layouts/)
- [Meta icons and images](https://developers.meta.com/horizon/design/styles_icons_images/)
- [Quest v71 interface reference](https://www.uploadvr.com/meta-quest-v71-horizon-os/)

This adapts the visual approach to the existing Three.js spatial controls; it
does not embed Meta's native UI toolkit.

## Verification

Browser-tested on `localhost:30002` with IWER controller and hand input:

- Roof button world position remained `[0.2883, 6.1550000238418585, 6.95248]`
  before opening, after opening, and after closing its submenu.
- Roof sub-options scroll without changing the main page.
- MEP properties appear inline; a hand pinch changed a pipe diameter.
- Painting opens material options alongside the unchanged Build palette.
- Terrain exposes brush controls in the same area.
- Select removes the empty detail area.
- Catalog thumbnails retain their proportions beside the main tools.

Plugin checks: 94 tests passed and TypeScript passed. The editor app's route
generation and TypeScript check also passed. Physical-headset visual validation
remains necessary for final readability and comfort at different distances.

## Scroll implementation

The existing mesh controls use [XR pointer capture](https://pmndrs.github.io/xr/docs/tutorials/interactions)
for controller and hand drags. A short press activates a control; movement beyond
the drag threshold suppresses activation until release. The viewport owns capture
so moving tiles do not interrupt the gesture. Wheel input is also supported.

World-space material masks clip text, images, and controls consistently in both
XR eyes. Raycasts use the same bounds, preventing hidden options from receiving
input. Category changes reset their scroll position. Main palette placement stays fixed.
