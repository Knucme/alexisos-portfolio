/* ===================================================================
   AlexisOS - ship.js
   The STATUS screen: a vector schematic of the Vigil of Ash (side
   elevation) with damaged sections flashing, plus telemetry panels.

   Built for a future repair game: every system lives in SHIP_SYSTEMS
   with a status ("ok", "damaged", "offline") and a percentage. Later,
   repair puzzles only need to change those values and call render
   again; the schematic and panels redraw from the data.
   =================================================================== */
(function () {
  "use strict";

  /* ---------- Ship systems (the data the schematic is drawn from) ---------- */
  const SHIP_SYSTEMS = [
    // Listed bow to stern; each area's number is its position in this list.
    { id: "bridge",  name: "BRIDGE",       status: "ok",      pct: 88, note: "COGITATOR ONLINE" },
    { id: "vox",     name: "VOX ARRAY",    status: "damaged", pct: 23, note: "NON STANDARD SIGNAL CH.9" },
    // Like the Geller field, the prow armor is display-only: its hull
    // integrity is reported on the bridge, not visited.
    { id: "prow",    name: "PROW ARMOR",   status: "ok",      pct: 66, note: "HULL INTEGRITY 66%", area: false, measure: "INTEGRITY" },
    { id: "life",    name: "LIFE SUPPORT", status: "damaged", pct: 37, note: "ON RESERVE POWER" },
    { id: "deck4",   name: "DECK 4",       status: "damaged", pct: 12, note: "PRESSURE SEAL FAILING" },
    { id: "reactor", name: "REACTOR",      status: "damaged", pct: 4,  note: "STANDBY 4%" },
    { id: "cargo",   name: "AFT CARGO",    status: "damaged", pct: 51, note: "UNKNOWN BIOSIGNS" },
    { id: "engines", name: "ENGINES",      status: "offline", pct: 0,  note: "NO THRUST" },
    // Not a place you can go: the field is run from the bridge console.
    { id: "geller",  name: "GELLER FIELD", status: "offline", pct: 0,  note: "FIELD COLLAPSED", area: false }
  ];
  // Number only the systems you can travel to.
  let areaNum = 0;
  SHIP_SYSTEMS.forEach(function (s) { s.num = s.area === false ? null : ++areaNum; });
  function tagOf(s) { return s.num ? "[" + s.num + "] " : ""; }

  function hull() {
    const sum = SHIP_SYSTEMS.reduce(function (a, s) { return a + s.pct; }, 0);
    return Math.round(sum / SHIP_SYSTEMS.length);
  }

  /* ---------- SVG helpers ---------- */
  const NS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) { parent.appendChild(e); }
    return e;
  }
  function poly(points, parent, cls) {
    return svg("polygon", { points: points, class: cls || "" }, parent);
  }
  function line(x1, y1, x2, y2, parent, cls) {
    return svg("line", { x1: x1, y1: y1, x2: x2, y2: y2, class: cls || "" }, parent);
  }

  /* ---------- Ship geometry: one group per system ----------
     The Vigil of Ash: a long-haul industrial hulk. Engine block aft,
     an open spine truss carrying cargo containers, a spherical reactor,
     the habitation drum (deck 4), life-support tanks, and a heavy
     command module forward with the bridge and vox mast on top.
     Side elevation, prow to the right. viewBox 0 0 640 270. */
  function rect(x, y, w, h, g, rx, cls) {
    return svg("rect", { x: x, y: y, width: w, height: h, rx: rx || 0, class: cls || "" }, g);
  }
  function path(d, g, cls) { return svg("path", { d: d, class: cls || "" }, g); }

  const SHAPES = {
    engines: function (g) {
      // Engine block with radiator fins and four exhaust bells
      poly("62,100 128,108 128,192 62,200", g);
      [[104, 128], [128, 152], [152, 176], [176, 200]].forEach(function (b, i) {
        const y0 = b[0] - 2, y1 = b[1] - 6;
        poly("62," + (y0 + 4) + " 34," + y0 + " 34," + (y1 + 4) + " 62," + y1, g);
        line(34, (y0 + y1 + 4) / 2, 26, (y0 + y1 + 4) / 2, g, "detail");
      });
      [78, 94, 110].forEach(function (x) {
        line(x, 102, x - 6, 74, g); line(x, 198, x - 6, 226, g);
        line(x - 6, 74, x + 4, 74, g, "detail"); line(x - 6, 226, x + 4, 226, g, "detail");
      });
      line(62, 150, 128, 150, g, "detail");
    },
    cargo: function (g) {
      // Open spine truss with X bracing, containers above and below
      line(128, 138, 250, 138, g); line(128, 162, 250, 162, g);
      for (let x = 128; x < 250; x += 20) {
        line(x, 138, x + 20, 162, g, "detail"); line(x, 162, x + 20, 138, g, "detail");
        line(x, 138, x, 162, g, "detail");
      }
      rect(134, 104, 34, 32, g); rect(172, 104, 34, 32, g);
      rect(134, 164, 34, 32, g); rect(210, 164, 34, 32, g);
      // A container torn loose and drifting
      svg("rect", { x: 214, y: 92, width: 30, height: 28, transform: "rotate(-18 229 106)", class: "loose" }, g);
      [151, 189].forEach(function (x) { line(x, 106, x, 134, g, "detail"); });
    },
    reactor: function (g) {
      svg("circle", { cx: 292, cy: 150, r: 40 }, g);
      svg("ellipse", { cx: 292, cy: 150, rx: 40, ry: 11 }, g);
      svg("ellipse", { cx: 292, cy: 150, rx: 13, ry: 40, class: "detail" }, g);
      svg("circle", { cx: 292, cy: 150, r: 14 }, g);
      line(250, 138, 254, 140, g, "detail"); line(330, 140, 334, 138, g, "detail");
    },
    deck4: function (g) {
      // Habitation drum with window rows and a hull breach
      rect(334, 108, 100, 84, g, 18);
      [124, 176].forEach(function (y) { line(344, y, 424, y, g, "detail"); });
      for (let x = 348; x < 424; x += 12) {
        rect(x, 132, 6, 6, g, 0, "detail");
        rect(x, 162, 6, 6, g, 0, "detail");
      }
      path("M 392 108 L 398 120 L 390 128 L 402 140 L 396 150", g, "breach");
    },
    life: function (g) {
      // Three pressure tanks on the spine
      line(434, 138, 486, 138, g); line(434, 162, 486, 162, g);
      [438, 456, 474].forEach(function (x) { rect(x, 112, 12, 76, g, 6); });
      [126, 174].forEach(function (y) { line(438, y, 486, y, g, "detail"); });
    },
    prow: function (g) {
      // Heavy command module
      poly("486,108 548,90 600,98 618,150 600,202 548,210 486,192", g);
      line(486, 150, 618, 150, g, "detail");
      line(548, 90, 548, 210, g, "detail"); line(600, 98, 600, 202, g, "detail");
      path("M 618 140 L 632 144 L 632 156 L 618 160", g);
      [118, 182].forEach(function (y) { line(500, y, 590, y, g, "detail"); });
    },
    bridge: function (g) {
      poly("536,90 546,68 588,68 598,96", g);
      rect(552, 74, 30, 7, g, 0, "detail");
      [556, 566, 576].forEach(function (x) { line(x, 74, x, 81, g, "detail"); });
    },
    vox: function (g) {
      line(567, 68, 567, 18, g);
      line(557, 34, 577, 34, g); line(560, 48, 574, 48, g);
      path("M 548 26 Q 567 10 586 26", g);
      line(567, 18, 590, 8, g, "detail");
    },
    geller: function (g) {
      svg("ellipse", { cx: 330, cy: 150, rx: 318, ry: 128, class: "field" }, g);
    }
  };

  /* Where each label sits and where its leader line points. */
  const LABELS = {
    vox:     { x: 450, y: 18,  tx: 562, ty: 26 },
    bridge:  { x: 450, y: 50,  tx: 540, ty: 80 },
    prow:    { x: 556, y: 246, tx: 580, ty: 206 },
    life:    { x: 420, y: 258, tx: 462, ty: 188 },
    deck4:   { x: 330, y: 238, tx: 370, ty: 192 },
    reactor: { x: 246, y: 258, tx: 292, ty: 190 },
    cargo:   { x: 140, y: 238, tx: 180, ty: 196 },
    engines: { x: 30,  y: 258, tx: 70,  ty: 226 },
    geller:  { x: 40,  y: 22,  tx: 120, ty: 48 }
  };

  /* Generous invisible click zones around each section, so you don't
     have to hit the thin lines exactly: [x, y, width, height]. */
  const HIT = {
    engines: [20, 68, 110, 164],
    cargo:   [128, 86, 122, 116],
    reactor: [250, 104, 84, 92],
    deck4:   [334, 102, 100, 96],
    life:    [434, 106, 52, 88],
    bridge:  [532, 62, 70, 36],
    vox:     [542, 2, 54, 62]
  };

  function schematic(onPick, onEnter) {
    const root = svg("svg", { viewBox: "0 0 640 270", class: "ship-svg", role: "img",
                              "aria-label": "Schematic of the Vigil of Ash with damaged sections flashing" });
    // Keel and centerline
    line(30, 150, 630, 150, root, "axis");
    SHIP_SYSTEMS.forEach(function (s, i) {
      // Systems that aren't areas (the Geller field) are display-only: no click, no focus.
      const nav = s.area !== false;
      const g = svg("g", { class: "ship-sec " + s.status + (nav ? "" : " static"), "data-id": s.id }, root);
      if (nav) { g.setAttribute("tabindex", 0); }
      g.style.animationDelay = (i * 0.37 % 1.3).toFixed(2) + "s";
      svg("title", {}, g).textContent = s.name + ": " + s.note + " (" + s.pct + "%)";
      if (nav && HIT[s.id]) {
        const h = HIT[s.id];
        svg("rect", { x: h[0], y: h[1], width: h[2], height: h[3], rx: 4, class: "hit" }, g);
      }
      SHAPES[s.id](g);
      g.addEventListener("mouseenter", function () { onPick(s); });
      g.addEventListener("focus", function () { onPick(s); });
      if (nav) {
        g.addEventListener("click", function (e) { e.stopPropagation(); onEnter(s); });
        g.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); onEnter(s); } });
      }
    });
    // Labels with leader lines
    SHIP_SYSTEMS.forEach(function (s) {
      const L = LABELS[s.id];
      const nav = s.area !== false;
      const g = svg("g", { class: "ship-label " + s.status + (nav ? " nav" : ""), "data-id": s.id }, root);
      line(L.x + 20, L.y + (L.y < L.ty ? 4 : -12), L.tx, L.ty, g, "leader");
      const t = svg("text", { x: L.x, y: L.y }, g);
      t.textContent = tagOf(s) + s.name + (s.status === "ok" ? "" : " !");
      // The label is a click target too (with a padded box behind the text)
      if (nav) {
        const w = t.textContent.length * 7.2 + 12;
        g.insertBefore(svg("rect", { x: L.x - 6, y: L.y - 15, width: w, height: 22, rx: 3, class: "label-hit" }), t);
        g.addEventListener("mouseenter", function () {
          onPick(s);
          const sec = root.querySelector('.ship-sec[data-id="' + s.id + '"]');
          if (sec) { sec.classList.add("hover"); }
        });
        g.addEventListener("mouseleave", function () {
          const sec = root.querySelector('.ship-sec[data-id="' + s.id + '"]');
          if (sec) { sec.classList.remove("hover"); }
        });
        g.addEventListener("click", function (e) { e.stopPropagation(); onEnter(s); });
      }
    });
    return root;
  }

  /* ---------- Panels ---------- */
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text != null) { e.textContent = text; }
    return e;
  }

  function panel(title, cls) {
    const p = el("div", "sp-panel" + (cls ? " " + cls : ""));
    p.appendChild(el("div", "sp-title", title));
    return p;
  }

  function bar(pct) {
    const cells = 14, on = Math.round(pct / 100 * cells);
    return "█".repeat(on) + "░".repeat(cells - on);
  }

  /* opts.enter(system) is called to open an area (click or keyboard). */
  function render(opts) {
    opts = opts || {};
    const wrap = el("div", "ship");

    const head = el("div", "ship-head");
    head.appendChild(el("span", "dim", "HULL SCHEMATIC"));
    head.appendChild(el("span", "ship-name", "VIGIL OF ASH"));
    head.appendChild(el("span", "dim", "HULL " + hull() + "%"));
    wrap.appendChild(head);

    const grid = el("div", "ship-grid");

    // Left: schematic
    const left = panel("DAMAGE REPORT", "sp-schematic");
    const picked = el("div", "line sp-picked dim", "HOVER A SECTION FOR DETAIL. CLICK IT, OR TYPE ITS NUMBER, TO GO THERE.");
    left.appendChild(schematic(function (s) {
      picked.className = "line sp-picked" + (s.status === "ok" ? "" : " alert");
      picked.textContent = tagOf(s) + s.name + " .... " + s.pct + "%. " + s.note;
      wrap.querySelectorAll(".sp-row").forEach(function (r) {
        r.classList.toggle("on", r.dataset.id === s.id);
      });
    }, function (s) { if (opts.enter) { opts.enter(s); } }));
    left.appendChild(picked);
    grid.appendChild(left);

    // Right: systems, caution & warning, repair status
    const right = el("div", "ship-side");

    const sys = panel("SYSTEMS");
    SHIP_SYSTEMS.forEach(function (s) {
      const r = el("div", "sp-row " + s.status);
      r.dataset.id = s.id;
      r.appendChild(el("span", "sp-name", (s.num ? s.num + "  " : "\u00B7  ") + s.name));
      if (s.area !== false) {
        r.addEventListener("click", function (e) { e.stopPropagation(); if (opts.enter) { opts.enter(s); } });
      } else {
        r.classList.add("static");
      }
      r.appendChild(el("span", "sp-pct", String(s.pct).padStart(3, " ") + "%"));
      r.appendChild(el("span", "sp-state", s.measure === "INTEGRITY" ? "INT" : s.status === "ok" ? "NOM" : s.status === "damaged" ? "DMG" : "OFF"));
      sys.appendChild(r);
    });
    right.appendChild(sys);

    const cw = panel("CAUTION & WARNING", "sp-cw");
    const bad = SHIP_SYSTEMS.filter(function (s) { return s.status !== "ok"; });
    bad.forEach(function (s) {
      cw.appendChild(el("div", "line " + (s.status === "offline" ? "alert" : "sp-warn"),
        (s.status === "offline" ? "WRN  " : "CAU  ") + s.name + ": " + s.note));
    });
    right.appendChild(cw);

    const rep = panel("REPAIR PROTOCOLS");
    const fixed = SHIP_SYSTEMS.filter(function (s) { return s.status === "ok"; }).length;
    rep.appendChild(el("div", "line", "NOMINAL  " + fixed + " / " + SHIP_SYSTEMS.length));
    rep.appendChild(el("div", "line sp-bar", bar(fixed / SHIP_SYSTEMS.length * 100)));
    rep.appendChild(el("div", "line dim", "REPAIR INTERFACE: LOCKED. AWAITING ENGINSEER."));
    right.appendChild(rep);

    grid.appendChild(right);
    wrap.appendChild(grid);

    wrap.appendChild(el("div", "ship-foot", bad.length + " FAULTS ACTIVE"));
    return wrap;
  }

  /* ---------- Repairs (the easter egg hunt) ----------
     A repaired system is saved in this browser, so the ship stays fixed
     between visits. REPAIRS lists what each fix sets the system to. */
  const REPAIRS = {
    vox:     { status: "ok", pct: 100, note: "LOCK HOLDING. SIGNAL CLEAR" },
    reactor: { status: "ok", pct: 100, note: "CORES STABLE. FULL OUTPUT" },
    geller:  { status: "ok", pct: 100, note: "FIELD STABLE" },
    engines: { status: "ok", pct: 100, note: "BOTH ENGINES ONLINE. THRUST NOMINAL" }
  };
  /* Some repairs depend on others. The Geller field can only be raised
     from the bridge once the vox array and the reactor are online. */
  const REQUIRES = {
    geller: ["vox", "reactor"]
  };
  const ORIGINAL = {};
  SHIP_SYSTEMS.forEach(function (s) { ORIGINAL[s.id] = { status: s.status, pct: s.pct, note: s.note }; });
  const KEY = "alexisos-repairs";

  function saved() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; }
  }
  function applyRepairs() {
    const done = saved();
    SHIP_SYSTEMS.forEach(function (s) {
      const src = done[s.id] && REPAIRS[s.id] ? REPAIRS[s.id] : ORIGINAL[s.id];
      s.status = src.status; s.pct = src.pct; s.note = src.note;
    });
  }
  function repair(id) {
    if (!REPAIRS[id]) { return; }
    const done = saved();
    done[id] = true;
    try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) { /* storage blocked */ }
    applyRepairs();
  }
  function isRepaired(id) { return !!saved()[id]; }
  /* Which prerequisites are still missing for a repair (empty = ready). */
  function missingFor(id) {
    return (REQUIRES[id] || []).filter(function (r) { return !isRepaired(r); });
  }
  function resetRepairs() {
    try { localStorage.removeItem(KEY); localStorage.removeItem(FLAG_KEY); } catch (e) { /* storage blocked */ }
    applyRepairs();
  }

  /* Small saved progress markers for multi-step repairs
     (for example, which engine panels have been safed). */
  const FLAG_KEY = "alexisos-flags";
  function flags() {
    try { return JSON.parse(localStorage.getItem(FLAG_KEY) || "{}"); } catch (e) { return {}; }
  }
  function flag(name, value) {
    const f = flags();
    if (value === undefined) { return !!f[name]; }
    f[name] = !!value;
    try { localStorage.setItem(FLAG_KEY, JSON.stringify(f)); } catch (e) { /* storage blocked */ }
    return f[name];
  }
  applyRepairs();

  window.Ship = { systems: SHIP_SYSTEMS, render: render, hull: hull,
                  repair: repair, isRepaired: isRepaired, resetRepairs: resetRepairs,
                  missingFor: missingFor, requires: REQUIRES, flag: flag };
})();
