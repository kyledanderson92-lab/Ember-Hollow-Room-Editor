// Generated portable distribution. Edit src/ instead; regenerate with node scripts/build-portable.mjs.
// No modules, fetches, external assets or build tools are needed to open index.html.
(() => {
"use strict";

// ----- src/presets.js -----
// Editor suggestions only; never modular-room canon.
const presets = {
  TW: {
    name: "Tight Weaving Corridor",
    guidance:
      "Variable-height passages and vertical transitions; short splits that rejoin.",
    settings: {
      width: 48,
      height: 32,
      units_per_cell: 90,
      grid_step: 1,
      export_scale: 2,
    },
  },
  BMF: {
    name: "Broken Multi-Floor Combat",
    guidance:
      "Approximately three gameplay screen widths. 1280 × 3 / 90 ≈ 43 cells is an editor suggestion, not universal room size.",
    settings: {
      width: 43,
      height: 40,
      units_per_cell: 90,
      grid_step: 1,
      export_scale: 2,
    },
  },
};


// ----- src/model.js -----
const groups = ["geometry_operations", "doors", "enemies", "platforms", "hazards", "annotations"];
const clone = (value) => structuredClone(value);
const uid = () => globalThis.crypto?.randomUUID?.() ?? `o-${Date.now()}-${Math.random()}`;
function newRoom(family = "TW", number = 1) {
  return { schema_version: 2, room_id: `${family}-${String(number).padStart(2, "0")}`, room_family: family,
    settings: clone((presets[family] ?? presets.TW).settings),
    door_contract: { height_world_units: 270, width_world_units: null, anchor_convention: null },
    ...Object.fromEntries(groups.map(g => [g, []])) };
}
const geometry = (type, x, y, width, height) => ({ id: uid(), type, x, y, width, height });
function rect(room, o) {
  if (["carve", "fill"].includes(o.type)) return {x:o.x,y:o.y,w:o.width,h:o.height};
  if (o.type === "door") return { x:o.x-(o.role === "exit" ? o.marker_width : 0), y:o.y, w:o.marker_width, h:o.height_world_units/room.settings.units_per_cell };
  return {x:o.x-.35,y:o.y-.35,w:o.type === "platform" ? o.length : .7,h:.7};
}
const objects = room => groups.flatMap(group => room[group].map(object => ({group,object})));
const inside = (p,r) => p.x >= r.x && p.x <= r.x+r.w && p.y >= r.y && p.y <= r.y+r.h;
// Exact rectangle difference. Shared edges have zero area; no sampling/rasterization.
function subtract(a,b) {
  const x=Math.max(a.x,b.x), y=Math.max(a.y,b.y), right=Math.min(a.x+a.w,b.x+b.w), bottom=Math.min(a.y+a.h,b.y+b.h);
  if (right<=x || bottom<=y) return [a];
  return [{x:a.x,y:a.y,w:a.w,h:y-a.y}, {x:a.x,y:bottom,w:a.w,h:a.y+a.h-bottom},
    {x:a.x,y,w:x-a.x,h:bottom-y}, {x:right,y,w:a.x+a.w-right,h:bottom-y}].filter(r=>r.w>0 && r.h>0);
}
const validRectangle = o => [o.x,o.y,o.width,o.height].every(Number.isFinite) && o.width>0 && o.height>0 && ["carve","fill"].includes(o.type);
function finalGeometry(room) {
  let regions=[];
  const bounds={x:0,y:0,w:room.settings.width,h:room.settings.height};
  for (const o of room.geometry_operations) {
    if (!validRectangle(o)) continue;
    const r=rect(room,o), x=Math.max(0,r.x),y=Math.max(0,r.y),
      clipped={x,y,w:Math.min(bounds.w,r.x+r.w)-x,h:Math.min(bounds.h,r.y+r.h)-y};
    if (clipped.w<=0 || clipped.h<=0) continue;
    if (o.type === "fill") regions=regions.flatMap(a=>subtract(a,clipped));
    else {
      let additions=[clipped];
      for (const existing of regions) additions=additions.flatMap(a=>subtract(a,existing));
      regions.push(...additions);
    }
  }
  return regions;
}
const traversable = (room,p) => finalGeometry(room).some(r=>p.x>=r.x && p.x<r.x+r.w && p.y>=r.y && p.y<r.y+r.h);
function move(room,o,dx,dy) {
  if (o.type !== "door") o.x+=dx;
  o.y+=dy;
}
function updateSettings(room,next) {
  const candidate=clone(room);
  candidate.settings={...candidate.settings,...next};
  const s=candidate.settings;
  for (const [key,value] of Object.entries(s)) if (!Number.isFinite(value)||value<=0) throw Error(`${key} must be positive.`);
  if (s.width>10000||s.height>10000||s.units_per_cell<1||![1,2,4].includes(s.export_scale)) throw Error("Settings exceed supported limits.");
  if (candidate.geometry_operations.some(o=>o.x<0||o.y<0||o.x+o.width>s.width||o.y+o.height>s.height)) throw Error("These settings would put existing geometry outside room bounds.");
  candidate.doors.forEach(o=>o.x=o.role === "entry" ? 0:s.width);
  return candidate;
}

// Mirror the authored model within its bounds, preserving operation order/IDs.
// Door roles follow the left-entry/right-exit contract after a horizontal flip.
function flipRoom(room, axis) {
  if (!["horizontal", "vertical"].includes(axis)) throw Error("Invalid flip axis.");
  const { width, height, units_per_cell } = room.settings;
  for (const { object: o } of objects(room)) {
    if (axis === "horizontal") {
      if (["carve", "fill"].includes(o.type)) o.x = width - o.x - o.width;
      else if (o.type === "platform") o.x = width - o.x - o.length;
      else o.x = width - o.x;
      if (o.type === "door") o.role = o.role === "entry" ? "exit" : "entry";
    } else {
      const extent = ["carve", "fill"].includes(o.type) ? o.height
        : o.type === "door" ? o.height_world_units / units_per_cell : 0;
      o.y = height - o.y - extent;
    }
  }
}


// ----- src/history.js -----
class History {
  constructor(room) {
    this.past = [];
    this.future = [];
    this.current = clone(room);
  }
  commit(room) {
    if (JSON.stringify(room) === JSON.stringify(this.current)) return false;
    this.past.push(this.current);
    if (this.past.length > 200) this.past.shift();
    this.current = clone(room);
    this.future = [];
    return true;
  }
  undo() {
    if (this.past.length) {
      this.future.push(this.current);
      this.current = this.past.pop();
    }
    return clone(this.current);
  }
  redo() {
    if (this.future.length) {
      this.past.push(this.current);
      this.current = this.future.pop();
    }
    return clone(this.current);
  }
}


// ----- src/persistence.js -----
const serialize = (room) => JSON.stringify(room, null, 2);
function deserialize(text) {
  if (text.length > 5_000_000) throw Error("JSON exceeds 5 MB limit.");
  const r = JSON.parse(text);
  if (![1,2].includes(r.schema_version)) throw Error("Unsupported schema version.");
  if (r.schema_version === 1) {
    if (!Array.isArray(r.corridors) || !Array.isArray(r.shafts)) throw Error("Missing legacy geometry arrays.");
    r.geometry_operations=[...r.corridors,...r.shafts].map(o=>({id:o.id,type:"carve",x:o.x,y:o.y,width:o.type === "corridor" ? o.length:o.width,height:o.height}));
    delete r.corridors; delete r.shafts;
    for (const key of ["floors","pitch","corridor_height","shaft_width"]) delete r.settings?.[key];
    r.doors?.forEach(d=>delete d.floor);
    r.schema_version=2;
  }
  if (
    typeof r.room_id !== "string" ||
    typeof r.room_family !== "string" ||
    !r.settings ||
    !r.door_contract
  )
    throw Error("Missing room metadata.");
  const s = r.settings;
  for (const k of [
    "width",
    "height",
    "units_per_cell",
    "grid_step",
    "export_scale",
  ])
    if (!Number.isFinite(s[k]) || s[k] <= 0)
      throw Error(`Invalid setting: ${k}`);
  if (
    s.width > 10000 ||
    s.height > 10000 ||
    s.units_per_cell < 1 ||
    ![1,2,4].includes(s.export_scale)
  )
    throw Error("Room exceeds supported limits.");
  const types = {
    geometry_operations: null,
    doors: "door",
    enemies: "enemy",
    platforms: "platform",
    hazards: "hazard",
    annotations: "annotation",
  };
  const fields = {
    carve: ["x", "y", "width", "height"],
    fill: ["x", "y", "width", "height"],
    door: ["x", "y", "marker_width", "height_world_units"],
    enemy: ["x", "y"],
    platform: ["x", "y", "length"],
    hazard: ["x", "y"],
    annotation: ["x", "y"],
  };
  const ids = new Set();
  let count = 0;
  for (const g of groups) {
    if (!Array.isArray(r[g])) throw Error(`Missing ${g} array.`);
    for (const o of r[g]) {
      if (
        ++count > 10000 ||
        typeof o.id !== "string" ||
        ids.has(o.id) ||
        (g === "geometry_operations" ? !validRectangle(o) : o.type !== types[g])
      )
        throw Error("Invalid, duplicate, or excessive objects.");
      ids.add(o.id);
      for (const k of fields[o.type])
        if (!Number.isFinite(o[k])) throw Error(`Invalid ${o.type}.${k}`);
      if (
        ["length", "width", "height", "marker_width"].some(
          (k) => k in o && o[k] <= 0,
        )
      )
        throw Error("Object dimensions must be positive.");
      if (o.type === "door" && !["entry", "exit"].includes(o.role))
        throw Error("Invalid door role.");
      if (
        ["enemy", "annotation", "hazard"].includes(o.type) &&
        typeof o.label !== "string"
      )
        throw Error("Marker label must be text.");
    }
  }
  return r;
}
function download(data, name, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const autosaveKey = "ember-hollow-room-editor-v1";
function saveAutosave(room, dirty) {
  localStorage.setItem(autosaveKey, JSON.stringify({ room, dirty }));
}
function restoreAutosave() {
  const text = localStorage.getItem(autosaveKey);
  if (!text) return null;
  const saved = JSON.parse(text);
  return { room: deserialize(serialize(saved.room)), dirty: !!saved.dirty };
}


// ----- src/validation.js -----
// Exact rectangle-union graph: positive area overlap or a shared edge of positive
// length connects regions. Corner contact never creates a traversable connection.
function connected(a, b) {
  const x = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x),
    y = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return x >= 0 && y >= 0 && (x > 0 || y > 0);
}
function validate(room) {
  const errors = [],
    warnings = [],
    s = room.settings,
    geo = room.geometry_operations,
    rs = finalGeometry(room),
    adj = rs.map(() => []);
  const fail = (code, message) => errors.push({ code, message });
  const warn = (code, message) => warnings.push({ code, message });
  if (
    !/^[A-Z][A-Z0-9]*-\d{2}$/.test(room.room_id) ||
    room.room_id.split("-")[0] !== room.room_family
  )
    fail("room_id", "Room ID must be FAMILY-00 and match family.");
  if (room.door_contract.height_world_units !== 270)
    fail("door_contract", "Canonical door height must be 270 world units.");
  if (
    room.door_contract.width_world_units !== null ||
    room.door_contract.anchor_convention !== null
  )
    warn(
      "provisional_door",
      "Door width/anchor are project-specific unresolved values, not canon.",
    );
  geo.forEach(o => {
    if (!validRectangle(o)) fail("rectangle", `${o.id}: invalid or zero-size rectangle.`);
    const r=rect(room,o);
    if (r.x<0||r.y<0||r.x+r.w>s.width||r.y+r.h>s.height) fail("bounds", `${o.id}: outside room bounds.`);
    if ([r.x,r.y,r.w,r.h].some(v=>Math.abs(v/s.grid_step-Math.round(v/s.grid_step))>1e-8)) warn("grid", `${o.id}: geometry is not grid snapped.`);
  });
  rs.forEach((r,i)=> { for(let j=0;j<i;j++) if(connected(r,rs[j])) {adj[i].push(j);adj[j].push(i);} });
  function doorNodes(d) {
    const h = d.height_world_units / s.units_per_cell,
      y = d.y;
    const intervals = rs
      .map((r, i) => ({ r, i }))
      .filter(
        ({ r }) =>
          d.x >= r.x && d.x <= r.x + r.w && r.y < y + h && r.y + r.h > y,
      )
      .map(({ r, i }) => ({
        start: Math.max(y, r.y),
        end: Math.min(y + h, r.y + r.h),
        i,
      }))
      .sort((a, b) => a.start - b.start);
    let end = y;
    for (const it of intervals) {
      if (it.start > end) return [];
      end = Math.max(end, it.end);
    }
    return end >= y + h ? intervals.map((it) => it.i) : [];
  }
  const entry = room.doors.filter((d) => d.role === "entry"),
    exit = room.doors.filter((d) => d.role === "exit");
  if (entry.length !== 1) fail("entry_count", "Exactly one entry is required.");
  if (exit.length !== 1) fail("exit_count", "Exactly one exit is required.");
  const nodes = new Map();
  room.doors.forEach((d) => {
    if (d.height_world_units !== 270)
      fail("door_height", `${d.role}: opening height must be 270 world units.`);
    if (d.x !== (d.role === "entry" ? 0 : s.width))
      fail(
        "door_side",
        `${d.role}: must be on the ${d.role === "entry" ? "left" : "right"} room boundary.`,
      );
    if (!Number.isFinite(d.y)||d.y<0||d.y+d.height_world_units/s.units_per_cell>s.height) fail("door_bounds", `${d.role}: outside room bounds.`);
    const n = doorNodes(d);
    nodes.set(d.id, n);
    if (!n.length)
      fail(
        "door_connection",
        `${d.role}: full opening must connect to traversable space.`,
      );
  });
  function flood(seeds) {
    const seen = new Set(seeds),
      queue = [...seeds];
    for (let q = 0; q < queue.length; q++)
      for (const n of adj[queue[q]])
        if (!seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
    return seen;
  }
  const reached = flood(
    entry.length === 1 ? (nodes.get(entry[0].id) ?? []) : [],
  );
  const path =
    entry.length === 1 &&
    exit.length === 1 &&
    (nodes.get(exit[0].id) ?? []).some((i) => reached.has(i));
  if (!path) fail("path", "No continuous Entry → Exit path.");
  if (rs.length && flood([0]).size !== rs.length)
    fail("island", "Disconnected traversable islands detected.");
  if (reached.size < rs.length)
    warn(
      "unreachable",
      `${rs.length - reached.size} final region(s) unreachable from entry.`,
    );
  const doorIndices = new Set([...nodes.values()].flat());
  adj.forEach((ns, i) => {
    if (ns.length <= 1 && !doorIndices.has(i))
      warn(
        "dead_end",
        `Region ${i+1}: potential dead-end branch (object graph heuristic).`,
      );
  });
  room.enemies.forEach((o) => {
    if (!traversable(room, o))
      warn("enemy_outside", `${o.label}: enemy outside traversable geometry.`);
  });
  for (const g of ["platforms", "hazards", "annotations"])
    room[g].forEach((o) => {
      if (o.x < 0 || o.x > s.width || o.y < 0 || o.y > s.height || (o.type === "platform" && o.x + o.length > s.width))
        warn("marker_bounds", `${o.type}: outside room bounds.`);
    });
  return { valid: errors.length === 0, path, errors, warnings };
}


// ----- src/renderer.js -----
const escapeXML = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );
function scene(
  room,
  {
    grid = false,
    bounds = false,
    coordinates = false,
    selected = null,
  } = {},
) {
  const s = room.settings,
    out = [`<rect width="${s.width}" height="${s.height}" fill="black"/>`];
  const box = (r, fill, extra = "") =>
    `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${fill}" ${extra}/>`;
  for (const r of finalGeometry(room)) out.push(box(r, "white"));
  if (grid) {
    const step =
      s.grid_step *
      Math.max(1, Math.ceil(Math.max(s.width, s.height) / s.grid_step / 300));
    for (let x = 0; x <= s.width; x += step)
      out.push(
        `<path d="M${x} 0V${s.height}" stroke="#687580" stroke-opacity=".28" stroke-width=".025"/>`,
      );
    for (let y = 0; y <= s.height; y += step)
      out.push(
        `<path d="M0 ${y}H${s.width}" stroke="#687580" stroke-opacity=".28" stroke-width=".025"/>`,
      );
  }
  for (const d of room.doors) {
    const r = rect(room, d);
    out.push(box(r, d.role === "entry" ? "#247be5" : "#9149d8"));
    out.push(
      `<text x="${r.x + r.w / 2}" y="${r.y + r.h / 2}" text-anchor="middle" dominant-baseline="central" fill="white" font-size=".7">${d.role === "entry" ? "I" : "O"}</text>`,
    );
  }
  for (const o of room.enemies)
    out.push(
      `<circle cx="${o.x}" cy="${o.y}" r=".48" fill="#d92c35"/><text x="${o.x}" y="${o.y}" text-anchor="middle" dominant-baseline="central" font-size=".55" fill="white">${escapeXML(o.label)}</text>`,
    );
  for (const o of room.platforms)
    out.push(
      `<path d="M${o.x} ${o.y}h${o.length}" stroke="#28af61" stroke-width=".15"/><path d="M${o.x + 0.3} ${o.y + 0.2}l.2 .2 .2-.2" fill="none" stroke="#28af61" stroke-width=".08"/>`,
    );
  for (const o of room.hazards)
    out.push(
      `<path d="M${o.x} ${o.y - 0.5}l.5 1h-1Z" fill="#e7a52f"/><text x="${o.x + 0.65}" y="${o.y + 0.2}" fill="#c8891a" font-size=".55">${escapeXML(o.label)}</text>`,
    );
  for (const o of room.annotations)
    out.push(
      `<text x="${o.x}" y="${o.y}" fill="#28af61" font-size=".65">${escapeXML(o.label)}</text>`,
    );
  if (bounds || selected)
    for (const { object: o } of objects(room)) {
      if (!bounds && o.id !== selected) continue;
      out.push(
        box(
          rect(room, o),
          "none",
          `stroke="${o.id === selected ? "#ffb347" : "#719ba6"}" stroke-width=".07" stroke-dasharray=".2 .12"`,
        ),
      );
      if (o.id === selected && ["carve", "fill"].includes(o.type)) {
        const r = rect(room, o);
        out.push(
          box(
            { x: r.x + r.w - 0.2, y: r.y + r.h - 0.2, w: 0.4, h: 0.4 },
            "#ffb347",
          ),
        );
      }
    }
  if (coordinates)
    for (let x = 0; x < s.width; x += Math.max(s.grid_step, 5))
      out.push(
        `<text x="${x}" y=".7" fill="#94a3b8" font-size=".5">${Math.round(x * s.units_per_cell)}</text>`,
      );
  return out.join("");
}
function svgDocument(room, overlays = {}) {
  const unit = 20,
    pad = 30,
    title = 42,
    w = room.settings.width * unit + pad * 2,
    h = room.settings.height * unit + pad * 2 + title;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="white"/><text x="${pad}" y="35" font-family="Arial,sans-serif" font-size="24" fill="black">${escapeXML(room.room_id)}</text><g transform="translate(${pad} ${pad + title}) scale(${unit})" font-family="Arial,sans-serif">${scene(room, overlays)}</g></svg>`;
}


// ----- src/export.js -----
function exportSVG(room, overlays) {
  download(svgDocument(room, overlays), `${room.room_id}.svg`, "image/svg+xml");
}
async function exportPNG(room, overlays) {
  const scale = room.settings.export_scale,
    w = (room.settings.width * 20 + 60) * scale,
    h = (room.settings.height * 20 + 102) * scale;
  if (w * h > 64_000_000 || w > 16384 || h > 16384)
    throw Error(
      "PNG exceeds safe canvas size. Lower export scale/bounds or export SVG.",
    );
  const url = URL.createObjectURL(
    new Blob([svgDocument(room, overlays)], { type: "image/svg+xml" }),
  );
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(Error("SVG rasterization failed."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw Error("PNG encoding failed.");
    download(blob, `${room.room_id}.png`, "image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}


// ----- src/area-copy.js -----
const markerGroups = ["enemies", "platforms", "hazards", "annotations"];
const containsPoint = (area, point) => point.x >= area.x && point.x < area.x + area.width
  && point.y >= area.y && point.y < area.y + area.height;

function areaFits(room, area) {
  return [area.x, area.y, area.width, area.height].every(Number.isFinite)
    && area.width > 0 && area.height > 0 && area.x >= 0 && area.y >= 0
    && area.x + area.width <= room.settings.width
    && area.y + area.height <= room.settings.height;
}

// Capture the resolved geometry, never whole source operations. Coordinates in
// the clipboard are relative to the selected top-left; black is implicit.
function copyArea(room, area) {
  if (!areaFits(room, area)) throw Error("Select a positive-size area inside room bounds.");
  const clip = { width: area.width, height: area.height,
    geometry_operations: [], ...Object.fromEntries(markerGroups.map(g => [g, []])) };
  for (const r of finalGeometry(room)) {
    const x = Math.max(area.x, r.x), y = Math.max(area.y, r.y);
    const width = Math.min(area.x + area.width, r.x + r.w) - x;
    const height = Math.min(area.y + area.height, r.y + r.h) - y;
    if (width > 0 && height > 0)
      clip.geometry_operations.push(geometry("carve", x - area.x, y - area.y, width, height));
  }
  for (const group of markerGroups) {
    for (const o of room[group]) {
      if (group === "platforms") {
        if (o.y < area.y || o.y >= area.y + area.height) continue;
        const x = Math.max(o.x, area.x);
        const length = Math.min(o.x + o.length, area.x + area.width) - x;
        if (length > 0) clip[group].push({ ...clone(o), x: x - area.x, y: o.y - area.y, length });
      } else if (containsPoint(area, o)) {
        clip[group].push({ ...clone(o), x: o.x - area.x, y: o.y - area.y });
      }
    }
  }
  return clip;
}

// Replace the destination patch. Clear its white space first, replay clipped
// white regions, replace only its markers and preserve every outside fragment.
// The caller commits this entire operation as one history/autosave edit.
function pasteArea(room, clip, point) {
  const area = { ...point, width: clip.width, height: clip.height };
  if (!areaFits(room, area)) throw Error("The copied area must fit completely inside room bounds.");
  room.geometry_operations.push(geometry("fill", area.x, area.y, area.width, area.height));
  for (const o of clip.geometry_operations)
    room.geometry_operations.push({ ...clone(o), id: uid(), x: o.x + area.x, y: o.y + area.y });
  for (const group of markerGroups) {
    room[group] = room[group].flatMap(o => {
      if (group !== "platforms") return containsPoint(area, o) ? [] : [o];
      if (o.y < area.y || o.y >= area.y + area.height
        || o.x + o.length <= area.x || o.x >= area.x + area.width) return [o];
      const fragments = [];
      if (o.x < area.x) fragments.push({ ...o, length: area.x - o.x });
      if (o.x + o.length > area.x + area.width)
        fragments.push({ ...o, id: fragments.length ? uid() : o.id,
          x: area.x + area.width, length: o.x + o.length - area.x - area.width });
      return fragments;
    });
    room[group].push(...clip[group].map(o => ({ ...clone(o), id: uid(), x: o.x + area.x, y: o.y + area.y })));
  }
}

// Feed the existing scene renderer so preview icons/colors match normal rooms.
function areaPreviewRoom(clip, settings) {
  return { settings: { ...settings, width: clip.width, height: clip.height },
    geometry_operations: clip.geometry_operations, doors: [],
    ...Object.fromEntries(markerGroups.map(g => [g, clip[g]])) };
}


// ----- src/tools.js -----
const toolList = [
  ["select", "Select", "V"],
  ["area", "Copy Area", "R"],
  ["paste", "Place Copy", "T"],
  ["carve", "Carve Space", "C"],
  ["fill", "Fill Geometry", "F"],
  ["entry", "Entry door", "I"],
  ["exit", "Exit door", "O"],
  ["enemy", "Enemy", "E"],
  ["platform", "One-way platform", "P"],
  ["hazard", "Hazard", "H"],
  ["annotation", "Annotation", "A"],
  ["erase", "Erase", "X"],
];
function installTools(editor) {
  const svg = document.querySelector("#canvas"),
    viewport = document.querySelector("#viewport");
  let hoverPoint = null;
  let drag = null,
    space = false;
  const raw = (e) => {
    const r = svg.getBoundingClientRect();
    return {
      x: (e.clientX - r.left - editor.view.x) / editor.view.scale,
      y: (e.clientY - r.top - editor.view.y) / editor.view.scale,
    };
  };
  const snap = (p) => {
    const step = editor.room.settings.grid_step;
    return {
      x: Math.round(p.x / step) * step,
      y: Math.round(p.y / step) * step,
    };
  };
  const hit = (p) =>
    objects(editor.room)
      .reverse()
      .find(({ object: o }) => inside(p, rect(editor.room, o)))?.object;
  function cancel() {
    if (drag?.before) editor.room = drag.before;
    drag = null;
    editor.preview("");
    editor.render();
  }
  editor.cancel = cancel;
  const areaPoint = p => ({
    x: Math.max(0, Math.min(editor.room.settings.width, p.x)),
    y: Math.max(0, Math.min(editor.room.settings.height, p.y)),
  });
  function showPaste(p) {
    if (!editor.clipboard) return;
    const clip = editor.clipboard;
    const fits = areaFits(editor.room, { ...p, width: clip.width, height: clip.height });
    editor.preview(`<g transform="translate(${p.x} ${p.y})" opacity=".8">${scene(areaPreviewRoom(clip, editor.room.settings))}<rect width="${clip.width}" height="${clip.height}" fill="none" stroke="${fits ? "#ffc77d" : "#f07878"}" stroke-width=".12" stroke-dasharray=".3 .2"/></g>`);
  }
  editor.refreshPaste = () => { if (editor.tool === "paste" && hoverPoint) showPaste(hoverPoint); };

  svg.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 && e.button !== 1) return;
    e.preventDefault();
    svg.setPointerCapture(e.pointerId);
    const p = snap(raw(e));
    if (e.button === 1 || space) {
      drag = {
        mode: "pan",
        client: { x: e.clientX, y: e.clientY },
        view: { ...editor.view },
      };
      return;
    }
    const tool = editor.tool;
    if (tool === "paste") {
      editor.placeCopy(p);
      showPaste(p);
      return;
    }
    if (tool === "area") {
      drag = { mode: "area", start: areaPoint(p), before: clone(editor.room) };
      editor.selected = null;
      editor.render();
      return;
    }
    if (tool === "select" || tool === "erase") {
      const current = objects(editor.room).find(
        ({ object: o }) => o.id === editor.selected,
      )?.object;
      const selectedRect =
        ["carve", "fill"].includes(current?.type) ? rect(editor.room, current) : null;
      const position = raw(e);
      const onHandle =
        selectedRect &&
        Math.abs(position.x - selectedRect.x - selectedRect.w) < 0.45 &&
        Math.abs(position.y - selectedRect.y - selectedRect.h) < 0.45;
      const o = tool === "select" && onHandle ? current : hit(position);
      editor.selected = o?.id ?? null;
      if (tool === "erase") {
        if (o) editor.remove();
        return;
      }
      editor.render();
      if (o) {
        const r = rect(editor.room, o);
        drag = {
          mode:
            onHandle
              ? "resize"
              : "move",
          start: p,
          id: o.id,
          before: clone(editor.room),
        };
      }
      return;
    }
    if (["carve", "fill", "platform"].includes(tool)) {
      drag = { mode: tool, start: p, before: clone(editor.room) };
      return;
    }
    if (tool === "entry" || tool === "exit") {
      const s=editor.room.settings, x=tool === "entry" ? 0:s.width, y=p.y;
      // The click selects the snapped top of the opening. Validation checks full clearance.
      editor.change((room) => {
        room.doors.push({
          id: uid(),
          type: "door",
          role: tool,
          x,
          y,
          height_world_units: 270,
          marker_width: 0.6,
        });
      });
      return;
    }
    if (!traversable(editor.room, p) && tool === "enemy") {
      editor.message("Place enemies inside white traversable geometry.");
      return;
    }
    const labels = { enemy: "G", hazard: "!", annotation: "Note" };
    editor.change((room) => {
      const group = {
        enemy: "enemies",
        hazard: "hazards",
        annotation: "annotations",
      }[tool];
      const o = { id: uid(), type: tool, x: p.x, y: p.y, label: labels[tool] };
      room[group].push(o);
      editor.selected = o.id;
    });
  });
  svg.addEventListener("pointermove", (e) => {
    const p = snap(raw(e)),
      u = editor.room.settings.units_per_cell;
    document.querySelector("#cursor").textContent =
      `Grid ${p.x}, ${p.y} · World ${p.x * u}, ${p.y * u}`;
    hoverPoint = p;
    if (!drag) {
      if (editor.tool === "paste") showPaste(p);
      return;
    }
    if (drag.mode === "area") {
      const end = areaPoint(p);
      drag.area = { x: Math.min(drag.start.x, end.x), y: Math.min(drag.start.y, end.y),
        width: Math.abs(end.x - drag.start.x), height: Math.abs(end.y - drag.start.y) };
      const a = drag.area;
      editor.preview(`<rect x="${a.x}" y="${a.y}" width="${a.width}" height="${a.height}" fill="#f3b15d" fill-opacity=".12" stroke="#ffc77d" stroke-width=".1" stroke-dasharray=".3 .2"/>`);
      return;
    }
    if (drag.mode === "pan") {
      editor.view.x = drag.view.x + e.clientX - drag.client.x;
      editor.view.y = drag.view.y + e.clientY - drag.client.y;
      editor.camera();
      return;
    }
    if (drag.mode === "move" || drag.mode === "resize") {
      editor.room = clone(drag.before);
      const o = objects(editor.room).find(
        ({ object: o }) => o.id === drag.id,
      ).object;
      if (drag.mode === "move")
        move(editor.room, o, p.x - drag.start.x, p.y - drag.start.y);
      else {
        o.width=Math.max(editor.room.settings.grid_step,p.x-o.x);
        o.height=Math.max(editor.room.settings.grid_step,p.y-o.y);
      }
      editor.render(false);
      return;
    }
    let o;
    if (["carve","fill"].includes(drag.mode) && p.x !== drag.start.x && p.y !== drag.start.y)
      o=geometry(drag.mode, Math.min(p.x,drag.start.x), Math.min(p.y,drag.start.y),Math.abs(p.x-drag.start.x),Math.abs(p.y-drag.start.y));
    if (drag.mode === "platform")
      o = {
        type: "platform",
        x: Math.min(p.x, drag.start.x),
        y: drag.start.y,
        length: Math.max(
          editor.room.settings.grid_step,
          Math.abs(p.x - drag.start.x),
        ),
      };
    drag.object = o;
    if (o) {
      const r = rect(editor.room, o);
      editor.preview(
        `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#f3b15d" opacity=".5" stroke="#ffc77d" stroke-width=".06"/>`,
      );
    } else editor.preview("");
  });
  svg.addEventListener("pointerup", () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    editor.preview("");
    if (d.mode === "area") {
      if (d.area?.width > 0 && d.area?.height > 0) editor.captureArea(d.area);
      return;
    }
    if (d.mode === "move" || d.mode === "resize") editor.commit();
    else if (d.object)
      editor.change((room) => {
        const o = { ...d.object, id: uid() };
        room[
          { carve: "geometry_operations", fill: "geometry_operations", platform: "platforms" }[
            d.mode
          ]
        ].push(o);
        editor.selected = o.id;
      });
  });
  svg.addEventListener("pointerleave", () => {
    if (!drag) { hoverPoint = null; editor.preview(""); }
  });
  svg.addEventListener("pointercancel", cancel);
  svg.addEventListener("lostpointercapture", () => {
    if (drag) cancel();
  });
  svg.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect(),
        x = e.clientX - r.left,
        y = e.clientY - r.top,
        p = raw(e);
      const scale = Math.max(
        2,
        Math.min(150, editor.view.scale * Math.exp(-e.deltaY * 0.0015)),
      );
      editor.view = { scale, x: x - p.x * scale, y: y - p.y * scale };
      editor.camera();
    },
    { passive: false },
  );
  window.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey,
      k = e.key.toLowerCase();
    if (mod && k === "s") {
      e.preventDefault();
      if (e.target.id === "room-id") e.target.blur();
      editor.save();
      return;
    }
    if (e.target.matches("input,textarea,select")) return;
    if (mod && ["c", "v"].includes(k)) {
      e.preventDefault();
      if (k === "c") {
        if (editor.areaSelection) editor.captureArea(editor.areaSelection);
        else editor.message("Choose Copy Area and drag a rectangle first.");
      } else editor.setTool("paste");
      return;
    }
    if (mod && ["z", "y", "d"].includes(k)) {
      e.preventDefault();
      if (k === "z") e.shiftKey ? editor.redo() : editor.undo();
      if (k === "y") editor.redo();
      if (k === "d") editor.duplicate();
      return;
    }
    if (e.code === "Space") {
      space = true;
      e.preventDefault();
    }
    if (e.key === "Escape") {
      cancel();
      editor.selected = null;
      if (editor.tool === "paste" || editor.tool === "area") editor.setTool("select");
      editor.render();
    }
    if (["Delete", "Backspace"].includes(e.key)) {
      e.preventDefault();
      editor.remove();
    }
    if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      const step = editor.room.settings.grid_step;
      editor.change((room) => {
        const o = objects(room).find(
          ({ object: o }) => o.id === editor.selected,
        )?.object;
        if (o) {
          const vertical = step;
          move(
            room,
            o,
            e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0,
            e.key === "ArrowUp"
              ? -vertical
              : e.key === "ArrowDown"
                ? vertical
                : 0,
          );
        }
      });
    }
    const t = toolList.find((t) => t[2].toLowerCase() === k);
    if (t && !mod) editor.setTool(t[0]);
  });
  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") space = false;
  });
  window.addEventListener("blur", () => {
    space = false;
    cancel();
  });
  new ResizeObserver(() => {
    editor.camera();
  }).observe(viewport);
}


