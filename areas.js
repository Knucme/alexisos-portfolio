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

  window.ShipAreas = {
    bridge: bridge,
    reactor: reactor
  };
})();
