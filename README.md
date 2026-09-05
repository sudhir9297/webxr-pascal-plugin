# WebXR plugin

WebXR tools and editor integration for immersive experiences.

This repository contains the WebXR package shell. Runtime features and editor
integration will be added as the WebXR requirements are defined.

## Development

```bash
bun install
bun run check-types
bun test
```

The package implements the editor host's public plugin contract through
`@pascal-app/core`.

## XR structure

- `src/xr/god-mode` handles scene-scale navigation, controller grips, and hand
  palm grabs.
- `src/xr/human-mode` handles first-person locomotion, collision correction,
  snap turning, haptics, and comfort UI.
- `src/xr/mode-switching` contains the shared God/Human mode state.

## pmndrs documentation

The project configures the pmndrs documentation MCP server in
`.codex/config.toml`. Codex can use it to read the current React Three Fiber,
Drei, Zustand, and React XR documentation while working in this repository.

Restart the Codex client after cloning the repository so it loads the
project-scoped MCP configuration.

## License

MIT