// ----- src/example-rooms.js -----
// Generated by scripts/build-portable.mjs from examples/*.json.
const exampleRooms = {
  "TW-01": {
    "schema_version": 2,
    "room_id": "TW-01",
    "room_family": "TW",
    "settings": {
      "width": 48,
      "height": 32,
      "units_per_cell": 90,
      "grid_step": 1,
      "export_scale": 2
    },
    "door_contract": {
      "height_world_units": 270,
      "width_world_units": null,
      "anchor_convention": null
    },
    "doors": [
      {
        "id": "entry",
        "type": "door",
        "role": "entry",
        "x": 0,
        "marker_width": 0.6,
        "height_world_units": 270,
        "y": 25
      },
      {
        "id": "exit",
        "type": "door",
        "role": "exit",
        "x": 48,
        "marker_width": 0.6,
        "height_world_units": 270,
        "y": 11
      }
    ],
    "enemies": [
      {
        "id": "enemy-0",
        "type": "enemy",
        "x": 7,
        "y": 28,
        "label": "G"
      },
      {
        "id": "enemy-1",
        "type": "enemy",
        "x": 20,
        "y": 20,
        "label": "F"
      },
      {
        "id": "enemy-2",
        "type": "enemy",
        "x": 39,
        "y": 13,
        "label": "B"
      }
    ],
    "platforms": [
      {
        "id": "platform-1",
        "type": "platform",
        "x": 11,
        "y": 23,
        "length": 4
      }
    ],
    "hazards": [],
    "annotations": [],
    "geometry_operations": [
      {
        "id": "carve-0",
        "type": "carve",
        "x": 0,
        "y": 25,
        "width": 14,
        "height": 5
      },
      {
        "id": "carve-1",
        "type": "carve",
        "x": 11,
        "y": 18,
        "width": 4,
        "height": 12
      },
      {
        "id": "carve-2",
        "type": "carve",
        "x": 11,
        "y": 18,
        "width": 17,
        "height": 4
      },
      {
        "id": "carve-3",
        "type": "carve",
        "x": 24,
        "y": 9,
        "width": 5,
        "height": 13
      },
      {
        "id": "carve-4",
        "type": "carve",
        "x": 24,
        "y": 9,
        "width": 24,
        "height": 6
      },
      {
        "id": "trim",
        "type": "fill",
        "x": 32,
        "y": 9,
        "width": 8,
        "height": 2
      }
    ]
  },
  "TW-02": {
    "schema_version": 2,
    "room_id": "TW-02",
    "room_family": "TW",
    "settings": {
      "width": 48,
      "height": 32,
      "units_per_cell": 90,
      "grid_step": 1,
      "export_scale": 2
    },
    "door_contract": {
      "height_world_units": 270,
      "width_world_units": null,
      "anchor_convention": null
    },
    "doors": [
      {
        "id": "entry",
        "type": "door",
        "role": "entry",
        "x": 0,
        "marker_width": 0.6,
        "height_world_units": 270,
        "y": 25
      },
      {
        "id": "exit",
        "type": "door",
        "role": "exit",
        "x": 48,
        "marker_width": 0.6,
        "height_world_units": 270,
        "y": 18
      }
    ],
    "enemies": [
      {
        "id": "enemy-0",
        "type": "enemy",
        "x": 6,
        "y": 28,
        "label": "G"
      },
      {
        "id": "enemy-1",
        "type": "enemy",
        "x": 17,
        "y": 20,
        "label": "P"
      },
      {
        "id": "enemy-2",
        "type": "enemy",
        "x": 29,
        "y": 12,
        "label": "F"
      },
      {
        "id": "enemy-3",
        "type": "enemy",
        "x": 41,
        "y": 20,
        "label": "B"
      }
    ],
    "platforms": [
      {
        "id": "platform-1",
        "type": "platform",
        "x": 9,
        "y": 23,
        "length": 4
      }
    ],
    "hazards": [],
    "annotations": [],
    "geometry_operations": [
      {
        "id": "carve-0",
        "type": "carve",
        "x": 0,
        "y": 25,
        "width": 12,
        "height": 5
      },
      {
        "id": "carve-1",
        "type": "carve",
        "x": 9,
        "y": 17,
        "width": 4,
        "height": 13
      },
      {
        "id": "carve-2",
        "type": "carve",
        "x": 9,
        "y": 17,
        "width": 16,
        "height": 5
      },
      {
        "id": "carve-3",
        "type": "carve",
        "x": 21,
        "y": 10,
        "width": 5,
        "height": 12
      },
      {
        "id": "carve-4",
        "type": "carve",
        "x": 21,
        "y": 10,
        "width": 16,
        "height": 4
      },
      {
        "id": "carve-5",
        "type": "carve",
        "x": 33,
        "y": 10,
        "width": 4,
        "height": 12
      },
      {
        "id": "carve-6",
        "type": "carve",
        "x": 33,
        "y": 18,
        "width": 15,
        "height": 4
      },
      {
        "id": "carve-7",
        "type": "carve",
        "x": 14,
        "y": 11,
        "width": 4,
        "height": 10
      },
      {
        "id": "carve-8",
        "type": "carve",
        "x": 14,
        "y": 11,
        "width": 11,
        "height": 3
      }
    ]
  }
};


