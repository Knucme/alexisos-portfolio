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
  function bridge(sys, all, opts) {
    const done = (opts && opts.done) || function () {};
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
    radar.appendChild(el("div", "bp-crt-label", "1 CONTACT UNIDENTIFIED"));
    shield.appendChild(radar);
    panel.appendChild(shield);

    // Master caution: one light per ship system, in a row under the screen
    const cautionWrap = el("div", "bp-caution");
    cautionWrap.appendChild(el("div", "bp-bay-title static", "MASTER CAUTION"));
    const ann = el("div", "bp-anns row");
    all.forEach(function (s) { ann.appendChild(annunciator(s)); });
    cautionWrap.appendChild(ann);
    const gmsg = el("div", "bp-gmsg", "");
    cautionWrap.appendChild(gmsg);
    function gellerMsg(text, kind) {
      gmsg.className = "bp-gmsg " + (kind || "");
      gmsg.textContent = text;
    }
    panel.appendChild(cautionWrap);

    // Control deck
    const deck = el("div", "bp-top");

    const left = bay("POWER");
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
    ["SHLD 1", "SHLD 2", "GELLER", "LIGHTS", "GRAV", "DOORS"].forEach(function (t, i) {
      let sw = toggle(t, i === 3 || i === 4);
      if (t === "GELLER") {                       // the Geller field is run from here
        const gf = all.find(function (x) { return x.id === "geller"; });
        const online = gf && gf.status === "ok";
        if (!online) { sw.classList.add("fault"); } else { sw.classList.add("up"); }
        sw.title = "Geller field: " + (gf ? gf.note : "");
        sw.dataset.ctl = "geller";
        // Replace the plain flip with the interlock check
        const fresh = sw.cloneNode(true);
        fresh.addEventListener("click", function (e) {
          e.stopPropagation();
          if (online) { gellerMsg("GELLER FIELD ALREADY STABLE.", "ok"); return; }
          const missing = window.Ship ? Ship.missingFor("geller") : ["vox", "reactor"];
          if (missing.length) {
            // flick up, then snap back down: the interlock refuses
            fresh.classList.add("up");
            setTimeout(function () { fresh.classList.remove("up"); }, 350);
            const names = missing.map(function (r) {
              const x = all.find(function (s) { return s.id === r; });
              return x ? x.name : r.toUpperCase();
            });
            gellerMsg("INTERLOCK: " + names.join(" AND ") + " MUST BE ONLINE FIRST.", "bad");
            return;
          }
          fresh.classList.add("up");
          fresh.classList.remove("fault");
          if (window.Ship) { Ship.repair("geller"); }
          gellerMsg("GELLER FIELD RISING... FIELD STABLE. THE WARP CAN'T TOUCH US NOW.", "ok");
          panel.classList.add("bp-won");
          setTimeout(done, 2600);
        });
        sw = fresh;
      }
      tg2.appendChild(sw);
    });
    center.appendChild(tg2);
    const strip = el("div", "bp-led");
    strip.appendChild(el("span", "bp-led-text",
      "VIGIL OF ASH    HULL " + (window.Ship ? Ship.hull() : 31) + "%    REACTOR STANDBY    VOX CH.9 SIGNAL UNKNOWN    AWAITING ENGINSEER    "));
    center.appendChild(strip);
    deck.appendChild(center);

    const right = bay("HELM");
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

    panel.appendChild(el("div", "bp-plate", "COGITATOR MAIN CONSOLE MK IV. DO NOT ANOINT WHILE POWERED"));
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
      info.textContent = r.name + ": " + (r.status === "ok" ? "NOMINAL" : r.status === "dmg" ? "DAMAGED" : "SEALED") + ". " + r.note;
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
      title: "CREW QUARTERS",
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
      title: "CARGO HOLDS",
      hull: "60,40 720,40 790,110 790,310 720,380 60,380 30,340 30,80",
      rooms: [
        { name: "HOLD 1", x: 50, y: 50, w: 250, h: 320, status: "ok", note: "24 CONTAINERS. MANIFEST MATCHES.", furn: crates(4, 4), labelY: 20 },
        { name: "HOLD 2", x: 300, y: 50, w: 220, h: 320, status: "dmg", note: "CONTAINER C7 TORN FROM ITS CLAMPS. MISSING.", furn: crates(3, 4, 6), labelY: 20 },
        { name: "QUARANTINE", x: 520, y: 50, w: 130, h: 130, status: "dmg", note: "UNKNOWN BIOSIGNS. 3 CONTACTS. MOVING." },
        { name: "MANIFEST OFFICE", x: 520, y: 180, w: 130, h: 70, status: "ok", note: "LAST ENTRY 1,207 DAYS AGO." },
        { name: "CARGO LIFT", x: 520, y: 250, w: 130, h: 120, status: "ok", note: "STUCK BETWEEN DECKS 3 AND 4.",
          furn: function (g, r) { sv("rect", { x: r.x + 30, y: r.y + 30, width: 70, height: 60, class: "dp-furn" }, g); sv("line", { x1: r.x + 30, y1: r.y + 30, x2: r.x + 100, y2: r.y + 90, class: "dp-furn" }, g); sv("line", { x1: r.x + 100, y1: r.y + 30, x2: r.x + 30, y2: r.y + 90, class: "dp-furn" }, g); } },
        { name: "SERVITOR BAY", x: 650, y: 80, w: 100, h: 90, status: "sealed", note: "SERVITOR 3 KAPPA: NO RESPONSE." },
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

  /* ---------- ENGINES ----------
     Pixel-art view of the two main engines against the stars. Each
     engine: a spoked intake ring with a core in the middle, a ribbed
     body, and three exhaust nozzles.
       PORT:      stalled. Core glows a weak, flickering blue, the ring
                  turns slowly, nozzles pulse dim, and it sputters.
       STARBOARD: dead. No light at all, ring still, pixel smoke leaking
                  from the nozzles and the core. */
  function engines(sys) {
    const wrap = el("div", "rx");
    const W = 256, H = 144;
    const canvas = el("canvas", "rx-canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Two engines: port stalled with a weak blue glow, starboard dead and smoking");
    wrap.appendChild(canvas);

    const reads = el("div", "rx-reads");
    [["PORT ENGINE", "STALLED", "warn"], ["PORT THRUST", "3%", ""], ["PORT CORE", "FLICKER", "warn"],
     ["STBD ENGINE", "OFFLINE", "crit"], ["STBD THRUST", "0%", "crit"], ["STBD CORE", "VENTING", "crit"]].forEach(function (r) {
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
    const rnd = seeded(23);

    const stars = [];
    for (let i = 0; i < 90; i++) { stars.push({ x: rnd() * W, y: rnd() * H, b: 0.3 + rnd() * 0.7, s: rnd() < 0.1 ? 2 : 1 }); }

    // y = engine centerline. ring at x 52, body to x 196, nozzles past that.
    const ENG = [
      { y: 44,  on: true,  spin: 0 },
      { y: 104, on: false, spin: 0.9 }
    ];
    let smoke = [];

    function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

    function ellipse(cx, cy, rx, ry, color, fill) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (fill) { ctx.fillStyle = color; ctx.fill(); } else { ctx.strokeStyle = color; ctx.stroke(); }
    }

    function engine(E, t) {
      const cy = E.y, ringX = 52, rx = 13, ry = 27;
      // flicker for the stalled engine: mostly dim, with random sputters
      const sputter = E.on ? (Math.sin(t * 23) > 0.92 || rnd() < 0.03 ? 1 : 0) : 0;
      const pulse = E.on ? 0.35 + 0.15 * Math.sin(t * 2.4) + sputter * 0.45 : 0;

      // body: ribbed cylinder from the ring to the nozzles
      px(ringX + 6, cy - 15, 138, 30, "#1b1e26");
      px(ringX + 6, cy - 15, 138, 2, "#3a3f4d");
      px(ringX + 6, cy + 13, 138, 2, "#0d0f14");
      for (let x = ringX + 14; x < ringX + 144; x += 9) {
        px(x, cy - 15, 2, 30, "#2a2e3a");
        px(x, cy - 15, 1, 30, "#454b5c");
      }
      // collar between ring and body
      px(ringX + 4, cy - 19, 12, 38, "#262a35"); px(ringX + 4, cy - 19, 12, 2, "#4c5266");
      // a thin heat line along the body when stalled
      if (E.on) { px(ringX + 16, cy - 1, 124, 1, "rgba(80,170,255," + (0.15 + pulse * 0.35) + ")"); }

      // three exhaust nozzles
      [-11, 0, 11].forEach(function (o, i) {
        const ny = cy + o;
        px(ringX + 144, ny - 4, 16, 8, "#2b2f3b"); px(ringX + 144, ny - 4, 16, 1, "#525a70");
        px(ringX + 160, ny - 5, 4, 10, "#1a1d25");
        if (E.on) {
          const g = 0.25 + pulse * 0.6 + (i === 1 ? 0.1 : 0);
          px(ringX + 162, ny - 3, 2, 6, "rgba(120,200,255," + g + ")");
          const flare = ctx.createRadialGradient(ringX + 164, ny, 0, ringX + 164, ny, 10);
          flare.addColorStop(0, "rgba(90,180,255," + (g * 0.6) + ")"); flare.addColorStop(1, "rgba(90,180,255,0)");
          ctx.fillStyle = flare; ctx.fillRect(ringX + 154, ny - 10, 20, 20);
        } else {
          px(ringX + 162, ny - 3, 2, 6, "#0a0b0e");
        }
      });

      // intake ring with spokes (turning slowly on the stalled engine)
      ctx.lineWidth = 3;
      ellipse(ringX, cy, rx, ry, "#2f3442");
      ctx.lineWidth = 1;
      ellipse(ringX, cy, rx + 1, ry + 1, "#5a6178");
      const rot = E.on ? t * 0.35 : E.spin;
      for (let k = 0; k < 10; k++) {
        const a = rot + k * Math.PI / 5;
        ctx.strokeStyle = Math.sin(a) > 0 ? "#3d4356" : "#252a36";
        ctx.beginPath();
        ctx.moveTo(ringX + Math.cos(a) * 5, cy + Math.sin(a) * 11);
        ctx.lineTo(ringX + Math.cos(a) * rx, cy + Math.sin(a) * ry);
        ctx.stroke();
      }

      // core
      if (E.on) {
        const cg = ctx.createRadialGradient(ringX, cy, 1, ringX, cy, 14);
        cg.addColorStop(0, "rgba(220,240,255," + (0.45 + pulse * 0.5) + ")");
        cg.addColorStop(0.5, "rgba(70,160,255," + (0.35 + pulse * 0.4) + ")");
        cg.addColorStop(1, "rgba(20,60,140,0.2)");
        ellipse(ringX, cy, 6, 13, cg, true);
        // crackle: little jagged arcs, mostly during a sputter
        if (sputter || rnd() < 0.25) {
          ctx.strokeStyle = "rgba(190,230,255," + (0.5 + sputter * 0.5) + ")";
          ctx.beginPath();
          let x = ringX + (rnd() - 0.5) * 6, y = cy - 10;
          ctx.moveTo(x, y);
          for (let j = 0; j < 5; j++) { x = ringX + (rnd() - 0.5) * 8; y += 4; ctx.lineTo(x, y); }
          ctx.stroke();
        }
        // soft halo around the ring
        const halo = ctx.createRadialGradient(ringX, cy, 4, ringX, cy, 40);
        halo.addColorStop(0, "rgba(60,150,255," + (0.12 + pulse * 0.2) + ")"); halo.addColorStop(1, "rgba(60,150,255,0)");
        ctx.fillStyle = halo; ctx.fillRect(ringX - 40, cy - 40, 80, 80);
      } else {
        ellipse(ringX, cy, 6, 13, "#101218", true);
        ellipse(ringX, cy, 6, 13, "#262a35");
        // a last ember that never quite goes out
        if (Math.sin(t * 1.3) > 0.6) { px(ringX - 1, cy + 3, 2, 2, "rgba(255,110,40,0.55)"); }
      }
    }

    /* Smoke streams out of each nozzle in turn (and now and then out of
       the dead core), then drifts away to the right and upward, growing
       and thinning until it leaves the frame. It never stops. */
    let nozzle = 0;
    function spawn(E, fromCore) {
      const ny = fromCore ? 0 : [-11, 0, 11][nozzle++ % 3];
      smoke.push({
        x: fromCore ? 52 + (rnd() - 0.5) * 6 : 52 + 164 + rnd() * 2,
        y: E.y + ny + (rnd() - 0.5) * 2,
        vx: fromCore ? -(0.15 + rnd() * 0.2) : 0.45 + rnd() * 0.45,
        vy: -(0.08 + rnd() * 0.22),
        r: 1.2 + rnd() * 1.3,
        grow: 0.035 + rnd() * 0.04,
        wob: rnd() * 6.28,
        life: 0,
        max: 160 + rnd() * 120
      });
    }

    function drawSmoke() {
      smoke.forEach(function (p) {
        p.life++;
        p.vx *= 0.997;                                   // slows as it spreads
        p.x += p.vx;
        p.y += p.vy + Math.sin(p.life * 0.05 + p.wob) * 0.12;
        p.r += p.grow;
        const a = Math.max(0, 1 - p.life / p.max), s = Math.round(p.r);
        ctx.fillStyle = "rgba(150,150,158," + (0.5 * a) + ")";
        ctx.fillRect(Math.round(p.x - s), Math.round(p.y - s / 2), s * 2, s);
        ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s), s, s * 2);
        ctx.fillStyle = "rgba(200,200,205," + (0.3 * a) + ")";
        ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), Math.max(1, s - 1), Math.max(1, s - 1));
      });
      smoke = smoke.filter(function (p) { return p.life < p.max && p.y > -12 && p.x < W + 12 && p.x > -12; });
    }

    let frame = 0, raf = 0;
    function draw() {
      if (!canvas.isConnected && frame > 0) { cancelAnimationFrame(raf); return; }
      const t = frame / 60;
      // space
      px(0, 0, W, H, "#04050a");
      stars.forEach(function (st, i) {
        const tw = 0.6 + 0.4 * Math.sin(t * 1.5 + i);
        px((st.x - t * 2 * st.b) % W < 0 ? (st.x - t * 2 * st.b) % W + W : (st.x - t * 2 * st.b) % W, st.y, st.s, st.s,
           "rgba(220,225,255," + (st.b * tw) + ")");
      });
      // faint dust band
      const band = ctx.createLinearGradient(0, 60, 0, 90);
      band.addColorStop(0, "rgba(120,80,60,0)"); band.addColorStop(0.5, "rgba(120,80,60,0.12)"); band.addColorStop(1, "rgba(120,80,60,0)");
      ctx.fillStyle = band; ctx.fillRect(0, 50, W, 50);

      ENG.forEach(function (E) { engine(E, t); });
      if (!reduce) {
        if (frame % 3 === 0) { spawn(ENG[1], false); }   // steady stream from the nozzles
        if (frame % 11 === 0) { spawn(ENG[1], true); }   // slower leak from the core
      }
      drawSmoke();

      // labels
      ctx.font = "6px \"IBM Plex Mono\", monospace";
      ctx.fillStyle = "rgba(120,190,255,0.8)"; ctx.fillText("PORT STALLED", 70, 20);
      ctx.fillStyle = "rgba(255,90,60," + (Math.sin(t * 6) > 0 ? 0.9 : 0.4) + ")"; ctx.fillText("STBD OFFLINE", 70, 80);
      frame++;
      if (!reduce) { raf = requestAnimationFrame(draw); }
    }
    if (!reduce) {
      // pre-fill so the plume is already trailing away when the page opens
      for (let i = 0; i < 260; i++) {
        if (i % 3 === 0) { spawn(ENG[1], false); }
        if (i % 11 === 0) { spawn(ENG[1], true); }
        smoke.forEach(function (p) { p.life++; p.vx *= 0.997; p.x += p.vx; p.y += p.vy; p.r += p.grow; });
        smoke = smoke.filter(function (p) { return p.life < p.max && p.x < W + 12; });
      }
    }
    draw();
    return wrap;
  }

  /* ---------- LIFE SUPPORT: cryo-stasis bay ----------
     Pixel-art wall of stasis pods in two tiers, lit by cold blue light,
     with low cryo fog drifting across the floor. Life support is on
     reserve power, so most pods are dark and empty, two have failed
     (flashing red, frost cracked), and one is still sealed: its monitor
     flatlines, then every so often shows a single heartbeat. */
  function lifeSupport(sys) {
    const wrap = el("div", "rx");
    const W = 256, H = 144;
    const canvas = el("canvas", "rx-canvas cryo");
    canvas.width = W;
    canvas.height = H;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Cryo bay: a wall of stasis pods, most empty, two failed, one still sealed");
    wrap.appendChild(canvas);

    const reads = el("div", "rx-reads");
    [["STASIS PODS", "12", ""], ["EMPTY", "9", ""], ["FAILED", "2", "crit"],
     ["SEALED", "POD 07", "warn"], ["POD 07 VITALS", "INTERMITTENT", "crit"], ["BAY POWER", "RESERVE 37%", "warn"]].forEach(function (r) {
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
    const rnd = seeded(41);

    // 6 columns x 2 tiers. state: empty | failed | sealed
    const PODS = [];
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 6; col++) {
        const n = row * 6 + col + 1;
        PODS.push({ n: n, x: 22 + col * 38, y: row === 0 ? 14 : 66,
                    state: n === 7 ? "sealed" : (n === 3 || n === 10) ? "failed" : "empty" });
      }
    }
    const PW = 28, PH = 46;
    let fog = [];

    function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

    function room(t) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#0a1018"); g.addColorStop(0.7, "#101a26"); g.addColorStop(1, "#06090e");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // ceiling light strip, flickering on reserve power
      const on = Math.sin(t * 7) > -0.85 ? 1 : 0.3;
      px(0, 2, W, 3, "rgba(150,200,255," + (0.18 * on) + ")");
      px(0, 2, W, 1, "rgba(220,240,255," + (0.35 * on) + ")");
      // wall racks behind the pods
      px(0, 10, W, 1, "#1d2a3a"); px(0, 62, W, 2, "#1d2a3a"); px(0, 114, W, 2, "#1d2a3a");
      for (let x = 16; x < W; x += 38) { px(x, 10, 2, 106, "#151f2c"); }
      // floor grating
      px(0, 116, W, H - 116, "#080c12");
      for (let x = 0; x < W; x += 6) { px(x, 118, 1, H - 118, "#0f1620"); }
      px(0, 116, W, 1, "#2a3a50");
    }

    function heartbeat(t) {
      // flat most of the time; a single beat roughly every 5 seconds
      const c = t % 5;
      return c > 4.6 && c < 4.9;
    }

    function pod(P, t) {
      const x = P.x, y = P.y;
      const failFlash = Math.sin(t * 8 + P.n) > 0;
      // shell
      px(x, y + 3, PW, PH - 6, "#c9d2dc");
      px(x + 2, y, PW - 4, 3, "#c9d2dc"); px(x + 2, y + PH - 3, PW - 4, 3, "#c9d2dc");
      px(x, y + 3, 2, PH - 6, "#e8eef5"); px(x + PW - 3, y + 3, 3, PH - 6, "#8a96a6");
      for (let k = 0; k < 5; k++) { px(x + 6 + k * 4, y + 26, 1, 14, "#a7b2bf"); }       // body ribs
      px(x + 4, y + PH - 6, PW - 8, 2, "#6e7a8a");                                         // foot plate
      // round window
      const wx = x + PW / 2, wy = y + 13, wr = 8;
      ctx.beginPath(); ctx.arc(wx, wy, wr + 2, 0, Math.PI * 2); ctx.fillStyle = "#2b3442"; ctx.fill();
      ctx.beginPath(); ctx.arc(wx, wy, wr, 0, Math.PI * 2);
      if (P.state === "sealed") {
        const breath = 0.55 + 0.15 * Math.sin(t * 1.2) + (heartbeat(t) ? 0.3 : 0);
        const wg = ctx.createRadialGradient(wx, wy, 1, wx, wy, wr);
        wg.addColorStop(0, "rgba(235,248,255," + breath + ")"); wg.addColorStop(1, "rgba(80,160,255," + (breath * 0.7) + ")");
        ctx.fillStyle = wg; ctx.fill();
        px(wx - 2, wy - 3, 4, 8, "rgba(60,90,130,0.55)");     // a shape behind the frost
        px(wx - 3, wy - 6, 6, 4, "rgba(60,90,130,0.45)");
      } else if (P.state === "failed") {
        ctx.fillStyle = failFlash ? "rgba(255,70,50,0.75)" : "rgba(90,20,20,0.8)"; ctx.fill();
        ctx.strokeStyle = "rgba(255,230,230,0.7)"; ctx.beginPath();             // frost crack
        ctx.moveTo(wx - 5, wy - 4); ctx.lineTo(wx, wy); ctx.lineTo(wx - 2, wy + 5); ctx.moveTo(wx, wy); ctx.lineTo(wx + 5, wy - 2); ctx.stroke();
      } else {
        ctx.fillStyle = "#0b1119"; ctx.fill();
        px(wx - 5, wy - 5, 3, 2, "rgba(150,190,230,0.15)");                       // glint on empty glass
      }
      // side status screen
      const sx = x + PW - 2, sy = y + 24;
      px(sx, sy, 8, 6, "#05080c"); px(sx, sy, 8, 1, "#3a4658");
      if (P.state === "sealed") {
        const beat = heartbeat(t);
        px(sx + 1, sy + 3, 6, 1, "rgba(120,255,170,0.8)");
        if (beat) { px(sx + 3, sy + 1, 1, 2, "rgba(120,255,170,1)"); px(sx + 4, sy + 4, 1, 1, "rgba(120,255,170,1)"); }
      } else if (P.state === "failed") {
        px(sx + 1, sy + 1, 6, 4, failFlash ? "rgba(255,60,40,0.9)" : "rgba(80,10,10,0.9)");
      } else {
        px(sx + 1, sy + 3, 6, 1, "rgba(70,100,140,0.5)");
      }
      // status lamp and pod number
      px(x + 3, y + PH - 10, 2, 2, P.state === "sealed" ? "#7dffb0" : P.state === "failed" ? (failFlash ? "#ff3a2a" : "#4a1010") : "#30404f");
      ctx.font = "5px \"IBM Plex Mono\", monospace";
      ctx.fillStyle = "#3b4757";
      ctx.fillText(String(P.n).padStart(2, "0"), x + 9, y + PH - 8);
      // cold light spill under the sealed pod
      if (P.state === "sealed") {
        const sp = ctx.createRadialGradient(wx, wy, 2, wx, wy, 34);
        sp.addColorStop(0, "rgba(120,190,255,0.22)"); sp.addColorStop(1, "rgba(120,190,255,0)");
        ctx.fillStyle = sp; ctx.fillRect(wx - 34, wy - 34, 68, 68);
      }
    }

    function spawnFog(init) {
      fog.push({ x: init ? rnd() * W : -10 - rnd() * 20, y: 108 + rnd() * 32, vx: 0.12 + rnd() * 0.2,
                 r: 3 + rnd() * 4, a: 0.08 + rnd() * 0.12, wob: rnd() * 6.28 });
    }
    function drawFog(t) {
      fog.forEach(function (f) {
        f.x += f.vx; const y = f.y + Math.sin(t * 0.8 + f.wob) * 1.5; const s = Math.round(f.r);
        ctx.fillStyle = "rgba(190,220,255," + f.a + ")";
        ctx.fillRect(Math.round(f.x - s * 1.5), Math.round(y - s / 2), s * 3, s);
        ctx.fillRect(Math.round(f.x - s / 2), Math.round(y - s), s, s * 2);
      });
      fog = fog.filter(function (f) { return f.x < W + 20; });
    }

    let frame = 0, raf = 0;
    for (let i = 0; i < 70; i++) { spawnFog(true); }
    function draw() {
      if (!canvas.isConnected && frame > 0) { cancelAnimationFrame(raf); return; }
      const t = frame / 60;
      room(t);
      PODS.forEach(function (P) { pod(P, t); });
      if (!reduce && frame % 4 === 0) { spawnFog(false); }
      drawFog(t);
      frame++;
      if (!reduce) { raf = requestAnimationFrame(draw); }
    }
    draw();
    return wrap;
  }

  /* ---------- VOX ARRAY ----------
     The antenna farm on the dorsal hull, seen against open space with a
     gas giant and its moon in the distance. Dish A still works and
     slowly tracks the channel 9 signal (incoming pulses arrive from the
     dark); dish B is cracked and tilted, mast 2 is snapped in half, and
     loose cables spark. Warning beacons blink on the masts. */
  function voxArray(sys) {
    const wrap = el("div", "rx");
    const W = 256, H = 144;
    const canvas = el("canvas", "rx-canvas space");
    canvas.width = W;
    canvas.height = H;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Antenna array on the hull, some broken, with a planet and moon in the distance");
    wrap.appendChild(canvas);

    const reads = el("div", "rx-reads");
    [["DISH A", sys && sys.status === "ok" ? "LOCKED" : "TRACKING", sys && sys.status === "ok" ? "" : "warn"], ["DISH B", "CRACKED", "crit"], ["MAST 2", "SEVERED", "crit"],
     ["MASTS 1, 3", "NOMINAL", ""], ["CH.9 SIGNAL", "-87 DB", "warn"], ["ORIGIN", "UNKNOWN", "crit"]].forEach(function (r) {
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
    const rnd = seeded(57);

    const stars = [];
    for (let i = 0; i < 110; i++) { stars.push({ x: rnd() * W, y: rnd() * 100, b: 0.25 + rnd() * 0.75, s: rnd() < 0.08 ? 2 : 1 }); }
    let sparks = [], pulses = [];
    const HULL = 112;       // top of the hull surface

    function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

    function sky(t) {
      px(0, 0, W, H, "#03040a");
      stars.forEach(function (st, i) {
        px(st.x, st.y, st.s, st.s, "rgba(225,230,255," + (st.b * (0.65 + 0.35 * Math.sin(t * 1.3 + i))) + ")");
      });
      // gas giant, upper right, partly lit, with bands and a ring
      const gx = 214, gy = 34, gr = 30;
      ctx.save();
      ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.clip();
      const pg = ctx.createLinearGradient(gx - gr, gy - gr, gx + gr, gy + gr);
      pg.addColorStop(0, "#c98a5a"); pg.addColorStop(0.5, "#8a4f3a"); pg.addColorStop(1, "#2a1520");
      ctx.fillStyle = pg; ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
      for (let b = -3; b <= 3; b++) {
        px(gx - gr, gy + b * 8 + Math.sin(b) * 2, gr * 2, 2, "rgba(255,210,170," + (0.08 + (b % 2 ? 0.06 : 0)) + ")");
      }
      // night side
      const ns = ctx.createLinearGradient(gx - gr, 0, gx + gr, 0);
      ns.addColorStop(0, "rgba(3,4,10,0)"); ns.addColorStop(0.55, "rgba(3,4,10,0.15)"); ns.addColorStop(1, "rgba(3,4,10,0.85)");
      ctx.fillStyle = ns; ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
      ctx.restore();
      ctx.strokeStyle = "rgba(230,200,170,0.45)";
      ctx.beginPath(); ctx.ellipse(gx, gy, gr + 14, 5, -0.25, 0, Math.PI * 2); ctx.stroke();
      // its moon, small and grey, slowly drifting across
      const mx = 160 + Math.sin(t * 0.05) * 6, my = 18;
      ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2); ctx.fillStyle = "#9aa0aa"; ctx.fill();
      ctx.beginPath(); ctx.arc(mx + 2, my, 5, 0, Math.PI * 2); ctx.fillStyle = "rgba(3,4,10,0.6)"; ctx.fill();
      px(mx - 2, my - 1, 1, 1, "#6c727c");
    }

    function hull() {
      px(0, HULL, W, H - HULL, "#2a2e38");
      px(0, HULL, W, 1, "#5d6476");
      for (let x = 0; x < W; x += 24) { px(x, HULL + 1, 1, H - HULL, "#1d2029"); }
      for (let y = HULL + 10; y < H; y += 10) { px(0, y, W, 1, "#22252e"); }
      // a scorched gash in the plating near the broken mast
      px(120, HULL + 4, 26, 3, "#14161c"); px(124, HULL + 7, 14, 2, "#14161c");
    }

    function lattice(x, top, bottom, w) {
      px(x, top, 1, bottom - top, "#8a92a6"); px(x + w, top, 1, bottom - top, "#8a92a6");
      ctx.strokeStyle = "#5a6174";
      ctx.beginPath();
      for (let y = top; y < bottom - 6; y += 6) { ctx.moveTo(x, y); ctx.lineTo(x + w, y + 6); ctx.moveTo(x + w, y); ctx.lineTo(x, y + 6); }
      ctx.stroke();
    }

    function beacon(x, y, t, ph) {
      if (Math.sin(t * 3 + ph) > 0.4) {
        px(x - 1, y - 1, 3, 3, "rgba(255,60,40,0.35)");
        px(x, y, 1, 1, "#ff4a30");
      } else { px(x, y, 1, 1, "#4a1510"); }
    }

    function dish(cx, cy, r, aim, broken, t) {
      // parabolic dish seen from the side: an arc + feed horn
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(aim);
      ctx.lineWidth = 3;
      ctx.strokeStyle = broken ? "#6b7080" : "#c8cedb";
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.42, 0, Math.PI * 1.05, Math.PI * (broken ? 1.75 : 1.95)); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = broken ? "#4d5160" : "#8a92a6";
      ctx.beginPath(); ctx.moveTo(-r * 0.6, -r * 0.2); ctx.lineTo(0, -r * 0.95); ctx.lineTo(r * 0.6, -r * 0.2); ctx.stroke();
      px(-1, -r - 1, 3, 3, broken ? "#3a3d48" : "#e8ecf5");                         // feed horn
      if (!broken) { px(0, -r - 2, 1, 1, Math.sin(t * 6) > 0 ? "#7dffb0" : "#1f5a3a"); }
      if (broken) {                                                                   // crack line
        ctx.strokeStyle = "#1a1c22"; ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.4); ctx.lineTo(-r * 0.05, -r * 0.15); ctx.lineTo(-r * 0.3, 0); ctx.stroke();
      }
      ctx.restore();
    }

    function spark(x, y) {
      for (let i = 0; i < 4; i++) {
        sparks.push({ x: x, y: y, vx: (rnd() - 0.5) * 1.2, vy: -rnd() * 1.2, life: 0, max: 14 + rnd() * 10 });
      }
    }

    let frame = 0, raf = 0;
    function draw() {
      if (!canvas.isConnected && frame > 0) { cancelAnimationFrame(raf); return; }
      const t = frame / 60;
      sky(t);

      // incoming channel 9 pulses: rings travelling in from the upper left toward dish A
      if (!reduce && frame % 90 === 0) { pulses.push({ r: 70, a: 0.6 }); }
      const dax = 48, day = 84;
      pulses.forEach(function (p) {
        p.r -= 0.6; p.a = Math.max(0, p.a - 0.004);
        ctx.strokeStyle = "rgba(120,255,170," + p.a + ")";
        ctx.beginPath(); ctx.arc(dax - 6, day - 10, Math.max(1, p.r), Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
      });
      pulses = pulses.filter(function (p) { return p.r > 4; });

      hull();
      // Dish A on its pedestal, sweeping slowly
      px(dax - 2, day, 5, HULL - day, "#6b7285"); px(dax - 8, HULL - 4, 17, 4, "#3a3f4d");
      dish(dax, day, 20, -0.55 + Math.sin(t * 0.25) * 0.18, false, t);

      // Mast 1 (intact) with whips and beacon
      lattice(92, 40, HULL, 6);
      px(95, 26, 1, 14, "#b6bccb"); beacon(95, 25, t, 0);
      px(86, 52, 18, 1, "#8a92a6"); px(86, 52, 1, 8, "#8a92a6"); px(103, 52, 1, 8, "#8a92a6");

      // Mast 2 (severed): stump, plus the top half hanging down by a cable
      lattice(130, 74, HULL, 6);
      px(129, 72, 9, 2, "#3a3d48");                                                      // jagged break
      ctx.strokeStyle = "#3d4150"; ctx.beginPath(); ctx.moveTo(133, 74); ctx.quadraticCurveTo(140, 92, 146, 96); ctx.stroke();
      ctx.save(); ctx.translate(146, 96); ctx.rotate(1.9 + Math.sin(t * 0.7) * 0.05);       // dangling section swaying
      ctx.strokeStyle = "#6b7285"; ctx.strokeRect(0, -3, 22, 6);
      ctx.beginPath(); for (let k = 0; k < 22; k += 5) { ctx.moveTo(k, -3); ctx.lineTo(k + 5, 3); } ctx.stroke();
      ctx.restore();
      if (!reduce && rnd() < 0.05) { spark(134, 73); }

      // Dish B (cracked, slumped on its mount)
      px(182, 92, 4, HULL - 92, "#4d5363"); px(176, HULL - 4, 16, 4, "#2f333f");
      dish(184, 92, 16, 0.9, true, t);
      if (!reduce && rnd() < 0.025) { spark(188, 86); }

      // Mast 3 (short, intact) with a beacon
      lattice(232, 70, HULL, 5);
      px(234, 58, 1, 12, "#b6bccb"); beacon(234, 57, t, 1.4);

      // sparks
      sparks.forEach(function (sp) { sp.life++; sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.05;
        px(sp.x, sp.y, 1, 1, "rgba(255," + (200 - sp.life * 6) + ",80," + (1 - sp.life / sp.max) + ")"); });
      sparks = sparks.filter(function (sp) { return sp.life < sp.max; });

      // a piece of debris tumbling past
      const dx = (t * 6) % (W + 40) - 20, dy = 60 + Math.sin(t * 0.4) * 6;
      ctx.save(); ctx.translate(dx, dy); ctx.rotate(t * 0.8); px(-3, -1, 6, 2, "#6b7080"); px(-1, -3, 2, 6, "#4d5160"); ctx.restore();

      ctx.font = "6px \"IBM Plex Mono\", monospace";
      ctx.fillStyle = "rgba(120,255,170,0.75)"; ctx.fillText("CH.9", 8, 22);
      frame++;
      if (!reduce) { raf = requestAnimationFrame(draw); }
    }
    draw();
    return wrap;
  }

  window.ShipAreas = {
    bridge: bridge,
    reactor: reactor,
    deck4: deck4,
    cargo: cargoBay,
    engines: engines,
    life: lifeSupport,
    vox: voxArray
  };
})();
