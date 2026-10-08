# Ember Hollow Room Editor

The standalone Ember Hollow room blueprint editor: a browser-based tool for authoring orthogonal side-view room layouts.

**Open the editor:** https://kyledanderson92-lab.github.io/Ember-Hollow-Room-Editor/

The website opens directly into the editor. No login, installation, backend, or database is required. This repository contains only the standalone editor distribution and editable examples.

## Use

Draw floor-aligned corridors and connect them with shafts. Place blue entry and purple exit doors, red labeled enemy markers, green one-way platforms, hazards, and annotations. Select objects to move, resize, edit, duplicate or delete them. Validation checks the geometric Entry → Exit path, disconnected islands, exact floor alignment, doorway clearance, and marker placement.

- Save/load complete, human-readable room JSON to continue editing on another computer.
- Export clean schematic PNG at 1×, 2× or 4× and vector SVG.
- Undo/redo edits, zoom with the mouse wheel, and pan with middle mouse or Space + drag.
- Select TW-01 or TW-02 from Examples to load editable demonstration rooms.
- Browser autosave restores work on this browser/origin; JSON is the portable document.

Keyboard tools: V select, C corridor, S shaft, I entry, O exit, E enemy, P platform, H hazard, A annotation, X erase. Delete removes selection. Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redoes; Ctrl/Cmd+S saves JSON. Escape cancels a gesture.

Room coordinates are logical grid cells, positive X right and Y down. Default scale is 90 world units per cell, an editor default rather than canon. Floor 0 is lowest. Corridor ceiling and floor elevations are exact. Door opening height is 270 world units; canonical opening width and stitching anchor remain explicitly unresolved. Geometric connectivity does not simulate player movement. Example layouts are editor demonstrations, not canonical gameplay scenes.

## Offline Windows use

Download this repository as a ZIP and extract it. Double-click `launch_editor.bat` or `index.html`. The app and examples are bundled and need no server or development tools. If local file pages are blocked, `launch_http.bat` uses built-in Windows PowerShell to serve this folder on http://localhost:8765 and open it automatically. No administrator rights or execution-policy changes are required. Keep the console open; Ctrl+C stops it.

## Maintaining the public distribution

The canonical development copy remains in the separate development repository's `tools/room_editor/` directory. This repository is a runtime distribution. Do not merge development-repository history or copy its root into this repository.

Maintainers use `tools/room_editor/scripts/sync-public.mjs` from the development checkout. It validates the generated bundle, targets this exact public repository, and copies only a fixed allowlist of runtime files and examples. Its default is a dry run; `--apply` performs the copy. It does not commit or push automatically.

```sh
# From the canonical development repository root:
node tools/room_editor/scripts/build-portable.mjs
npm test --prefix tools/room_editor
# Public checkout must be clean and point to this repository:
node tools/room_editor/scripts/sync-public.mjs ../Ember-Hollow-Room-Editor
node tools/room_editor/scripts/sync-public.mjs ../Ember-Hollow-Room-Editor --apply
# Review the public diff before publishing:
git -C ../Ember-Hollow-Room-Editor diff
# Then commit and push the public update:
git -C ../Ember-Hollow-Room-Editor add .
git -C ../Ember-Hollow-Room-Editor commit -m "Update room editor"
git -C ../Ember-Hollow-Room-Editor push origin main
```

GitHub Pages serves the public `main` branch root; pushed updates redeploy automatically. `.editor-public-files.json` records the complete allowed public file set. No private game code, assets, documents or Git history belong in this distribution.
