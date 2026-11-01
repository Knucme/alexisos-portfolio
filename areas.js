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

  window.ShipAreas = {
    bridge: bridge
  };
})();
