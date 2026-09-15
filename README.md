# WebXR plugin

WebXR session support for the Pascal editor.

The VR button enters the current editor scene in place. It uses a native
headset when available and an emulated Meta Quest 3 during local development.
No route change, popup, scene snapshot, or second scene store is needed.

The plugin owns the XR runtime:

- native and IWER platform setup
- immersive session creation and frame rendering
- default WebXR controller and hand models
- God and Human modes, locomotion, collision, and comfort controls
- tracked pointer rays and stereo-eye layer handling
- a floating Build, Paint, and Settings workspace, including its spatial controls and session state
- the Pascal editor input bridge, inline session integration and development emulator harness
- Pascal-specific Build, Paint, Terrain, selection, and parametric-settings models

The Pascal viewer remains the host for the scene renderer, lights, materials,
and camera theme. The editor supplies a small `PascalXRWandBindings` object for
private desktop commands that are not part of the public editor package API.
The plugin turns those bindings into its `XRWandAdapter`; the editor does not
implement the XR session, player modes, controller/hand attachment, input
bridge, emulator harness, or wand models and rendering.

Pascal-specific host integration is isolated from the generic WebXR runtime:

```text
src/integrations/pascal-editor/
├── input/    # editor event routing and reference-space ray conversion
├── inline-session.tsx # live editor session and toolbar controls
├── testing/  # development emulator harness
└── wand/     # host bindings plus Build/Paint/Settings/Terrain models
```

## Development

### Floating XR workspace

The Pascal integration opens a stationary workspace 1.05 m ahead of the user. Paint,
Build, and Settings share one tall panel with a compact vertical tool rail on its
left. Drag the bar below the panel to move it. Panel size remains available in
Settings, and tab navigation and tool selections are preserved.

Press left-controller **Y** to bring the workspace back in front of you.
The tool rail also has a Center button. **X** switches between God and Human
mode. The workspace stays independent of God-mode model scaling and does not
follow the user. Direct touch/poke interaction is not enabled; use rays and
trigger/pinch selection.

### Local checks

```bash
cd ../editor
bun install
cd ../webxr-pascal-plugin
bun run check-types
bun test
```

The sibling `../editor` checkout is used for local Pascal package development.
The editor workspace includes `../webxr-pascal-plugin` and the app depends on
`@webxr/plugin` through `workspace:*`. Run `bun install` in `../editor` after
cloning both sibling repositories.
Its Turbopack aliases resolve both projects to the host's React, Three, Fiber,
XR, and Pascal packages so the scene and controller stores stay shared.

The host calls `usePascalWebXR(webXRWandBindings)`, passes `feature.immersive`
to `<Editor immersive={...}>`, and mounts `<PascalWebXRButton feature={feature} />`
beside Walkthrough. The plugin prepares XR before the click, requests the
session during the click, and ends it on unmount. Exit restores the desktop
view, camera, wall and level modes. Build/Paint changes remain in the live scene.

The root package exposes its manifest, toolbar button, session wrappers, runtime
hooks, viewer configuration, player modes, and generic wand API. Pascal editor
integration is exposed separately from `@webxr/plugin/pascal-editor` so generic
consumers do not eagerly load editor-only modules.

## pmndrs documentation

The project configures the pmndrs documentation MCP server in
`.codex/config.toml`. Codex can use it to read the current React Three Fiber,
Drei, Zustand, and React XR documentation while working in this repository.

Restart the Codex client after cloning the repository so it loads the
project-scoped MCP configuration.

## License

MIT
