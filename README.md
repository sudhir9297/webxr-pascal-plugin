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

The Pascal viewer remains the host for the scene renderer, lights, materials,
and camera theme. The editor supplies its editing tools and wand panel as
children. Neither package implements the XR session or player modes.

## Development

```bash
bun install
bun run check-types
bun test
```

The package exposes its plugin manifest, toolbar button, preview handoff,
runtime hooks, viewer configuration, player modes, and session modules from
`src/index.ts`.

## pmndrs documentation

The project configures the pmndrs documentation MCP server in
`.codex/config.toml`. Codex can use it to read the current React Three Fiber,
Drei, Zustand, and React XR documentation while working in this repository.

Restart the Codex client after cloning the repository so it loads the
project-scoped MCP configuration.

## License

MIT