// ----- src/app.js -----
const $ = (id) => document.getElementById(id);
const enemyNames = {
  G: "Medium Grunt",
  F: "Flyer",
  P: "Projectile Gunner",
  B: "Bomb Thrower",
  L: "Large Bruiser",
};
const settingLabels = {
  width: "Room width (cells)",
  height: "Room height (cells)",
  units_per_cell: "World units per cell (editor scale)",
  grid_step: "Snap/grid spacing (cells)",
  export_scale: "PNG scale (1× / 2× / 4×)",
};
const hints = {
  select: "Select · drag to move · bottom-right handle to resize",
  area: "Drag a grid rectangle to copy its cells and markers; doors stay fixed",
  paste: "Click to place the copy at its top-left · repeat to stamp · Escape to cancel",
  carve: "Drag a snapped rectangle to carve white space",
  fill: "Drag a snapped rectangle to fill black geometry",
  entry: "Click opening top · entry snaps to LEFT boundary",
  exit: "Click opening top · exit snaps to RIGHT boundary",
  enemy: "Click white space · edit label in properties",
  platform: "Drag horizontally to create a one-way platform",
  hazard: "Click to place a hazard marker",
  annotation: "Click to place a text annotation",
  erase: "Click an object to delete",
};
let restored = null;
try {
  restored = restoreAutosave();
} catch (e) {
  $("message").textContent = `Autosave unavailable: ${e.message}`;
}
const initial = restored?.room ?? newRoom();
const editor = {
  room: initial,
  history: new History(initial),
  selected: null,
  clipboard: null,
  areaSelection: null,
  tool: "select",
  dirty: restored?.dirty ?? false,
  view: { scale: 20, x: 30, y: 50 },
  message(text) {
    $("message").textContent = text;
  },
  overlays() {
    return Object.fromEntries(
      ["grid", "bounds", "coordinates"].map((k) => [k, $(k).checked]),
    );
  },
  camera() {
    const { scale, x, y } = this.view;
    $("camera").setAttribute(
      "transform",
      `translate(${x} ${y}) scale(${scale})`,
    );
    $("zoom").textContent = `${Math.round((scale / 20) * 100)}%`;
  },
  preview(html) {
    $("preview").innerHTML = html;
  },
  render(panels = true) {
    $("scene").innerHTML = scene(this.room, {
      ...this.overlays(),
      selected: this.selected,
    });
    $("canvas-title").textContent = this.room.room_id;
    this.camera();
    if (panels) {
      this.panels();
      this.validation();
    }
  },
  validation() {
    const v = validate(this.room);
    $("validation-state").textContent =
      `ENTRY → EXIT: ${v.path ? "VALID" : "BROKEN"}${v.path && !v.valid ? " · ROOM ERRORS" : ""}`;
    $("validation-state").className = v.valid ? "valid" : "broken";
    $("issues").innerHTML =
      [
        ...v.errors.map(
          (e) => `<li class="broken">${escapeXML(e.message)}</li>`,
        ),
        ...v.warnings.map((e) => `<li>Warning: ${escapeXML(e.message)}</li>`),
      ].join("") || "<li>No geometry errors or warnings.</li>";
  },
  persist() {
    try {
      saveAutosave(this.room, this.dirty);
      $("autosave").textContent = "Autosaved locally";
    } catch (e) {
      $("autosave").textContent = "Autosave unavailable";
      this.message(e.message);
    }
  },
  commit() {
    if (this.history.commit(this.room)) {
      this.dirty = true;
      this.persist();
    }
    this.render();
  },
  change(fn) {
    const before = clone(this.room);
    try {
      fn(this.room);
      this.commit();
    } catch (e) {
      this.room = before;
      this.message(e.message);
      this.render();
    }
  },
  undo() {
    this.cancel?.();
    this.room = this.history.undo();
    this.dirty = true;
    this.persist();
    this.render();
  },
  redo() {
    this.cancel?.();
    this.room = this.history.redo();
    this.dirty = true;
    this.persist();
    this.render();
  },
  save() {
    this.cancel?.();
    download(
      serialize(this.room),
      `${this.room.room_id}.json`,
      "application/json",
    );
    this.dirty = false;
    this.persist();
    this.panels();
    this.message("JSON download requested.");
  },
  remove() {
    if (!this.selected) return;
    this.change((room) => {
      groups.forEach(
        (g) => (room[g] = room[g].filter((o) => o.id !== this.selected)),
      );
      this.selected = null;
    });
  },
  duplicate() {
    const found = objects(this.room).find(
      ({ object: o }) => o.id === this.selected,
    );
    if (!found) return;
    this.change((room) => {
      const o = clone(found.object);
      o.id = uid();
      if (o.type !== "door") move(room, o, room.settings.grid_step, 0);
      room[found.group].push(o);
      this.selected = o.id;
    });
  },
  captureArea(area) {
    try {
      this.clipboard = copyArea(this.room, area);
      this.areaSelection = clone(area);
      this.setTool("paste");
      this.message(`Copied ${area.width} × ${area.height} cells and markers. Click to place; doors stay fixed.`);
    } catch (e) { this.message(e.message); }
  },
  placeCopy(point) {
    if (!this.clipboard) return;
    this.change(room => pasteArea(room, this.clipboard, point));
  },
  setTool(tool) {
    if (tool === "paste" && !this.clipboard) {
      this.message("Choose Copy Area and drag a rectangle first.");
      return;
    }
    this.cancel?.();
    this.tool = tool;
    document.querySelectorAll("[data-tool]").forEach((b) => {
      b.classList.toggle("active", b.dataset.tool === tool);
      b.setAttribute("aria-pressed", b.dataset.tool === tool);
    });
    $("tool-hint").textContent = hints[tool];
    $("canvas").style.cursor = tool === "select" ? "default" : "crosshair";
    this.refreshPaste?.();
  },
  fit() {
    const r = $("canvas").getBoundingClientRect(),
      s = this.room.settings,
      scale = Math.max(
        2,
        Math.min((r.width - 80) / s.width, (r.height - 90) / s.height, 70),
      );
    this.view = {
      scale,
      x: (r.width - s.width * scale) / 2,
      y: (r.height - s.height * scale) / 2 + 15,
    };
    this.camera();
  },
  replace(room, dirty = true) {
    this.cancel?.();
    this.room = room;
    this.clipboard = null;
    this.areaSelection = null;
    this.tool = "select";
    this.history = new History(room);
    this.selected = null;
    this.dirty = dirty;
    this.persist();
    this.render();
    this.fit();
    this.setTool("select");
  },
  panels() {
    document.querySelector('[data-tool="paste"]').disabled = !this.clipboard;
    $("room-id").value = this.room.room_id;
    $("dirty").textContent = this.dirty ? "● Unsaved JSON" : "";
    $("undo").disabled = !this.history.past.length;
    $("redo").disabled = !this.history.future.length;
    $("room-family").value = this.room.room_family;
    $("room-number").value = Number(this.room.room_id.split("-")[1]);
    const s = this.room.settings;
    $("setting-fields").innerHTML = Object.entries(settingLabels)
      .map(
        ([k, label]) =>
          `<label>${label}${k === "export_scale" ? `<select name="${k}">${[1, 2, 4].map((v) => `<option ${s[k] === v ? "selected" : ""}>${v}</option>`).join("")}</select>` : `<input name="${k}" type="number" min="${k === "units_per_cell" ? 1 : 0.01}" step="${"any"}" value="${s[k]}" required>`}</label>`,
      )
      .join("");
    $("guidance").textContent = (
      presets[this.room.room_family] ?? presets[$("preset").value]
    ).guidance;
    if (presets[this.room.room_family])
      $("preset").value = this.room.room_family;
    $("door-width").value = this.room.door_contract.width_world_units ?? "";
    $("door-anchor").value = this.room.door_contract.anchor_convention ?? "";
    $("object-picker").innerHTML =
      '<option value="">Choose an object…</option>' +
      objects(this.room)
        .map(
          ({ object: o }) =>
            `<option value="${escapeXML(o.id)}" ${this.selected === o.id ? "selected" : ""}>${escapeXML(o.type)} ${escapeXML(o.role ?? o.label ?? `${o.x}, ${o.y}`)} · ${escapeXML(o.id.slice(0, 8))}</option>`,
        )
        .join("");
    const o = objects(this.room).find(
      ({ object: o }) => o.id === this.selected,
    )?.object;
    $("delete").disabled = $("duplicate").disabled = !o;
    if (!o) {
      $("selection").innerHTML = "<p>Select geometry or a marker.</p>";
      return;
    }
    const keys = {
      carve: ["x", "y", "width", "height"],
      fill: ["x", "y", "width", "height"],
      door: ["y", "marker_width"],
      enemy: ["x", "y", "label"],
      platform: ["x", "y", "length"],
      hazard: ["x", "y", "label"],
      annotation: ["x", "y", "label"],
    }[o.type];
    $("selection").innerHTML =
      `<p>${escapeXML(o.type)}${o.role ? " · " + o.role : ""}</p><form id="object-form">${keys.map((k) => `<label>${escapeXML(k.replaceAll("_", " "))}<input name="${k}" type="${k === "label" ? "text" : "number"}" step="any" value="${escapeXML(o[k])}" required></label>`).join("")}<button>Apply object changes</button></form>${o.type === "enemy" ? '<div class="button-row enemy-labels">' + Object.entries(enemyNames).map(([l, name]) => `<button type="button" data-label="${l}" aria-label="${l}: ${escapeXML(name)}">${l}<span class="enemy-tooltip" aria-hidden="true">${escapeXML(name)}</span></button>`).join("") + "</div>" : ""}${o.type === "door" ? "<p>Marker width is measured in grid cells and has no canonical opening-width meaning.</p>" : ""}`;
    $("object-form").onsubmit = (e) => {
      e.preventDefault();
      this.change((room) => {
        const target = objects(room).find(
          ({ object: x }) => x.id === o.id,
        ).object;
        for (const [k, v] of new FormData(e.target)) {
          const value = k === "label" ? v : Number(v);
          if (k !== "label" && !Number.isFinite(value))
            throw Error("Properties must be finite numbers.");
          if (["length", "width", "height", "marker_width"].includes(k) && value <= 0)
            throw Error("Dimensions must be positive.");
          target[k] = value;
        }
        if (["carve", "fill", "platform"].includes(target.type)) {
          const step = room.settings.grid_step;
          for (const key of ["x", "y", "length", "width", "height"])
            if (
              key in target &&
              Math.abs(target[key] / step - Math.round(target[key] / step)) >
                1e-8
            )
              throw Error(`${key} must be a multiple of grid spacing ${step}.`);
        }
        if (target.type === "door") {
          target.x = target.role === "entry" ? 0 : room.settings.width;
        }
      });
    };
    document.querySelectorAll("[data-label]").forEach(
      (b) =>
        (b.onclick = () =>
          this.change((room) => {
            room.enemies.find((x) => x.id === o.id).label = b.dataset.label;
          })),
    );
  },
};
$("preset").innerHTML = Object.entries(presets)
  .map(
    ([prefix, preset]) =>
      `<option value="${escapeXML(prefix)}">${escapeXML(prefix)} · ${escapeXML(preset.name)}</option>`,
  )
  .join("");
