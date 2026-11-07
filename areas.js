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
    a.dataset.sys = s.id;
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

  /* Animation loops stop once their canvas leaves the page. Scenes are
     printed through the output queue, so a canvas can start drawing a
     moment before it is attached: only stop after it has been seen on
     the page at least once (and give up if it never shows up). */
  function gone(canvas) {
    if (canvas.isConnected) { canvas._seen = true; return false; }
    canvas._waits = (canvas._waits || 0) + 1;
    return canvas._seen || canvas._waits > 1800;
  }

  /* ---------- BRIDGE WINDOW ----------
     A small pixel canvas (320x110) scaled up crisply. fps on PLANET and
     RIFT sets how fast each one turns.
       stars     drawn here, twinkling
       planet    an unknown world: violet seas, amber continents.
                 assets/bridge/planet_sheet.png, 96 frames of 80x80 in a
                 12 column grid, one full turn (rendered from a port of
                 Deep-Fold's PixelPlanets, MIT, see assets/CREDITS.txt)
       warp rift assets/bridge/warp_vortex.png, 61 frames of 64x64 in an
                 8 column grid (Free Pixel Effects Pack, public domain,
                 scaled down from 100px)
       frame     window struts and bolts, drawn last
     To move the planet or the rift, change PLANET / RIFT below. */
  function viewport() {
    const W = 320, H = 110;
    const canvas = el("canvas", "bp-view");
    canvas.width = W; canvas.height = H;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Bridge window: an unknown violet and amber planet beside a red warp rift");
    const ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) { return canvas; }
    ctx.imageSmoothingEnabled = false;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const planetImg = sceneImage("assets/bridge/planet_sheet.png");
    const riftImg = sceneImage("assets/bridge/warp_vortex.png");
    const PLANET = { x: 26, y: 16, size: 80, frames: 96, cols: 12, fps: 3 };
    const RIFT = { x: 150, y: 23, size: 64, frames: 61, cols: 8, fps: 7 };
    const rnd = seeded(23);
    const stars = [];
    for (let i = 0; i < 90; i++) {
      stars.push({ x: Math.floor(rnd() * W), y: Math.floor(rnd() * H), b: 0.25 + rnd() * 0.75,
                   tw: rnd() * 6.28, big: rnd() > 0.93 });
    }

    function sprite(img, S, n) {
      if (!img.complete || !img.naturalWidth) { return; }
      const f = n % S.frames;
      ctx.drawImage(img, (f % S.cols) * S.size, Math.floor(f / S.cols) * S.size, S.size, S.size,
                    S.x, S.y, S.size, S.size);
    }

    function frame() {
      // window strut: one slanted center mullion and a top rail, with bolts
      ctx.fillStyle = "#0d1016";
      ctx.fillRect(0, 0, W, 4);
      [[252, 244]].forEach(function (m) {
        ctx.beginPath(); ctx.moveTo(m[0] - 3, 0); ctx.lineTo(m[0] + 3, 0); ctx.lineTo(m[1] + 3, H); ctx.lineTo(m[1] - 3, H); ctx.closePath(); ctx.fill();
      });
      ctx.fillStyle = "#2a303b";
      [[252, 244]].forEach(function (m) {
        for (let k = 1; k < 5; k++) { const t = k / 5; ctx.fillRect(Math.round(m[0] + (m[1] - m[0]) * t) - 1, Math.round(H * t), 2, 2); }
      });
      ctx.fillStyle = "rgba(255,255,255,0.05)";                      // faint glare on the glass
      ctx.beginPath(); ctx.moveTo(270, 0); ctx.lineTo(282, 0); ctx.lineTo(262, H); ctx.lineTo(255, H); ctx.closePath(); ctx.fill();
    }

    let n = 0, raf = 0;
    function draw() {
      if (gone(canvas)) { cancelAnimationFrame(raf); return; }
      const t = n / 60;
      ctx.fillStyle = "#03040a"; ctx.fillRect(0, 0, W, H);
      stars.forEach(function (s) {
        const a = s.b * (0.6 + 0.4 * Math.sin(t * 2 + s.tw));
        ctx.fillStyle = "rgba(220,230,255," + a.toFixed(2) + ")";
        ctx.fillRect(s.x, s.y, s.big ? 2 : 1, s.big ? 2 : 1);
      });
      // red glow bleeding from the rift
      const rc = RIFT.size / 2;
      const g = ctx.createRadialGradient(RIFT.x + rc, RIFT.y + rc, 3, RIFT.x + rc, RIFT.y + rc, 46);
      g.addColorStop(0, "rgba(255,60,70," + (0.18 + 0.06 * Math.sin(t * 1.7)).toFixed(3) + ")");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(RIFT.x + rc - 46, RIFT.y + rc - 46, 92, 92);
      sprite(planetImg, PLANET, Math.floor(t * PLANET.fps));
      sprite(riftImg, RIFT, Math.floor(t * RIFT.fps));
      frame();
      n++;
      if (!reduce) { raf = requestAnimationFrame(draw); }
    }
    draw();
    if (reduce) {
      [planetImg, riftImg].forEach(function (im) { if (!im.complete && im.addEventListener) { im.addEventListener("load", draw); } });
    }
    return canvas;
  }

  /* ---------- BRIDGE ----------
     Top: the bridge window, open to space: a planet turning slowly on
     the left, a warp rift churning on the right.
     Under it: the master caution lights, then the control deck:
     mostly knobs and switches, very few buttons. */
  function bridge(sys, all, opts) {
    const done = (opts && opts.done) || function () {};
    const rand = seeded(7);
    const panel = el("div", "bp");
    panel.setAttribute("aria-label", "Bridge main control console");

    // Windshield: a window open to space (see viewport() below)
    const shield = el("div", "bp-shield");
    shield.appendChild(viewport());
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

    /* Shown when the GELLER switch is flipped too early: a warning box on
       the console listing what has to be fixed first, with buttons that
       go straight to each area. The matching caution lights pulse. */
    const HOW = {
      vox:     "Divert power to Dish A and calibrate it to the carrier wave.",
      reactor: "Use the control terminal to cool Core B and vent its pressure."
    };
    /* Warning box on the console. items: [{ name, ok, how, go, lamp }]
       Each unfinished item gets a hint and a GO FIX button. */
    function showAlert(title, sub, items) {
      const old = panel.querySelector(".bp-alert");
      if (old) { old.remove(); }
      const box = el("div", "bp-alert");
      box.setAttribute("role", "alertdialog");
      box.appendChild(el("div", "bp-alert-h", title));
      box.appendChild(el("div", "bp-alert-sub", sub));
      items.forEach(function (it) {
        const row = el("div", "bp-alert-row " + (it.ok ? "ok" : "bad"));
        row.appendChild(el("span", "bp-alert-mark", it.ok ? "\u2713 " + (it.okText || "ONLINE") : "\u2717 " + (it.badText || "OFFLINE")));
        const info = el("span", "bp-alert-info");
        info.appendChild(el("span", "bp-alert-name", it.name));
        if (!it.ok && it.how) { info.appendChild(el("span", "bp-alert-how", it.how)); }
        row.appendChild(info);
        if (!it.ok && it.go && opts && opts.go) {
          const goBtn = el("button", "bp-alert-go", "GO FIX \u25B8");
          goBtn.type = "button";
          goBtn.addEventListener("click", function (e) { e.stopPropagation(); opts.go(it.go); });
          row.appendChild(goBtn);
        }
        box.appendChild(row);
        if (it.lamp && !it.ok) {
          const lamp = panel.querySelector('.bp-ann[data-sys="' + it.lamp + '"]');
          if (lamp) { lamp.classList.remove("need"); void lamp.offsetWidth; lamp.classList.add("need"); }
        }
      });
      const ok = el("button", "bp-alert-ok", "ACKNOWLEDGE");
      ok.type = "button";
      ok.addEventListener("click", function (e) { e.stopPropagation(); box.remove(); });
      box.appendChild(ok);
      panel.appendChild(box);
      if (box.scrollIntoView) { box.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
      ok.focus({ preventScroll: true });
    }

    function showInterlock() {
      const req = (window.Ship && Ship.requires.geller) || ["vox", "reactor"];
      showAlert("!! GELLER FIELD INTERLOCK !!", "The field can't be raised until these systems are back online:",
        req.map(function (r) {
          const sx = all.find(function (x) { return x.id === r; });
          return {
            name: (sx ? "[" + sx.num + "] " + sx.name : r.toUpperCase()) + (r === "vox" ? " (ANTENNAS)" : ""),
            ok: window.Ship ? Ship.isRepaired(r) : false,
            how: HOW[r] || "", go: r, lamp: r
          };
        }));
    }

    /* ENGINE RESTART lever (helm bay): kicks both engines back online,
       but only after both engine panels have had their nozzles safed. */
    function engineRestart(leverEl) {
      if (window.Ship && Ship.isRepaired("engines")) { gellerMsg("ENGINES ALREADY RUNNING.", "ok"); return; }
      const port = window.Ship && Ship.flag("engine_port_safed");
      const stbd = window.Ship && Ship.flag("engine_stbd_safed");
      if (!port || !stbd) {
        leverEl.classList.add("pulled");
        setTimeout(function () { leverEl.classList.remove("pulled"); }, 350);
        gellerMsg("RESTART REFUSED: ENGINE NOZZLES STILL LIVE.", "bad");
        const how = "Open its panel in the engine room and safe all three nozzles in order.";
        showAlert("!! ENGINE RESTART LOCKOUT !!", "Both engines must be shut down nozzle by nozzle before a restart:", [
          { name: "PORT ENGINE PANEL", ok: port, okText: "SAFED", badText: "LIVE", how: how, go: "engines", lamp: "engines" },
          { name: "STARBOARD ENGINE PANEL", ok: stbd, okText: "SAFED", badText: "LIVE", how: how, go: "engines", lamp: "engines" }
        ]);
        return;
      }
      leverEl.classList.add("pulled", "locked");
      if (window.Ship) { Ship.repair("engines"); }
      gellerMsg("IGNITION... PORT LIT... STARBOARD LIT. BOTH ENGINES ONLINE.", "ok");
      panel.classList.add("bp-won");
      setTimeout(done, 2600);
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
            showInterlock();
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
    // Big red engine restart lever
    const engOn = window.Ship && Ship.isRepaired("engines");
    const rl = el("button", "bp-biglever" + (engOn ? " pulled locked" : ""));
    rl.type = "button";
    rl.dataset.ctl = "engine-restart";
    rl.setAttribute("aria-label", "Engine restart lever");
    rl.appendChild(el("span", "bp-biglever-slot"));
    rl.appendChild(el("span", "bp-biglever-handle"));
    rl.appendChild(el("span", "bp-tag", engOn ? "ENGINES ON" : "ENGINE RESTART"));
    rl.addEventListener("click", function (e) { e.stopPropagation(); engineRestart(rl); });
    helm.appendChild(rl);
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

    return panel;
  }

  /* Pre-rendered room images (made from the Kraken Code PSX Sci-Fi
     packs, 256x144), loaded once and reused. */
  const SCENE_IMG = {};
  const SCENE_V = "3";                 // bump when the rendered images change
  function sceneImage(src) {
    if (!SCENE_IMG[src] && typeof Image === "function") {
      const img = new Image();
      // If the picture fails (say, mid deploy), forget it and retry a few
      // seconds later instead of showing an empty room for the whole visit.
      let tries = 0;
      img.onerror = function () {
        if (++tries > 5) { return; }
        setTimeout(function () { img.src = src + "?v=" + SCENE_V + "&r=" + Date.now(); }, 3000);
      };
      img.src = src + "?v=" + SCENE_V;
      SCENE_IMG[src] = img;
    }
    return SCENE_IMG[src] || { complete: false };
  }
  function reactorImage(fixed) {
    return sceneImage("assets/reactor/reactor_" + (fixed ? "online" : "damaged") + ".png");
  }

  /* ---------- SECURITY CAMERAS ----------
     One feed above each deck plan that can switch between cameras.
     Each camera: { room, cam, src, fx }
       room  the compartment name on the deck plan (clicking it there
             switches to this camera)
       cam   the camera number shown in the corner
       src   the rendered room image (256x144); leave it out for a dead
             feed, which shows static and NO SIGNAL
       fx    optional fx(ctx, t) for live effects on top of the image
     Switching plays a short burst of static. */
  function glowAt(ctx, x, y, r, rgba) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, rgba); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = "source-over";
  }
  // a light that pulses (sin), blinks (on/off) or sweeps like a beacon (cos)
  function pulse(x, y, r, rgb, speed, kind) {
    return function (ctx, t) {
      let a;
      if (kind === "blink") { a = Math.sin(t * speed) > 0 ? 0.5 : 0.05; }
      else if (kind === "beacon") { a = Math.max(0, Math.cos(t * speed)) * 0.6; }
      else { a = 0.2 + 0.2 * Math.max(0, Math.sin(t * speed)); }
      glowAt(ctx, x, y, r, "rgba(" + rgb + "," + a.toFixed(3) + ")");
    };
  }

  /* ---------- QUARANTINE (CAM 23): the warp incursion ----------
     Drawn over the rendered room, back to front:
       portal   a burning warp portal on the back wall
                (assets/aft_cargo/q_portal.png, 24 frames of 56x56)
       ritual   a blood circle on the floor, already in perspective
                (assets/aft_cargo/q_ritual.png, same size as the room)
       spawns   three warp creatures that crawl out of the portal and
                prowl the room (assets/aft_cargo/mon_demon.png and
                mon_blood.png: rows idle, walk, attack, death; 48x28 frames)
     Creatures live in room coordinates (metres, floor plane) and are
     projected with the same camera the room was rendered with, so they
     shrink with distance and sort front to back. Tune SPAWNS, BOUNDS and
     PORTAL below. */
  const QCAM = { eye: [2.3, 2.5, 0.7], target: [-1.1, 0.8, -3.8], fov: 66, W: 256, H: 144 };
  function qProject(x, y, z) {
    const e = QCAM.eye, t = QCAM.target;
    let f = [t[0] - e[0], t[1] - e[1], t[2] - e[2]];
    const fl = Math.hypot(f[0], f[1], f[2]); f = [f[0] / fl, f[1] / fl, f[2] / fl];
    let r = [f[1] * 0 - f[2] * 1, f[2] * 0 - f[0] * 0, f[0] * 1 - f[1] * 0];          // f x up
    const rl = Math.hypot(r[0], r[1], r[2]); r = [r[0] / rl, r[1] / rl, r[2] / rl];
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    const d = [x - e[0], y - e[1], z - e[2]];
    const depth = d[0] * f[0] + d[1] * f[1] + d[2] * f[2];
    const foc = (QCAM.H / 2) / Math.tan(QCAM.fov * Math.PI / 360);
    return { x: QCAM.W / 2 + foc * (d[0] * r[0] + d[1] * r[1] + d[2] * r[2]) / depth,
             y: QCAM.H / 2 - foc * (d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) / depth, depth: depth };
  }

  function quarantineFx() {
    const C = "assets/aft_cargo/";
    const portalImg = sceneImage(C + "q_portal.png");
    const ritualImg = sceneImage(C + "q_ritual.png");
    const sheets = { demon: sceneImage(C + "mon_demon.png"), blood: sceneImage(C + "mon_blood.png") };
    const PORTAL = { x: 152, y: 57, w: 30, h: 33, frames: 24, size: 56, fps: 10 };
    const DOOR = { x: -0.3, z: -4.6 };                        // floor spot under the portal
    const BOUNDS = { x0: -1.5, x1: 1.3, z0: -4.3, z1: -1.4 };
    const FW = 48, FH = 28, FEET = 26, CX = 23;               // frame size, feet row, body centre
    const ROWS = { idle: [0, 6], walk: [1, 8], attack: [2, 7], death: [3, 4] };
    const HEIGHT = 0.9;                                       // creature height in metres (sets on screen size)
    const SPAWNS = [
      { kind: "blood", delay: 0.5 },
      { kind: "demon", delay: 5 },
      { kind: "blood", delay: 10 }
    ].map(function (s, i) {
      return { kind: s.kind, delay: s.delay, x: DOOR.x, z: DOOR.z, tx: DOOR.x, tz: DOOR.z,
               state: "wait", until: s.delay, face: 1, seed: i * 17.3, anim: 0 };
    });
    let last = 0;

    function pick(m, t) {
      // new spot on the floor; now and then go and stand in the circle
      const k = Math.sin(t * 3.1 + m.seed) * 0.5 + 0.5;
      // each creature has its own spot on the circle's edge, so they gather around it
      if (k > 0.7) { m.tx = -0.25 + Math.cos(m.seed) * 0.75; m.tz = -2.55 + Math.sin(m.seed) * 0.6; return; }
      m.tx = BOUNDS.x0 + (BOUNDS.x1 - BOUNDS.x0) * (Math.sin(t * 1.7 + m.seed) * 0.5 + 0.5);
      m.tz = BOUNDS.z0 + (BOUNDS.z1 - BOUNDS.z0) * (Math.sin(t * 2.3 + m.seed * 1.9) * 0.5 + 0.5);
    }

    function step(m, t, dt) {
      if (m.state === "wait") {
        if (t >= m.until) { m.state = "emerge"; m.until = t + 1.2; }
        return;
      }
      if (m.state === "emerge") { if (t >= m.until) { m.state = "idle"; m.until = t + 0.6; } return; }
      if (m.state === "idle" || m.state === "attack") {
        if (t >= m.until) { pick(m, t); m.state = "walk"; }
        return;
      }
      // walking
      const dx = m.tx - m.x, dz = m.tz - m.z, dist = Math.hypot(dx, dz), sp = 0.55 * dt;
      if (dist <= sp) {
        m.x = m.tx; m.z = m.tz;
        const roll = Math.sin(t * 5.7 + m.seed);
        m.state = roll > 0.4 ? "attack" : "idle";
        m.until = t + (m.state === "attack" ? 0.9 : 1 + (roll + 1) * 1.2);
        return;
      }
      m.x += dx / dist * sp; m.z += dz / dist * sp;
      const a = qProject(m.x, 0, m.z), b = qProject(m.tx, 0, m.tz);
      if (Math.abs(b.x - a.x) > 0.5) { m.face = b.x > a.x ? 1 : -1; }
    }

    function drawMon(ctx, m, t) {
      const img = sheets[m.kind];
      if (!img.complete || !img.naturalWidth || m.state === "wait") { return; }
      const foot = qProject(m.x, 0, m.z), head = qProject(m.x, HEIGHT, m.z);
      const scale = Math.max(0.4, (foot.y - head.y) / 17);    // ~17px of body in each frame
      const row = ROWS[m.state === "walk" ? "walk" : m.state === "attack" ? "attack" : "idle"];
      const n = Math.floor(t * (m.state === "walk" ? 10 : 7) + m.seed) % row[1];
      const w = FW * scale, h = FH * scale;
      ctx.save();
      if (m.state === "emerge") { ctx.globalAlpha = Math.max(0, 1 - (m.until - t) / 1.2); }
      // soft shadow on the floor
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath(); ctx.ellipse(foot.x, foot.y, 6 * scale, 1.8 * scale, 0, 0, Math.PI * 2); ctx.fill();
      ctx.translate(Math.round(foot.x), Math.round(foot.y));
      ctx.scale(m.face, 1);
      ctx.drawImage(img, n * FW, row[0] * FH, FW, FH, -CX * scale, -FEET * scale, w, h);
      ctx.restore();
    }

    return function (ctx, t) {
      const dt = Math.min(0.1, Math.max(0, t - last)); last = t;
      // portal on the back wall, with its light spilling into the room
      glowAt(ctx, PORTAL.x, PORTAL.y + 4, 44, "rgba(255,110,30," + (0.22 + 0.06 * Math.sin(t * 3)).toFixed(3) + ")");
      if (portalImg.complete && portalImg.naturalWidth) {
        const n = Math.floor(t * PORTAL.fps) % PORTAL.frames;
        ctx.drawImage(portalImg, n * PORTAL.size, 0, PORTAL.size, PORTAL.size,
                      PORTAL.x - PORTAL.w / 2, PORTAL.y - PORTAL.h / 2, PORTAL.w, PORTAL.h);
      }
      // blood circle on the floor, pulsing
      if (ritualImg.complete && ritualImg.naturalWidth) {
        ctx.save();
        ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 2.2);
        ctx.drawImage(ritualImg, 0, 0, 256, 144);
        ctx.restore();
        glowAt(ctx, 126, 100, 34, "rgba(255,30,20," + (0.12 + 0.08 * Math.sin(t * 2.2)).toFixed(3) + ")");
      }
      SPAWNS.forEach(function (m) { step(m, t, dt); });
      SPAWNS.slice().sort(function (a, b) { return a.z - b.z; }).forEach(function (m) { drawMon(ctx, m, t); });
    };
  }

  function camFeeds(cams) {
    const W = 256, H = 144;
    const box = el("div", "cam-box");
    const canvas = el("canvas", "rx-canvas cam");
    canvas.width = W; canvas.height = H;
    canvas.setAttribute("role", "img");
    box.appendChild(canvas);

    // controls: prev / next and one button per camera
    const bar = el("div", "cam-bar");
    const prev = el("button", "cam-btn cam-step", "< PREV");
    const next = el("button", "cam-btn cam-step", "NEXT >");
    prev.type = next.type = "button";
    const list = el("div", "cam-list");
    const btns = cams.map(function (c, i) {
      const b = el("button", "cam-btn" + (c.src ? "" : " dead"), "CAM " + c.cam);
      b.type = "button";
      b.title = c.room;
      b.addEventListener("click", function (e) { e.stopPropagation(); show(i, true); });
      list.appendChild(b);
      return b;
    });
    prev.addEventListener("click", function (e) { e.stopPropagation(); show((cur + cams.length - 1) % cams.length, true); });
    next.addEventListener("click", function (e) { e.stopPropagation(); show((cur + 1) % cams.length, true); });
    bar.appendChild(prev); bar.appendChild(list); bar.appendChild(next);
    box.appendChild(bar);

    const ctx = canvas.getContext && canvas.getContext("2d");
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cur = 0, burst = 0, frame = 0, raf = 0, img = null;
    const api = { el: box, onChange: null, show: function (room) {
      const i = cams.findIndex(function (c) { return c.room === room; });
      if (i >= 0 && i !== cur) { show(i, false); }
    } };

    function show(i, fromUser) {
      cur = i;
      const c = cams[i];
      img = c.src ? sceneImage(c.src) : null;
      if (img && reduce && !img.complete && img.addEventListener) { img.addEventListener("load", draw); }
      burst = reduce ? 0 : 10;
      btns.forEach(function (b, k) { b.classList.toggle("on", k === i); });
      canvas.setAttribute("aria-label", "Security camera " + c.cam + ": " + c.room + (c.src ? "" : ", no signal"));
      if (fromUser && api.onChange) { api.onChange(c.room); }
      if (reduce) { draw(); }
    }

    function noise(amount) {
      for (let i = 0; i < amount; i++) {
        const v = Math.floor(Math.random() * 200);
        ctx.fillStyle = "rgb(" + v + "," + v + "," + v + ")";
        ctx.fillRect(Math.floor(Math.random() * W), Math.floor(Math.random() * H), 2, 1);
      }
    }

    function draw() {
      if (!ctx) { return; }
      if (gone(canvas)) { cancelAnimationFrame(raf); return; }
      const t = frame / 60;
      const c = cams[cur];
      ctx.fillStyle = "#050507"; ctx.fillRect(0, 0, W, H);
      ctx.font = "7px \"IBM Plex Mono\", monospace";
      if (!c.src) {
        // dead feed: static with a NO SIGNAL card
        noise(1600);
        ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.fillRect(W / 2 - 46, H / 2 - 14, 92, 26);
        ctx.fillStyle = "#e8eee8"; ctx.font = "10px \"IBM Plex Mono\", monospace";
        ctx.fillText("NO SIGNAL", W / 2 - 27, H / 2 + 1);
        ctx.font = "7px \"IBM Plex Mono\", monospace";
        ctx.fillStyle = "#ffb43a"; ctx.fillText(c.note || "COMPARTMENT SEALED", W / 2 - 38, H / 2 + 9);
      } else {
        if (img && img.complete && img.naturalWidth) { ctx.drawImage(img, 0, 0, W, H); }
        if (c.fx) { c.fx(ctx, t); }
        const band = (t * 30) % (H + 20) - 10;
        ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(0, band, W, 6);
      }
      if (burst > 0) { noise(900); burst--; }
      // overlay text
      ctx.font = "7px \"IBM Plex Mono\", monospace";
      ctx.fillStyle = "rgba(230,240,230,0.85)";
      ctx.fillText("CAM " + c.cam + " " + c.room, 6, 11);
      const secs = Math.floor(t) % 60;
      ctx.fillText("T+1207D 03:4" + Math.floor(t / 60) % 10 + ":" + String(secs).padStart(2, "0"), W - 82, H - 6);
      if (c.src && Math.floor(t * 1.5) % 2 === 0) { ctx.fillStyle = "#ff2a2a"; ctx.fillRect(W - 30, 6, 4, 4); }
      ctx.fillStyle = "rgba(230,240,230,0.85)"; ctx.fillText(c.src ? "REC" : "OFF", W - 24, 11);
      frame++;
      if (!reduce) { raf = requestAnimationFrame(draw); }
    }
    show(0, false);
    if (!reduce) { draw(); }
    return api;
  }

  /* ---------- REACTOR ----------
     The room itself is a pre-rendered PS1 style image made from the
     Kraken Code PSX Sci-Fi pack (assets/reactor/reactor_damaged.png and
     reactor_online.png, 256x144). The live effects are drawn on top:
     pulsing core glow, bubbles inside the glass, steam from the caps,
     and the red flashing on core B while it is critical.
     To move an effect, change CORES below: x0/x1 is the glass column in
     image pixels, y0/y1 its top and bottom. */
  function reactor(sys, all, opts) {
    const wrap = el("div", "rx");
    const W = 256, H = 144;
    const canvas = el("canvas", "rx-canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Reactor hall: three plasma core columns venting steam");
    const isFixed = sys && sys.status === "ok";
    // A wall terminal beside the reactor hall: clicking it opens the
    // control board in its own window (see openWindow in script.js).
    const row = el("div", "rx-row");
    row.appendChild(canvas);
    const term = el("button", "rx-term" + (isFixed ? " ok" : ""));
    term.type = "button";
    term.setAttribute("aria-label", "Open the reactor control terminal");
    term.appendChild(el("span", "rx-term-h", "CONTROL TERMINAL"));
    term.appendChild(el("span", "rx-term-s" + (isFixed ? "" : " blink"), isFixed ? "CORES STABLE" : "CORE B CRITICAL"));
    term.appendChild(el("span", "rx-term-c", isFixed ? "[ VIEW STATUS ]" : "[ CLICK TO ACCESS ]"));
    term.addEventListener("click", function (e) {
      e.stopPropagation();
      if (opts && opts.open) { opts.open("reactor"); }
    });
    row.appendChild(term);
    wrap.appendChild(row);

    const reads = el("div", "rx-reads");
    const fixed = sys && sys.status === "ok";      // repaired via the control board
    (fixed
      ? [["CORE A", "455 C", ""], ["CORE B", "574 C", ""], ["CORE C", "455 C", ""],
         ["CONTAINMENT", "100%", ""], ["OUTPUT", "FULL", ""], ["COOLANT", "NOMINAL", ""]]
      : [["CORE A", "612 C", ""], ["CORE B", "1,184 C", "crit"], ["CORE C", "598 C", ""],
         ["CONTAINMENT", "41%", "crit"], ["OUTPUT", "STANDBY 4%", ""], ["COOLANT", "VENTING", "warn"]]).forEach(function (r) {
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

    const CORES = [
      { x0: 74,  x1: 85,  crit: false, phase: 0 },
      { x0: 123, x1: 134, crit: !fixed, phase: 1.7 },
      { x0: 172, x1: 183, crit: false, phase: 3.1 }
    ];
    const TOP = 60, BOT = 84, CAP = 55;      // glass top, glass bottom, steam vent height
    const bg = reactorImage(fixed);
    let smoke = [];
    const rnd = seeded(11);

    function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

    function core(C, t) {
      const cx = (C.x0 + C.x1) / 2, w = C.x1 - C.x0;
      const flash = C.crit ? (Math.sin(t * 9) > 0 ? 1 : 0.35) : 0.75 + 0.25 * Math.sin(t * 3 + C.phase);
      ctx.globalCompositeOperation = "lighter";
      // glow halo around the column
      const halo = ctx.createRadialGradient(cx, (TOP + BOT) / 2, 2, cx, (TOP + BOT) / 2, 34);
      halo.addColorStop(0, C.crit ? "rgba(255,40,20," + 0.45 * flash + ")" : "rgba(60,200,255," + 0.22 * flash + ")");
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo; ctx.fillRect(cx - 40, TOP - 30, 80, BOT - TOP + 60);
      // bubbles of plasma rising inside the glass
      for (let i = 0; i < 4; i++) {
        const ph = (t * 0.45 + i / 4 + C.phase) % 1;
        const bx = cx + Math.sin(t * 2 + i * 1.9 + C.phase) * (w / 2 - 2);
        const by = BOT - 2 - ph * (BOT - TOP - 4);
        px(bx, by, 1, 1, C.crit ? "rgba(255,200,150," + (0.9 - ph * 0.6) + ")" : "rgba(200,250,255," + (0.8 - ph * 0.5) + ")");
      }
      // band of light sweeping down the column so it reads as turning
      const sy = TOP + ((t * 14 + C.phase * 9) % (BOT - TOP));
      px(C.x0, sy, w, 1, C.crit ? "rgba(255,120,80,0.35)" : "rgba(150,240,255,0.30)");
      ctx.globalCompositeOperation = "source-over";
      // critical core: the glass blinks hot red
      if (C.crit && flash === 1) { px(C.x0, TOP, w, BOT - TOP, "rgba(255,30,10,0.25)"); }
    }

    function spawnSmoke(C) {
      const cx = (C.x0 + C.x1) / 2;
      smoke.push({ x: cx + (rnd() - 0.5) * 10, y: CAP, vx: (rnd() - 0.5) * 0.35, vy: -(0.12 + rnd() * 0.15),
                   r: 1.5 + rnd() * 1.5, life: 0, max: 90 + rnd() * 60, crit: C.crit });
    }

    function drawSmoke() {
      smoke.forEach(function (p) {
        p.life++; p.x += p.vx + Math.sin(p.life * 0.05) * 0.15; p.y += p.vy; p.r += 0.05;
        const a = Math.max(0, 1 - p.life / p.max);
        const shade = p.crit ? [200, 170, 165] : [190, 215, 225];
        const s = Math.round(p.r);
        ctx.fillStyle = "rgba(" + shade.join(",") + "," + (0.4 * a) + ")";
        ctx.fillRect(Math.round(p.x - s), Math.round(p.y - s / 2), s * 2, s);
        ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s), s, s * 2);
      });
      smoke = smoke.filter(function (p) { return p.life < p.max && p.y > -10; });
    }

    let frame = 0, raf = 0;
    function draw() {
      if (gone(canvas)) { cancelAnimationFrame(raf); return; }
      const t = frame / 60;
      ctx.fillStyle = "#06050a"; ctx.fillRect(0, 0, W, H);
      if (bg.complete && bg.naturalWidth) { ctx.drawImage(bg, 0, 0, W, H); }
      CORES.forEach(function (C) { core(C, t); });
      if (!reduce) {
        CORES.forEach(function (C) { if (frame % (C.crit ? 5 : 12) === 0) { spawnSmoke(C); } });
      }
      drawSmoke();
      // warning stripe on the critical core's pedestal
      if (!fixed && Math.sin(t * 9) > 0) { px(CORES[1].x0 - 3, BOT + 5, CORES[1].x1 - CORES[1].x0 + 6, 1, "#ff2a10"); }
      frame++;
      if (!reduce) { raf = requestAnimationFrame(draw); }
    }
    // Pre-warm the steam so it's already rising when the page opens
    if (!reduce) { for (let i = 0; i < 160; i++) { CORES.forEach(function (C) { if (i % 12 === 0) { spawnSmoke(C); } }); smoke.forEach(function (p) { p.life++; p.y += p.vy; p.x += p.vx; }); } }
    draw();
    if (reduce && !bg.complete && bg.addEventListener) { bg.addEventListener("load", draw); }
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

  /* Camera feed above a deck plan, linked both ways: click a
     compartment to see its camera; switch cameras to highlight the
     compartment. */
  function withCam(cams, spec) {
    const feed = camFeeds(cams);
    spec.onPick = function (r) { feed.show(r.name); };
    const plan = deckPlan(spec);
    feed.onChange = function (room) { if (plan.select) { plan.select(room); } };
    const box = el("div", "dp-cam");
    box.appendChild(feed.el);
    box.appendChild(plan);
    return box;
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
      const g = sv("g", { class: "dp-room " + r.status, tabindex: 0, "data-room": r.name }, svg);
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
        if (spec.onPick) { spec.onPick(r); }
      });
    });
    // Pin a compartment by name (used when the camera is switched)
    wrap.select = function (name) {
      const r = spec.rooms.find(function (x) { return x.name === name; });
      if (!r) { return; }
      pinned = r;
      svg.querySelectorAll(".dp-room").forEach(function (x) { x.classList.toggle("pinned", x.getAttribute("data-room") === name); });
      report(r);
    };

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
    const D = "assets/deck4/";
    return withCam([
      { room: "BUNKS A", cam: "04", src: D + "crew_quarters.png", fx: pulse(204, 70, 36, "255,40,20", 3) },
      { room: "BUNKS B", cam: "05", src: D + "d4_bunks_b.png", fx: pulse(155, 57, 44, "255,30,15", 6, "blink") },
      { room: "SANITATION", cam: "06", src: D + "d4_sanitation.png" },
      { room: "MEDICAE BAY", cam: "07", src: D + "d4_medicae.png", fx: pulse(142, 60, 10, "90,255,140", 9, "blink") },
      { room: "OFFICER QTRS", cam: "08", note: "LOCKED FROM INSIDE" },
      { room: "MAIN CORRIDOR", cam: "09", src: D + "d4_corridor.png", fx: function (ctx, t) {
          if (Math.sin(t * 5.3) * Math.sin(t * 1.7) > 0.8) { ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(0, 0, 256, 144); } } },
      { room: "LOCKERS", cam: "10", src: D + "d4_lockers.png" },
      { room: "MESS HALL", cam: "11", src: D + "d4_mess.png" },
      { room: "GALLEY", cam: "12", src: D + "d4_galley.png" },
      { room: "SHRINE", cam: "13", src: D + "d4_shrine.png", fx: function (ctx, t) {
          const f = 0.22 + 0.08 * Math.sin(t * 11) + 0.06 * Math.sin(t * 23);       // candle flicker
          glowAt(ctx, 157, 60, 30, "rgba(255,170,70," + f.toFixed(3) + ")"); } },
      { room: "AIRLOCK 4", cam: "14", src: D + "d4_airlock.png", fx: pulse(158, 37, 46, "255,40,20", 5, "beacon") }
    ], {
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
    const C = "assets/aft_cargo/";
    return withCam([
      { room: "HOLD 1", cam: "21", src: C + "c_hold1.png" },
      { room: "HOLD 2", cam: "22", src: C + "cargo_hold.png", fx: pulse(158, 50, 40, "255,150,30", 5, "beacon") },
      { room: "QUARANTINE", cam: "23", src: C + "c_quarantine.png", fx: quarantineFx() },
      { room: "MANIFEST OFFICE", cam: "24", src: C + "c_manifest.png", fx: pulse(124, 70, 8, "120,255,160", 4) },
      { room: "CARGO LIFT", cam: "25", src: C + "c_lift.png", fx: pulse(132, 35, 40, "255,150,30", 5, "beacon") },
      { room: "SERVITOR BAY", cam: "26", note: "SERVITOR 3 KAPPA: NO RESPONSE" },
      { room: "DOCK CLAMP", cam: "27", src: C + "c_dock.png" },
      { room: "FUEL BUNKER", cam: "28", src: C + "c_fuel.png", fx: pulse(168, 106, 14, "255,120,40", 2) }
    ], {
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
     The two main engines seen from outside the hull: big bell nozzles
     with cooling tube bands, stacked one above the other (rendered
     image, see the notes inside). Two side terminals open the shutdown
     panels; the bridge lever restarts both. */
  function engines(sys, all, opts) {
    const wrap = el("div", "rx");
    const W = 256, H = 144;
    const canvas = el("canvas", "rx-canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Two large bell nozzle engines, one above the other: port stalled with a weak blue glow, starboard dead and smoking");
    const running = sys && sys.status === "ok";      // restarted from the bridge

    // Two panel screens beside the engines, one per engine
    const row = el("div", "rx-row");
    row.appendChild(canvas);
    const side = el("div", "rx-terms");
    [["port", "PORT ENGINE", "enginePort"], ["stbd", "STBD ENGINE", "engineStbd"]].forEach(function (p) {
      const safed = window.Ship && Ship.flag("engine_" + p[0] + "_safed");
      const t = el("button", "rx-term small" + (running || safed ? " ok" : ""));
      t.type = "button";
      t.appendChild(el("span", "rx-term-h", p[1] + " PANEL"));
      t.appendChild(el("span", "rx-term-s" + (running || safed ? "" : " blink"),
        running ? "RUNNING" : safed ? "NOZZLES SAFED" : "NOZZLES LIVE"));
      t.appendChild(el("span", "rx-term-c", running ? "[ VIEW ]" : safed ? "[ DONE ]" : "[ CLICK TO ACCESS ]"));
      t.addEventListener("click", function (e) {
        e.stopPropagation();
        if (opts && opts.open) { opts.open(p[2]); }
      });
      side.appendChild(t);
    });
    row.appendChild(side);
    wrap.appendChild(row);

    const reads = el("div", "rx-reads");
    (running
      ? [["PORT ENGINE", "ONLINE", ""], ["PORT THRUST", "100%", ""], ["PORT CORE", "STABLE", ""],
         ["STBD ENGINE", "ONLINE", ""], ["STBD THRUST", "100%", ""], ["STBD CORE", "STABLE", ""]]
      : [["PORT ENGINE", "STALLED", "warn"], ["PORT THRUST", "3%", ""], ["PORT CORE", "FLICKER", "warn"],
         ["STBD ENGINE", "OFFLINE", "crit"], ["STBD THRUST", "0%", "crit"], ["STBD CORE", "VENTING", "crit"]]).forEach(function (r) {
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

    /* The engines are a pre-rendered image (assets/engines/engines.png,
       256x144 with a transparent background): two big bell nozzles,
       one above the other, with their plumbing and the thrust plate.
       Live effects are drawn over it. MOUTH is each bell's opening in
       image pixels (centre, half width, half height):
         PORT (top)     stalled: a weak blue glow flickering in the throat
         STBD (bottom)  dead: an ember and smoke pouring out of the bell
         shut down      (safed at its panel) no light at all, just smoke
         running        both burn, flashing blue, with a long plume and a
                        blue thrust arrow past each bell (ARROW.dx moves it) */
    const art = sceneImage("assets/engines/engines.png");
    // blue thrust arrow shown past each bell once the engines are running
    // (assets/engines/thrust_arrow.png: 30 frames of 55x24 in one row)
    const arrow = sceneImage("assets/engines/thrust_arrow.png");
    const ARROW = { w: 55, h: 24, frames: 30, fps: 20, dx: 24 };
    const ENG = [
      { cx: 176, cy: 36, rx: 16, ry: 33, safed: !!(window.Ship && Ship.flag("engine_port_safed")) },   // port
      { cx: 175, cy: 112, rx: 16, ry: 32, safed: !!(window.Ship && Ship.flag("engine_stbd_safed")) }    // starboard
    ];
    let smoke = [];

    function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }

    function mouthGlow(E, strength, rgb) {
      ctx.save();
      ctx.beginPath(); ctx.ellipse(E.cx, E.cy, E.rx - 2, E.ry - 3, 0, 0, Math.PI * 2); ctx.clip();
      const g = ctx.createRadialGradient(E.cx - 6, E.cy, 1, E.cx - 6, E.cy, E.ry);
      g.addColorStop(0, "rgba(" + rgb + "," + strength.toFixed(3) + ")");
      g.addColorStop(1, "rgba(" + rgb + ",0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = g; ctx.fillRect(E.cx - E.rx, E.cy - E.ry, E.rx * 2, E.ry * 2);
      ctx.restore();
    }

    // exhaust plume: a cone of light leaving the bell, with shock diamonds
    function plume(E, t, power) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const len = 78 * power, flick = 1 + 0.04 * Math.sin(t * 40 + E.cy);
      const g = ctx.createLinearGradient(E.cx, 0, E.cx + len, 0);
      g.addColorStop(0, "rgba(200,235,255," + (0.75 * power) + ")");
      g.addColorStop(0.4, "rgba(110,170,255," + (0.35 * power) + ")");
      g.addColorStop(1, "rgba(60,90,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(E.cx, E.cy - E.ry * 0.9);
      ctx.quadraticCurveTo(E.cx + len * 0.5, E.cy - E.ry * 0.75 * flick, E.cx + len, E.cy - 4);
      ctx.lineTo(E.cx + len, E.cy + 4);
      ctx.quadraticCurveTo(E.cx + len * 0.5, E.cy + E.ry * 0.75 * flick, E.cx, E.cy + E.ry * 0.9);
      ctx.closePath(); ctx.fill();
      for (let k = 0; k < 4; k++) {                                     // shock diamonds
        const x = E.cx + 12 + k * 14 + ((t * 30) % 2);
        const r = (9 - k * 1.6) * power;
        ctx.fillStyle = "rgba(255,255,255," + (0.35 - k * 0.07) * power + ")";
        ctx.beginPath(); ctx.moveTo(x - r, E.cy); ctx.lineTo(x, E.cy - r * 0.8); ctx.lineTo(x + r, E.cy); ctx.lineTo(x, E.cy + r * 0.8); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }

    /* Smoke rolls out of the dead bell, then drifts away to the right
       and upward, growing and thinning until it leaves the frame. */
    function spawn(E) {
      const a = rnd() * Math.PI * 2;
      smoke.push({
        x: E.cx + Math.cos(a) * E.rx * 0.5, y: E.cy + Math.sin(a) * E.ry * 0.6,
        vx: 0.35 + rnd() * 0.45, vy: -(0.05 + rnd() * 0.2),
        r: 2 + rnd() * 2, grow: 0.05 + rnd() * 0.05, wob: rnd() * 6.28, life: 0, max: 150 + rnd() * 120
      });
    }

    function drawSmoke() {
      smoke.forEach(function (p) {
        p.life++;
        p.vx *= 0.996;
        p.x += p.vx;
        p.y += p.vy + Math.sin(p.life * 0.05 + p.wob) * 0.12;
        p.r += p.grow;
        const a = Math.max(0, 1 - p.life / p.max), s = Math.round(p.r);
        ctx.fillStyle = "rgba(140,140,148," + (0.45 * a) + ")";
        ctx.fillRect(Math.round(p.x - s), Math.round(p.y - s / 2), s * 2, s);
        ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s), s, s * 2);
        ctx.fillStyle = "rgba(195,195,200," + (0.25 * a) + ")";
        ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), Math.max(1, s - 1), Math.max(1, s - 1));
      });
      smoke = smoke.filter(function (p) { return p.life < p.max && p.y > -12 && p.x < W + 12 && p.x > -12; });
    }

    let frame = 0, raf = 0;
    function draw() {
      if (gone(canvas)) { cancelAnimationFrame(raf); return; }
      const t = frame / 60;
      // space
      px(0, 0, W, H, "#04050a");
      stars.forEach(function (st, i) {
        const tw = 0.6 + 0.4 * Math.sin(t * 1.5 + i);
        px(st.x, st.y, st.s, st.s, "rgba(220,225,255," + (st.b * tw) + ")");
      });
      if (art.complete && art.naturalWidth) { ctx.drawImage(art, 0, 0, W, H); }

      if (running) {
        // restarted from the bridge: both burn, flashing blue
        const flash = 0.7 + 0.3 * Math.sin(t * 7);
        ENG.forEach(function (E, i) {
          const f = i ? 0.7 + 0.3 * Math.sin(t * 7 + 1.3) : flash;
          mouthGlow(E, 0.55 + 0.45 * f, "120,190,255");
          plume(E, t, 0.75 + 0.25 * f);
          if (arrow.complete && arrow.naturalWidth) {
            const n = (Math.floor(t * ARROW.fps) + i * 7) % ARROW.frames;
            ctx.drawImage(arrow, n * ARROW.w, 0, ARROW.w, ARROW.h,
                          E.cx + ARROW.dx, E.cy - ARROW.h / 2, ARROW.w, ARROW.h);
          }
        });
      } else {
        ENG.forEach(function (E) {
          if (E.safed) {
            // shut off at its panel: dark, no flicker, smoke rolling out
            if (!reduce && frame % 3 === 0) { spawn(E); }
          } else if (E === ENG[0]) {
            // port, still live: stalled, a weak flicker with the odd sputter of flame
            const sputter = Math.sin(t * 23) > 0.94 || rnd() < 0.02;
            mouthGlow(E, 0.25 + 0.12 * Math.sin(t * 2.4) + (sputter ? 0.4 : 0), "90,170,255");
            if (sputter) { plume(E, t, 0.3); }
          } else {
            // starboard, still live: dead, a faint ember in the throat and smoke
            if (Math.sin(t * 1.3) > 0.6) { mouthGlow(E, 0.18, "255,110,40"); }
            if (!reduce && frame % 3 === 0) { spawn(E); }
          }
        });
      }
      drawSmoke();

      // labels
      ctx.font = "6px \"IBM Plex Mono\", monospace";
      if (running) {
        ctx.fillStyle = "rgba(120,220,255,0.9)"; ctx.fillText("PORT ONLINE", 6, 12); ctx.fillText("STBD ONLINE", 6, H - 6);
      } else {
        if (ENG[0].safed) { ctx.fillStyle = "rgba(200,200,205,0.8)"; ctx.fillText("PORT SHUT DOWN", 6, 12); }
        else { ctx.fillStyle = "rgba(120,190,255,0.8)"; ctx.fillText("PORT STALLED", 6, 12); }
        if (ENG[1].safed) { ctx.fillStyle = "rgba(200,200,205,0.8)"; ctx.fillText("STBD SHUT DOWN", 6, H - 6); }
        else { ctx.fillStyle = "rgba(255,90,60," + (Math.sin(t * 6) > 0 ? 0.9 : 0.4) + ")"; ctx.fillText("STBD OFFLINE", 6, H - 6); }
      }
      frame++;
      if (!reduce) { raf = requestAnimationFrame(draw); }
    }
    if (!reduce && !running) {
      // pre-fill so the smoke is already trailing away when the page opens
      const smokers = ENG.filter(function (E, i) { return E.safed || i === 1; });
      for (let i = 0; i < 240; i++) {
        if (i % 3 === 0) { smokers.forEach(spawn); }
        smoke.forEach(function (p) { p.life++; p.vx *= 0.996; p.x += p.vx; p.y += p.vy; p.r += p.grow; });
        smoke = smoke.filter(function (p) { return p.life < p.max && p.x < W + 12; });
      }
    }
    draw();
    if (reduce && !art.complete && art.addEventListener) { art.addEventListener("load", draw); }
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
    canvas.setAttribute("aria-label", "Cryo bay: an aisle of stasis pods, most empty, two failed, one still sealed");
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

    // The bay is a pre-rendered image (assets/life_support/cryo_bay.png).
    // Live effects sit on top. Positions are image pixels:
    //   SEALED  pod 07, front right, the only one with a sleeper in it
    //   FAILED  pods 03 and 10, further down the aisle
    const bg = sceneImage("assets/life_support/cryo_bay.png");
    const SEALED = { x: 213, y: 80 };
    const FAILED = [{ x: 87, y: 73, n: 3 }, { x: 162, y: 72, n: 10 }];
    let fog = [];

    function heartbeat(t) {
      // flat most of the time; a single beat roughly every 5 seconds
      const c = t % 5;
      return c > 4.6 && c < 4.9;
    }

    function glow(x, y, r, rgba) {
      const g = ctx.createRadialGradient(x, y, 1, x, y, r);
      g.addColorStop(0, rgba); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    function effects(t) {
      ctx.globalCompositeOperation = "lighter";
      // pod 07 breathes slowly, with a stronger pulse on each heartbeat
      const breath = 0.16 + 0.07 * Math.sin(t * 1.2) + (heartbeat(t) ? 0.18 : 0);
      glow(SEALED.x, SEALED.y, 30, "rgba(90,170,255," + breath + ")");
      // failed pods flash red
      FAILED.forEach(function (P) {
        if (Math.sin(t * 8 + P.n) > 0) { glow(P.x, P.y, 14, "rgba(255,50,30,0.45)"); }
      });
      ctx.globalCompositeOperation = "source-over";
      // vitals trace over pod 07's side screen
      const sx = 226, sy = 103;
      ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(sx, sy, 14, 7);
      ctx.fillStyle = "rgba(120,255,170,0.85)"; ctx.fillRect(sx + 1, sy + 4, 12, 1);
      if (heartbeat(t)) { ctx.fillRect(sx + 6, sy + 1, 1, 3); ctx.fillRect(sx + 7, sy + 5, 1, 1); }
      // the lights stutter on reserve power
      if (Math.sin(t * 7) < -0.9) { ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(0, 0, W, H); }
    }

    function spawnFog(init) {
      fog.push({ x: init ? rnd() * W : -10 - rnd() * 20, y: 120 + rnd() * 24, vx: 0.12 + rnd() * 0.2,
                 r: 2 + rnd() * 3, a: 0.04 + rnd() * 0.06, wob: rnd() * 6.28 });
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
    for (let i = 0; i < 40; i++) { spawnFog(true); }
    function draw() {
      if (gone(canvas)) { cancelAnimationFrame(raf); return; }
      const t = frame / 60;
      ctx.fillStyle = "#05080d"; ctx.fillRect(0, 0, W, H);
      if (bg.complete && bg.naturalWidth) { ctx.drawImage(bg, 0, 0, W, H); }
      effects(t);
      if (!reduce && frame % 4 === 0) { spawnFog(false); }
      drawFog(t);
      frame++;
      if (!reduce) { raf = requestAnimationFrame(draw); }
    }
    draw();
    if (reduce && !bg.complete && bg.addEventListener) { bg.addEventListener("load", draw); }
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
      if (gone(canvas)) { cancelAnimationFrame(raf); return; }
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
