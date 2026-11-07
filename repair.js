/* ===================================================================
   AlexisOS - repair.js
   Repair puzzles for the ship (the easter egg hunt). Each entry in
   window.Repairs is function(system, { done }) that returns a panel.
   Call done() after a successful repair so the page can redraw.

   VOX ARRAY (area 2)
   The warp storm wrecked most of the array. Two steps:
     1. POWER: pull power cells out of the broken units (Dish B, Mast 2)
        into the relay buffer, then feed them into Dish A until it has
        the 6 cells it needs.
     2. CALIBRATE: steer Dish A (azimuth, elevation, feed rate) until
        the received signal matches the clean carrier wave, cos(x).
        The signal bar climbs as the two waves line up; a full match
        locks the channel and the Vox Array is repaired.
   =================================================================== */
(function () {
  "use strict";

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text != null) { e.textContent = text; }
    return e;
  }

  function btn(text, cls, fn) {
    const b = el("button", "opt rp-btn" + (cls ? " " + cls : ""), text);
    b.type = "button";
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      if (window.Ship) { Ship.touch(); }     // working a puzzle keeps progress alive
      fn();
    });
    return b;
  }

  function cells(n, of) {
    let s = "";
    for (let i = 0; i < of; i++) { s += i < n ? "■" : "□"; }
    return s;
  }

  /* ---------- VOX ARRAY ---------- */
  function vox(sys, opts) {
    const done = (opts && opts.done) || function () {};
    const wrap = el("section", "panel rp");
    wrap.appendChild(el("div", "panel-title", "VOX REPAIR PROTOCOL"));
    const body = el("div", "panel-body");
    wrap.appendChild(body);

    // Already fixed: show the locked carrier and stop.
    if (window.Ship && Ship.isRepaired("vox")) {
      body.appendChild(el("div", "line rp-ok", "+++ CHANNEL LOCKED. VOX ARRAY RESTORED. +++"));
      body.appendChild(el("div", "line dim", "Dish A is holding the carrier. The array can send and receive again."));
      const mon = monitor();
      body.appendChild(mon.el);
      mon.set({ amp: 1, freq: 1, phase: 0 }, true);
      return wrap;
    }

    body.appendChild(el("div", "para dim",
      "The warp storm burned out most of the array. Dish A still turns, but it's starved for power. " +
      "Pull cells from the dead units into the relay buffer, feed Dish A, then calibrate it to the carrier wave."));

    /* ----- step 1: power diversion ----- */
    const units = [
      { id: "dishA", name: "DISH A", ok: true,  cells: 2, max: 6, need: 6 },
      { id: "mast1", name: "MAST 1", ok: true,  cells: 3, max: 3 },
      { id: "mast3", name: "MAST 3", ok: true,  cells: 2, max: 2 },
      { id: "dishB", name: "DISH B", ok: false, cells: 3, max: 3 },
      { id: "mast2", name: "MAST 2", ok: false, cells: 2, max: 2 }
    ];
    const BUFFER_MAX = 3;
    let buffer = 0;

    const powerBox = el("div", "rp-step");
    powerBox.appendChild(el("div", "rp-h", "STEP 1  POWER DIVERSION"));
    const grid = el("div", "rp-units");
    powerBox.appendChild(grid);
    const bufLine = el("div", "line rp-buffer");
    powerBox.appendChild(bufLine);
    const powerMsg = el("div", "line dim rp-msg", "Draw from a dead unit, then feed an operational one.");
    powerBox.appendChild(powerMsg);
    body.appendChild(powerBox);

    /* ----- step 2: calibration ----- */
    const calBox = el("div", "rp-step rp-cal locked");
    calBox.appendChild(el("div", "rp-h", "STEP 2  CALIBRATE DISH A"));
    const lockNote = el("div", "line alert rp-locknote", "LOCKED. DISH A NEEDS 6 POWER CELLS.");
    calBox.appendChild(lockNote);
    const mon = monitor();
    calBox.appendChild(mon.el);

    const ctrls = el("div", "rp-ctrls");
    // Start off target, but not too far. Steps are chosen so the exact
    // match is reachable. Each control has its own lock light and a hint
    // that says which way to slide it (see hint() below), so players
    // can solve one control at a time instead of guessing.
    const state = { amp: 1.5, freq: 1.5, phase: 90 };
    const SPEC = [
      { key: "freq",  label: "FEED RATE", what: "how many peaks", target: 1, min: 0.5, max: 2.0, step: 0.25,
        fmt: function (v) { return v.toFixed(2); }, high: "TOO MANY PEAKS", low: "TOO FEW PEAKS" },
      { key: "amp",   label: "ELEVATION", what: "how tall the wave is", target: 1, min: 0.2, max: 2.0, step: 0.1,
        fmt: function (v) { return v.toFixed(1); }, high: "TOO TALL", low: "TOO SHORT" },
      { key: "phase", label: "AZIMUTH",   what: "slides the wave sideways", target: 0, min: -180, max: 180, step: 15,
        fmt: function (v) { return (v > 0 ? "+" : "") + v + "°"; }, high: "SLIDE LEFT", low: "SLIDE RIGHT" }
    ];
    calBox.insertBefore(el("div", "line dim rp-howto",
      "Each control has its own light. Turn them all green: FEED RATE sets how many peaks, " +
      "ELEVATION sets how tall the wave is, AZIMUTH slides it sideways."), mon.el);
    const sliders = [], hints = [];
    function onTarget(sp) { return Math.abs(state[sp.key] - sp.target) < sp.step / 2; }
    function hint(sp, out) {
      if (onTarget(sp)) { out.textContent = "● LOCKED"; out.className = "rp-ctrl-s ok"; return; }
      const high = state[sp.key] > sp.target;
      out.textContent = high ? "◀ " + sp.high : sp.low + " ▶";
      out.className = "rp-ctrl-s off";
    }
    SPEC.forEach(function (sp) {
      const row = el("label", "rp-ctrl");
      row.appendChild(el("span", "rp-ctrl-l", sp.label));
      const input = document.createElement("input");
      input.type = "range"; input.min = sp.min; input.max = sp.max; input.step = sp.step;
      input.value = state[sp.key];
      input.disabled = true;
      input.setAttribute("aria-label", sp.label);
      const val = el("span", "rp-ctrl-v", sp.fmt(state[sp.key]));
      const st = el("span", "rp-ctrl-s");
      input.title = sp.label + ": " + sp.what;
      input.addEventListener("input", function () {
        if (window.Ship) { Ship.touch(); }
        state[sp.key] = parseFloat(input.value);
        val.textContent = sp.fmt(state[sp.key]);
        update();
      });
      input.addEventListener("click", function (e) { e.stopPropagation(); });
      row.appendChild(input);
      row.appendChild(val);
      row.appendChild(st);
      ctrls.appendChild(row);
      sliders.push(input);
      hints.push([sp, st]);
    });
    calBox.appendChild(ctrls);
    const calMsg = el("div", "line dim rp-msg", "Match the live signal to the dashed carrier wave.");
    calBox.appendChild(calMsg);
    body.appendChild(calBox);

    function powered() { return units[0].cells >= units[0].need; }

    function drawUnits() {
      grid.innerHTML = "";
      units.forEach(function (u) {
        const row = el("div", "rp-unit " + (u.ok ? "ok" : "dead"));
        row.appendChild(el("span", "rp-name", u.name));
        row.appendChild(el("span", "rp-state", u.ok ? "OPERATIONAL" : "BROKEN"));
        row.appendChild(el("span", "rp-cells", cells(u.cells, u.max)));
        if (u.ok) {
          const full = u.cells >= u.max;
          const b = btn(full ? "FULL" : "◂ FEED", "", function () {
            if (buffer < 1 || u.cells >= u.max) { return; }
            buffer--; u.cells++;
            powerMsg.textContent = "1 CELL FED INTO " + u.name + ".";
            if (u.id === "dishA" && powered()) { powerMsg.textContent = "DISH A FULLY POWERED. CALIBRATION UNLOCKED."; }
            drawUnits(); unlock();
          });
          b.disabled = full || buffer < 1;
          row.appendChild(b);
        } else {
          const b = btn(u.cells ? "DRAW ▸" : "DRAINED", "", function () {
            if (u.cells < 1 || buffer >= BUFFER_MAX) {
              if (buffer >= BUFFER_MAX) { powerMsg.textContent = "RELAY BUFFER FULL. FEED A UNIT FIRST."; }
              return;
            }
            u.cells--; buffer++;
            powerMsg.textContent = "1 CELL DRAWN FROM " + u.name + ".";
            drawUnits();
          });
          b.disabled = u.cells < 1;
          row.appendChild(b);
        }
        grid.appendChild(row);
      });
      bufLine.textContent = "RELAY BUFFER  " + cells(buffer, BUFFER_MAX) + "  " + buffer + "/" + BUFFER_MAX;
    }

    function unlock() {
      const on = powered();
      calBox.classList.toggle("locked", !on);
      lockNote.style.display = on ? "none" : "";
      sliders.forEach(function (s) { s.disabled = !on || locked; });
      lockNote.textContent = "LOCKED. DISH A NEEDS 6 POWER CELLS (HAS " + units[0].cells + ").";
      update();
    }

    let locked = false;
    function update() {
      const q = mon.set(state, false, !powered());
      hints.forEach(function (h) {
        if (powered()) { hint(h[0], h[1]); } else { h[1].textContent = ""; h[1].className = "rp-ctrl-s"; }
      });
      if (!powered() || locked) { return; }
      const good = SPEC.filter(onTarget).length;
      if (good === SPEC.length || q >= 0.98) {
        locked = true;
        sliders.forEach(function (s) { s.disabled = true; });
        calMsg.className = "line rp-ok rp-msg";
        calMsg.textContent = "+++ CARRIER LOCKED. VOX ARRAY RESTORED. +++";
        wrap.classList.add("rp-won");
        if (window.Ship) { Ship.repair("vox"); }
        setTimeout(done, 2600);
      } else {
        const next = SPEC.find(function (sp) { return !onTarget(sp); });
        calMsg.className = "line rp-msg" + (good ? "" : " dim");
        calMsg.textContent = good + " OF 3 CONTROLS LOCKED. NEXT: " + next.label + " (" + next.what + ").";
      }
    }

    drawUnits();
    unlock();
    return wrap;
  }

  /* ---------- Signal monitor (vitals-monitor style) ----------
     Big readouts on the left, a scrolling scope on the right showing
     the carrier wave cos(x) (dashed) and the live signal, and a
     segmented signal bar underneath. set(state) returns quality 0..1. */
  function monitor() {
    const m = el("div", "rp-mon");
    const top = el("div", "rp-mon-top");
    const warn = el("div", "rp-mon-banner", "SIGNAL LOST. CARRIER NOT ACQUIRED.");
    m.appendChild(warn);

    const left = el("div", "rp-mon-left");
    const big = el("div", "rp-big");
    const bigVal = el("span", "rp-big-v", "0");
    big.appendChild(el("span", "rp-big-l", "SIGNAL"));
    big.appendChild(bigVal);
    big.appendChild(el("span", "rp-big-u", "%"));
    left.appendChild(big);
    const snr = el("div", "rp-small", "SNR  0.0 DB");
    const lock = el("div", "rp-small", "LOCK  SEARCHING");
    left.appendChild(snr);
    left.appendChild(lock);
    top.appendChild(left);

    const canvas = el("canvas", "rp-scope");
    canvas.width = 480; canvas.height = 150;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Scope: dashed carrier wave cos x and the live signal");
    top.appendChild(canvas);
    m.appendChild(top);

    const bar = el("div", "rp-bar");
    const segs = [];
    for (let i = 0; i < 24; i++) { const s = el("span", "rp-seg"); bar.appendChild(s); segs.push(s); }
    m.appendChild(bar);

    const ctx = canvas.getContext && canvas.getContext("2d");
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cur = { amp: 1, freq: 1, phase: 0 }, quality = 0, dead = false, t0 = performance.now(), raf = 0, shown = false;

    function qualityOf(s) {
      // RMS difference between the live wave and cos(x) over two periods
      let sum = 0; const N = 200;
      for (let i = 0; i < N; i++) {
        const x = i / N * 4 * Math.PI;
        const d = s.amp * Math.cos(s.freq * x + s.phase * Math.PI / 180) - Math.cos(x);
        sum += d * d;
      }
      const rms = Math.sqrt(sum / N);
      return Math.max(0, Math.min(1, 1 - rms / 1.3));
    }

    function color(q) { return q >= 0.98 ? "#38ff7a" : q >= 0.6 ? "#ffcc33" : "#ff5a3c"; }

    function draw(now) {
      if (!ctx) { return; }
      // Wait until the panel is on the page; stop once it has been removed.
      if (!canvas.isConnected) {
        if (shown) { return; }
        raf = requestAnimationFrame(draw);
        return;
      }
      shown = true;
      const W = canvas.width, H = canvas.height, mid = H / 2, sy = H * 0.34;
      const shift = reduce ? 0 : (now - t0) / 1000 * 1.6;      // the flow scrolls left to right
      ctx.fillStyle = "#06120a"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(80,160,110,0.18)"; ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += 25) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.strokeStyle = "rgba(120,200,150,0.35)"; ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();

      function wave(fn, style, width, dash) {
        ctx.save(); ctx.strokeStyle = style; ctx.lineWidth = width; ctx.setLineDash(dash || []);
        ctx.beginPath();
        for (let px = 0; px <= W; px += 2) {
          const x = px / W * 4 * Math.PI - shift;
          const y = mid - fn(x) * sy;
          if (px === 0) { ctx.moveTo(px, y); } else { ctx.lineTo(px, y); }
        }
        ctx.stroke(); ctx.restore();
      }
      // carrier wave: cos(x)
      wave(Math.cos, "rgba(160,255,200,0.55)", 1.5, [6, 6]);
      if (!dead) {
        const noise = (1 - quality) * 0.22;
        const c = color(quality);
        ctx.shadowColor = c; ctx.shadowBlur = 6;
        wave(function (x) {
          return cur.amp * Math.cos(cur.freq * x + cur.phase * Math.PI / 180) + (Math.random() - 0.5) * noise;
        }, c, 2);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = "rgba(255,90,60,0.8)"; ctx.font = "13px \"IBM Plex Mono\", monospace";
        ctx.fillText("NO POWER", W / 2 - 34, mid - 8);
      }
      ctx.fillStyle = "rgba(160,255,200,0.6)"; ctx.font = "11px \"IBM Plex Mono\", monospace";
      ctx.fillText("CARRIER  y = cos x", 8, 14);
      if (!reduce) { raf = requestAnimationFrame(draw); }
    }

    function set(s, perfect, noPower) {
      cur = { amp: s.amp, freq: s.freq, phase: s.phase };
      dead = !!noPower;
      quality = perfect ? 1 : dead ? 0 : qualityOf(cur);
      const pct = Math.round(quality * 100);
      bigVal.textContent = String(pct);
      const c = color(quality);
      big.style.color = c;
      const on = Math.round(quality * segs.length);
      segs.forEach(function (sg, i) { sg.style.background = i < on ? c : ""; sg.classList.toggle("on", i < on); });
      snr.textContent = "SNR  " + (quality * 24).toFixed(1) + " DB";
      lock.textContent = "LOCK  " + (quality >= 0.98 ? "ACQUIRED" : dead ? "NO POWER" : quality >= 0.8 ? "MARGINAL" : "SEARCHING");
      warn.className = "rp-mon-banner " + (quality >= 0.98 ? "good" : quality >= 0.6 ? "mid" : "bad");
      warn.textContent = quality >= 0.98 ? "CARRIER LOCKED. CHANNEL OPEN."
                        : dead ? "DISH UNPOWERED. CARRIER NOT ACQUIRED."
                        : quality >= 0.6 ? "WEAK CARRIER. KEEP TUNING." : "SIGNAL LOST. CARRIER NOT ACQUIRED.";
      if (reduce && shown) { draw(performance.now()); }
      return quality;
    }

    if (ctx) { raf = requestAnimationFrame(draw); }
    return { el: m, set: set };
  }

  /* ---------- REACTOR (area 5) ----------
     Core B is overheating and its pressure is climbing. A live control
     board, updated 10 times a second:
       COOLANT A / B / C  the pump's flow is shared between open lines
       CROSSFEED          moves heat from Core B into Cores A and C
       VENT B             bleeds Core B pressure into the vent header
       PURGE HEADER       empties the header to space, but costs the
                          pump pressure (less cooling while it's open)
     Goal: Core B at or under 650 C, pressure at or under 40%, Cores A
     and C at or under 750 C, all held for 10 seconds. Then restart.
     Fail states: header full (rupture: pressure and heat spike) and
     pressure at 100% (scram: the board resets). */
  function reactor(sys, opts) {
    const done = (opts && opts.done) || function () {};
    const wrap = el("section", "panel rp rx-board");
    wrap.appendChild(el("div", "panel-title", "REACTOR CONTROL BOARD"));
    const body = el("div", "panel-body");
    wrap.appendChild(body);

    if (window.Ship && Ship.isRepaired("reactor")) {
      body.appendChild(el("div", "line rp-ok", "+++ REACTOR ONLINE. ALL CORES STABLE. +++"));
      body.appendChild(el("div", "line dim", "Core B is holding at a safe temperature. Full output restored."));
      return wrap;
    }

    body.appendChild(el("div", "para dim",
      "Core B is overheating and building pressure. Open its coolant line, spread its heat into the other " +
      "cores, and bleed off pressure without letting the vent header burst. Hold everything in the safe zone " +
      "for 10 seconds, then restart the reactor."));

    // Model constants (tuned so only full coolant + crossfeed settles Core B)
    const GEN = [4.4, 6, 4.4], PASSIVE = 2.0, COOL = 8, XFER = 2, AMB = 150, K = 400;
    const LIMIT_B = 650, LIMIT_AC = 750, LIMIT_P = 40, HOLD_TICKS = 100;
    const START = function () {
      return { T: [612, 1184, 598], P: 72, H: 55, valve: [true, false, true], cross: false, vent: false, purge: false, hold: 0 };
    };
    let st = START(), finished = false, history = [];

    // ----- layout -----
    const board = el("div", "rxb");
    const cores = el("div", "rxb-cores");
    const coreEls = ["A", "B", "C"].map(function (n, i) {
      const c = el("div", "rxb-core" + (i === 1 ? " main" : ""));
      c.appendChild(el("div", "rxb-name", "CORE " + n));
      const gauge = el("div", "rxb-gauge");
      const fill = el("div", "rxb-fill");
      gauge.appendChild(fill);
      const mark = el("div", "rxb-limit");
      mark.style.bottom = ((i === 1 ? LIMIT_B : LIMIT_AC) / 1300 * 100) + "%";
      gauge.appendChild(mark);
      c.appendChild(gauge);
      const temp = el("div", "rxb-temp", "0 C");
      c.appendChild(temp);
      const v = btn("", "rxb-valve", function () {
        if (finished) { return; }
        st.valve[i] = !st.valve[i]; paint();
        say((st.valve[i] ? "COOLANT LINE " + n + " OPENED." : "COOLANT LINE " + n + " CLOSED."), "");
      });
      c.appendChild(v);
      cores.appendChild(c);
      return { fill: fill, temp: temp, valve: v, box: c };
    });
    board.appendChild(cores);

    const cross = btn("", "rxb-cross", function () {
      if (finished) { return; }
      st.cross = !st.cross; paint();
      say(st.cross ? "CROSSFEED ENGAGED. CORE B HEAT SPREADING INTO A AND C." : "CROSSFEED DISENGAGED.", "");
    });
    board.appendChild(cross);

    const side = el("div", "rxb-side");
    function meter(label) {
      const m = el("div", "rxb-meter");
      m.appendChild(el("div", "rxb-mlabel", label));
      const bar = el("div", "rxb-mbar");
      const f = el("div", "rxb-mfill");
      bar.appendChild(f);
      m.appendChild(bar);
      const v = el("div", "rxb-mval", "");
      m.appendChild(v);
      side.appendChild(m);
      return { box: m, fill: f, val: v, bar: bar };
    }
    const pMeter = meter("CORE B PRESSURE");
    const pMark = el("div", "rxb-mlimit"); pMark.style.left = LIMIT_P + "%"; pMeter.bar.appendChild(pMark);
    const vent = btn("", "rxb-btn", function () {
      if (finished) { return; }
      st.vent = !st.vent; paint();
    });
    side.appendChild(vent);
    const hMeter = meter("VENT HEADER");
    const purge = btn("", "rxb-btn", function () {
      if (finished) { return; }
      st.purge = !st.purge; paint();
    });
    side.appendChild(purge);
    const holdMeter = meter("STABILITY HOLD");
    board.appendChild(side);
    body.appendChild(board);

    const trend = el("canvas", "rxb-trend");
    trend.width = 600; trend.height = 70;
    trend.setAttribute("aria-label", "Core B temperature trend");
    body.appendChild(trend);
    // Guide: live checklist of the goals plus one "NEXT" instruction,
    // with the control it refers to outlined on the board (see guide()).
    const guideBox = el("div", "rx-guide");
    const nextLine = el("div", "rx-next-line");
    guideBox.appendChild(nextLine);
    const checks = el("div", "rx-checks");
    const GOALS = [
      ["b", "CORE B ≤ " + LIMIT_B + " C"],
      ["p", "PRESSURE ≤ " + LIMIT_P + "%"],
      ["ac", "CORES A, C ≤ " + LIMIT_AC + " C"],
      ["hold", "HOLD 10 S"]
    ].map(function (g) {
      const c = el("span", "rx-check", "○ " + g[1]);
      checks.appendChild(c);
      return { key: g[0], label: g[1], el: c };
    });
    guideBox.appendChild(checks);
    body.appendChild(guideBox);
    const msg = el("div", "line rp-msg dim", "BOARD LIVE. CORE B CRITICAL.");
    body.appendChild(msg);
    const restart = btn("RESTART REACTOR", "rxb-restart", function () {
      if (window.Ship) { Ship.repair("reactor"); }
      msg.className = "line rp-ok rp-msg";
      msg.textContent = "+++ REACTOR RESTARTED. CORES STABLE. FULL OUTPUT. +++";
      restart.disabled = true;
      wrap.classList.add("rp-won");
      setTimeout(done, 2600);
    });
    restart.style.display = "none";
    body.appendChild(restart);

    function say(text, kind) { msg.className = "line rp-msg " + (kind || "dim"); msg.textContent = text; }

    function heatClass(t, limit) { return t > limit + 200 ? "crit" : t > limit ? "warn" : "ok"; }

    function paint() {
      st.T.forEach(function (t, i) {
        const c = coreEls[i];
        const limit = i === 1 ? LIMIT_B : LIMIT_AC;
        c.fill.style.height = Math.min(100, t / 1300 * 100) + "%";
        c.fill.className = "rxb-fill " + heatClass(t, limit);
        c.temp.textContent = Math.round(t) + " C";
        c.temp.className = "rxb-temp " + heatClass(t, limit);
        c.valve.textContent = "COOLANT " + (st.valve[i] ? "OPEN" : "SHUT");
        c.valve.classList.toggle("on", st.valve[i]);
      });
      cross.textContent = st.cross ? "← CROSSFEED ON →" : "CROSSFEED OFF";
      cross.classList.toggle("on", st.cross);
      pMeter.fill.style.width = Math.min(100, st.P) + "%";
      pMeter.fill.className = "rxb-mfill " + (st.P > 85 ? "crit" : st.P > LIMIT_P ? "warn" : "ok");
      pMeter.val.textContent = Math.round(st.P) + "%";
      hMeter.fill.style.width = Math.min(100, st.H) + "%";
      hMeter.fill.className = "rxb-mfill " + (st.H > 85 ? "crit" : st.H > 60 ? "warn" : "ok");
      hMeter.val.textContent = Math.round(st.H) + "%";
      holdMeter.fill.style.width = (st.hold / HOLD_TICKS * 100) + "%";
      holdMeter.fill.className = "rxb-mfill ok";
      holdMeter.val.textContent = (st.hold / 10).toFixed(1) + " / 10 S";
      vent.textContent = "VENT B " + (st.vent ? "OPEN" : "SHUT");
      vent.classList.toggle("on", st.vent);
      purge.textContent = "PURGE HEADER " + (st.purge ? "OPEN" : "SHUT");
      purge.classList.toggle("on", st.purge);
      drawTrend();
      guide();
    }

    function drawTrend() {
      const ctx = trend.getContext && trend.getContext("2d");
      if (!ctx) { return; }
      const W = trend.width, H = trend.height;
      ctx.fillStyle = "#0b0705"; ctx.fillRect(0, 0, W, H);
      const y = function (t) { return H - Math.min(1, t / 1300) * H; };
      ctx.strokeStyle = "rgba(56,255,122,0.6)"; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, y(LIMIT_B)); ctx.lineTo(W, y(LIMIT_B)); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = "#ff8a3c"; ctx.lineWidth = 2; ctx.beginPath();
      history.forEach(function (t, k) {
        const x = W - (history.length - 1 - k) * (W / 300);
        if (k === 0) { ctx.moveTo(x, y(t)); } else { ctx.lineTo(x, y(t)); }
      });
      ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = "rgba(255,200,160,0.7)"; ctx.font = "11px \"IBM Plex Mono\", monospace";
      ctx.fillText("CORE B TEMP, 30 S", 6, 12);
    }

    function guide() {
      const ok = {
        b: st.T[1] <= LIMIT_B, p: st.P <= LIMIT_P,
        ac: st.T[0] <= LIMIT_AC && st.T[2] <= LIMIT_AC, hold: finished
      };
      GOALS.forEach(function (g) {
        g.el.textContent = (ok[g.key] ? "● " : "○ ") + g.label;
        g.el.className = "rx-check" + (ok[g.key] ? " ok" : "");
      });
      // what to do next, in the order that works
      let text, target = null;
      if (finished) { text = "ALL GOALS HELD. PRESS RESTART REACTOR."; target = restart; }
      else if (!st.valve[1]) { text = "OPEN COOLANT B. Core B has no coolant at all."; target = coreEls[1].valve; }
      else if (!st.valve[0] || !st.valve[2]) { text = "KEEP COOLANT A AND C OPEN. Every core needs its line."; target = !st.valve[0] ? coreEls[0].valve : coreEls[2].valve; }
      else if (!st.cross) { text = "ENGAGE CROSSFEED. It spreads Core B's heat into A and C."; target = cross; }
      else if (st.H >= 75 && !st.purge) { text = "VENT HEADER NEARLY FULL. OPEN PURGE HEADER before it bursts."; target = purge; }
      else if (st.purge && st.H <= 20) { text = "HEADER EMPTY. SHUT PURGE HEADER. While open it weakens the coolant."; target = purge; }
      else if (st.P > LIMIT_P && !st.vent) { text = "OPEN VENT B to bleed Core B pressure into the header."; target = vent; }
      else if (st.hold > 0) { text = "IN THE SAFE ZONE. HOLD STEADY: " + (st.hold / 10).toFixed(1) + " OF 10 S."; }
      else if (st.T[1] > LIMIT_B) { text = "WAIT. CORE B IS COOLING, " + Math.round(st.T[1] - LIMIT_B) + " C TO GO. Keep an eye on the header."; }
      else { text = "PRESSURE BLEEDING THROUGH VENT B. ALMOST THERE."; }
      nextLine.textContent = "NEXT: " + text;
      [coreEls[0].valve, coreEls[1].valve, coreEls[2].valve, cross, vent, purge, restart].forEach(function (b) {
        b.classList.toggle("rx-next", b === target);
      });
    }

    function step() {
      const n = st.valve.filter(Boolean).length;
      const eff = st.purge ? 0.6 : 1;
      const dT = st.T.map(function (t, i) {
        const share = st.valve[i] && n ? 1 / n : 0;
        return GEN[i] * 10 - (PASSIVE + COOL * share * eff) * (t - AMB) / K * 10;
      });
      if (st.cross) {
        [0, 2].forEach(function (i) {
          const q = XFER * (st.T[1] - st.T[i]) / K * 10;
          dT[1] -= q; dT[i] += q;
        });
      }
      st.T = st.T.map(function (t, i) { return Math.max(AMB, t + dT[i] * 0.1); });
      st.P += 0.025 * Math.max(0, (st.T[1] - 550) / 100);
      if (st.vent) { const d = Math.min(st.P, 0.35); st.P -= d; st.H += d; }
      if (st.purge) { st.H = Math.max(0, st.H - 0.8); }

      if (st.H >= 100) {
        st.H = 70; st.P = Math.min(99, st.P + 15); st.T[1] += 120; st.vent = false;
        say("!! HEADER RUPTURE. PRESSURE BLOWBACK INTO CORE B. PURGE BEFORE YOU VENT. !!", "alert");
      }
      if (st.P >= 100) {
        st = START(); history = [];
        say("!! SCRAM. CORE B PRESSURE LIMIT. BOARD RESET TO EMERGENCY STATE. !!", "alert");
      }
      const safe = st.T[1] <= LIMIT_B && st.P <= LIMIT_P && st.T[0] <= LIMIT_AC && st.T[2] <= LIMIT_AC;
      st.hold = safe ? st.hold + 1 : 0;
      history.push(st.T[1]); if (history.length > 300) { history.shift(); }
      if (st.hold >= HOLD_TICKS) {
        finished = true;
        say("+++ ALL CORES IN SAFE RANGE. RESTART AUTHORIZED. +++", "rp-ok");
        restart.style.display = "";
      } else if (safe) {
        say("SAFE RANGE. HOLD IT...", "rp-ok");
      } else if (st.T[0] > LIMIT_AC || st.T[2] > LIMIT_AC) {
        if (!/RUPTURE|SCRAM/.test(msg.textContent)) { say("CORES A OR C RUNNING HOT. THEY NEED COOLANT TOO.", ""); }
      }
    }

    paint();
    let shown = false;
    const timer = setInterval(function () {
      if (!wrap.isConnected) { if (shown) { clearInterval(timer); } return; }
      shown = true;
      if (finished) { return; }
      step(); paint();
    }, 100);
    return wrap;
  }

  /* ---------- ENGINES (area 7): nozzle shutdown panels ----------
     Each engine has three exhaust nozzles. Before the engines can be
     restarted from the bridge, every nozzle has to be safed, one at a
     time, in the order printed on the panel:
       1. PUSH TO ISOLATE (the yellow button)   window turns ISOLATED
       2. PULL TO SAFE   (the lever under it)   window turns SAFED
     Anything out of order faults the panel and it resets.
     When all three are safed, the engine's flag is saved. */
  const ENGINE_PANELS = {
    port: { name: "PORT ENGINE", order: [2, 1, 3] },
    stbd: { name: "STARBOARD ENGINE", order: [3, 1, 2] }
  };

  function enginePanel(key, opts) {
    const cfg = ENGINE_PANELS[key];
    const done = (opts && opts.done) || function () {};
    const flagName = "engine_" + key + "_safed";
    const wrap = el("section", "ep");

    const plate = el("div", "ep-plate");
    plate.appendChild(el("div", "ep-title", cfg.name + "  NOZZLE SHUTDOWN"));
    const orderLine = el("div", "ep-order");
    orderLine.appendChild(el("span", "ep-order-l", "SHUTDOWN ORDER"));
    cfg.order.forEach(function (n, k) {
      orderLine.appendChild(el("span", "ep-step", String(n)));
      if (k < cfg.order.length - 1) { orderLine.appendChild(el("span", "ep-arrow", "▸")); }
    });
    plate.appendChild(orderLine);
    plate.appendChild(el("div", "ep-note", "For each nozzle: push to isolate, then pull to safe."));
    wrap.appendChild(plate);

    const already = window.Ship && Ship.flag(flagName);
    // nozzle state: live -> isolated -> safed
    let nz = [1, 2, 3].map(function (n) { return { n: n, state: already ? "safed" : "live" }; });
    let step = already ? 3 : 0, faulted = false;

    const grid = el("div", "ep-grid");
    const cells = nz.map(function (z) {
      const col = el("div", "ep-col");
      col.appendChild(el("div", "ep-label", "NOZZLE " + z.n));
      const win = el("div", "ep-win");
      col.appendChild(win);
      col.appendChild(el("div", "ep-cap", "Push to Isolate"));
      const push = el("button", "ep-push");
      push.type = "button";
      push.setAttribute("aria-label", "Nozzle " + z.n + ": push to isolate");
      col.appendChild(push);
      col.appendChild(el("div", "ep-cap", "Pull to Safe"));
      const lever = el("button", "ep-lever");
      lever.type = "button";
      lever.setAttribute("aria-label", "Nozzle " + z.n + ": pull lever to safe");
      lever.appendChild(el("span", "ep-slot"));
      lever.appendChild(el("span", "ep-handle"));
      col.appendChild(lever);
      grid.appendChild(col);
      push.addEventListener("click", function (e) { e.stopPropagation(); act(z, "push"); });
      lever.addEventListener("click", function (e) { e.stopPropagation(); act(z, "pull"); });
      return { win: win, push: push, lever: lever, col: col };
    });
    wrap.appendChild(grid);
    const msg = el("div", "ep-msg", already ? "ALL NOZZLES SAFED. RESTART FROM THE BRIDGE." : "AWAITING SHUTDOWN SEQUENCE.");
    wrap.appendChild(msg);

    function paint() {
      nz.forEach(function (z, i) {
        const c = cells[i];
        c.win.className = "ep-win " + z.state;
        c.win.textContent = z.state === "live" ? "Live" : z.state === "isolated" ? "Isolated" : "Safed";
        c.push.classList.toggle("down", z.state !== "live");
        c.lever.classList.toggle("pulled", z.state === "safed");
        c.col.classList.toggle("next", !faulted && step < 3 && cfg.order[step] === z.n);
      });
      orderLine.querySelectorAll(".ep-step").forEach(function (s, k) { s.classList.toggle("done", k < step); });
    }

    function fault(text) {
      faulted = true;
      wrap.classList.add("fault");
      msg.className = "ep-msg bad";
      msg.textContent = text + " PANEL RESETTING.";
      paint();
      setTimeout(function () {
        nz.forEach(function (z) { z.state = "live"; });
        step = 0; faulted = false;
        wrap.classList.remove("fault");
        msg.className = "ep-msg";
        msg.textContent = "PANEL RESET. START AGAIN FROM THE FIRST NOZZLE IN THE ORDER.";
        paint();
      }, 1500);
    }

    function act(z, kind) {
      if (window.Ship) { Ship.touch(); }
      if (faulted || step >= 3) { return; }
      const expected = cfg.order[step];
      if (z.n !== expected) { fault("FAULT: NOZZLE " + z.n + " IS OUT OF SEQUENCE."); return; }
      if (kind === "push") {
        if (z.state !== "live") { return; }
        z.state = "isolated";
        msg.className = "ep-msg"; msg.textContent = "NOZZLE " + z.n + " ISOLATED. PULL ITS LEVER TO SAFE IT.";
      } else {
        if (z.state !== "isolated") { fault("FAULT: NOZZLE " + z.n + " WAS NOT ISOLATED FIRST."); return; }
        z.state = "safed";
        step++;
        msg.className = "ep-msg"; msg.textContent = "NOZZLE " + z.n + " SAFED.";
      }
      paint();
      if (step >= 3) {
        if (window.Ship) { Ship.flag(flagName, true); }
        msg.className = "ep-msg good";
        msg.textContent = "+++ " + cfg.name + " SAFED. RESTART BOTH ENGINES FROM THE BRIDGE. +++";
        wrap.classList.add("rp-won");
        setTimeout(done, 2400);
      }
    }

    paint();
    return wrap;
  }

  function enginePort(sys, opts) { return enginePanel("port", opts); }
  enginePort.title = "PORT ENGINE PANEL";
  function engineStbd(sys, opts) { return enginePanel("stbd", opts); }
  engineStbd.title = "STARBOARD ENGINE PANEL";


  /* ---------- DAMAGE CONTROL (bridge) ----------
     Two windows opened from the DAMAGE CONTROL strip on the bridge.
       purge     every compartment on Deck 4 and Aft Cargo by name. Rooms
                 with biosigns can be SEALED, then DECONTAMINATED: a
                 progress bar runs, then the purge is confirmed. Saves the
                 flags sealed_<key> and purge_<key>; the room cameras then
                 show the creatures dead (the fires keep burning).
       suppress  one discharge puts out every fire on both decks and in
                 the failed cryo pods in life support. Saves
                 fire_suppressed; the cameras then show smoke, no flames.
     Flags reset with the rest of the repairs (1 hour idle, or a warp jump). */
  const PURGE_ROOMS = [
    { key: "quarantine", deck: "AFT CARGO", name: "QUARANTINE", bios: 3 },
    { key: "bunksB", deck: "DECK 4", name: "BUNKS B", bios: 3 }
  ];
  const FIRE_ROOMS = [["DECK 4", "BUNKS B"], ["DECK 4", "AIRLOCK 4"], ["AFT CARGO", "HOLD 2"], ["AFT CARGO", "QUARANTINE"],
                      ["LIFE SUPPORT", "CRYO PODS 03, 10"]];
  const ALL_ROOMS = [
    ["DECK 4", ["BUNKS A", "BUNKS B", "SANITATION", "MEDICAE BAY", "OFFICER QTRS", "MAIN CORRIDOR", "LOCKERS", "MESS HALL", "GALLEY", "SHRINE", "AIRLOCK 4"]],
    ["AFT CARGO", ["HOLD 1", "HOLD 2", "QUARANTINE", "MANIFEST OFFICE", "CARGO LIFT", "SERVITOR BAY", "DOCK CLAMP", "FUEL BUNKER"]]
  ];
  const LOCKED = { "OFFICER QTRS": "LOCKED FROM INSIDE", "SERVITOR BAY": "SEALED, NO RESPONSE" };
  function flagOn(n) { return !!(window.Ship && Ship.flag(n)); }

  // a stepped progress bar that fills over ms, with changing captions
  function runBar(bar, cap, steps, ms, then) {
    const cells = [];
    bar.innerHTML = "";
    for (let i = 0; i < 24; i++) { const c = el("span", "dc-cell"); bar.appendChild(c); cells.push(c); }
    const t0 = Date.now();
    const timer = setInterval(function () {
      if (!bar.isConnected) { clearInterval(timer); return; }
      const p = Math.min(1, (Date.now() - t0) / ms);
      cells.forEach(function (c, i) { c.classList.toggle("on", i < Math.round(p * 24)); });
      cap.textContent = steps[Math.min(steps.length - 1, Math.floor(p * steps.length))] + "  " + Math.round(p * 100) + "%";
      if (p >= 1) { clearInterval(timer); then(); }
    }, 80);
  }

  function purge(sys, opts) {
    const done = (opts && opts.done) || function () {};
    const wrap = el("section", "dc");
    wrap.appendChild(el("div", "dc-h", "Seal a compartment, then decontaminate it. Rooms without biosigns need nothing."));
    const busy = { on: false };
    ALL_ROOMS.forEach(function (d) {
      wrap.appendChild(el("div", "dc-deck", d[0]));
      d[1].forEach(function (name) {
        const r = PURGE_ROOMS.find(function (p) { return p.name === name && p.deck === d[0]; });
        const row = el("div", "dc-row");
        row.appendChild(el("span", "dc-name", name));
        const state = el("span", "dc-state");
        row.appendChild(state);
        const act = el("span", "dc-act");
        row.appendChild(act);
        wrap.appendChild(row);
        if (!r) {
          state.textContent = LOCKED[name] || "NO BIOSIGNS";
          state.className = "dc-state " + (LOCKED[name] ? "dim" : "ok");
          return;
        }
        const barRow = el("div", "dc-progress");
        const bar = el("div", "dc-bar"), cap = el("div", "dc-cap");
        barRow.appendChild(bar); barRow.appendChild(cap);
        wrap.appendChild(barRow);
        function paint() {
          const sealed = flagOn("sealed_" + r.key), purged = flagOn("purge_" + r.key);
          act.innerHTML = "";
          row.className = "dc-row " + (purged ? "ok" : sealed ? "warn" : "crit");
          if (purged) { state.textContent = "PURGED. 0 BIOSIGNS"; state.className = "dc-state ok"; return; }
          state.textContent = r.bios + " BIOSIGNS. " + (sealed ? "SEALED" : "OPEN");
          state.className = "dc-state " + (sealed ? "warn" : "crit");
          const seal = el("button", "opt dc-btn", sealed ? "[ SEALED ]" : "[ SEAL ]");
          seal.type = "button"; seal.disabled = sealed || busy.on;
          seal.addEventListener("click", function (e) {
            e.stopPropagation();
            if (window.Ship) { Ship.flag("sealed_" + r.key, true); }
            paint();
          });
          const decon = el("button", "opt dc-btn decon", "[ DECONTAMINATE ]");
          decon.type = "button"; decon.disabled = !sealed || busy.on;
          decon.title = sealed ? "" : "Seal the compartment first";
          decon.addEventListener("click", function (e) {
            e.stopPropagation();
            if (busy.on) { return; }
            busy.on = true; seal.disabled = decon.disabled = true;
            barRow.classList.add("on");
            runBar(bar, cap, ["PRESSURE DOORS LOCKED", "FLOODING DECON AGENT", "BURNING ORGANICS", "SCANNING FOR BIOSIGNS", "VENTING TO SPACE"], 4200, function () {
              if (window.Ship) { Ship.flag("purge_" + r.key, true); }
              busy.on = false;
              cap.textContent = "+++ PURGE CONFIRMED. " + r.name + ": 0 BIOSIGNS +++";
              cap.classList.add("good");
              paint();
            });
          });
          act.appendChild(seal); act.appendChild(decon);
        }
        paint();
      });
    });
    const close = el("button", "opt dc-done", "[ DONE ]");
    close.type = "button";
    close.addEventListener("click", function (e) { e.stopPropagation(); done(); });
    wrap.appendChild(close);
    return wrap;
  }
  purge.title = "COMPARTMENT PURGE";

  function suppress(sys, opts) {
    const done = (opts && opts.done) || function () {};
    const wrap = el("section", "dc");
    const out = flagOn("fire_suppressed");
    wrap.appendChild(el("div", "dc-h", "Discharge suppressant into every compartment reporting fire."));
    const states = [];
    FIRE_ROOMS.forEach(function (f) {
      const row = el("div", "dc-row " + (out ? "ok" : "crit"));
      row.appendChild(el("span", "dc-name", f[1]));
      row.appendChild(el("span", "dc-deckname", f[0]));
      const st = el("span", "dc-state " + (out ? "ok" : "crit"), out ? "OUT. VENTING SMOKE" : "FIRE");
      row.appendChild(st);
      states.push([row, st]);
      wrap.appendChild(row);
    });
    const barRow = el("div", "dc-progress" + (out ? "" : ""));
    const bar = el("div", "dc-bar"), cap = el("div", "dc-cap");
    barRow.appendChild(bar); barRow.appendChild(cap);
    wrap.appendChild(barRow);
    const go = el("button", "opt dc-btn big", out ? "[ SUPPRESSION SPENT ]" : "[ DISCHARGE SUPPRESSION ]");
    go.type = "button"; go.disabled = out;
    go.addEventListener("click", function (e) {
      e.stopPropagation();
      go.disabled = true;
      barRow.classList.add("on");
      runBar(bar, cap, ["ARMING HALON BANKS", "DISCHARGING", "SMOTHERING FIRES", "CHECKING HEAT SENSORS"], 3600, function () {
        if (window.Ship) { Ship.flag("fire_suppressed", true); }
        states.forEach(function (s) { s[0].className = "dc-row ok"; s[1].className = "dc-state ok"; s[1].textContent = "OUT. VENTING SMOKE"; });
        cap.textContent = "+++ ALL FIRES OUT +++"; cap.classList.add("good");
        go.textContent = "[ SUPPRESSION SPENT ]";
      });
    });
    wrap.appendChild(go);
    const close = el("button", "opt dc-done", "[ DONE ]");
    close.type = "button";
    close.addEventListener("click", function (e) { e.stopPropagation(); done(); });
    wrap.appendChild(close);
    return wrap;
  }
  suppress.title = "FIRE SUPPRESSION";

  window.Repairs = { vox: vox, reactor: reactor, engines: true, enginePort: enginePort, engineStbd: engineStbd,
                     purge: purge, suppress: suppress, PURGE_ROOMS: PURGE_ROOMS, FIRE_ROOMS: FIRE_ROOMS };
})();
