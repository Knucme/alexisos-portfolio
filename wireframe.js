/* ===================================================================
   AlexisOS - wireframe.js
   A rotating 3D wireframe of the favicon robot (dome head, grille
   eyes, antenna disc, shoulders) drawn on a <canvas>, in the style of
   old vector telemetry displays. No libraries.

   Usage:  const stop = Wireframe.mount(canvasElement);
   The line color follows the CSS variable --amber, so it turns red
   in CONDITION CRITICAL and green in god mode automatically.
   =================================================================== */
(function () {
  "use strict";

  const TAU = Math.PI * 2;

  /* ---------- Model: a list of polylines in 3D (x right, y up, z out) ---------- */
  function ring(y, r, n, fromA, toA) {
    const pts = [];
    const a0 = fromA || 0, a1 = toA == null ? TAU : toA;
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n;
      pts.push([Math.sin(a) * r, y, Math.cos(a) * r]);
    }
    return pts;
  }

  function buildRobot() {
    const L = [];
    const HEAD_BOTTOM = -0.55, HEAD_TOP_SIDE = 0.3, R = 1;

    // Head: straight sides, then a dome
    [HEAD_BOTTOM, -0.12, HEAD_TOP_SIDE].forEach(function (y) { L.push(ring(y, R, 40)); });
    [25, 50, 72].forEach(function (deg) {
      const a = deg * Math.PI / 180;
      L.push(ring(HEAD_TOP_SIDE + Math.sin(a) * R, Math.cos(a) * R, 36));
    });
    for (let m = 0; m < 12; m++) {               // meridians over the dome
      const th = m / 12 * TAU;
      const pts = [];
      pts.push([Math.sin(th) * R, HEAD_BOTTOM, Math.cos(th) * R]);
      for (let k = 0; k <= 10; k++) {
        const a = k / 10 * Math.PI / 2;
        const r = Math.cos(a) * R;
        pts.push([Math.sin(th) * r, HEAD_TOP_SIDE + Math.sin(a) * R, Math.cos(th) * r]);
      }
      L.push(pts);
    }

    // Rim band at the base of the head
    L.push(ring(HEAD_BOTTOM - 0.02, 1.12, 40));
    L.push(ring(HEAD_BOTTOM - 0.2, 1.12, 40));
    for (let m = 0; m < 16; m++) {
      const th = m / 16 * TAU;
      L.push([[Math.sin(th) * 1.12, HEAD_BOTTOM - 0.02, Math.cos(th) * 1.12],
              [Math.sin(th) * 1.12, HEAD_BOTTOM - 0.2, Math.cos(th) * 1.12]]);
    }

    // Eyes: two ovals on the front of the head, with grille bars
    [-0.36, 0.36].forEach(function (cx) {
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24 * TAU;
        const th = cx + Math.cos(t) * 0.2;
        pts.push([Math.sin(th) * 1.01, -0.05 + Math.sin(t) * 0.25, Math.cos(th) * 1.01]);
      }
      L.push(pts);
      [-0.07, 0.07].forEach(function (off) {
        const th = cx + off;
        L.push([[Math.sin(th) * 1.01, -0.27, Math.cos(th) * 1.01],
                [Math.sin(th) * 1.01, 0.17, Math.cos(th) * 1.01]]);
      });
    });

    // Antenna: a stalk off the upper right of the dome, with a disc on top
    const base = [0.42, 1.18, 0.1];
    const tip = [0.7, 1.75, 0.15];
    L.push([base, tip]);
    const disc = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24 * TAU;
      disc.push([tip[0] + Math.cos(t) * 0.32, tip[1] + 0.08 + Math.sin(t) * 0.05, tip[2] + Math.sin(t) * 0.32]);
    }
    L.push(disc);

    // Neck, then shoulders as a flattened oval (wide side to side,
    // shallow front to back) so it reads as a bust, not a bell.
    L.push(ring(-0.78, 0.5, 28));
    L.push(ring(-0.95, 0.5, 28));
    const DEPTH = 0.55;
    const torso = [[-1.0, 0.75], [-1.12, 1.35], [-1.35, 1.62], [-1.75, 1.72]];
    torso.forEach(function (t) {
      L.push(ring(t[0], t[1], 40).map(function (p) { return [p[0], p[1], p[2] * DEPTH]; }));
    });
    for (let m = 0; m < 14; m++) {
      const th = m / 14 * TAU;
      L.push(torso.map(function (t) { return [Math.sin(th) * t[1], t[0], Math.cos(th) * t[1] * DEPTH]; }));
    }
    // Chest plate: a small panel on the front
    L.push([[-0.35, -1.25, 0.86], [0.35, -1.25, 0.86], [0.35, -1.6, 0.92], [-0.35, -1.6, 0.92], [-0.35, -1.25, 0.86]]);
    return L;
  }

  /* Orbit ring with tick marks under the robot (does not spin with it). */
  function buildOrbit() {
    const L = [ring(-2.05, 2.5, 64)];
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * TAU;
      const r1 = 2.5, r2 = i % 6 === 0 ? 2.75 : 2.62;
      L.push([[Math.sin(a) * r1, -2.05, Math.cos(a) * r1], [Math.sin(a) * r2, -2.05, Math.cos(a) * r2]]);
    }
    return L;
  }

  const ROBOT = buildRobot();
  const ORBIT = buildOrbit();

  /* ---------- Projection ---------- */
  function rotY(p, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
  }
  function rotX(p, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
  }

  function amber() {
    return (getComputedStyle(document.body).getPropertyValue("--amber") || "#ffb000").trim() || "#ffb000";
  }

  /* ---------- Draw ---------- */
  function mount(canvas) {
    const ctx = canvas.getContext && canvas.getContext("2d");
    if (!ctx) { return function () {}; }
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let color = amber();
    let lastColorCheck = 0;
    let raf = 0, last = 0, angle = 0.6, orbitAngle = 0;
    let stopped = false;

    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || 260, h = canvas.clientHeight || 260;
      if (canvas.width !== Math.round(w * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      return { w: canvas.width, h: canvas.height, dpr: dpr };
    }

    function drawSet(lines, spin, S, tilt, offX, stroke, alphaScale) {
      const scale = S.h / 4.9, cx = S.w / 2 + offX, cy = S.h / 2 + S.h * 0.02;
      const d = 7;
      // Sort segments into a few depth buckets (back = dim, front = bright)
      // and stroke each bucket as one path. Much faster than one stroke
      // per segment, especially with the glow on.
      const BUCKETS = 5;
      const paths = [];
      for (let b = 0; b < BUCKETS; b++) { paths.push([]); }
      lines.forEach(function (poly) {
        let prev = null;
        for (let i = 0; i < poly.length; i++) {
          const r = rotX(rotY(poly[i], spin), tilt);
          const k = d / (d - r[2]);
          const pt = [cx + r[0] * scale * k, cy - r[1] * scale * k, r[2]];
          if (prev) {
            const z = (prev[2] + pt[2]) / 2;           // about -2.5 (back) .. 2.5 (front)
            const b = Math.max(0, Math.min(BUCKETS - 1, Math.floor((z + 2.5) / 5 * BUCKETS)));
            paths[b].push(prev[0], prev[1], pt[0], pt[1]);
          }
          prev = pt;
        }
      });
      ctx.strokeStyle = stroke;
      for (let b = 0; b < BUCKETS; b++) {
        const segs = paths[b];
        if (!segs.length) { continue; }
        ctx.globalAlpha = alphaScale * (0.2 + 0.8 * b / (BUCKETS - 1));
        ctx.beginPath();
        for (let i = 0; i < segs.length; i += 4) {
          ctx.moveTo(segs[i], segs[i + 1]);
          ctx.lineTo(segs[i + 2], segs[i + 3]);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function frame(now) {
      if (stopped) { return; }
      if (!canvas.isConnected) { stop(); return; }
      if (now - lastColorCheck > 500) { color = amber(); lastColorCheck = now; }
      const dt = last ? Math.min(now - last, 100) : 16;
      last = now;
      if (!reduce) {
        angle += dt * 0.00045;          // about one turn every 14 seconds
        orbitAngle -= dt * 0.00012;
      }
      const S = size();
      ctx.clearRect(0, 0, S.w, S.h);
      ctx.lineWidth = Math.max(1, S.dpr * 0.9);
      ctx.lineCap = "round";
      const tilt = -0.42 + Math.sin(angle * 0.7) * 0.04;
      const fringe = S.dpr * 1.2;

      // Faint red / blue offset passes, like convergence error on an old CRT
      ctx.shadowBlur = 0;
      drawSet(ROBOT, angle, S, tilt, -fringe, "rgba(255, 70, 70, 1)", 0.22);
      drawSet(ROBOT, angle, S, tilt, fringe, "rgba(90, 170, 255, 1)", 0.22);
      // Main phosphor pass with glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 6 * S.dpr;
      drawSet(ORBIT, orbitAngle, S, tilt, 0, color, 0.7);
      drawSet(ROBOT, angle, S, tilt, 0, color, 1);
      ctx.shadowBlur = 0;

      if (!reduce) { raf = requestAnimationFrame(frame); }
    }

    function stop() {
      stopped = true;
      if (raf) { cancelAnimationFrame(raf); }
    }

    raf = requestAnimationFrame(frame);
    return stop;
  }

  window.Wireframe = { mount: mount };
})();