$("object-picker").onchange = (e) => {
  editor.cancel?.();
  editor.selected = e.target.value || null;
  editor.render();
};
$("tools").innerHTML = toolList
  .map(
    ([id, label, key]) =>
      `<button data-tool="${id}" title="${label} (${key})">${label} <span style="float:right;opacity:.5">${key}</span></button>`,
  )
  .join("");
document
  .querySelectorAll("[data-tool]")
  .forEach((b) => (b.onclick = () => editor.setTool(b.dataset.tool)));
installTools(editor);
function guard() {
  return (
    !editor.dirty ||
    confirm(
      "Current work has not been saved as JSON. Replace it? Download JSON first to keep a separate copy.",
    )
  );
}
$("new").onclick = () => {
  if (guard()) editor.replace(newRoom($("preset").value));
};
$("save").onclick = () => editor.save();
$("load").onclick = () => {
  if (guard()) $("file").click();
};
$("file").onchange = async (e) => {
  try {
    const file = e.target.files[0];
    if (file) {
      editor.replace(deserialize(await file.text()), false);
      editor.message("Room loaded.");
    }
  } catch (err) {
    editor.message(`Load failed: ${err.message}`);
  } finally {
    e.target.value = "";
  }
};
$("example").onchange = async (e) => {
  const name = e.target.value;
  e.target.value = "";
  if (!name || !guard()) return;
  try {
    editor.replace(deserialize(serialize(exampleRooms[name])), false);
    editor.message("Editor example loaded; not a canonical gameplay room.");
  } catch (err) {
    editor.message(err.message);
  }
};
$("room-id").onchange = (e) => {
  const value = e.target.value.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9]*-\d{2}$/.test(value)) {
    editor.message("Use FAMILY-00, for example TW-03.");
    editor.panels();
    return;
  }
  editor.change((room) => {
    room.room_id = value;
    room.room_family = value.split("-")[0];
  });
};
$("settings").onsubmit = (e) => {
  e.preventDefault();
  const next = Object.fromEntries(
    [...new FormData(e.target)].map(([k, v]) => [k, Number(v)]),
  );
  editor.change(() => {
    const family = $("room-family").value.trim().toUpperCase(),
      number = Number($("room-number").value);
    if (
      !/^[A-Z][A-Z0-9]*$/.test(family) ||
      !Number.isInteger(number) ||
      number < 0 ||
      number > 99
    )
      throw Error("Use an uppercase family prefix and number 00–99.");
    editor.room = updateSettings(editor.room, next);
    editor.room.room_family = family;
    editor.room.room_id = `${family}-${String(number).padStart(2, "0")}`;
  });
};
$("preset").onchange = (e) => {
  $("guidance").textContent = presets[e.target.value].guidance;
};
$("apply-preset").onclick = () => {
  const family = $("preset").value;
  editor.change(() => {
    const next = updateSettings(editor.room, presets[family].settings);
    next.room_family = family;
    next.room_id = `${family}-${editor.room.room_id.split("-")[1] ?? "01"}`;
    editor.room = next;
  });
};
$("apply-door").onclick = () =>
  editor.change((room) => {
    const value = $("door-width").value;
    if (value && (!Number.isFinite(Number(value)) || Number(value) <= 0))
      throw Error("Provisional width must be positive or empty.");
    room.door_contract.width_world_units = value ? Number(value) : null;
    room.door_contract.anchor_convention =
      $("door-anchor").value.trim() || null;
  });
