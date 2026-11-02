/* ===================================================================
   AlexisOS - areas.js
   Scenes for each ship area (opened from STATUS -> area number).
   Each entry in ShipAreas is a function(system, allSystems) that
   returns a DOM element. Areas without a scene show a "survey pending"
   message, so new ones can be added one at a time.

   BRIDGE: the main control console. Built from plain HTML/CSS, so the
   buttons, switches and lights can become repair-puzzle inputs later.
   Each control has a data-ctl name for that purpose.
   =================================================================== */
(function () {
  "use strict";

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text != null) { e.textContent = text; }
    return e;
  }

  function seeded(n) {               // stable pseudo-random, so the panel looks the same each visit
    let x = n * 9301 + 49297;
    return function () { x = (x * 9301 + 49297) % 233280; return x / 233280; };
  }

  /* ---------- Small building blocks ---------- */
  function gauge(label, value) {     // value 0..1
    const g = el("div", "bp-gauge");
    const face = el("div", "bp-gauge-face");
    const needle = el("div", "bp-needle");
    needle.style.transform = "rotate(" + (-120 + value * 240) + "deg)";
    face.appendChild(needle);
    g.appendChild(face);
    g.appendChild(el("div", "bp-tag", label));
    return g;
  }

  function toggle(label, up) {
    const t = el("button", "bp-toggle" + (up ? " up" : ""));
    t.type = "button";
    t.dataset.ctl = "toggle-" + label.toLowerCase();
    t.appendChild(el("span", "bp-lever"));
    t.appendChild(el("span", "bp-tag", label));
    t.addEventListener("click", function (e) { e.stopPropagation(); t.classList.toggle("up"); });
    return t;
  }

  function key(label, cls) {
    const k = el("button", "bp-key " + (cls || ""), label);
    k.type = "button";
    k.dataset.ctl = "key-" + label.toLowerCase().replace(/\s+/g, "-");
    k.addEventListener("click", function (e) {
      e.stopPropagation();
      k.classList.remove("pressed");
      void k.offsetWidth;
      k.classList.add("pressed");
    });
    return k;
  }

  function knob(label, angle, white) {
    const k = el("div", "bp-knob-wrap");
    const dial = el("div", "bp-knob" + (white ? " white" : ""));
    dial.style.transform = "rotate(" + angle + "deg)";
    k.appendChild(dial);
    k.appendChild(el("div", "bp-tag", label));
    return k;
  }

  function bay(title, cls) {
    const b = el("div", "bp-bay " + (cls || ""));
    if (title) { b.appendChild(el("div", "bp-bay-title", title)); }
    return b;
  }

  /* Annunciator light for a ship system: off / amber flashing / red. */
  function annunciator(s) {
    const a = el("div", "bp-ann " + s.status, s.name.replace(" ", "\n"));
    a.title = "[" + s.num + "] " + s.name + ": " + s.note;
    return a;
  }

  /* Rocker switch with an orange label. */
  function rocker(t, fault) {
    const r = el("button", "bp-rocker" + (fault ? " fault" : ""));
    r.type = "button";
    r.dataset.ctl = "rocker-" + t.toLowerCase().replace(/\s+/g, "-");
    r.appendChild(el("span", "bp-rocker-tag", t));
    r.appendChild(el("span", "bp-rocker-body"));
    r.addEventListener("click", function (e) { e.stopPropagation(); r.classList.toggle("on"); });
    return r;
  }

  /* Knobs can be turned: each click steps the pointer 30 degrees. */
  function turnable(k) {
    const dial = k.querySelector(".bp-knob");
    let angle = parseFloat(dial.dataset.angle || "0");
    dial.dataset.ctl = "knob";
    dial.style.cursor = "pointer";
    dial.addEventListener("click", function (e) {
      e.stopPropagation();
      angle = angle >= 120 ? -120 : angle + 30;
      dial.style.transform = "rotate(" + angle + "deg)";
    });
    return k;
  }
  function knobT(label, angle, white, big) {
    const k = knob(label, angle, white);
    const dial = k.querySelector(".bp-knob");
    dial.dataset.angle = angle;
    if (big) { dial.classList.add("big"); }
    return turnable(k);
  }

  /* ---------- BRIDGE ----------
     Top: the auspex screen across the full width, like a windshield.
     Under it: the master caution lights, then the control deck:
     mostly knobs and switches, very few buttons. */
  function bridge(sys, all) {
    const rand = seeded(7);
    const panel = el("div", "bp");
    panel.setAttribute("aria-label", "Bridge main control console");

    // Windshield auspex screen
    const shield = el("div", "bp-shield");
    const radar = el("div", "bp-radar wide");
    radar.appendChild(el("div", "bp-sweep"));
    for (let i = 0; i < 7; i++) {
      const blip = el("div", "bp-blip" + (i === 6 ? " hostile" : ""));
      blip.style.left = (10 + rand() * 80) + "%";
      blip.style.top = (15 + rand() * 70) + "%";
      blip.style.animationDelay = (rand() * 4).toFixed(2) + "s";
      radar.appendChild(blip);
    }
    radar.appendChild(el("div", "bp-crt-label", "AUSPEX // FORWARD ARC // 1 CONTACT UNIDENTIFIED"));
    shield.appendChild(radar);
    panel.appendChild(shield);

    // Master caution: one light per ship system, in a row under the screen
    const cautionWrap = el("div", "bp-caution");
    cautionWrap.appendChild(el("div", "bp-bay-title static", "MASTER CAUTION"));
    const ann = el("div", "bp-anns row");
    all.forEach(function (s) { ann.appendChild(annunciator(s)); });
    cautionWrap.appendChild(ann);
    panel.appendChild(cautionWrap);

    // Control deck
    const deck = el("div", "bp-top");

    const left = bay("FLIGHT // POWER");
    const gauges = el("div", "bp-row");
    [["THRUST", 0.02], ["PWR BUS", 0.18], ["O2 PRESS", 0.41], ["HULL", 0.31]].forEach(function (g) {
      gauges.appendChild(gauge(g[0], g[1]));
    });
    left.appendChild(gauges);
    const kL = el("div", "bp-row");
    kL.appendChild(knobT("THROTTLE", -110, false, true));
    kL.appendChild(knobT("BUS SEL", 30));
    kL.appendChild(knobT("TRIM", -20, true));
    left.appendChild(kL);
    const rL = el("div", "bp-row bp-rockers");
    ["PUMP 1", "PUMP 2", "SEAL 4", "HEAT"].forEach(function (t, i) { rL.appendChild(rocker(t, i === 2)); });
    left.appendChild(rL);
    deck.appendChild(left);

    const center = bay("SYSTEMS BUS", "center");
    const tg1 = el("div", "bp-row");
    ["MAIN", "AUX", "BUS A", "BUS B", "VENT", "AIRLK"].forEach(function (t, i) { tg1.appendChild(toggle(t, i === 1 || i === 3)); });
    center.appendChild(tg1);
    const kC = el("div", "bp-row");
    kC.appendChild(knobT("REACTOR", -120, true, true));
    kC.appendChild(knobT("COOLANT", 40));
    kC.appendChild(knobT("FIELD", -60, false, true));
    center.appendChild(kC);
    const tg2 = el("div", "bp-row");
    ["SHLD 1", "SHLD 2", "GELLER", "LIGHTS", "GRAV", "DOORS"].forEach(function (t, i) { tg2.appendChild(toggle(t, i === 3 || i === 4)); });
    center.appendChild(tg2);
    const strip = el("div", "bp-led");
    strip.appendChild(el("span", "bp-led-text",
      "VIGIL OF ASH  //  HULL " + (window.Ship ? Ship.hull() : 31) + "%  //  REACTOR STANDBY  //  VOX CH.9 SIGNAL UNKNOWN  //  AWAITING ENGINSEER  //  "));
    center.appendChild(strip);
    deck.appendChild(center);

    const right = bay("HELM // VOX");
    const kR = el("div", "bp-row");
    kR.appendChild(knobT("GAIN", -40));
    kR.appendChild(knobT("FREQ", 110, true));
    kR.appendChild(knobT("SQUELCH", 0));
    right.appendChild(kR);
    const ind = el("div", "bp-indicators");
    [["VOX CH.9", "on"], ["XPDR", ""], ["BEACON", "on"], ["HELM LOCK", ""]].forEach(function (x) {
      const i = el("div", "bp-ind " + x[1]);
      i.appendChild(el("span", "bp-dot"));
      i.appendChild(el("span", null, x[0]));
      ind.appendChild(i);
    });
    right.appendChild(ind);
    const helm = el("div", "bp-row");
    const stick = el("div", "bp-stick");
    stick.appendChild(el("div", "bp-stick-base"));
    stick.appendChild(el("div", "bp-stick-top"));
    helm.appendChild(stick);
    const tgR = el("div", "bp-row");
    ["RCS", "GEAR"].forEach(function (t) { tgR.appendChild(toggle(t, false)); });
    helm.appendChild(tgR);
    right.appendChild(helm);
    deck.appendChild(right);

    panel.appendChild(deck);

    // A thin bottom rail: readouts and just a few buttons
    const rail = el("div", "bp-rail");
    [["BRG", "271.4"], ["RNG", "0.00"], ["VEL", "0.000"], ["T+", "1207D"]].forEach(function (r) {
      const d = el("div", "bp-read");
      d.appendChild(el("span", "bp-read-l", r[0]));
      d.appendChild(el("span", "bp-read-v", r[1]));
      rail.appendChild(d);
    });
    ["ENGAGE", "RESET"].forEach(function (t) { rail.appendChild(key(t, "fnkey")); });
    panel.appendChild(rail);

    panel.appendChild(el("div", "bp-plate", "COGITATOR MAIN CONSOLE  //  MK IV  //  DO NOT ANOINT WHILE POWERED"));
    return panel;
  }

  /* ---------- REACTOR ----------
     Pixel-art reactor hall drawn on a small canvas and scaled up with
     crisp pixels: three glass containment tanks full of molten core,
     turning slowly (the ribs sweep around each cylinder), pulsing with
     heat, and venting pixelated steam from the top. The center tank is
     the failing one: it flashes red. */
  function reactor(sys) {
    const wrap = el("div", "rx");
    const W = 256, H = 144;
    const canvas = el("canvas", "rx-canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Reactor hall: three glowing containment tanks venting steam");
    wrap.appendChild(canvas);

    const reads = el("div", "rx-reads");
    [["CORE A", "612 C", ""], ["CORE B", "1,184 C", "crit"], ["CORE C", "598 C", ""],
     ["CONTAINMENT", "41%", "crit"], ["OUTPUT", "STANDBY 4%", ""], ["COOLANT", "VENTING", "warn"]].forEach(function (r) {
      const d = el("div", "rx-read " + r[2]);
      d.appendChild(el("span", "rx-l", r[0]));
      d.appendChild(el("span", "rx-v", r[1]));
      reads.appendChild(d);
    });
    wrap.appendChild(reads);

    const ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) { return wrap; }
    ctx.imageSmoothingEnabled = false;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const TANKS = [
      { x: 62,  hot: "#ffb12a", core: "#ff6a00", crit: false, phase: 0 },
      { x: 128, hot: "#ffd24a", core: "#ff3a10", crit: true,  phase: 1.7 },
      { x: 194, hot: "#ffb12a", core: "#ff6a00", crit: false, phase: 3.1 }
    ];
    const TW = 40, TOP = 46, BOT = 112;      // tank width, glass top, glass bottom
    let smoke = [];
    const rnd = seeded(11);

    function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

    function room(t) {
      // back wall
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#120607"); g.addColorStop(0.65, "#2a0d08"); g.addColorStop(1, "#0b0405");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 32) { px(x, 0, 1, 118, "#1d0a09"); }       // wall panels
      // overhead pipes
      px(0, 10, W, 4, "#3a1f1c"); px(0, 10, W, 1, "#6b3a30");
      px(0, 20, W, 3, "#2b1714"); px(0, 20, W, 1, "#55302a");
      for (let x = 20; x < W; x += 58) { px(x, 8, 4, 8, "#4a2a24"); }       // pipe clamps
      // floor and grating
      px(0, 118, W, H - 118, "#0d0606");
      for (let x = -40; x < W + 40; x += 16) {                               // perspective lines
        ctx.strokeStyle = "#1e0d0b"; ctx.beginPath(); ctx.moveTo(x, 118); ctx.lineTo(x + (x - W / 2) * 0.6, H); ctx.stroke();
      }
      px(0, 118, W, 1, "#3b1a12");
      // warm light spill on the floor, pulsing
      const glow = 0.35 + 0.15 * Math.sin(t * 2.2);
      const fg = ctx.createRadialGradient(W / 2, 122, 4, W / 2, 122, 130);
      fg.addColorStop(0, "rgba(255,120,30," + glow + ")"); fg.addColorStop(1, "rgba(255,80,20,0)");
      ctx.fillStyle = fg; ctx.fillRect(0, 100, W, 44);
    }

    function tank(T, t) {
      const x0 = T.x - TW / 2, r = TW / 2;
      const flash = T.crit ? (Math.sin(t * 9) > 0 ? 1 : 0.45) : 0.75 + 0.25 * Math.sin(t * 3 + T.phase);
      // pedestal
      px(x0 - 4, BOT, TW + 8, 8, "#1b1b22"); px(x0 - 4, BOT, TW + 8, 1, "#3d3d4a");
      px(x0 + 2, BOT + 8, TW - 4, 4, "#121217");
      // feed pipes from the overhead line
      px(T.x - 2, 14, 4, TOP - 18, "#3a1f1c"); px(T.x - 2, 14, 1, TOP - 18, "#6b3a30");
      // glass body: molten core with a heat gradient
      const level = TOP + 14 + Math.sin(t * 1.3 + T.phase) * 2;
      const g = ctx.createLinearGradient(0, level, 0, BOT);
      g.addColorStop(0, T.crit && flash < 1 ? "#ff2a10" : T.hot);
      g.addColorStop(0.5, T.core);
      g.addColorStop(1, "#5a0e04");
      ctx.globalAlpha = flash;
      ctx.fillStyle = g; ctx.fillRect(x0 + 1, Math.round(level), TW - 2, BOT - Math.round(level));
      ctx.globalAlpha = 1;
      // empty glass above the liquid
      px(x0 + 1, TOP, TW - 2, Math.round(level) - TOP, "rgba(255,170,90,0.10)");
      // bubbles / swirl blobs rising inside
      for (let i = 0; i < 6; i++) {
        const ph = (t * 0.5 + i / 6 + T.phase) % 1;
        const bx = T.x + Math.sin(t * 2 + i * 1.9 + T.phase) * (r - 6);
        const by = BOT - 4 - ph * (BOT - level - 6);
        px(bx, by, 2, 2, "rgba(255,240,170," + (0.9 - ph * 0.6) + ")");
      }
      // rotation: ribs sweeping around the cylinder (only the front half shows)
      for (let k = 0; k < 6; k++) {
        const a = t * 0.9 + T.phase + k * Math.PI / 3;
        const z = Math.cos(a);
        if (z <= 0) { continue; }
        const rx = T.x + Math.sin(a) * (r - 1);
        px(rx, TOP, 1, BOT - TOP, "rgba(40,20,20," + (0.35 + z * 0.45) + ")");
      }
      // glass edge highlights (fixed, so the turning reads as rotation)
      px(x0, TOP, 1, BOT - TOP, "#c98a5a"); px(x0 + TW - 1, TOP, 1, BOT - TOP, "#7a4a32");
      px(x0 + 5, TOP + 3, 2, BOT - TOP - 10, "rgba(255,255,255,0.22)");
      // metal bands and cap
      [TOP, TOP + 22, BOT - 2].forEach(function (y) { px(x0 - 1, y, TW + 2, 2, "#2a2a33"); px(x0 - 1, y, TW + 2, 1, "#55556a"); });
      px(x0 + 4, TOP - 8, TW - 8, 8, "#24242c"); px(x0 + 4, TOP - 8, TW - 8, 1, "#4d4d5e");
      px(T.x - 3, TOP - 13, 6, 5, "#2e2e38");       // vent stack
      // heat halo
      const halo = ctx.createRadialGradient(T.x, (TOP + BOT) / 2, 4, T.x, (TOP + BOT) / 2, 46);
      halo.addColorStop(0, T.crit ? "rgba(255,40,20," + 0.28 * flash + ")" : "rgba(255,140,40," + 0.18 * flash + ")");
      halo.addColorStop(1, "rgba(255,80,20,0)");
      ctx.fillStyle = halo; ctx.fillRect(T.x - 50, TOP - 20, 100, BOT - TOP + 40);
    }

    function spawnSmoke(T) {
      smoke.push({ x: T.x + (rnd() - 0.5) * 4, y: TOP - 13, vx: (rnd() - 0.5) * 0.25, vy: -(0.35 + rnd() * 0.3),
                   r: 2 + rnd() * 2, life: 0, max: 110 + rnd() * 70, crit: T.crit });
    }

    function drawSmoke() {
      smoke.forEach(function (p) {
        p.life++; p.x += p.vx + Math.sin(p.life * 0.05) * 0.15; p.y += p.vy; p.r += 0.06;
        const a = Math.max(0, 1 - p.life / p.max);
        const shade = p.crit ? [190, 170, 165] : [215, 210, 205];
        // pixel puff: a few chunky squares instead of a smooth circle
        const s = Math.round(p.r);
        ctx.fillStyle = "rgba(" + shade.join(",") + "," + (0.55 * a) + ")";
        ctx.fillRect(Math.round(p.x - s), Math.round(p.y - s / 2), s * 2, s);
        ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s), s, s * 2);
        ctx.fillStyle = "rgba(255,255,255," + (0.35 * a) + ")";
        ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), Math.max(1, s - 1), Math.max(1, s - 1));
      });
      smoke = smoke.filter(function (p) { return p.life < p.max && p.y > -10; });
    }

    let frame = 0, raf = 0;
    function draw() {
      if (!canvas.isConnected && frame > 0) { cancelAnimationFrame(raf); return; }
      const t = frame / 60;
      room(t);
      TANKS.forEach(function (T) { tank(T, t); });
      if (!reduce) {
        TANKS.forEach(function (T) { if (frame % (T.crit ? 4 : 7) === 0) { spawnSmoke(T); } });
      }
      drawSmoke();
      // warning stripe on the critical tank's pedestal
      if (Math.sin(t * 9) > 0) { ctx.fillStyle = "#ff2a10"; ctx.fillRect(TANKS[1].x - 10, BOT + 2, 20, 2); }
      frame++;
      if (!reduce) { raf = requestAnimationFrame(draw); }
    }
    // Pre-warm the steam so it's already rising when the page opens
    if (!reduce) { for (let i = 0; i < 160; i++) { TANKS.forEach(function (T) { if (i % 7 === 0) { spawnSmoke(T); } }); smoke.forEach(function (p) { p.life++; p.y += p.vy; p.x += p.vx; }); } }
    draw();
    return wrap;
  }

  /* ---------- DECK PLANS (top-down) ----------
     Generic renderer for a top-down deck plan in SVG: a hull outline,
     labeled compartments with furniture, doors, and damage markers.
     Prow points right. Hover a compartment for its report; click to pin
     it. Each compartment has an id and status ("ok", "dmg", "sealed")
     so future repair puzzles can change them. */
  const SVGNS = "http://www.w3.org/2000/svg";
  function sv(tag, attrs, parent) {
    const e = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) { parent.appendChild(e); }
    return e;
  }

  function deckPlan(spec) {
    const wrap = el("div", "dp");
    const svg = sv("svg", { viewBox: "0 0 800 420", class: "dp-svg", role: "img", "aria-label": spec.title });
    // blueprint grid
    const defs = sv("defs", {}, svg);
    const pat = sv("pattern", { id: "dpgrid-" + spec.id, width: 20, height: 20, patternUnits: "userSpaceOnUse" }, defs);
    sv("path", { d: "M 20 0 L 0 0 0 20", class: "dp-gridline" }, pat);
    sv("rect", { x: 0, y: 0, width: 800, height: 420, fill: "url(#dpgrid-" + spec.id + ")" }, svg);
    // hull
    sv("polygon", { points: spec.hull, class: "dp-hull" }, svg);
    sv("polygon", { points: spec.hull, class: "dp-hull-inner", transform: "translate(0,0)" }, svg);

    const info = el("div", "line dp-info dim", "HOVER A COMPARTMENT FOR ITS REPORT. CLICK TO PIN.");
    let pinned = null;
    function report(r) {
      info.className = "line dp-info" + (r.status === "ok" ? "" : " alert");
      info.textContent = r.name + "  //  " + (r.status === "ok" ? "NOMINAL" : r.status === "dmg" ? "DAMAGED" : "SEALED") + "  //  " + r.note;
    }

    spec.rooms.forEach(function (r, i) {
      const g = sv("g", { class: "dp-room " + r.status, tabindex: 0 }, svg);
      g.style.animationDelay = (i * 0.29 % 1.2).toFixed(2) + "s";
      sv("rect", { x: r.x, y: r.y, width: r.w, height: r.h, class: "dp-wall" }, g);
      if (r.furn) { r.furn(g, r); }
      const label = sv("text", { x: r.x + r.w / 2, y: r.y + (r.labelY || r.h / 2), class: "dp-label" }, g);
      label.textContent = r.name;
      // shrink long names so they fit inside narrow compartments
      const fit = Math.min(15, (r.w - 14) / (r.name.length * 0.68));
      if (fit < 15) { label.style.fontSize = fit.toFixed(1) + "px"; }
      if (r.status !== "ok") {
        const tag = sv("text", { x: r.x + r.w / 2, y: r.y + (r.labelY || r.h / 2) + 16, class: "dp-tag" }, g);
        tag.textContent = r.status === "dmg" ? "! DAMAGED" : "SEALED";
      }
      sv("title", {}, g).textContent = r.name + ": " + r.note;
      g.addEventListener("mouseenter", function () { if (!pinned) { report(r); } });
      g.addEventListener("focus", function () { report(r); });
      g.addEventListener("click", function (e) {
        e.stopPropagation();
        pinned = pinned === r ? null : r;
        svg.querySelectorAll(".dp-room").forEach(function (x) { x.classList.remove("pinned"); });
        if (pinned) { g.classList.add("pinned"); }
        report(r);
      });
    });

    // doors: [x, y, "h"|"v"] gaps drawn over walls
    (spec.doors || []).forEach(function (d) {
      const w = 18;
      if (d[2] === "h") { sv("line", { x1: d[0] - w / 2, y1: d[1], x2: d[0] + w / 2, y2: d[1], class: "dp-door" }, svg); }
      else { sv("line", { x1: d[0], y1: d[1] - w / 2, x2: d[0], y2: d[1] + w / 2, class: "dp-door" }, svg); }
    });
    if (spec.extra) { spec.extra(svg); }

    // compass / scale
    const legend = sv("g", { class: "dp-legend" }, svg);
    sv("text", { x: 790, y: 410, "text-anchor": "end" }, legend).textContent = "PROW →   GRID 2M";
    sv("text", { x: 10, y: 410 }, legend).textContent = spec.title;

    wrap.appendChild(svg);
    wrap.appendChild(info);

    // compartment list
    const list = el("div", "dp-list");
    spec.rooms.forEach(function (r) {
      const row = el("div", "dp-row " + r.status);
      row.appendChild(el("span", null, r.name));
      row.appendChild(el("span", "dp-state", r.status === "ok" ? "NOM" : r.status === "dmg" ? "DMG" : "SEALED"));
      list.appendChild(row);
    });
    wrap.appendChild(list);
    return wrap;
  }

  /* furniture helpers */
  function bunks(n) {
    return function (g, r) {
      for (let i = 0; i < n; i++) {
        const x = r.x + 10 + i * ((r.w - 20) / n);
        sv("rect", { x: x, y: r.y + 10, width: (r.w - 20) / n - 6, height: 26, class: "dp-furn" }, g);
        sv("rect", { x: x, y: r.y + r.h - 36, width: (r.w - 20) / n - 6, height: 26, class: "dp-furn" }, g);
      }
    };
  }
  function tables(n) {
    return function (g, r) {
      for (let i = 0; i < n; i++) {
        const cx = r.x + (i + 0.5) * (r.w / n), cy = r.y + r.h - 30;
        sv("circle", { cx: cx, cy: cy, r: 12, class: "dp-furn" }, g);
        [0, 1, 2, 3].forEach(function (k) {
          const a = k * Math.PI / 2;
          sv("rect", { x: cx + Math.cos(a) * 18 - 3, y: cy + Math.sin(a) * 18 - 3, width: 6, height: 6, class: "dp-furn" }, g);
        });
      }
    };
  }
  function crates(cols, rows, missing) {
    return function (g, r) {
      const cw = (r.w - 24) / cols, ch = (r.h - 50) / rows;
      for (let c = 0; c < cols; c++) {
        for (let k = 0; k < rows; k++) {
          const idx = k * cols + c;
          const cls = missing === idx ? "dp-furn dp-missing" : "dp-furn";
          sv("rect", { x: r.x + 12 + c * cw, y: r.y + 34 + k * ch, width: cw - 6, height: ch - 6, class: cls }, g);
          if (missing !== idx) {
            sv("line", { x1: r.x + 12 + c * cw, y1: r.y + 34 + k * ch, x2: r.x + 6 + (c + 1) * cw, y2: r.y + 28 + (k + 1) * ch, class: "dp-furn dp-x" }, g);
          }
        }
      }
    };
  }

  /* ---------- DECK 4: crew quarters ---------- */
  function deck4() {
    return deckPlan({
      id: "deck4",
      title: "DECK 4  //  CREW QUARTERS",
      hull: "40,60 690,60 770,150 770,270 690,360 40,360 20,330 20,90",
      rooms: [
        { name: "BUNKS A", x: 50, y: 70, w: 150, h: 120, status: "ok", note: "12 RACKS. ALL EMPTY.", furn: bunks(4) },
        { name: "BUNKS B", x: 200, y: 70, w: 140, h: 120, status: "dmg", note: "PRESSURE SEAL FAILING. HULL BREACH ALONG OUTER WALL.", furn: bunks(3) },
        { name: "SANITATION", x: 340, y: 70, w: 90, h: 120, status: "ok", note: "WATER RECLAIM OFFLINE." },
        { name: "MEDICAE BAY", x: 430, y: 70, w: 140, h: 120, status: "ok", note: "2 SURGICAL SLABS. SUPPLIES 9%.",
          furn: function (g, r) { [0, 1].forEach(function (i) { sv("rect", { x: r.x + 20 + i * 60, y: r.y + 14, width: 40, height: 22, class: "dp-furn" }, g); }); } },
        { name: "OFFICER QTRS", x: 570, y: 70, w: 120, h: 120, status: "sealed", note: "LOCKED FROM INSIDE. NO RESPONSE." },
        { name: "MAIN CORRIDOR", x: 50, y: 190, w: 640, h: 40, status: "ok", note: "LIGHTS AT 12%. FOOTPRINTS IN THE DUST.", labelY: 25 },
        { name: "LOCKERS", x: 50, y: 230, w: 110, h: 120, status: "ok", note: "38 LOCKERS. 1 FORCED OPEN." },
        { name: "MESS HALL", x: 160, y: 230, w: 210, h: 120, status: "ok", note: "TRAYS STILL ON THE TABLES.", furn: tables(3), labelY: 30 },
        { name: "GALLEY", x: 370, y: 230, w: 100, h: 120, status: "ok", note: "RATIONS: 4 YEARS. RECAF: NONE." },
        { name: "SHRINE", x: 470, y: 230, w: 120, h: 120, status: "ok", note: "CANDLES BURNED DOWN. SOMEONE LIT ONE RECENTLY." },
        { name: "AIRLOCK 4", x: 590, y: 230, w: 100, h: 120, status: "dmg", note: "OUTER DOOR CYCLING ON ITS OWN." }
      ],
      doors: [[125, 190, "h"], [270, 190, "h"], [385, 190, "h"], [500, 190, "h"], [630, 190, "h"],
              [105, 230, "h"], [265, 230, "h"], [420, 230, "h"], [530, 230, "h"], [640, 230, "h"],
              [690, 210, "v"], [690, 290, "v"]],
      extra: function (svg) {
        // breach along the outer wall of Bunks B
        sv("path", { d: "M 215 62 L 230 74 L 242 64 L 258 78 L 270 66 L 286 76 L 300 63", class: "dp-breach" }, svg);
        sv("text", { x: 258, y: 52, class: "dp-callout" }, svg).textContent = "SEAL 4 BREACH";
      }
    });
  }

  /* ---------- AFT CARGO ---------- */
  function cargoBay() {
    return deckPlan({
      id: "cargo",
      title: "AFT CARGO  //  HOLDS 1-2",
      hull: "60,40 720,40 790,110 790,310 720,380 60,380 30,340 30,80",
      rooms: [
        { name: "HOLD 1", x: 50, y: 50, w: 250, h: 320, status: "ok", note: "24 CONTAINERS. MANIFEST MATCHES.", furn: crates(4, 4), labelY: 20 },
        { name: "HOLD 2", x: 300, y: 50, w: 220, h: 320, status: "dmg", note: "CONTAINER C-7 TORN FROM ITS CLAMPS. MISSING.", furn: crates(3, 4, 6), labelY: 20 },
        { name: "QUARANTINE", x: 520, y: 50, w: 130, h: 130, status: "dmg", note: "UNKNOWN BIOSIGNS. 3 CONTACTS. MOVING." },
        { name: "MANIFEST OFFICE", x: 520, y: 180, w: 130, h: 70, status: "ok", note: "LAST ENTRY 1,207 DAYS AGO." },
        { name: "CARGO LIFT", x: 520, y: 250, w: 130, h: 120, status: "ok", note: "STUCK BETWEEN DECKS 3 AND 4.",
          furn: function (g, r) { sv("rect", { x: r.x + 30, y: r.y + 30, width: 70, height: 60, class: "dp-furn" }, g); sv("line", { x1: r.x + 30, y1: r.y + 30, x2: r.x + 100, y2: r.y + 90, class: "dp-furn" }, g); sv("line", { x1: r.x + 100, y1: r.y + 30, x2: r.x + 30, y2: r.y + 90, class: "dp-furn" }, g); } },
        { name: "SERVITOR BAY", x: 650, y: 80, w: 100, h: 90, status: "sealed", note: "SERVITOR 3-KAPPA: NO RESPONSE." },
        { name: "DOCK CLAMP", x: 650, y: 170, w: 110, h: 80, status: "ok", note: "CLAMP OPEN. NOTHING DOCKED." },
        { name: "FUEL BUNKER", x: 650, y: 250, w: 100, h: 90, status: "ok", note: "PROMETHIUM 22%." }
      ],
      doors: [[300, 120, "v"], [300, 300, "v"], [520, 215, "v"], [520, 310, "v"], [585, 180, "h"], [585, 250, "h"], [650, 210, "v"], [700, 170, "h"], [700, 250, "h"]],
      extra: function (svg) {
        // unknown biosigns drifting inside quarantine
        [[560, 95, 0], [610, 140, 1.3], [585, 120, 2.4]].forEach(function (b) {
          const c = sv("circle", { cx: b[0], cy: b[1], r: 4, class: "dp-bio" }, svg);
          c.style.animationDelay = b[2] + "s";
        });
        sv("text", { x: 585, y: 34, class: "dp-callout" }, svg).textContent = "3 UNKNOWN BIOSIGNS";
        // scrape marks where C-7 broke loose
        sv("path", { d: "M 440 300 L 470 330 L 490 336 L 505 360", class: "dp-breach" }, svg);
      }
    });
  }

  window.ShipAreas = {
    bridge: bridge,
    reactor: reactor,
    deck4: deck4,
    cargo: cargoBay
  };
})();
