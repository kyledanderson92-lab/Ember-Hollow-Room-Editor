# Ember Hollow Room Editor

The standalone Ember Hollow room blueprint editor: a browser-based tool for authoring orthogonal side-view room layouts.

**Open the editor:** https://kyledanderson92-lab.github.io/Ember-Hollow-Room-Editor/

The website opens directly into the editor. No login, installation, backend, or database is required. This repository contains only the standalone editor distribution and editable examples.

## Use

Paint snapped rectangles with **Carve Space** (white) and **Fill Geometry** (black). Fixed floors, Corridor and Shaft authoring have been removed. Build variable-height passages, tall chambers and split/rejoin routes without floor alignment. Select rectangles to move, resize using their bottom-right handle, edit, duplicate or delete. The All objects dropdown selects hidden/overlapping operations. Place blue entry/purple exit doors by clicking their opening top, red enemy markers, green one-way platforms, hazards and annotations. Validation uses final white space for connectivity, islands, doorway coverage and enemy placement, and checks rectangle validity, bounds, naming and marker bounds.

Schema v2 stores ordered `geometry_operations` with type carve/fill, x/y/width/height and stable ID. Starting with solid room bounds, replay first-to-last: carve adds white space; fill removes it; later operations override earlier ones. Exact rectangle subtraction supplies the same final geometry to display, validation and export. Duplicates append and run last; deletion replays remaining operations. Edges snap to the configurable logical grid; visible grid is optional. Property editing accepts snapped rectangle values. A zero-area drag does nothing.

Old schema v1 JSON/autosave migrates automatically: stored corridor/shaft coordinates become carve rectangles, old floor settings/metadata are removed, and doors/markers retain their positions. Saving writes v2. Old geometry is never recalculated from floor settings.
- Save/load complete, human-readable room JSON to continue editing on another computer.
- Export clean schematic PNG at 1×, 2× or 4× and vector SVG.
- Undo/redo edits, zoom with the mouse wheel, and pan with middle mouse or Space + drag.
- Select TW-01 or TW-02 from Examples to load editable demonstration rooms.
- Browser autosave restores work on this browser/origin; JSON is the portable document.

Keyboard tools: V select, C Carve Space, F Fill Geometry, I entry, O exit, E enemy, P platform, H hazard, A annotation, X erase. Delete removes selection. Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redoes; Ctrl/Cmd+S saves JSON. Escape cancels a gesture.

Room coordinates are logical grid cells, positive X right and Y down. Default scale is 90 world units per cell, an editor default rather than canon. Door opening height is 270 world units; canonical opening width and stitching anchor remain explicitly unresolved. Geometric connectivity does not simulate player movement. Example layouts are editor demonstrations, not canonical gameplay scenes.

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

## Flip the entire room

Use **Flip Horizontally** or **Flip Vertically** under ROOM in the left toolbar. A flip mirrors all carve/fill operations and markers within the current bounds, preserving operation order and IDs. Platform spans and complete 270-world-unit door openings are mirrored correctly. Horizontal flips swap entry/exit roles so entry remains on the left and exit on the right. Enemy letters and annotation text remain readable. Each flip is one Undo step and autosaves like other edits; save JSON to keep a portable copy.

Enemy identifier buttons show full names in visible editor-rendered tooltips on hover or keyboard focus.
