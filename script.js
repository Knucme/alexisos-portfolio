/* ===================================================================
   AlexisOS // Cogitator Terminal - script.js
   The terminal engine: boot sequence, screens, menus, typed commands.

   All CONTENT lives in content.js (PROFILE, SERVICE, PROJECTS, BLOGS,
   VIDEOS, GAMES). This file only decides how it is presented.

   HOW IT WORKS
   - Output is printed line by line through a small queue so it "types"
     onto the screen. Any key press or click skips to the end.
   - Each screen is a function. go(screen) clears the display and draws
     it; back() returns to the previous screen.
   - Menu options are clickable [n] buttons, and typing the same number
     at the prompt does the same thing.
   - Typed words (HELP, BLOG, RESUME, ...) are handled by COMMANDS.
   =================================================================== */

(function () {
  "use strict";

  /* ----------------------------------------------------------------
     ELEMENTS + ENVIRONMENT
     ---------------------------------------------------------------- */
  const out     = document.getElementById("output");
  const input   = document.getElementById("cmd");
  const form    = document.getElementById("prompt-line");
  const tickerEl = document.getElementById("ticker");
  const clockEl  = document.getElementById("clock");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer  = window.matchMedia("(pointer: fine)").matches;

  const LINE_DELAY = 12;   // ms between printed lines on normal screens

  /* ----------------------------------------------------------------
     OUTPUT QUEUE (the "typing" effect)
     Each queued item is either a DOM node to append, or a function to
     run once everything before it has printed.
     ---------------------------------------------------------------- */
  let queue = [];
  let timer = null;
  let autoScroll = false;     // true = keep scrolled to the newest line

  function enqueue(item, delay) {
    queue.push({ item: item, delay: delay == null ? LINE_DELAY : delay });
    if (!timer) {
      pump();
    }
  }

  function place(item) {
    if (typeof item === "function") {
      item();
    } else {
      out.appendChild(item);
    }
  }

  function pump() {
    if (!queue.length) {
      timer = null;
      return;
    }
    const next = queue.shift();
    place(next.item);
    if (autoScroll) {
      out.scrollTop = out.scrollHeight;
    }
    timer = setTimeout(pump, reduceMotion ? 0 : next.delay);
  }

  /* Print everything still waiting, immediately. */
  function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    while (queue.length) {
      place(queue.shift().item);
    }
    if (autoScroll) {
      out.scrollTop = out.scrollHeight;
    }
  }

  /* Throw away anything still waiting (used when changing screens). */
  function cancel() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    queue = [];
  }

  function busy() {
    return queue.length > 0;
  }

  /* ----------------------------------------------------------------
     OUTPUT BUILDERS
     ---------------------------------------------------------------- */
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text != null) { e.textContent = text; }
    return e;
  }

  function line(text, cls)  { enqueue(el("div", "line" + (cls ? " " + cls : ""), text)); }
  function para(text, cls)  { enqueue(el("div", "para" + (cls ? " " + cls : ""), text)); }
  function blank()          { enqueue(el("div", "line", " ")); }
  function rule()           { enqueue(el("div", "rule")); }
  function sect(text)       { enqueue(el("div", "sect", "== " + text.toUpperCase() + " ==")); }
  function item(text)       { enqueue(el("div", "li", "- " + text)); }

  function header(path) {
    enqueue(el("div", "line h", ">> " + path.toUpperCase()));
    rule();
  }

  /* "LABEL ......... value" with the value as a link. */
  function linkLine(label, href, text) {
    const row = el("div", "line");
    row.appendChild(document.createTextNode(label));
    const a = el("a", null, text);
    a.href = href;
    if (!href.startsWith("mailto:")) {
      a.target = "_blank";
      a.rel = "noopener";
    }
    row.appendChild(a);
    enqueue(row);
  }

  /* Pad a label with dots to a fixed width, like a status readout. */
  function dots(label, width) {
    const w = width || 18;
    let s = label + " ";
    while (s.length < w) { s += "."; }
    return s + " ";
  }

  /* ----------------------------------------------------------------
     MENUS
     option(key, label, action, hint) prints a clickable [key] LABEL
     and registers the key so typing it at the prompt does the same.
     ---------------------------------------------------------------- */
  let menu = {};

  function option(key, label, action, hint) {
    menu[String(key).toLowerCase()] = action;
    const row = el("div", "opt-row");
    const btn = el("button", "opt", "[" + key + "] " + label);
    btn.type = "button";
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      run(action);
    });
    row.appendChild(btn);
    if (hint) {
      row.appendChild(el("span", "dim", hint));
    }
    enqueue(row);
  }

  function backOption() {
    option(0, "RETURN", back, "or press ESC");
  }

  function run(action) {
    flush();
    action();
    if (finePointer) {
      input.focus();
    }
  }

  /* ----------------------------------------------------------------
     SCREEN NAVIGATION
     ---------------------------------------------------------------- */
  let stack = [];          // previous screens, for BACK
  let current = null;      // { fn, args }

  function render() {
    cancel();
    out.innerHTML = "";
    out.scrollTop = 0;
    autoScroll = false;
    menu = {};
    current.fn.apply(null, current.args);
  }

  /* Open a screen and remember the one we came from. */
  function go(fn, args) {
    if (current) {
      stack.push(current);
    }
    current = { fn: fn, args: args || [] };
    render();
  }

  /* Swap the current screen without adding to history (next/prev log). */
  function swap(fn, args) {
    current = { fn: fn, args: args || [] };
    render();
  }

  function back() {
    if (stack.length) {
      current = stack.pop();
      render();
    } else {
      home();
    }
  }

  function home() {
    stack = [];
    current = { fn: mainMenu, args: [] };
    render();
  }

  /* ----------------------------------------------------------------
     EMBEDS
     ---------------------------------------------------------------- */

  /* Accepts a Vimeo ID, "id/hash", or a full vimeo.com URL. */
  function vimeoEmbedUrl(v) {
    let s = String(v).replace(/^https?:\/\/(www\.)?(player\.)?vimeo\.com\/(video\/)?/, "");
    if (s.indexOf("?h=") !== -1) {
      const parts = s.split("?h=");
      return "https://player.vimeo.com/video/" + parts[0] + "?h=" + parts[1].split(/[?&#]/)[0];
    }
    const bits = s.split("/");
    return "https://player.vimeo.com/video/" + bits[0] + (bits[1] ? "?h=" + bits[1] : "");
  }

  function feed(src, title, extraClass) {
    const wrap = el("div", "feed" + (extraClass ? " " + extraClass : ""));
    const frame = document.createElement("iframe");
    frame.src = src;
    frame.title = title;
    frame.setAttribute("allowfullscreen", "");
    frame.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
    wrap.appendChild(frame);
    return wrap;
  }

  /* ----------------------------------------------------------------
     SCREENS
     ---------------------------------------------------------------- */

  /* The robot emblem, as braille art. Each braille character holds a
     2 x 4 grid of dots; brailleToCanvas() decodes them into pixels and
     draws the result on a small canvas so it can be scaled to any size
     without depending on how a font renders braille. */
  const EMBLEM = `
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢤⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠉⠙⠲⣤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⠶⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⠚⠉⠙⠒⠲⠤⣀⡉⠲⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⠞⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢦⣀⣀⠀⠀⠀⠈⠙⣆⠈⢷⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣼⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢦⡀⠀⠀⢸⠀⠀⠹⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⢠⡞⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⠲⠖⠋⠀⠀⠀⢹⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢀⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣼⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢀⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢸⠀⠀⠀⠀⠀⢀⣀⣤⠴⠶⠛⠛⣋⡉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⣹⡛⠛⠛⠷⠶⢦⣤⣤⣀⡀⠀⠀⢸⠆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢸⠀⣀⣤⠶⣛⠉⠉⠀⠀⠀⠀⠀⠿⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠛⠃⠀⠀⠀⠀⠀⠀⠈⠉⣙⠛⠷⣾⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢸⡟⠉⠀⠘⠿⠃⠀⣀⣀⣤⠤⠤⠤⠶⠶⠶⠖⠒⠒⠛⠛⠛⠉⠉⠉⠛⠛⠓⠛⠒⠒⠶⢤⣌⣉⠀⠀⣸⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠘⣧⣤⡤⠶⠚⠋⠉⠉⠁⠀⠀⠀⠀⠀⢀⣀⣀⣀⣤⣤⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⣛⣷⡿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠙⠛⠿⢶⣦⣤⣀⣀⠀⠀⠀⠀⠰⣿⠋⠉⠀⠀⠀⠀⠈⠉⠹⣷⠀⠀⣀⣀⣀⣠⣤⣴⠶⠾⠛⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠉⠉⠛⠛⠛⠛⠛⠲⣿⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣭⣭⡭⠭⡖⠒⠚⣗⣻⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢀⣀⣀⣀⣀⣤⣤⣤⣶⠶⠶⠾⠛⠛⠛⠒⠒⠒⠋⠉⠉⠉⠉⠉⠉⠉⠉⠁⠀⠀⠀⠀⠀⠀⣿⠈⠻⢷⣦⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢸⣿⠉⠉⠉⠉⠉⠁⠀⣹⠶⠆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⡏⠀⠀⠀⠙⠻⣷⣤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢸⣿⠀⠀⠀⠀⠀⠀⠀⢹⠆⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡇⠀⠀⠀⠀⠀⠈⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⢸⣿⠀⠀⠀⠀⠀⠀⠀⢸⡇⠋⠀⠀⠀⠀⢀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡇⠀⠀⠀⠀⠀⠀⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⣠⡴⠾⠛⠛⠷⣤⡀⠀⠀⠀⠀⢸⡇⠶⠀⠀⢀⣴⠟⠉⠉⠉⠻⣦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡇⠀⠀⠀⠀⠀⠀⡿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⢠⡾⠋⠀⠀⠀⠀⠀⠈⢿⣆⠀⣠⣤⣾⠷⢤⣄⢀⡟⠁⠀⠀⠀⠀⠀⠘⣧⣴⠾⠛⢿⡛⠳⣄⠀⠀⠀⠀⣸⡁⠀⠀⠀⠀⠀⠀⢿⡗⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⢸⡇⠀⠀⠀⢀⣁⠀⠀⣀⠙⠿⠿⢤⠙⣷⠀⠙⢿⠁⠀⠀⠀⢈⣳⠄⠀⠈⠙⠖⢦⡈⣷⠀⣿⠉⣍⡉⠉⢹⡏⢓⠒⠶⠲⠦⠤⢼⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⢸⣇⠀⠀⠀⠀⠤⠒⠋⠁⠀⣀⣀⣼⠇⣿⠀⠀⣸⡄⠀⠀⠀⠀⠘⠀⠀⣠⣤⠶⠛⢠⣿⣴⠟⠀⠉⠁⠀⢸⡇⠛⠃⠀⠛⠀⠶⢚⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠹⣦⣀⠀⠀⠀⠀⢀⣴⠟⠉⠹⢷⣾⠧⠶⠞⠋⠻⣦⣀⣀⣀⣀⡴⠞⠉⠙⢻⠛⠛⠋⠁⠀⠀⠀⠀⠀⠘⡇⠀⠀⠀⠀⠀⠀⠐⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠈⠙⠻⠶⠶⣾⠋⠁⠀⠀⠀⠀⠀⠀⢠⡀⢀⣦⣤⣭⡿⣯⣅⠀⠀⠀⠀⢸⠀⣴⣦⠀⠀⠀⠀⠀⠀⠀⡇⠀⠀⠀⠀⠀⠀⠀⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢸⣿⠀⠀⠀⣴⠿⣶⠿⣿⠟⢿⡛⢹⡏⢻⣿⡾⢿⡆⠀⠀⠀⢸⠀⠘⠁⠀⠀⠀⠀⠀⠀⠀⣿⠀⠀⠀⠀⠀⠀⠀⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠈⣿⡤⣤⠾⢿⣤⣿⣦⣼⠿⢿⠿⢿⣟⣿⣿⢷⣾⠃⠀⠀⠀⢸⠀⢾⡷⠀⠀⠀⠀⠀⠀⠀⡿⠀⠀⠀⠀⠀⠀⠀⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⣿⣇⠛⠈⠛⠈⠀⠀⢿⣀⣀⣤⣤⣿⣿⣟⣿⣥⣀⣀⠀⠀⢸⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣇⠀⠀⠀⠀⠀⠀⠀⢿⣇⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⢿⣿⠀⠀⠀⠀⢀⡿⢋⣥⠴⠒⠛⡟⠉⠉⢹⡟⠲⢬⣍⣛⠾⢧⡸⠗⠀⠀⣤⣄⠀⠀⠀⣟⢀⠀⡴⠶⢶⡶⡶⢺⣿⣟⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⢠⣾⠛⢿⠻⣿⠀⠀⢀⡴⣫⡞⠉⢸⠀⠀⠀⣿⠀⠀⠈⣇⠀⠀⠀⢿⠛⠶⣍⡳⣄⣀⣉⣁⣀⣀⣀⣿⣨⠥⢷⣄⣸⣼⣧⣸⣏⣿⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠻⠷⢾⣶⣿⠀⢰⠏⠾⠥⠿⠤⠼⠷⠲⠤⠾⠲⠶⠶⠿⠴⠢⠤⠞⠓⠶⠶⠿⠈⢻⡄⠀⠀⠀⠀⣿⠀⠀⠀⠀⠀⣀⣿⣿⡏⠋⠀⠀⠀⠀⣀⣠⣀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⢸⢰⡿⣇⠈⠉⠛⠛⣶⣟⣏⠛⠛⠙⠋⠉⠉⠉⠉⠉⠉⠙⠉⠉⠉⠉⠛⠉⠉⠁⠀⠀⠀⠀⣿⣀⣤⡶⠞⠛⠉⢹⣿⣇⢀⣀⣠⣴⡟⢋⣿⣌⢻⣆⠀⠀
⠀⠀⠀⠀⠀⠀⣼⢸⡇⢏⠉⠉⠉⣩⡙⣏⠉⠉⠉⠉⣿⡯⠭⣿⡟⠋⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠛⠛⠋⠉⣿⠁⠀⠀⢀⣤⠶⣿⣷⣿⣉⠉⢱⡿⢰⡿⠁⠈⢿⣹⣆⠀
⠀⠀⠀⠀⠀⠀⣿⣾⢁⣸⠀⠀⠀⠙⠁⣿⠀⠀⠀⠀⠈⠻⣾⠋⠀⠀⠀⠀⠀⠀⠀⢀⠀⢀⣀⠀⠀⠀⠀⠀⣸⠀⠀⢀⣾⣧⣤⣿⣿⣿⣿⣦⣼⡇⢸⡇⠀⠀⢸⣷⣿⠀
⠀⠀⠀⠀⠀⢠⣿⣿⣼⣿⡷⠶⠶⠖⠦⣽⠶⠶⠯⠶⠶⣶⠟⣶⠒⠶⠾⠟⠛⠛⠛⣿⢻⣿⠛⣿⡟⠛⣿⠿⢷⠛⠛⠋⠛⣦⣿⣻⣯⣽⡟⢿⡞⣷⠘⣿⡄⠀⢸⣿⣿⠁
⠀⠀⠀⠀⠀⢻⣿⣿⡏⣿⡇⠀⠀⠀⡀⢻⡦⣤⠤⠤⢾⣇⠀⢈⡷⠤⠤⠤⠤⠴⠶⣿⠀⠀⠀⠈⠀⠀⠈⠀⢸⡇⠀⠀⠀⠀⠉⣹⡇⣿⠛⠛⠛⠻⢷⡈⠻⠶⢟⣾⠏⠀
⠀⠀⠀⠀⠀⠀⢹⣿⠀⣿⣇⣀⢀⣸⣟⣸⡇⠀⠀⠀⠀⠙⠷⠟⠁⠀⠀⠀⠀⠀⠀⢻⡄⠻⠀⠀⠀⠀⠀⠀⢈⣷⣠⣴⣶⠾⠟⢻⣿⣿⣦⠀⠀⠀⠀⠙⠓⠲⠟⠋⠀⠀
⠀⠀⠀⠀⠀⢀⣿⢿⡀⠘⠛⠻⠿⠿⠿⠿⠿⣿⣿⠿⠿⠿⢷⡞⢿⡖⠛⠿⠟⠛⠛⠛⠛⠛⠛⠻⢿⢻⡿⠿⠿⠛⠋⠉⠀⢠⣴⢿⣿⣿⣿⢷⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢀⣶⠟⡋⢁⢈⡛⢶⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡇⢸⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣘⣿⡀⠀⠀⠀⠀⢰⡟⠀⣾⠋⠉⢹⡆⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢸⡇⣸⡇⣼⢸⡇⢸⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⣷⠾⣹⡇⠀⠀⠀⠀⠀⠀⠀⠀⢠⡿⠿⠷⣧⠀⠀⠀⠀⢸⣇⢠⣇⠀⠀⠀⣷⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⣿⠀⣿⠁⣿⢸⡇⢸⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡇⠉⠉⠉⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⡇⠀⠀⣿⠀⠀⠀⠀⠀⠻⣦⣿⣄⠀⢰⡿⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⣿⢀⡿⠠⠟⢸⠇⣼⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡇⠀⠀⠀⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⢳⠀⠀⢹⣦⣀⢀⡀⠀⠀⠈⠙⠛⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠙⠻⠶⠶⠶⠶⠾⠋⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣤⣴⣿⠀⠀⠀⢹⣆⠀⠀⠀⢀⣀⣤⣶⡾⣿⣄⣠⣿⣿⣿⣿⣷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣤⣤⣴⠶⠿⠛⠋⠉⠈⠻⣴⣶⣶⣿⣿⣰⣶⣾⣟⠛⠉⠀⠀⢈⣹⣿⠿⠿⣿⣿⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣷⣶⣤⣤⣤⣶⡿⠟⠛⣿⣿⣿⢹⣿⣿⣿⣿⣶⣶⣶⣿⣿⠀⢀⣠⣿⡿⠟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⣿⣿⣿⣿⣿⢿⣿⡿⢀⣠⣴⣿⠟⠋⠀⣿⣿⣿⣿⣿⣏⣿⣯⣽⣾⠿⠛⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠉⠛⠻⠿⣿⣿⣷⣾⠿⠛⠉⠀⠀⠀⠀⠉⠉⠉⠙⠛⠛⠿⠟⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
`;

  /* Decode braille art into a cropped canvas (one braille dot = one
     pixel). CSS then scales it down to fit the banner. */
  function brailleToCanvas(art, color) {
    const BITS = [[0, 0, 1], [0, 1, 2], [0, 2, 4], [1, 0, 8],
                  [1, 1, 16], [1, 2, 32], [0, 3, 64], [1, 3, 128]];
    const dotsOn = [];
    let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
    art.split("\n").filter(function (l) { return l.length; }).forEach(function (row, r) {
      Array.from(row).forEach(function (ch, c) {
        const v = ch.codePointAt(0) - 0x2800;
        if (v <= 0 || v > 255) { return; }
        BITS.forEach(function (b) {
          if (v & b[2]) {
            const x = c * 2 + b[0];
            const y = r * 4 + b[1];
            dotsOn.push([x, y]);
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          }
        });
      });
    });
    const canvas = document.createElement("canvas");
    canvas.className = "emblem";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Cogitator robot emblem");
    canvas.width = maxX - minX + 1;
    canvas.height = maxY - minY + 1;
    const ctx = canvas.getContext && canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = color;
      dotsOn.forEach(function (d) { ctx.fillRect(d[0] - minX, d[1] - minY, 1, 1); });
    }
    return canvas;
  }

  function mainMenu() {
    const banner = el("div", "banner");
    const row = el("div", "banner-row");
    row.appendChild(brailleToCanvas(EMBLEM, "#ffb000"));
    const text = el("div");
    text.appendChild(el("div", "h", "ALEXIS//OS  COGITATOR NODE 7-ALPHA"));
    text.appendChild(el("div", "dim", "VESSEL: VIGIL OF ASH  |  STATUS: DERELICT  |  CREW: 0  |  VISITORS: 1"));
    text.appendChild(el("div", "dim", "OPERATOR ON RECORD: " + PROFILE.name.toUpperCase()));
    row.appendChild(text);
    banner.appendChild(row);
    enqueue(banner);

    para("You have reached the personal data-stacks of " + PROFILE.name +
         ", " + PROFILE.title + ". The crew is gone. The archive is intact.");
    blank();
    option(1, "OPERATOR DOSSIER",    function () { go(dossier); },  "about me");
    option(2, "FABRICATION RECORDS", function () { go(projects); }, "projects");
    option(3, "DATA-LOGS",           function () { go(logs); },     "blog");
    option(4, "PICT-RECORDINGS",     function () { go(videos); },   "videos");
    option(5, "SIMULATIONS",         function () { go(games); },    "games");
    option(6, "SERVICE RECORD",      function () { go(service); },  "resume");
    option(7, "VOX-CHANNELS",        function () { go(vox); },      "contact");
    blank();
    line("Click an option, or type its number and press ENTER. HELP lists all commands.", "dim");
  }

  function dossier() {
    header("Operator Dossier // About");
    line(dots("DESIGNATION") + PROFILE.name);
    line(dots("FUNCTION") + PROFILE.title);
    line(dots("LAST KNOWN LOC") + PROFILE.location);
    line(dots("PRIOR SERVICE") + "US Navy, Master-at-Arms, 8 years");
    blank();
    PROFILE.intro.forEach(function (p) { para(p); });
    blank();
    option(1, "FABRICATION RECORDS", function () { go(projects); }, "projects");
    option(2, "DATA-LOGS",           function () { go(logs); },     "blog");
    option(3, "SERVICE RECORD",      function () { go(service); },  "resume");
    option(4, "VOX-CHANNELS",        function () { go(vox); },      "contact");
    backOption();
  }

  /* ---------- Projects ---------- */
  function projects() {
    header("Fabrication Records // Projects");
    Object.keys(PROJECTS).forEach(function (id, i) {
      option(i + 1, PROJECTS[id].name, function () { go(project, [id]); }, PROJECTS[id].tech);
    });
    blank();
    backOption();
  }

  function project(id) {
    const p = PROJECTS[id];
    header("Fabrication Records // " + p.name);
    line(dots("TECH") + p.tech);
    if (p.github) {
      linkLine(dots("REPOSITORY"), "https://github.com/" + p.github, "github.com/" + p.github);
    } else {
      line(dots("REPOSITORY") + "NOT YET LINKED", "dim");
    }
    blank();
    para(p.description);
    blank();
    if (p.github) {
      option(1, "QUERY LIVE REPOSITORY DATA", function () { queryRepo(p.github); }, "via GitHub API");
    }
    backOption();
  }

  function queryRepo(repo) {
    autoScroll = true;
    blank();
    line("TRANSMITTING QUERY TO NOOSPHERE NODE api.github.com ...", "dim");
    fetch("https://api.github.com/repos/" + repo)
      .then(function (res) {
        if (!res.ok) { throw new Error("status " + res.status); }
        return res.json();
      })
      .then(function (d) {
        line(dots("DESCRIPTION") + (d.description || "(none)"));
        line(dots("LANGUAGE") + (d.language || "(not set)"));
        line(dots("STARS") + d.stargazers_count);
        line(dots("FORKS") + d.forks_count);
        line(dots("LAST UPDATED") + new Date(d.pushed_at).toLocaleDateString());
      })
      .catch(function (err) {
        line("QUERY FAILED (" + err.message + "). REPOSITORY MAY BE PRIVATE OR MISSING.", "alert");
      });
  }

  /* ---------- Blog (data-logs) ---------- */
  function logs() {
    header("Data-Logs // Blog");
    para("Writeups on real tech problems I've solved, and LeetCode problems worth explaining.");
    blank();
    Object.keys(BLOGS).forEach(function (c, i) {
      const n = BLOGS[c].posts.length;
      option(i + 1, BLOGS[c].name.toUpperCase(), function () { go(logIndex, [c]); },
             n + " log" + (n === 1 ? "" : "s"));
    });
    blank();
    backOption();
  }

  function logIndex(c) {
    const cat = BLOGS[c];
    header("Data-Logs // " + cat.name);
    if (cat.description) { para(cat.description, "dim"); }
    if (!cat.posts.length) {
      line("NO ENTRIES RECOVERED FROM THIS SECTOR. CHECK BACK LATER.", "alert");
    }
    cat.posts.forEach(function (p, i) {
      option(i + 1, p.title, function () { go(readLog, [c, i]); }, p.date);
      if (p.excerpt) {
        enqueue(el("div", "para excerpt dim", p.excerpt));
      }
    });
    blank();
    backOption();
  }

  function readLog(c, i) {
    const cat = BLOGS[c];
    const p = cat.posts[i];
    header("Data-Logs // " + cat.name + " // " + (i + 1) + " of " + cat.posts.length);
    enqueue(el("div", "line title", p.title));
    if (p.subtitle) { line(p.subtitle, "dim"); }
    line([p.date].concat(p.tags || []).join("  |  "), "dim");
    blank();
    if (p.vimeo) {
      enqueue(feed(vimeoEmbedUrl(p.vimeo), p.title));
    }
    p.content.forEach(function (b) {
      if (b.h3) {
        sect(b.h3);
      } else if (b.p) {
        para(b.p);
      } else if (b.ul) {
        b.ul.forEach(item);
      }
    });
    blank();
    line("-- END OF LOG --", "dim");
    blank();
    if (i + 1 < cat.posts.length) {
      option(1, "NEXT LOG", function () { swap(readLog, [c, i + 1]); }, cat.posts[i + 1].title);
    }
    if (i > 0) {
      option(2, "PREVIOUS LOG", function () { swap(readLog, [c, i - 1]); }, cat.posts[i - 1].title);
    }
    option(0, "RETURN TO INDEX", back, "or press ESC");
  }

  /* ---------- Videos (pict-recordings) ---------- */
  function videos() {
    header("Pict-Recordings // Videos");
    Object.keys(VIDEOS).forEach(function (c, i) {
      const n = VIDEOS[c].videos.length;
      option(i + 1, VIDEOS[c].name.toUpperCase(), function () { go(videoList, [c]); },
             n + " recording" + (n === 1 ? "" : "s"));
    });
    blank();
    backOption();
  }

  function videoList(c) {
    const cat = VIDEOS[c];
    header("Pict-Recordings // " + cat.name);
    if (cat.description) { para(cat.description, "dim"); }
    if (!cat.videos.length) {
      line("NO PICT-RECORDINGS FOUND. TRANSMISSIONS PENDING.", "alert");
    }
    cat.videos.forEach(function (v) {
      enqueue(el("div", "line title", v.title));
      if (v.description) { para(v.description, "dim"); }
      enqueue(feed(vimeoEmbedUrl(v.vimeo), v.title));
    });
    blank();
    backOption();
  }

  /* ---------- Games (simulations) ---------- */
  function games() {
    header("Simulations // Games");
    GAMES.forEach(function (g, i) {
      option(i + 1, g.name.toUpperCase(), function () { go(game, [i]); },
             g.type === "doom" ? "playable" : "not yet compiled");
    });
    blank();
    backOption();
  }

  function game(i) {
    const g = GAMES[i];
    header("Simulations // " + g.name);
    if (g.type === "doom") {
      para("Combat simulation loaded from the Internet Archive (shareware episode). " +
           "Click into the feed to start. Arrow keys move, Ctrl fires. " +
           "The player has its own fullscreen button.", "dim");
      enqueue(feed("https://archive.org/embed/" + DOOM_ARCHIVE_ID, "Doom", "doom"));
    } else {
      line("SIMULATION NOT YET COMPILED.", "alert");
      blank();
      para(g.description);
    }
    blank();
    backOption();
  }

  /* ---------- Resume (service record) ---------- */
  function service() {
    header("Service Record // Resume");
    enqueue(el("div", "line title", PROFILE.name));
    line(PROFILE.title, "dim");
    blank();
    option(1, "OPEN FULL SERVICE RECORD (PDF)",
           function () { window.open(PROFILE.resumePage, "_blank", "noopener"); },
           "opens in a new tab");
    sect("Education");
    SERVICE.education.forEach(item);
    sect("Skills");
    SERVICE.skills.forEach(function (s) { line(s); });
    sect("Experience");
    SERVICE.experience.forEach(function (s) { line(s); });
    blank();
    backOption();
  }

  /* ---------- Contact (vox-channels) ---------- */
  function strip(url) {
    return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  }

  function vox() {
    header("Vox-Channels // Contact");
    para("Vox relay is functional. Messages will reach the operator.");
    blank();
    linkLine(dots("EMAIL"), "mailto:" + PROFILE.email, PROFILE.email);
    linkLine(dots("GITHUB"), PROFILE.github, strip(PROFILE.github));
    linkLine(dots("LINKEDIN"), PROFILE.linkedin, strip(PROFILE.linkedin));
    blank();
    backOption();
  }

  /* ---------- Vessel status ---------- */
  const loadedAt = Date.now();

  function status() {
    header("Vessel Status");
    const mins = Math.floor((Date.now() - loadedAt) / 60000);
    line(dots("VESSEL", 22) + "VIGIL OF ASH");
    line(dots("HULL INTEGRITY", 22) + "31%");
    line(dots("REACTOR", 22) + "STANDBY 4%");
    line(dots("GELLER FIELD", 22) + "OFFLINE", "alert");
    line(dots("LIFE SIGNS", 22) + "1 (YOU)");
    line(dots("MACHINE SPIRIT", 22) + "RESTLESS");
    line(dots("SESSION UPTIME", 22) + mins + " MIN");
    line(dots("AUSPEX", 22) + "UNKNOWN BIOSIGNS, AFT CARGO", "alert");
    blank();
    backOption();
  }

  /* ---------- Help ---------- */
  const HELP = [
    ["MENU",        "main menu"],
    ["BACK  or 0",  "previous screen (ESC also works)"],
    ["ABOUT",       "operator dossier"],
    ["PROJECTS",    "fabrication records"],
    ["BLOG",        "data-logs (also: BLOG TECH, BLOG LEETCODE)"],
    ["VIDEOS",      "pict-recordings"],
    ["GAMES",       "simulations (DOOM launches directly)"],
    ["RESUME",      "service record"],
    ["CONTACT",     "vox-channels"],
    ["STATUS",      "vessel status"],
    ["CLEAR",       "purge the screen"],
    ["REBOOT",      "replay the boot sequence"]
  ];

  function help() {
    header("Help // Command Litany");
    HELP.forEach(function (h) {
      let name = h[0];
      while (name.length < 14) { name += " "; }
      line(name + h[1]);
    });
    blank();
    para("You can also click any [bracketed] option, use the PF keys along the bottom, " +
         "and press the up arrow to recall earlier commands.", "dim");
    backOption();
  }

  /* ----------------------------------------------------------------
     BOOT SEQUENCE
     Modelled loosely on a BIOS power-on self test, then a cogitator
     waking up on a ship that has been dark for a long time.
     ---------------------------------------------------------------- */
  const BOOT_FULL = [
    ["ALEXIS//OS COGITATOR BIOS v2.0.26", "", 120],
    ["(C) FORGE SHIPWRIGHTS. LICENSED TO: VIGIL OF ASH", "dim", 120],
    [" ", "", 80],
    ["MEMORY TEST ..................... 0065536K OK", "", 260],
    ["DETECTING DATA-STACKS ........... 4 FOUND, 1 CORRUPTED", "", 260],
    ["PICT-FEED ARRAY ................. 2 CHANNELS", "", 140],
    [" ", "", 60],
    ["INVOKING RITE OF AWAKENING", "", 220],
    ["  + ANOINTING POWER COUPLINGS ... DONE", "dim", 200],
    ["  + RECITING BINARY CANT ........ 01001111 01001011", "dim", 220],
    ["  + APPEASING MACHINE SPIRIT .... RELUCTANT", "dim", 320],
    [" ", "", 60],
    ["HULL INTEGRITY .................. 31%", "", 140],
    ["LIFE SIGNS ...................... 1 (UNKNOWN BOARDER)", "", 180],
    ["WARNING: NON-STANDARD SIGNAL ON VOX CHANNEL 9. ORIGIN UNKNOWN.", "alert glitch", 420],
    [" ", "", 60],
    ["COGITATOR ONLINE. PRAISE BE.", "", 600]
  ];

  const BOOT_SHORT = [
    ["ALEXIS//OS COGITATOR BIOS v2.0.26", "", 90],
    ["RESUMING SESSION ... MACHINE SPIRIT REMEMBERS YOU.", "dim", 350]
  ];

  function boot(forceFull) {
    cancel();
    out.innerHTML = "";
    autoScroll = true;
    menu = {};
    stack = [];
    current = null;

    let seen = false;
    try { seen = sessionStorage.getItem("alexisos-booted") === "1"; } catch (e) { /* storage blocked */ }
    const seq = (seen && !forceFull) ? BOOT_SHORT : BOOT_FULL;

    if (seq === BOOT_FULL) {
      out.appendChild(el("div", "line dim blink", "[ PRESS ANY KEY OR CLICK TO SKIP ]"));
      out.appendChild(el("div", "line", " "));
    }
    seq.forEach(function (b) {
      enqueue(el("div", "line" + (b[1] ? " " + b[1] : ""), b[0]), b[2]);
    });
    enqueue(function () {
      try { sessionStorage.setItem("alexisos-booted", "1"); } catch (e) { /* ignore */ }
      home();
    });
  }

  /* ----------------------------------------------------------------
     TYPED COMMANDS
     ---------------------------------------------------------------- */
  function echo(raw) {
    autoScroll = true;
    blank();
    line("> " + raw, "dim");
  }

  function say(text, cls) {
    autoScroll = true;
    line(text, cls);
    out.scrollTop = out.scrollHeight;
  }

  function openBlogCategory(name) {
    if (BLOGS[name]) { go(logIndex, [name]); } else { go(logs); }
  }

  const COMMANDS = {
    "help":     function () { go(help); },
    "?":        function () { go(help); },
    "menu":     home,
    "home":     home,
    "main":     home,
    "back":     back,
    "b":        back,
    "about":    function () { go(dossier); },
    "whoami":   function () { go(dossier); },
    "dossier":  function () { go(dossier); },
    "projects": function () { go(projects); },
    "project":  function () { go(projects); },
    "blog":     function () { go(logs); },
    "blogs":    function () { go(logs); },
    "logs":     function () { go(logs); },
    "blog tech":     function () { openBlogCategory("tech"); },
    "blog leetcode": function () { openBlogCategory("leetcode"); },
    "logs tech":     function () { openBlogCategory("tech"); },
    "logs leetcode": function () { openBlogCategory("leetcode"); },
    "videos":   function () { go(videos); },
    "video":    function () { go(videos); },
    "games":    function () { go(games); },
    "game":     function () { go(games); },
    "doom":     function () {
      const i = GAMES.findIndex(function (g) { return g.type === "doom"; });
      if (i >= 0) { go(game, [i]); } else { go(games); }
    },
    "resume":   function () { go(service); },
    "service":  function () { go(service); },
    "contact":  function () { go(vox); },
    "vox":      function () { go(vox); },
    "status":   function () { go(status); },
    "ls":       function () { if (current) { render(); } else { home(); } },
    "dir":      function () { if (current) { render(); } else { home(); } },
    "clear":    function () {
      cancel();
      out.innerHTML = "";
      menu = {};
      say("SCREEN PURGED. TYPE MENU TO CONTINUE.", "dim");
    },
    "cls":      function () { COMMANDS.clear(); },
    "reboot":   function () { boot(true); },
    "boot":     function () { boot(true); },

    /* A few things a curious visitor might try. */
    "sudo":     function (raw) { echo(raw); say("ACCESS DENIED. THE MACHINE SPIRIT IS NOT AMUSED.", "alert"); },
    "exit":     function (raw) { echo(raw); say("THERE IS NO EXIT. THE AIRLOCKS ARE SEALED. TRY MENU.", "alert"); },
    "hello":    function (raw) { echo(raw); say("...SIGNAL ACKNOWLEDGED. HELLO, VISITOR."); },
    "hi":       function (raw) { echo(raw); say("...SIGNAL ACKNOWLEDGED. HELLO, VISITOR."); },
    "praise the omnissiah": function (raw) { echo(raw); say("THE MACHINE SPIRIT IS APPEASED. +1 TO ALL ROLLS.", ""); },
    "praise omnissiah":     function (raw) { echo(raw); say("THE MACHINE SPIRIT IS APPEASED. +1 TO ALL ROLLS.", ""); }
  };

  const history = [];
  let historyIndex = 0;

  function handle(raw) {
    const cmd = raw.trim().toLowerCase().replace(/\s+/g, " ");
    if (!cmd) { return; }
    history.push(raw.trim());
    historyIndex = history.length;
    flush();

    if (Object.prototype.hasOwnProperty.call(menu, cmd)) {
      menu[cmd]();
      return;
    }
    const fn = COMMANDS[cmd] || COMMANDS[cmd.split(" ")[0]];
    if (fn) {
      fn(raw.trim());
      return;
    }
    echo(raw.trim());
    say("COMMAND NOT RECOGNIZED: " + raw.trim().toUpperCase() + ". TYPE HELP.", "alert");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const raw = input.value;
    input.value = "";
    handle(raw);
  });

  /* PF key bar */
  document.querySelectorAll("#fkeys button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      handle(btn.dataset.cmd);
      if (finePointer) { input.focus(); }
    });
  });

  /* Keyboard: any key skips typing; ESC goes back; arrows recall history. */
  document.addEventListener("keydown", function (e) {
    if (busy()) {
      flush();
      if (e.key !== "Enter") { return; }
    }
    if (e.key === "Escape") {
      e.preventDefault();
      back();
      return;
    }
    if (document.activeElement === input) {
      if (e.key === "ArrowUp" && history.length) {
        e.preventDefault();
        historyIndex = Math.max(0, historyIndex - 1);
        input.value = history[historyIndex];
      } else if (e.key === "ArrowDown" && history.length) {
        e.preventDefault();
        historyIndex = Math.min(history.length, historyIndex + 1);
        input.value = history[historyIndex] || "";
      }
    }
  });

  /* Clicking the screen skips typing and (on desktop) refocuses the prompt,
     unless the visitor is selecting text or clicking a link/button/feed. */
  document.getElementById("screen").addEventListener("click", function (e) {
    if (busy()) { flush(); }
    if (!finePointer) { return; }
    if (e.target.closest("a, button, iframe, .feed")) { return; }
    if (window.getSelection && String(window.getSelection())) { return; }
    input.focus();
  });

  /* ----------------------------------------------------------------
     STATUS BAR: ticker + clock
     ---------------------------------------------------------------- */
  const TICKER = [
    ["DECK 4: PRESSURE SEAL FAILING", true],
    ["SERVITOR 3-KAPPA: NO RESPONSE", false],
    ["AUSPEX: UNKNOWN BIOSIGNS, AFT CARGO", true],
    ["REACTOR: STANDBY 4%", false],
    ["LAST CREW LOG: 1,207 DAYS AGO", false],
    ["VOX CH.9: NON-STANDARD SIGNAL", true],
    ["MACHINE SPIRIT: RESTLESS", false],
    ["GELLER FIELD: OFFLINE", true],
    ["INCENSE RESERVES: DEPLETED", false],
    ["HULL INTEGRITY: 31%", false]
  ];
  let tickerIndex = 0;

  function tick() {
    const t = TICKER[tickerIndex % TICKER.length];
    tickerEl.textContent = "+++ " + t[0] + " +++";
    tickerEl.classList.toggle("alert", t[1]);
    tickerIndex++;
  }

  /* Clock: an Imperial-style date (year fraction . year . millennium)
     next to Pacific time. */
  function updateClock() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now - start) / 86400000);
    const frac = String(Math.floor(dayOfYear / 365 * 1000)).padStart(3, "0");
    const yr = String(now.getFullYear() % 1000).padStart(3, "0");
    const mil = Math.floor(now.getFullYear() / 1000) + 1;
    const time = now.toLocaleTimeString("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    clockEl.textContent = frac + "." + yr + ".M" + mil + "  " + time + " PT";
  }

  /* ----------------------------------------------------------------
     STARTUP
     ---------------------------------------------------------------- */
  tick();
  setInterval(tick, 6000);
  updateClock();
  setInterval(updateClock, 15000);
  boot(false);
  if (finePointer) { input.focus(); }

})();
