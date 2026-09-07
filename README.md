# WebXR plugin

WebXR session support for the Pascal editor.

Installing the plugin adds a VR button beside Preview. The button starts an
`immersive-vr` session with the current viewer and changes to an Exit VR action
until the session ends. Development browsers without native WebXR hardware use
an emulated Meta Quest 3 runtime with IWER controls.

## Development

```bash
bun install
bun run check-types
bun test
```

The package exposes its plugin manifest, host panel, toolbar button, and viewer
XR configuration from `src/index.ts`. Player modes and locomotion are outside
this first implementation.

## pmndrs documentation

The project configures the pmndrs documentation MCP server in
`.codex/config.toml`. Codex can use it to read the current React Three Fiber,
Drei, Zustand, and React XR documentation while working in this repository.

Restart the Codex client after cloning the repository so it loads the
project-scoped MCP configuration.

## License

MIT
