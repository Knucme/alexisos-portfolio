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
    b.addEventListener("click", function (e) { e.stopPropagation(); fn(); });
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
    // Start well off target. Steps are chosen so the exact match is reachable.
    const state = { amp: 1.7, freq: 1.75, phase: 105 };
    const SPEC = [
      { key: "phase", label: "AZIMUTH",   unit: "°", min: -180, max: 180, step: 15,   fmt: function (v) { return (v > 0 ? "+" : "") + v + "°"; } },
      { key: "amp",   label: "ELEVATION", unit: "",       min: 0.2,  max: 2.0, step: 0.1,  fmt: function (v) { return v.toFixed(1); } },
      { key: "freq",  label: "FEED RATE", unit: "",       min: 0.5,  max: 2.0, step: 0.25, fmt: function (v) { return v.toFixed(2); } }
    ];
    const sliders = [];
    SPEC.forEach(function (sp) {
      const row = el("label", "rp-ctrl");
      row.appendChild(el("span", "rp-ctrl-l", sp.label));
      const input = document.createElement("input");
      input.type = "range"; input.min = sp.min; input.max = sp.max; input.step = sp.step;
      input.value = state[sp.key];
      input.disabled = true;
      input.setAttribute("aria-label", sp.label);
      const val = el("span", "rp-ctrl-v", sp.fmt(state[sp.key]));
      input.addEventListener("input", function () {
        state[sp.key] = parseFloat(input.value);
        val.textContent = sp.fmt(state[sp.key]);
        update();
      });
      input.addEventListener("click", function (e) { e.stopPropagation(); });
      row.appendChild(input);
      row.appendChild(val);
      ctrls.appendChild(row);
      sliders.push(input);
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
      if (!powered() || locked) { return; }
      if (q >= 0.98) {
        locked = true;
        sliders.forEach(function (s) { s.disabled = true; });
        calMsg.className = "line rp-ok rp-msg";
        calMsg.textContent = "+++ CARRIER LOCKED. VOX ARRAY RESTORED. +++";
        wrap.classList.add("rp-won");
        if (window.Ship) { Ship.repair("vox"); }
        setTimeout(done, 2600);
      } else if (q >= 0.8) {
        calMsg.className = "line rp-msg"; calMsg.textContent = "CLOSE. FINE TUNE THE DISH.";
      } else {
        calMsg.className = "line dim rp-msg"; calMsg.textContent = "Match the live signal to the dashed carrier wave.";
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

  window.Repairs = { vox: vox, reactor: reactor, engines: true, enginePort: enginePort, engineStbd: engineStbd };
})();
