# WebXR plugin

WebXR session support for the Pascal editor.

Installing the plugin adds a VR button beside Preview. The button copies the
current editor scene into a dedicated XR preview window. That window uses a
native headset when available and an emulated Meta Quest 3 during local
development.

The plugin owns the XR runtime:

- native and IWER platform setup
- immersive session creation and frame rendering
- default WebXR controller and hand models
- God and Human modes, locomotion, collision, and comfort controls
- tracked pointer rays and stereo-eye layer handling
- the left-hand Build, Paint, and Settings wand UI, including its spatial controls and session state
- the Pascal editor input bridge, preview environment, and development emulator harness
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
├── preview/  # standalone scene host and immersive error boundary
├── testing/  # development emulator harness
└── wand/     # host bindings plus Build/Paint/Settings/Terrain models
```

## Development

```bash
bun install
bun run check-types
bun test
```

The root package exposes its manifest, toolbar button, preview handoff, runtime
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
