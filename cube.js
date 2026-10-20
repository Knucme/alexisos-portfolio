/* ===================================================================
   AlexisOS // HEX CUBE - cube.js
   A 3x3 Rubik's cube for the terminal. Stickers show short hex codes
   instead of colors, with a legend that translates them.

   Split into two parts so a real 3D view can be dropped in later:
   - MODEL  : the cube state and move logic (no DOM)
   - VIEWS  : renderers that draw the model (currently "face": one
              side at a time with arrows to move to the others).
              A future 3D renderer only needs a draw(model, el) function
              and an entry in RENDERERS below.

   Coordinates: x points right, y points up, z points at the viewer.
   The face you are looking at is always F. "Looking around" turns the
   whole cube (x / y / z rotations), so moves are always relative to
   what is on screen.
   =================================================================== */
(function () {
  "use strict";

  /* ---------- Colors (hex code -> word) ---------- */
  const START = { U: "FFF", D: "FD0", F: "0A0", B: "05F", R: "F00", L: "F80" };
  const LEGEND = [
    ["FFF", "WHITE"], ["FD0", "YELLOW"], ["F00", "RED"],
    ["F80", "ORANGE"], ["05F", "BLUE"], ["0A0", "GREEN"]
  ];
  const WORD = {};
  LEGEND.forEach(function (l) { WORD[l[0]] = l[1]; });

  const NORMAL = {
    U: [0, 1, 0], D: [0, -1, 0], R: [1, 0, 0],
    L: [-1, 0, 0], F: [0, 0, 1], B: [0, 0, -1]
  };

  /* Each move turns a layer clockwise as seen from `axis`.
     layer: which slice (dot(position, axis) === layer); null = whole cube. */
  const MOVES = {
    U: { axis: [0, 1, 0],  layer: 1 },
    D: { axis: [0, -1, 0], layer: 1 },
    R: { axis: [1, 0, 0],  layer: 1 },
    L: { axis: [-1, 0, 0], layer: 1 },
    F: { axis: [0, 0, 1],  layer: 1 },
    B: { axis: [0, 0, -1], layer: 1 },
    M: { axis: [-1, 0, 0], layer: 0 },
    E: { axis: [0, -1, 0], layer: 0 },
    S: { axis: [0, 0, 1],  layer: 0 },
    x: { axis: [1, 0, 0],  layer: null },
    y: { axis: [0, 1, 0],  layer: null },
    z: { axis: [0, 0, 1],  layer: null }
  };

  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

  /* Rotate v by -90 degrees around unit axis n (clockwise seen from n). */
  function turn(v, n) {
    const c = [n[1] * v[2] - n[2] * v[1], n[2] * v[0] - n[0] * v[2], n[0] * v[1] - n[1] * v[0]];
    const d = dot(n, v);
    return [-c[0] + n[0] * d, -c[1] + n[1] * d, -c[2] + n[2] * d];
  }

  function same(a, b) { return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]; }

  /* ---------- Notation ---------- */
  /* "R U R' U'", "r u2 r'", "RUR'U'" -> [{base:"R", turns:1}, ...]
     Returns null if anything in the string is not a move. */
  function parse(text) {
    const s = String(text).replace(/[’`]/g, "'").replace(/\s+/g, "");
    if (!s) { return null; }
    const re = /([UDLRFBMESudlrfbmesXYZxyz])(2'|'2|2|')?/g;
    const out = [];
    let used = 0;
    let m;
    while ((m = re.exec(s)) !== null) {
      if (m.index !== used) { return null; }
      used = re.lastIndex;
      let base = m[1];
      base = /[xyzXYZ]/.test(base) ? base.toLowerCase() : base.toUpperCase();
      const mod = m[2] || "";
      const turns = mod.indexOf("2") >= 0 ? 2 : (mod === "'" ? 3 : 1);
      out.push({ base: base, turns: turns });
    }
    return used === s.length && out.length ? out : null;
  }

  function label(mv) {
    return mv.base + (mv.turns === 2 ? "2" : mv.turns === 3 ? "'" : "");
  }

  function isRotation(mv) { return mv.base === "x" || mv.base === "y" || mv.base === "z"; }

  /* ---------- MODEL ---------- */
  function createModel() {
    const model = {
      stickers: [],
      history: [],      // moves since last scramble/reset, for UNDO
      moves: 0,         // face turns (rotations don't count)
      scrambled: false,
      startedAt: 0,     // first turn after a scramble
      solvedAt: 0
    };

    model.reset = function () {
      model.stickers = [];
      Object.keys(NORMAL).forEach(function (f) {
        const n = NORMAL[f];
        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
              const p = [x, y, z];
              if (dot(p, n) === 1) {
                model.stickers.push({ p: p, n: n.slice(), c: START[f] });
              }
            }
          }
        }
      });
      model.history = [];
      model.moves = 0;
      model.scrambled = false;
      model.startedAt = 0;
      model.solvedAt = 0;
    };

    /* Apply one parsed move without touching counters. */
    function raw(mv) {
      const def = MOVES[mv.base];
      for (let t = 0; t < mv.turns; t++) {
        model.stickers.forEach(function (s) {
          if (def.layer === null || dot(s.p, def.axis) === def.layer) {
            s.p = turn(s.p, def.axis);
            s.n = turn(s.n, def.axis);
          }
        });
      }
    }

    /* Apply a move as a player action. Returns true if it solved the cube. */
    model.apply = function (mv) {
      const wasSolved = model.isSolved();
      raw(mv);
      model.history.push(mv);
      if (!isRotation(mv)) {
        // Mixing a solved cube by hand counts as a scramble too.
        if (wasSolved && !model.scrambled) {
          model.scrambled = true;
          model.moves = 0;
          model.startedAt = 0;
          model.solvedAt = 0;
        }
        model.moves++;
        if (model.scrambled && !model.startedAt) { model.startedAt = Date.now(); }
      }
      if (!wasSolved && model.scrambled && model.isSolved() && !isRotation(mv)) {
        model.solvedAt = Date.now();
        model.scrambled = false;
        return true;
      }
      return false;
    };

    model.undo = function () {
      const mv = model.history.pop();
      if (!mv) { return null; }
      raw({ base: mv.base, turns: 4 - mv.turns });
      if (!isRotation(mv)) { model.moves = Math.max(0, model.moves - 1); }
      return mv;
    };

    model.scramble = function (length) {
      model.reset();
      const faces = ["U", "D", "L", "R", "F", "B"];
      const axisOf = { U: 0, D: 0, L: 1, R: 1, F: 2, B: 2 };
      const seq = [];
      let last = -1;
      while (seq.length < (length || 20)) {
        const f = faces[Math.floor(Math.random() * 6)];
        if (axisOf[f] === last) { continue; }
        last = axisOf[f];
        const mv = { base: f, turns: 1 + Math.floor(Math.random() * 3) };
        raw(mv);
        seq.push(mv);
      }
      if (model.isSolved()) { return model.scramble(length); }
      model.scrambled = true;
      return seq;
    };

    model.isSolved = function () {
      const seen = {};
      return model.stickers.every(function (s) {
        const k = s.n.join(",");
        if (!seen[k]) { seen[k] = s.c; }
        return seen[k] === s.c;
      });
    };

    /* True if all 9 stickers on that side match. */
    model.faceDone = function (f) {
      const g = model.face(f);
      return g.every(function (r) { return r.every(function (c) { return c === g[1][1]; }); });
    };

    /* Hex codes of every finished side, e.g. ["0A0", "FFF"]. */
    model.doneColors = function () {
      return Object.keys(NORMAL).filter(model.faceDone).map(function (f) { return model.face(f)[1][1]; });
    };

    /* 3x3 grid of hex codes for a face (U D L R F B in the net layout). */
    model.face = function (f) {
      const n = NORMAL[f];
      const g = [[], [], []];
      model.stickers.forEach(function (s) {
        if (!same(s.n, n)) { return; }
        const x = s.p[0], y = s.p[1], z = s.p[2];
        let row, col;
        switch (f) {
          case "F": row = 1 - y; col = x + 1; break;
          case "B": row = 1 - y; col = 1 - x; break;
          case "R": row = 1 - y; col = 1 - z; break;
          case "L": row = 1 - y; col = z + 1; break;
          case "U": row = z + 1; col = x + 1; break;
          case "D": row = 1 - z; col = x + 1; break;
        }
        g[row][col] = s.c;
      });
      return g;
    };

    model.reset();
    return model;
  }

  /* ---------- VIEWS ---------- */
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text != null) { e.textContent = text; }
    return e;
  }

  function cell(code, extra) {
    const c = el("div", "cc" + (extra ? " " + extra : ""), code ? "#" + code : "");
    if (code) {
      c.title = "#" + code + " = " + WORD[code];
      c.setAttribute("aria-label", WORD[code].toLowerCase());
    }
    return c;
  }

  /* Side view: only the side you are working on, with a direction
     button on each edge. Each button shows the center code of the side
     that is over there, and clicking it brings that side to the front. */
  function drawFace(model, stage, ctx) {
    const F = model.face("F");
    const done = model.faceDone("F");
    const wrap = el("div", "cube-nav");

    function arrow(dir, symbol, face, area) {
      const code = model.face(face)[1][1];
      const b = el("button", "opt cnav " + area + (model.faceDone(face) ? " done" : ""), "");
      b.type = "button";
      b.title = "Show the " + dir + " side (#" + code + " " + WORD[code] + ")";
      b.appendChild(el("span", "cnav-arrow", symbol));
      b.appendChild(el("span", "cnav-code", "#" + code));
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        ctx.look(dir);
      });
      return b;
    }

    /* Squares are clickable: click one to select it, then slide its row
       or column (or turn the whole side if it's the center). */
    const sel = ctx.selected;
    const g = el("div", "cube-face" + (done ? " side-done" : ""));
    g.setAttribute("aria-label", "The side facing you. Click a square to select it.");
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const isSel = sel && sel.r === r && sel.c === c;
        const sq = cell(F[r][c], (r === 1 && c === 1 ? "center" : "") + (done ? " done" : "") +
                                 (isSel ? " picked" : "") + " pickable");
        sq.setAttribute("role", "button");
        sq.tabIndex = 0;
        sq.addEventListener("click", function (e) {
          e.stopPropagation();
          ctx.select(isSel ? null : { r: r, c: c });
        });
        sq.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sq.click(); }
        });
        g.appendChild(sq);
      }
    }

    wrap.appendChild(arrow("up", "\u25B2", "U", "n-up"));
    wrap.appendChild(arrow("left", "\u25C4", "L", "n-left"));
    wrap.appendChild(g);
    wrap.appendChild(arrow("right", "\u25BA", "R", "n-right"));
    wrap.appendChild(arrow("down", "\u25BC", "D", "n-down"));
    stage.appendChild(wrap);

    /* Slide controls for the selected square. */
    const bar = el("div", "cube-pick");
    if (!sel) {
      bar.appendChild(el("span", "dim", "CLICK A SQUARE TO SELECT IT, THEN SLIDE ITS ROW OR COLUMN."));
    } else {
      const rowLeft  = ["U", "E'", "D'"][sel.r];
      const colUp    = ["L'", "M'", "R"][sel.c];
      const inv = function (m) { return m.slice(-1) === "'" ? m.slice(0, -1) : m + "'"; };
      bar.appendChild(el("span", "dim", "SELECTED ROW " + (sel.r + 1) + ", COL " + (sel.c + 1) + ":"));
      function slide(text, move) {
        const b = el("button", "opt cbtn", text);
        b.type = "button";
        b.title = "Move " + move;
        b.addEventListener("click", function (e) { e.stopPropagation(); ctx.turn(move); });
        bar.appendChild(b);
      }
      slide("\u25C4 ROW", rowLeft);
      slide("ROW \u25BA", inv(rowLeft));
      slide("\u25B2 COL", colUp);
      slide("COL \u25BC", inv(colUp));
      if (sel.r === 1 && sel.c === 1) {
        slide("\u21BB SIDE", "F");
        slide("\u21BA SIDE", "F'");
      }
    }
    stage.appendChild(bar);
  }

  /* Add a 3D renderer here later, e.g. { side: drawFace, three: draw3D }. */
  const RENDERERS = { face: drawFace };

  /* ---------- WIDGET ---------- */
  function clock(ms) {
    const s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  /* Build the cube panel. Returns { el, command(text) -> bool }. */
  function mount(model, opts) {
    const options = opts || {};
    const view = options.view || "face";
    let selected = null;     // clicked square {r, c} on the current side

    const root = el("div", "cube");
    const stat = el("div", "cube-stat line");
    const stage = el("div", "cube-stage");
    const log = el("div", "cube-log line dim");
    const controls = el("div", "cube-controls");

    const legend = el("div", "cube-legend");
    legend.appendChild(el("span", "dim", "LEGEND"));
    LEGEND.forEach(function (l) { legend.appendChild(el("span", "lg", "#" + l[0] + " = " + l[1])); });

    function btn(text, title, fn) {
      const b = el("button", "opt cbtn", text);
      b.type = "button";
      if (title) { b.title = title; }
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        fn();
        if (options.onAction) { options.onAction(); }
      });
      return b;
    }

    function row(name, buttons) {
      const r = el("div", "cube-row");
      r.appendChild(el("span", "cube-row-name dim", name));
      buttons.forEach(function (b) { r.appendChild(b); });
      controls.appendChild(r);
    }

    function say(text, cls) {
      log.className = "cube-log line " + (cls || "dim");
      log.textContent = text;
    }

    function draw() {
      stage.innerHTML = "";
      RENDERERS[view](model, stage, {
        look: look,
        selected: selected,
        select: function (s) { selected = s; draw(); if (options.onAction) { options.onAction(); } },
        turn: function (m) { play(parse(m), "TURNED"); if (options.onAction) { options.onAction(); } }
      });
      drawStat();
    }

    /* Status line only (the timer refreshes this without redrawing squares). */
    function drawStat() {
      const center = model.face("F")[1][1];
      let time = "--";
      if (model.startedAt) {
        time = clock((model.solvedAt && model.solvedAt > model.startedAt ? model.solvedAt : Date.now()) - model.startedAt);
      }
      const state = model.isSolved() ? "SOLVED" : (model.scrambled ? "SCRAMBLED" : "UNSOLVED");
      stat.textContent = "FACING #" + center + " " + WORD[center] +
        "  //  SIDES DONE " + model.doneColors().length + "/6" +
        "  //  MOVES " + model.moves + "  //  TIME " + time + "  //  " + state;
      stat.classList.toggle("alert", state === "SCRAMBLED");
    }

    /* Run a list of parsed moves. */
    /* Replay a CSS animation class on an element. */
    function flash(node, cls, ms) {
      node.classList.remove(cls);
      void node.offsetWidth;          // restart the animation
      node.classList.add(cls);
      setTimeout(function () { node.classList.remove(cls); }, ms);
    }

    function play(list, source) {
      const before = model.doneColors();
      let solved = false;
      list.forEach(function (mv) { if (model.apply(mv)) { solved = true; } });
      draw();
      if (solved) {
        // Whole cube done: everything flashes green.
        say("+++ CUBE RESTORED. " + model.moves + " MOVES IN " +
            clock(model.solvedAt - model.startedAt) + ". THE MACHINE SPIRIT APPROVES. +++", "win");
        flash(root, "won", 4200);
        return;
      }
      const fresh = model.doneColors().filter(function (c) { return before.indexOf(c) < 0; });
      if (fresh.length && model.scrambled) {
        // A side just came together: say which, and pulse it.
        say("SIDE COMPLETE: " + fresh.map(function (c) { return "#" + c + " " + WORD[c]; }).join(", ") +
            ". " + model.doneColors().length + " OF 6.", "good");
        flash(stage, "side-won", 1600);
        return;
      }
      say((source || "EXECUTED") + ": " + list.map(label).join(" "));
    }

    const ops = {
      scramble: function () {
        selected = null;
        const seq = model.scramble(20);
        draw();
        say("SCRAMBLED: " + seq.map(label).join(" "));
      },
      reset: function () { selected = null; model.reset(); draw(); say("CUBE RESET TO SOLVED STATE."); },
      spin: function () { look("spin"); },
      undo: function () {
        const mv = model.undo();
        draw();
        say(mv ? "UNDID: " + label(mv) : "NOTHING TO UNDO.");
      },
    };

    /* Look-around buttons turn the whole cube so a new side faces you. */
    const LOOK = {
      left:  { base: "y", turns: 3, text: "MOVED LEFT" },
      right: { base: "y", turns: 1, text: "MOVED RIGHT" },
      up:    { base: "x", turns: 3, text: "MOVED UP" },
      down:  { base: "x", turns: 1, text: "MOVED DOWN" },
      spin:  { base: "z", turns: 1, text: "SPUN THIS SIDE CLOCKWISE" }
    };
    function look(dir) {
      const l = LOOK[dir];
      selected = null;
      model.apply({ base: l.base, turns: l.turns });
      draw();
      const c = model.face("F")[1][1];
      say(l.text + ". NOW WORKING ON SIDE #" + c + " " + WORD[c] + ".");
      if (options.onAction) { options.onAction(); }
    }

    row("TURN", ["U", "U'", "D", "D'", "L", "L'", "R", "R'", "F", "F'", "B", "B'"].map(function (m) {
      return btn(m, "Turn " + m, function () { play(parse(m), "TURNED"); });
    }));
    row("OPS", [
      btn("SCRAMBLE", null, ops.scramble),
      btn("UNDO", null, ops.undo),
      btn("RESET", null, ops.reset),
      btn("SPIN", "Rotate this side's view clockwise", ops.spin)
    ]);

    root.appendChild(stat);
    root.appendChild(stage);
    root.appendChild(legend);
    root.appendChild(controls);
    root.appendChild(log);

    draw();
    say("USE THE ARROWS AROUND THE SIDE TO MOVE TO ANOTHER SIDE. TYPE MOVES AT THE PROMPT, E.G.  R U R' U'");

    /* Keep the timer ticking while the panel is on screen. */
    const tick = setInterval(function () {
      if (!root.isConnected) { clearInterval(tick); return; }
      if (model.startedAt && !model.solvedAt) { drawStat(); }
    }, 1000);

    /* Typed input from the terminal prompt. */
    function command(text) {
      const t = String(text).trim();
      const w = t.toLowerCase();
      if (w === "scramble" || w === "mix")  { ops.scramble(); return true; }
      if (w === "reset" || w === "solved")  { ops.reset(); return true; }
      if (w === "undo" || w === "u-")       { ops.undo(); return true; }
      if (w === "left" || w === "right" || w === "up" || w === "down" || w === "spin") {
        look(w); return true;
      }
      if (w === "look left" || w === "look right" || w === "look up" || w === "look down") {
        look(w.split(" ")[1]); return true;
      }
      const list = parse(t);
      if (list) { play(list, "TYPED"); return true; }
      return false;
    }

    return { el: root, command: command, model: model };
  }

  window.HexCube = { createModel: createModel, mount: mount, parse: parse, LEGEND: LEGEND };
})();
