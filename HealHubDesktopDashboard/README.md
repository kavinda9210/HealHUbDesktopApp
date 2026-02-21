# Vue 3 + TypeScript + Vite

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about the recommended Project Setup and IDE Support in the [Vue Docs TypeScript Guide](https://vuejs.org/guide/typescript/overview.html#project-setup).

## Manual desktop updates (Windows)

This app uses Tauri + an NSIS installer. To ship an updated downloadable installer (manual update):

1. Bump the version (keep the same `identifier` so it upgrades the existing install):
	- `src-tauri/tauri.conf.json` → `version`
	- `src-tauri/Cargo.toml` → `[package].version`

2. Build the installer:
	- `npm install`
	- `npm run tauri build`

3. Upload/share the generated installer:
	- `src-tauri/target/release/bundle/nsis/*.exe`

Installing the new `.exe` will replace/upgrade the existing app as long as the `identifier` stays the same.
