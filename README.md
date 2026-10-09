# Ember Hollow Room Editor

The standalone Ember Hollow room blueprint editor: a browser-based tool for authoring orthogonal side-view room layouts.

**Open the editor:** https://kyledanderson92-lab.github.io/Ember-Hollow-Room-Editor/

The website opens directly into the editor. No login, installation, backend, or database is required. This repository contains only the standalone editor distribution and editable examples.

## Use

Use **Paint Cells** (B): left-click fills black geometry and right-click carves white space. Click **Swap left / right** to reverse the mapping. Either button can click a cell or drag a snapped rectangle. Fixed floors, Corridor and Shaft authoring have been removed. Build variable-height passages, tall chambers and split/rejoin routes without floor alignment. Painting replaces cells directly; no geometry objects or hidden layers remain. Use Copy Area / Move to reposition geometry. The Markers dropdown selects doors, enemies, platforms, hazards, and notes. Place blue entry/purple exit doors by clicking their opening top, red enemy markers, green one-way platforms, hazards and annotations. Validation uses final white space for connectivity, islands, doorway coverage and enemy placement, and checks rectangle validity, bounds, naming and marker bounds.

Each cell has only its current black/white state. The toolbar shows the current left/right color mapping. Swapping is a session preference rather than room data. Right-click painting is limited to Paint Cells, so it never places or deletes markers in other tools. Later paint replaces previous color permanently, except through Undo. Adjacent white regions merge, and black is implicit. A click paints the cell under the pointer; a drag paints a snapped rectangle at least one cell thick. Erase deletes a clicked marker or paints the selected cells black.

Schema v2 keeps `geometry_operations` for compatibility, but saved geometry consists only of disjoint white rectangles encoding final cells. These are not selectable objects or stored paint history. Loading old stacked files flattens their final appearance without resnapping fractional geometry.

Old schema v1 JSON/autosave migrates automatically: stored corridor/shaft coordinates become carve rectangles, old floor settings/metadata are removed, and doors/markers retain their positions. Saving writes v2. Old geometry is never recalculated from floor settings.
- Save/load complete, human-readable room JSON to continue editing on another computer.
- Export clean schematic PNG at 1×, 2× or 4× and vector SVG.
- Undo/redo edits, zoom with the mouse wheel, and pan with middle mouse or Space + drag.
- Select TW-01 or TW-02 from Examples to load editable demonstration rooms.
- Browser autosave restores work on this browser/origin; JSON is the portable document.

Keyboard tools: B Paint Cells, V select, C left-click carves white, F left-click fills black, I entry, O exit, E enemy, P platform, H hazard, A annotation, X erase. Delete removes selection. Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redoes; Ctrl/Cmd+S saves JSON. Escape cancels a gesture.

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

Use **Flip Horizontally** or **Flip Vertically** under ROOM / VIEW in the left toolbar. A flip mirrors finalized geometry and markers within the current bounds, preserving marker IDs. Platform spans and complete 270-world-unit door openings are mirrored correctly. Horizontal flips swap entry/exit roles so entry remains on the left and exit on the right. Enemy letters and annotation text remain readable. Each flip is one Undo step and autosaves like other edits; save JSON to keep a portable copy.

Enemy identifier buttons show full names in visible editor-rendered tooltips on hover or keyboard focus.

## Copy exact areas

Choose **Copy Area** (R), then click and drag a snapped rectangle in any direction. Release to capture its final visible black/white cells and non-door markers. The source remains untouched. A placement preview follows the pointer: click where you want the copy's **top-left** corner. Click again for more copies, or press Escape to leave placement mode. **Place Copy** (T or Ctrl/Cmd+V) reuses the last snapshot. Ctrl/Cmd+C recaptures the last selected rectangle from the current room; normal text-field copying/pasting is unaffected.

This copies finalized cells. Each paste replaces the destination patch and flattens the result; geometry outside the destination is unchanged. Enemy/hazard centers and annotation anchors inside the selection are included; platform spans clip precisely at its edges. Right/bottom boundaries are exclusive for point markers. Marker icons/text remain complete and readable rather than being sliced into image pixels. Destination non-door markers inside the patch are replaced; crossing platforms retain their outside fragments. Every pasted marker gets a fresh ID.

Entry/exit doors are not included in Copy/Paste. Pasting geometry across a door may affect its clearance; validation reports this. Placement must fit completely inside the room (red outline indicates an invalid destination). Each paste is a single undoable edit, autosaves, and is included normally in JSON/PNG/SVG. The clipboard is local to the current editor session; it does not access the operating-system clipboard, is not saved in room JSON, and clears when loading a different room or refreshing the page. Copying itself neither changes the room nor adds an Undo step.

## Click or drag to paint

Carve Space clicks paint one grid cell white; Fill Geometry clicks paint one grid cell black. Dragging still draws a snapped rectangle (including one-cell-thick strips). Cells use the current grid spacing, not physical screen pixels. Small mouse jitter remains a click. Outside/incomplete-edge-cell clicks do nothing; Escape cancels a pending gesture. Every completed paint is undoable and autosaved.

Faint object outlines have been removed, and joined white regions render without rectangle seams. Geometry has no selectable objects or resize handles. Show grid is optional and starts off for a clean view.


## Move a selected area

Use the existing **Copy Area** drag gesture to select a rectangle, then click **Move** (M) before placing a copy. Click the destination top-left using the same grid snapping and preview as **Place Copy**. Move finishes after one placement; Copy/Paste remains repeatable. The source's resolved cells are filled black, destination contents are replaced just as with Paste, and selected markers retain their IDs and data. Overlapping destinations work. A clipped platform moves only its selected span; outside fragments remain and receive distinct IDs. The resulting geometry is flattened; the compatible JSON schema is retained.

Doors whose opening top is inside the selected vertical interval are included in Move, including doors on the right boundary of the rectangle. Doors keep their boundary X and canonical 270-unit opening height. A selection containing doors can move vertically only; an invalid horizontal destination or out-of-bounds opening is rejected before the source is changed. Other selections can move in either direction.

Escape or switching tools cancels placement without modifying the room. One Undo restores both the source and overwritten destination; Redo repeats the whole move. Moving to the original location adds no edit. If another edit changes the room during placement, Move rejects the stale snapshot and asks for a new selection. The Copy/Paste clipboard is unaffected by Move.

The left toolbar uses compact **EDIT**, **GEOMETRY**, **OBJECTS**, and **ROOM / VIEW** groups with two-column button grids. File actions remain together in the top bar, view controls above the canvas, and guide/settings controls in properties. Small widths stack the groups to keep buttons readable.