$("png").onclick = async () => {
  try {
    await exportPNG(
      editor.room,
      $("export-guides").checked ? editor.overlays() : {},
    );
    editor.message("PNG download requested.");
  } catch (e) {
    editor.message(e.message);
  }
};
$("svg-export").onclick = () =>
  exportSVG(editor.room, $("export-guides").checked ? editor.overlays() : {});
$("validate").onclick = () => {
  editor.validation();
  editor.message(
    "Geometric connectivity checked. Movement feasibility requires Godot playtesting.",
  );
};
$("undo").onclick = () => editor.undo();
$("redo").onclick = () => editor.redo();
$("delete").onclick = () => editor.remove();
$("duplicate").onclick = () => editor.duplicate();
for (const axis of ["horizontal", "vertical"]) {
  $(`flip-${axis}`).onclick = () => {
    editor.cancel?.();
    editor.change(room => flipRoom(room, axis));
    editor.message(`Room flipped ${axis === "horizontal" ? "horizontally; entry and exit roles swapped" : "vertically"}. Undo restores the previous layout.`);
  };
}
$("fit").onclick = () => editor.fit();
$("reset").onclick = () => {
  editor.view = { scale: 20, x: 30, y: 50 };
  editor.camera();
};
for (const k of ["grid", "bounds", "coordinates"])
  $(k).onchange = () => editor.render(false);
window.addEventListener("beforeunload", (e) => {
  if (editor.dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});
editor.render();
editor.setTool("select");
requestAnimationFrame(() => editor.fit());
if (restored) editor.message("Last autosave restored automatically.");

})();
