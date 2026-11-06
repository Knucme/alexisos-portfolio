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

  /* Where printed lines go. Normally the output itself; on framed pages
     it's the body of the page panel (see header()). */
  let sink = null;

  function place(item) {
    if (typeof item === "function") {
      item();
    } else {
      (sink || out).appendChild(item);
    }
  }

  function pump() {
    if (!queue.length) {
      timer = null;
      return;
    }
    const next = queue.shift();
    timer = "placing";
    place(next.item);
    // If the item we just placed changed screens, it already restarted
    // the queue with its own timer, so this chain stops here.
    if (timer !== "placing") {
      return;
    }
    if (autoScroll) {
      out.scrollTop = out.scrollHeight;
    }
    timer = setTimeout(pump, reduceMotion ? 0 : next.delay);
  }

  /* Print everything still waiting, immediately. */
  function flush() {
    if (timer && timer !== "placing") {
      clearTimeout(timer);
    }
    timer = null;
    while (queue.length) {
      place(queue.shift().item);
    }
    if (autoScroll) {
      out.scrollTop = out.scrollHeight;
    }
  }

  /* Throw away anything still waiting (used when changing screens). */
  function cancel() {
    if (timer && timer !== "placing") {
      clearTimeout(timer);
    }
    timer = null;
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
  function item(text)       { enqueue(el("div", "li", "+ " + text)); }

  /* Starts a framed page: a bordered panel with the title cut into the
     top edge (like a flight console window). Everything printed after
     this goes inside the panel. Also updates the top bar. */
  function header(path) {
    const title = path.toUpperCase();
    setPageTitle(title);
    const page = el("section", "page");
    page.appendChild(el("div", "page-title line h", title));
    const body = el("div", "page-body");
    page.appendChild(body);
    enqueue(page);
    enqueue(function () { sink = body; }, 0);
  }

  /* ---------- Top bar: page title, breadcrumb, active page key ---------- */
  const pageTitleEl = document.getElementById("pagetitle");
  const crumbEl = document.getElementById("crumb");

  function setPageTitle(title) {
    const parts = title.split("//").map(function (p) { return p.trim(); }).filter(Boolean);
    if (parts.length > 1 && parts[0] === "VIGIL OF ASH") { parts.shift(); }
    if (pageTitleEl) { pageTitleEl.textContent = parts[0] || title; }
    if (crumbEl) { crumbEl.textContent = ["VIGIL OF ASH"].concat(parts).join("  //  "); }
  }

  /* Which page key (F1..F10) lights up for each screen. */
  function pageKey(fn) {
    switch (fn) {
      case mainMenu: return "master";
      case dossier: return "dossier";
      case projects: case project: return "records";
      case logs: case logIndex: case readLog: return "logs";
      case videos: case videoList: return "pict";
      case games: case game: return "sim";
      case service: return "service";
      case vox: return "vox";
      case status: case shipArea: return "status";
      case help: return "help";
      default: return "";
    }
  }

  function lightKey(fn) {
    const k = pageKey(fn);
    document.querySelectorAll("#fkeys button").forEach(function (b) {
      b.classList.toggle("active", !!k && b.dataset.page === k);
    });
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

  /* Easter eggs can listen for "the visitor did something" (a typed
     command or a screen change), e.g. to end god mode. */
  const commandHooks = [];
  function notifyCommand(raw) {
    commandHooks.forEach(function (fn) { try { fn(raw || ""); } catch (e) { /* ignore */ } });
  }

  function render() {
    if (closeWindow) { closeWindow(); }
    notifyCommand("");
    cancel();
    out.innerHTML = "";
    sink = null;
    out.scrollTop = 0;
    autoScroll = false;
    menu = {};
    activeGame = null;
    lightKey(current.fn);
    current.fn.apply(null, current.args);
  }

  /* Open a screen and remember the one we came from. */
  function go(fn, args) {
    if (current) {
      stack.push(current);
    }
    current = { fn: fn, args: args || [] };
    transition();
  }

  /* Swap the current screen without adding to history (next/prev log). */
  function swap(fn, args) {
    current = { fn: fn, args: args || [] };
    transition();
  }

  /* ----------------------------------------------------------------
     LOADING TRANSITION
     A short "establishing link" screen with a progress bar, shown when
     moving into a new area. About half a second; any key or click
     skips it. BACK and MENU skip it so returning always feels instant.
     ---------------------------------------------------------------- */
  const LOAD_LINES = [
    "QUERYING COGITATOR ARCHIVE",
    "DECRYPTING DATA STACK",
    "ROUTING THROUGH NOOSPHERE RELAY",
    "SCRUBBING CORRUPTED SECTORS",
    "SPINNING UP MEMORY DRUMS",
    "RE SEATING DATA CABLES",
    "AWAITING MACHINE SPIRIT CONSENT"
  ];

  const LOAD_ALERTS = [
    "SECTOR 9 CORRUPTED. REROUTING.",
    "XENOS INTERFERENCE ON RELAY. COMPENSATING.",
    "PARITY ERROR. RETRYING."
  ];

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  /* Human-readable name of the area being opened, for the loader. */
  function areaName(fn, args) {
    switch (fn) {
      case dossier:   return "OPERATOR DOSSIER";
      case projects:  return "FABRICATION RECORDS";
      case project:   return "RECORD: " + PROJECTS[args[0]].name;
      case logs:      return "DATA LOGS";
      case logIndex:  return BLOGS[args[0]].name;
      case readLog:   return "LOG " + (args[1] + 1) + ": " + BLOGS[args[0]].posts[args[1]].title;
      case videos:    return "PICT RECORDINGS";
      case videoList: return VIDEOS[args[0]].name;
      case games:     return "SIMULATIONS";
      case game:      return "SIMULATION: " + GAMES[args[0]].name;
      case service:   return "SERVICE RECORD";
      case vox:       return "VOX CHANNELS";
      case status:    return "VESSEL STATUS";
      case shipArea:  return "SECTION: " + (Ship.systems.find(function (s) { return s.id === args[0]; }) || { name: "" }).name;
      case help:      return "COMMAND LITANY";
      default:        return "DATA STACK";
    }
  }

  function progressBar(pct) {
    const filled = Math.round(pct / 5);
    return "   [" + "█".repeat(filled) + "░".repeat(20 - filled) + "] " +
           String(pct).padStart(3, " ") + "%";
  }

  function transition() {
    if (reduceMotion) {
      render();
      return;
    }
    cancel();
    out.innerHTML = "";
    sink = null;
    out.scrollTop = 0;
    autoScroll = false;
    menu = {};

    const target = current;
    lightKey(target.fn);
    enqueue(el("div", "line h", ">> ESTABLISHING LINK: " + areaName(target.fn, target.args).toUpperCase()), 70);
    enqueue(el("div", "line dim", "   " + pick(LOAD_LINES) + " ..."), 80);
    if (Math.random() < 0.15) {
      enqueue(el("div", "line alert glitch", "   " + pick(LOAD_ALERTS)), 140);
    }
    const bar = el("div", "line", progressBar(0));
    enqueue(bar, 40);
    [17, 38, 61, 79, 93, 100].forEach(function (p) {
      enqueue(function () { bar.textContent = progressBar(p); }, 55);
    });
    enqueue(function () {
      // Only draw if the visitor hasn't already moved somewhere else.
      if (current === target) {
        render();
      }
    }, 0);
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

  /* Main-menu telemetry dashboard, laid out like an old vector display:
     readouts in the corners, the rotating wireframe robot in the middle,
     and the operator line along the bottom. */
  function readout(label, value, cls) {
    const r = el("div", "ro");
    r.appendChild(el("div", "ro-label", label));
    r.appendChild(el("div", "ro-value" + (cls ? " " + cls : ""), value));
    return r;
  }

  /* A titled, bordered panel (title cut into the top edge). Returns
     { el, body } so content can be added to body. */
  function panelBox(title, cls) {
    const p = el("section", "panel" + (cls ? " " + cls : ""));
    p.appendChild(el("div", "panel-title", title));
    const body = el("div", "panel-body");
    p.appendChild(body);
    return { el: p, body: body };
  }

  /* Print into a specific panel: everything enqueued inside fn lands in
     `target`, then printing goes back to wherever it was. */
  function into(target, fn) {
    let prev = null;
    enqueue(function () { prev = sink; sink = target; }, 0);
    fn();
    enqueue(function () { sink = prev; }, 0);
  }

  function pad2(n) { return String(n).padStart(2, "0"); }
  function uptimeText() {
    const s = Math.floor((Date.now() - loadedAt) / 1000);
    return pad2(Math.floor(s / 3600)) + ":" + pad2(Math.floor(s / 60) % 60) + ":" + pad2(s % 60);
  }

  /* Telemetry panel: corner readouts around the rotating robot. */
  function telemetry() {
    const dash = el("div", "dash");
    const mid = el("div", "dash-mid");
    const left = el("div", "dash-col");
    const hullPct = window.Ship ? Ship.hull() + "%" : "31%";
    left.appendChild(readout("HULL INTEGRITY", hullPct));
    left.appendChild(readout("REACTOR", "STANDBY 4%"));
    left.appendChild(readout("CREW / VISITORS", "0 / 1"));
    const right = el("div", "dash-col right");
    right.appendChild(readout("VOX CH.9 SIGNAL", "UNKNOWN", "alert"));
    right.appendChild(readout("LIFE SIGNS", "1 (YOU)"));
    const up = readout("UPTIME", uptimeText());
    right.appendChild(up);

    const canvas = el("canvas", "wire-robot");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Rotating wireframe of the AlexisOS robot");
    mid.appendChild(left);
    mid.appendChild(canvas);
    mid.appendChild(right);
    dash.appendChild(mid);
    dash.appendChild(el("div", "dash-rule"));
    // The robot's own status line, cycling through a few readouts
    const ROBOT_STATUS = [
      "UNIT 7 ALPHA: AWAITING ORDERS",
      "UNIT 7 ALPHA: SCANNING HULL",
      "UNIT 7 ALPHA: LISTENING ON VOX CH.9",
      "UNIT 7 ALPHA: MACHINE SPIRIT RESTLESS"
    ];
    const botLine = el("div", "dash-bottom", ROBOT_STATUS[0]);
    dash.appendChild(botLine);

    const upVal = up.querySelector(".ro-value");
    return {
      el: dash,
      start: function () {
        if (window.Wireframe) { Wireframe.mount(canvas); }
        const t = setInterval(function () {
          if (!upVal.isConnected) { clearInterval(t); return; }
          upVal.textContent = uptimeText();
          const s = Math.floor((Date.now() - loadedAt) / 1000);
          botLine.textContent = ROBOT_STATUS[Math.floor(s / 6) % ROBOT_STATUS.length];
        }, 1000);
      }
    };
  }

  /* "LABEL ....... VALUE" row with optional status flag like [PLAN]. */
  function kv(label, value, flag, cls) {
    const r = el("div", "kv" + (cls ? " " + cls : ""));
    r.appendChild(el("span", "kv-l", label));
    r.appendChild(el("span", "kv-v", value));
    r.appendChild(el("span", "kv-f", flag || ""));
    return r;
  }

  /* ---------- MASTER page (main menu) ----------
     A grid of console panels: telemetry with the robot, the data-stack
     menu, caution & warning, sources & health, and the operator card. */
  function mainMenu() {
    setPageTitle("MASTER");
    const grid = el("div", "master");

    const tele = panelBox("VIGIL OF ASH", "m-tele");
    const t = telemetry();
    tele.body.appendChild(t.el);

    const stacks = panelBox("DATA STACKS", "m-menu");

    const cw = panelBox("CAUTION & WARNING", "m-cw");
    const faults = window.Ship ? Ship.systems.filter(function (x) { return x.status !== "ok"; }) : [];
    faults.forEach(function (f) {
      cw.body.appendChild(el("div", "line " + (f.status === "offline" ? "alert" : "cw-cau"),
        (f.status === "offline" ? "WRN  " : "CAU  ") + f.name));
    });
    cw.body.appendChild(el("div", "line dim cw-foot", faults.length + " ACTIVE. TYPE STATUS"));

    const src = panelBox("SOURCES", "m-src");
    const posts = Object.keys(BLOGS).reduce(function (n, k) { return n + BLOGS[k].posts.length; }, 0);
    const newest = BLOGS.tech && BLOGS.tech.posts.length ? BLOGS.tech.posts[BLOGS.tech.posts.length - 1].date : "";
    const vids = Object.keys(VIDEOS).reduce(function (n, k) { return n + VIDEOS[k].videos.length; }, 0);
    src.body.appendChild(kv("ARCHIVE", "ONLINE", "[LIVE]"));
    src.body.appendChild(kv("DATA LOGS", posts + " ENTRIES", newest ? "[" + newest.toUpperCase() + "]" : ""));
    src.body.appendChild(kv("RECORDS", Object.keys(PROJECTS).length + " FILED", ""));
    src.body.appendChild(kv("PICT FEEDS", vids ? vids + " FEEDS" : "NONE", vids ? "" : "[PENDING]", vids ? "" : "dim"));
    src.body.appendChild(kv("SIMULATIONS", GAMES.length + " LOADED", ""));
    src.body.appendChild(kv("VOX CH.9", "NO DATA", "[UNK]", "alert"));

    const op = panelBox("OPERATOR", "m-op");
    op.body.appendChild(el("div", "line op-name", PROFILE.name.toUpperCase()));
    op.body.appendChild(el("div", "line dim", PROFILE.title));
    op.body.appendChild(el("div", "line dim", PROFILE.location));
    const mail = el("a", null, PROFILE.email);
    mail.href = "mailto:" + PROFILE.email;
    const mailRow = el("div", "line");
    mailRow.appendChild(mail);
    op.body.appendChild(mailRow);

    const top = el("div", "master-top");
    top.appendChild(tele.el);
    top.appendChild(stacks.el);
    const bottom = el("div", "master-bottom");
    bottom.appendChild(cw.el);
    bottom.appendChild(src.el);
    bottom.appendChild(op.el);
    grid.appendChild(top);
    grid.appendChild(bottom);

    // Live GitHub feed across the bottom (github.js)
    if (window.GitFeed) {
      const gh = panelBox("GITHUB LIVE FEED  ", "m-gh");
      const flag = el("span", "gh-flag", "[SYNC]");
      gh.el.querySelector(".panel-title").appendChild(flag);
      GitFeed.fill(gh.body, flag);
      grid.appendChild(gh.el);
    }

    enqueue(grid);
    enqueue(function () { t.start(); }, 0);

    into(stacks.body, function () {
      para("Personal data stacks of " + PROFILE.name + ". The crew is gone. The archive is intact.", "dim");
      option(1, "OPERATOR DOSSIER",    function () { go(dossier); },  "about me");
      option(2, "FABRICATION RECORDS", function () { go(projects); }, "projects");
      option(3, "DATA LOGS",           function () { go(logs); },     "blog");
      option(4, "PICT RECORDINGS",     function () { go(videos); },   "videos");
      option(5, "SIMULATIONS",         function () { go(games); },    "games");
      option(6, "SERVICE RECORD",      function () { go(service); },  "resume");
      option(7, "VOX CHANNELS",        function () { go(vox); },      "contact");
      blank();
      line("Click an option or type its number. HELP lists all commands.", "dim");
    });
  }

  function dossier() {
    header("Operator Dossier");
    line(dots("DESIGNATION") + PROFILE.name);
    line(dots("FUNCTION") + PROFILE.title);
    line(dots("LAST KNOWN LOC") + PROFILE.location);
    line(dots("PRIOR SERVICE") + "US Navy, Master at Arms, 8 years");
    blank();
    PROFILE.intro.forEach(function (p) { para(p); });
    blank();
    option(1, "FABRICATION RECORDS", function () { go(projects); }, "projects");
    option(2, "DATA LOGS",           function () { go(logs); },     "blog");
    option(3, "SERVICE RECORD",      function () { go(service); },  "resume");
    option(4, "VOX CHANNELS",        function () { go(vox); },      "contact");
    backOption();
  }

  /* ---------- Projects ---------- */
  function projects() {
    header("Fabrication Records");
    Object.keys(PROJECTS).forEach(function (id, i) {
      option(i + 1, PROJECTS[id].name, function () { go(project, [id]); }, PROJECTS[id].tech);
    });
    blank();
    backOption();
  }

  function project(id) {
    const p = PROJECTS[id];
    header(p.name);
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
    header("Data Logs");
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
    header(cat.name);
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
    header(cat.name + ", log " + (i + 1) + " of " + cat.posts.length);
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
    header("Pict Recordings");
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
    header(cat.name);
    if (cat.description) { para(cat.description, "dim"); }
    if (!cat.videos.length) {
      line("NO PICT RECORDINGS FOUND. TRANSMISSIONS PENDING.", "alert");
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
    header("Simulations");
    GAMES.forEach(function (g, i) {
      option(i + 1, g.name.toUpperCase(), function () { go(game, [i]); },
             GAME_HINTS[g.type] || "");
    });
    blank();
    backOption();
  }

  const GAME_HINTS = {
    doom:    "shareware combat",
    cube:    "3x3 puzzle cube",
    hangman: "guess my skills"
  };

  function hangmanScreen() {
    if (!window.Hangman) {
      line("HANGMAN MODULE MISSING (hangman.js DID NOT LOAD).", "alert");
      return;
    }
    if (!hangmanGame) { hangmanGame = Hangman.createGame(HANGMAN_WORDS); }
    para("Decode the word before the robot on the stand is fully assembled. Every " +
         "miss adds a part, and six misses finishes it. Every word is a skill or " +
         "something about me, and each round ends with why it matters.", "dim");
    para("Click letters or type one at the prompt. Type the whole word to guess it " +
         "(a wrong guess costs a miss). Type NEW for the next word, HINT for a clue. " +
         "Use 0 or ESC to leave.", "dim");
    const panel = Hangman.mount(hangmanGame, {
      onAction: function () { if (finePointer) { input.focus(); } }
    });
    activeGame = panel;
    enqueue(panel.el);
  }

  /* One cube for the whole visit, so progress survives leaving the screen. */
  let cubeModel = null;
  let activeGame = null;   // the game panel on screen, if any (gets typed input)
  let hangmanGame = null;  // one hangman session per visit (keeps score)

  function cubeScreen() {
    if (!window.HexCube) {
      line("CUBE MODULE MISSING (cube.js DID NOT LOAD).", "alert");
      return;
    }
    if (!cubeModel) {
      cubeModel = HexCube.createModel();
      cubeModel.scramble(20);
    }
    para("A 3x3 puzzle cube. This terminal has no color output, so every square " +
         "shows a hex code instead. The legend translates them. Get every side " +
         "to a single code.", "dim");
    para("You work on one side at a time. Click a square to select it, then slide " +
         "its row or column (the center square also turns the whole side). The " +
         "arrows around the side show the code of the side in that direction; click " +
         "one (or type UP, DOWN, LEFT, RIGHT) to bring that side to the front.", "dim");
    para("You can also type moves at the prompt in cube notation (R U R' U', F2) or " +
         "use the TURN buttons. Other commands: SCRAMBLE, UNDO, RESET, SPIN. Here B " +
         "means the back face, so use 0 or ESC to leave.", "dim");
    const panel = HexCube.mount(cubeModel, {
      onAction: function () { if (finePointer) { input.focus(); } }
    });
    activeGame = panel;
    enqueue(panel.el);
  }

  function game(i) {
    const g = GAMES[i];
    header(g.name);
    if (g.type === "doom") {
      para("Combat simulation loaded from the Internet Archive (shareware episode). " +
           "Click into the feed to start. Arrow keys move, Ctrl fires. " +
           "The player has its own fullscreen button.", "dim");
      enqueue(feed("https://archive.org/embed/" + DOOM_ARCHIVE_ID, "Doom", "doom"));
    } else if (g.type === "cube") {
      cubeScreen();
    } else if (g.type === "hangman") {
      hangmanScreen();
    } else {
      line("SIMULATION NOT YET COMPILED.", "alert");
    }
    blank();
    backOption();
  }

  /* ---------- Resume (service record) ---------- */
  function service() {
    header("Service Record");
    enqueue(el("div", "line title", PROFILE.name));
    line(SERVICE.headline || PROFILE.title, "dim");
    blank();
    option(1, "OPEN FULL SERVICE RECORD (PDF)",
           function () { window.open(PROFILE.resumePage, "_blank", "noopener"); },
           "opens in a new tab");
    option(2, "DOWNLOAD PDF",
           function () {
             const a = document.createElement("a");
             a.href = PROFILE.resumePdf;
             a.download = "Alexis-Gonzalez-Resume.pdf";
             document.body.appendChild(a);
             a.click();
             a.remove();
           },
           "saves a copy");
    if (SERVICE.summary) {
      sect("Summary");
      para(SERVICE.summary);
    }
    sect("Technical Skills");
    SERVICE.skills.forEach(function (s) { line(s); });
    if (SERVICE.certifications) {
      sect("Certifications");
      SERVICE.certifications.forEach(item);
    }
    sect("Experience");
    SERVICE.experience.forEach(function (s) { line(s); });
    sect("Education");
    SERVICE.education.forEach(item);
    if (SERVICE.military) {
      sect("Military Service");
      SERVICE.military.forEach(function (s) { line(s); });
    }
    blank();
    para("Projects from the resume are under FABRICATION RECORDS (type PROJECTS).", "dim");
    blank();
    backOption();
  }

  /* ---------- Contact (vox-channels) ---------- */
  function strip(url) {
    return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  }

  function vox() {
    header("Vox Channels");
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
    if (window.Ship) {
      // Clicking a system opens its area (the Geller field is display-only).
      enqueue(Ship.render({ enter: function (sys) { run(function () { go(shipArea, [sys.id]); }); } }));
      // A numbered option for every area, so they can be clicked or typed
      sect("Move to area");
      Ship.systems.filter(function (x) { return x.area !== false; }).forEach(function (sys) {
        option(sys.num, sys.name, function () { go(shipArea, [sys.id]); },
               sys.status === "ok" ? "nominal" : sys.status === "damaged" ? "damaged" : "offline");
      });
      blank();
      backOption();
      return;
    }
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

  /* ---------- Pop-up windows (repair terminals) ----------
     A window floats over the terminal; ESC, the CLOSE button, or
     changing screens closes it. Closing a repair mid-way resets it. */
  const WINDOWED_REPAIRS = { reactor: true };
  let closeWindow = null;

  function openWindow(title, content) {
    if (closeWindow) { closeWindow(); }
    const crt = document.getElementById("crt");
    const shade = el("div", "win-shade");
    const win = el("div", "win");
    win.setAttribute("role", "dialog");
    win.setAttribute("aria-label", title);
    const bar = el("div", "win-bar");
    bar.appendChild(el("span", "win-title", title));
    const x = el("button", "opt win-close", "[X] CLOSE");
    x.type = "button";
    bar.appendChild(x);
    win.appendChild(bar);
    const bodyEl = el("div", "win-body");
    bodyEl.appendChild(content);
    win.appendChild(bodyEl);
    shade.appendChild(win);
    crt.appendChild(shade);
    function close() {
      shade.remove();
      closeWindow = null;
      if (finePointer) { input.focus(); }
    }
    x.addEventListener("click", function (e) { e.stopPropagation(); close(); });
    shade.addEventListener("click", function (e) { if (e.target === shade) { close(); } });
    closeWindow = close;
    x.focus();
    return close;
  }

  function openRepairWindow(which, sys) {
    if (!window.Repairs || !Repairs[which]) { return; }
    let close = null;
    const panel = Repairs[which](sys, {
      done: function () { if (close) { close(); } render(); }
    });
    close = openWindow(sys.name + " CONTROL TERMINAL", panel);
  }

  /* ---------- Ship areas (opened from STATUS) ---------- */
  function shipArea(id) {
    const list = Ship.systems.filter(function (x) { return x.area !== false; });
    const i = list.findIndex(function (s) { return s.id === id; });
    const sys = list[i];
    header("[" + sys.num + "] " + sys.name);
    line(dots("CONDITION", 14) + (sys.status === "ok" ? "NOMINAL" : sys.status === "damaged" ? "DAMAGED" : "OFFLINE") +
         ", " + sys.pct + "%. " + sys.note, sys.status === "ok" ? "" : "alert");
    blank();
    const scene = window.ShipAreas && ShipAreas[id];
    if (scene) {
      if (id === "bridge") {
        // Systems that are monitored from the bridge rather than visited
        const pa = Ship.systems.find(function (x) { return x.id === "prow"; });
        if (pa) {
          line(dots("PROW ARMOR", 14) + "HULL INTEGRITY " + pa.pct + "%, " + (pa.status === "ok" ? "HOLDING" : "COMPROMISED"),
               pa.status === "ok" ? "" : "alert");
        }
        const gf = Ship.systems.find(function (x) { return x.id === "geller"; });
        if (gf) {
          line(dots("GELLER FIELD", 14) + (gf.status === "ok" ? "ONLINE" : "OFFLINE") + ", " + gf.pct + "%. CONTROLLED FROM THIS CONSOLE",
               gf.status === "ok" ? "" : "alert");
          if (gf.status !== "ok") {
            // Interlock: what has to be fixed before the GELLER switch works
            const req = Ship.requires.geller || [];
            const parts = req.map(function (r) {
              const x = Ship.systems.find(function (s) { return s.id === r; });
              return (x ? x.name : r.toUpperCase()) + (Ship.isRepaired(r) ? " [ONLINE]" : " [OFFLINE]");
            });
            line(dots("INTERLOCK", 14) + parts.join("   "), Ship.missingFor("geller").length ? "dim" : "");
          }
        }
        blank();
      }
      enqueue(scene(sys, Ship.systems, {
        done: function () { render(); },
        open: function (which) { openRepairWindow(which, sys); }
      }));
      // Repair puzzles: the reactor opens from its wall terminal; the rest sit under the scene
      if (window.Repairs && Repairs[id] && !WINDOWED_REPAIRS[id]) {
        blank();
        enqueue(Repairs[id](sys, { done: function () { render(); } }));
      }
    } else {
      line("NO PICT FEED FROM THIS SECTION YET. AREA SURVEY PENDING.", "dim");
    }
    blank();
    const next = list[(i + 1) % list.length];
    const prev = list[(i - 1 + list.length) % list.length];
    option("N", "NEXT AREA", function () { swap(shipArea, [next.id]); }, "[" + next.num + "] " + next.name.toLowerCase());
    option("P", "PREVIOUS AREA", function () { swap(shipArea, [prev.id]); }, "[" + prev.num + "] " + prev.name.toLowerCase());
    option(0, "RETURN TO SCHEMATIC", back, "or press ESC");
  }

  /* ---------- Help ---------- */
  const HELP = [
    ["MENU",        "main menu"],
    ["BACK  or 0",  "previous screen (ESC also works)"],
    ["ABOUT",       "operator dossier"],
    ["PROJECTS",    "fabrication records"],
    ["BLOG",        "data logs (also: BLOG TECH, BLOG LEETCODE)"],
    ["VIDEOS",      "pict recordings"],
    ["GAMES",       "simulations (DOOM, CUBE, HANGMAN launch directly)"],
    ["RESUME",      "service record"],
    ["CONTACT",     "vox channels"],
    ["STATUS",      "vessel status"],
    ["CLEAR",       "purge the screen"],
    ["THEME",       "cycle display colors (THEME LIST for names)"],
    ["REBOOT",      "replay the boot sequence"]
  ];

  function help() {
    header("Command Litany");
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
    ["DETECTING DATA STACKS ........... 4 FOUND, 1 CORRUPTED", "", 260],
    ["PICT FEED ARRAY ................. 2 CHANNELS", "", 140],
    [" ", "", 60],
    ["INVOKING RITE OF AWAKENING", "", 220],
    ["  + ANOINTING POWER COUPLINGS ... DONE", "dim", 200],
    ["  + RECITING BINARY CANT ........ 01001111 01001011", "dim", 220],
    ["  + APPEASING MACHINE SPIRIT .... RELUCTANT", "dim", 320],
    [" ", "", 60],
    ["HULL INTEGRITY .................. 31%", "", 140],
    ["LIFE SIGNS ...................... 1 (UNKNOWN BOARDER)", "", 180],
    ["WARNING: NON STANDARD SIGNAL ON VOX CHANNEL 9. ORIGIN UNKNOWN.", "alert glitch", 420],
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
    sink = null;
    setPageTitle("POWER ON SELF TEST");
    lightKey(null);
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
     THEMES (like the color modes on a flight console)
     THEME cycles them; THEME <NAME> picks one. Remembered in this browser.
     Red alert and god mode still take over the colors when active.
     ---------------------------------------------------------------- */
  const THEMES = ["retrowave", "amber", "phosphor", "modern"];
  const DEFAULT_THEME = "retrowave";      // what first-time visitors see
  let theme = DEFAULT_THEME;

  function savedTheme() {
    try { return localStorage.getItem("alexisos-theme") || DEFAULT_THEME; } catch (e) { return DEFAULT_THEME; }
  }

  function applyTheme(name, quiet) {
    if (THEMES.indexOf(name) < 0) { name = DEFAULT_THEME; }
    THEMES.forEach(function (t) { document.body.classList.remove("theme-" + t); });
    if (name !== "amber") { document.body.classList.add("theme-" + name); }
    theme = name;
    const flag = document.getElementById("themeflag");
    if (flag) { flag.textContent = "THEME " + name.toUpperCase(); }
    try { localStorage.setItem("alexisos-theme", name); } catch (e) { /* storage blocked */ }
    if (!quiet) { say("DISPLAY RECALIBRATED: " + name.toUpperCase() + ".", ""); }
  }

  function themeCommand(raw) {
    echo(raw);
    const arg = (raw.trim().split(/\s+/)[1] || "").toLowerCase();
    if (arg === "list") {
      say("THEMES: " + THEMES.join(", ").toUpperCase() + ". TYPE THEME <NAME>, OR THEME TO CYCLE.", "dim");
      return;
    }
    if (arg && THEMES.indexOf(arg) < 0) {
      say("UNKNOWN THEME: " + arg.toUpperCase() + ". TRY: " + THEMES.join(", ").toUpperCase(), "alert");
      return;
    }
    applyTheme(arg || THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]);
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

  function openGame(type) {
    const i = GAMES.findIndex(function (g) { return g.type === type; });
    if (i >= 0) { go(game, [i]); } else { go(games); }
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
    "doom":     function () { openGame("doom"); },
    "cube":     function () { openGame("cube"); },
    "rubik":    function () { openGame("cube"); },
    "rubiks":   function () { openGame("cube"); },
    "hangman":  function () { openGame("hangman"); },
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
      sink = null;
      menu = {};
      say("SCREEN PURGED. TYPE MENU TO CONTINUE.", "dim");
    },
    "cls":      function () { COMMANDS.clear(); },
    "reboot":   function () { boot(true); },
    "theme":    function (raw) { themeCommand(raw); },
    // Hidden: undo all ship repairs (handy for testing the puzzles)
    "reset repairs": function (raw) {
      echo(raw);
      if (window.Ship) { Ship.resetRepairs(); }
      say("REPAIR LOG WIPED. THE SHIP IS BROKEN AGAIN.", "alert");
    },
    "themes":   function (raw) { themeCommand("theme list"); },
    "boot":     function () { boot(true); },

    /* A few things a curious visitor might try. */
    "sudo":     function (raw) { echo(raw); say("ACCESS DENIED. THE MACHINE SPIRIT IS NOT AMUSED.", "alert"); },
    "exit":     function (raw) { echo(raw); say("THERE IS NO EXIT. THE AIRLOCKS ARE SEALED. TRY MENU.", "alert"); },
    "hello":    function (raw) { echo(raw); say("...SIGNAL ACKNOWLEDGED. HELLO, VISITOR."); },
    "hi":       function (raw) { echo(raw); say("...SIGNAL ACKNOWLEDGED. HELLO, VISITOR."); },
    "praise the omnissiah": function (raw) { echo(raw); say("THE MACHINE SPIRIT IS APPEASED. +1 TO ALL ROLLS.", ""); },
    "praise omnissiah":     function (raw) { echo(raw); say("THE MACHINE SPIRIT IS APPEASED. +1 TO ALL ROLLS.", ""); },

    /* Hidden: offensive security tools trip CONDITION CRITICAL (red alert).
       A firewall lockdown (iptables ...) or STAND DOWN restores it.
       Deliberately not listed in HELP. */
    "msfconsole": intrusion,
    "nmap":       intrusion,
    "hydra":      intrusion,
    "sqlmap":     intrusion,
    "iptables":   containment,
    "stand down": containment
  };

  /* ----------------------------------------------------------------
     CONDITION CRITICAL (easter egg)
     Turns the whole terminal red. Content stays the same; only the
     look, ticker, and status bar change. Lasts for the browser session.
     ---------------------------------------------------------------- */
  let critical = false;
  const conditionEl = document.createElement("span");
  conditionEl.className = "sb-condition blink";
  conditionEl.textContent = "!! CONDITION: CRITICAL !!";

  const RED_TICKER = [
    ["HOSTILE PROCESS IN COGITATOR CORE", true],
    ["HULL BREACH: DECKS 3 TO 6", true],
    ["BULKHEADS SEALING", true],
    ["REACTOR CONTAINMENT 12% AND FALLING", true],
    ["UNKNOWN SIGNAL ON VOX CH.9 IS TRANSMITTING", true],
    ["LIFE SUPPORT ON RESERVE POWER", true]
  ];

  function setCritical(on) {
    critical = on;
    document.body.classList.toggle("red-alert", on);
    const bar = document.getElementById("statusline");
    if (on && !conditionEl.isConnected) {
      bar.insertBefore(conditionEl, bar.firstChild);
    } else if (!on && conditionEl.isConnected) {
      conditionEl.remove();
    }
    try {
      if (on) { sessionStorage.setItem("alexisos-critical", "1"); }
      else { sessionStorage.removeItem("alexisos-critical"); }
    } catch (e) { /* storage blocked */ }
    tickerIndex = 0;
    tick();
  }

  function intrusion(raw) {
    echo(raw);
    autoScroll = true;
    if (critical) {
      say("SESSION ALREADY COMPROMISED. THE SHIP IS STILL BURNING.", "alert");
      return;
    }
    const crt = document.getElementById("crt");
    const seq = [
      ["[*] PAYLOAD STAGED... SENDING", "dim", 260],
      ["!! INTRUSION DETECTED: HOSTILE TOOLING ON VOX CH.9 !!", "alert glitch", 320],
      ["!! MACHINE SPIRIT REJECTS FOREIGN CODE. COUNTERMEASURES FAILED !!", "alert", 320],
      ["!! HULL BREACH. BULKHEADS SEALING. REACTOR CONTAINMENT UNSTABLE !!", "alert", 380]
    ];
    seq.forEach(function (s) { enqueue(el("div", "line " + s[1], s[0]), s[2]); });
    enqueue(function () {
      setCritical(true);
      crt.classList.remove("alarm-hit");
      void crt.offsetWidth;
      crt.classList.add("alarm-hit");
    }, 200);
    enqueue(el("div", "line alert", "+++ CONDITION: CRITICAL +++"), 200);
    enqueue(el("div", "line dim", "A good admin knows which firewall to raise. (Or type STAND DOWN.)"));
  }

  function containment(raw) {
    echo(raw);
    if (!critical) {
      say("FIREWALL HOLDING. NO HOSTILES DETECTED.", "dim");
      return;
    }
    autoScroll = true;
    enqueue(el("div", "line", "INBOUND TRAFFIC DROPPED. HOSTILE PROCESS TERMINATED."), 260);
    enqueue(el("div", "line", "BULKHEADS HOLDING. REACTOR CONTAINMENT RESTORED."), 260);
    enqueue(function () { setCritical(false); }, 120);
    enqueue(el("div", "line", "+++ CONDITION: STABLE. PRAISE BE. +++"));
  }

  const history = [];
  let historyIndex = 0;

  /* An easter egg can take over the prompt (vim, ssh password prompt).
     While trapped, every line goes to the trap and is NOT saved to
     history. Shape: { fn(raw), esc() optional }. */
  let inputTrap = null;

  function handle(raw) {
    if (inputTrap) {
      flush();
      inputTrap.fn(raw);
      return;
    }
    const cmd = raw.trim().toLowerCase().replace(/\s+/g, " ");
    if (!cmd) { return; }
    notifyCommand(raw.trim());
    history.push(raw.trim());
    historyIndex = history.length;
    flush();

    if (Object.prototype.hasOwnProperty.call(menu, cmd)) {
      menu[cmd]();
      return;
    }
    const fn = COMMANDS[cmd] || COMMANDS[cmd.split(" ")[0]];
    // On a game screen, game input comes first (single letters like "b"
    // are moves or guesses there), but words like MENU still work.
    if (activeGame && !(fn && cmd.length > 1)) {
      if (activeGame.command(raw.trim())) { return; }
    }
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
      if (e.key !== "Enter" && e.key !== "Escape") { return; }
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (closeWindow) { closeWindow(); return; }
      if (inputTrap) {
        if (inputTrap.esc) { inputTrap.esc(); }
        return;
      }
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
    ["SERVITOR 3 KAPPA: NO RESPONSE", false],
    ["AUSPEX: UNKNOWN BIOSIGNS, AFT CARGO", true],
    ["REACTOR: STANDBY 4%", false],
    ["LAST CREW LOG: 1,207 DAYS AGO", false],
    ["VOX CH.9: NON STANDARD SIGNAL", true],
    ["MACHINE SPIRIT: RESTLESS", false],
    ["GELLER FIELD: OFFLINE", true],
    ["INCENSE RESERVES: DEPLETED", false],
    ["HULL INTEGRITY: 31%", false]
  ];
  let tickerIndex = 0;

  let tickerHold = false;   // an easter egg is animating the ticker

  function tick() {
    if (tickerHold) { return; }
    const list = critical ? RED_TICKER : TICKER;
    const t = list[tickerIndex % list.length];
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
      second: "2-digit",
      hour12: false
    });
    clockEl.textContent = frac + "." + yr + ".M" + mil + "  " + time + " PT";
  }

  /* ----------------------------------------------------------------
     EASTER EGG HOOKS
     eggs.js (loaded after this file) uses these to add hidden commands.
     ---------------------------------------------------------------- */
  window.AlexisOS = {
    el: el,
    enqueue: enqueue,
    flush: flush,
    echo: echo,
    say: say,
    line: function (text, cls) { autoScroll = true; line(text, cls); },
    blank: blank,
    scroll: function () { out.scrollTop = out.scrollHeight; },
    output: out,
    input: input,
    ticker: tickerEl,
    holdTicker: function (on) { tickerHold = on; if (!on) { tick(); } },
    goContact: function () { go(vox); },
    goDossier: function () { go(dossier); },
    setCritical: setCritical,
    isCritical: function () { return critical; },
    reduceMotion: reduceMotion,
    register: function (name, fn) { COMMANDS[name] = fn; },
    onCommand: function (fn) { commandHooks.push(fn); },
    trap: function (t) { inputTrap = t; },
    untrap: function () { inputTrap = null; }
  };

  /* ----------------------------------------------------------------
     STARTUP
     ---------------------------------------------------------------- */
  try {
    if (sessionStorage.getItem("alexisos-critical") === "1") { setCritical(true); }
  } catch (e) { /* storage blocked */ }
  tick();
  setInterval(tick, 6000);
  updateClock();
  setInterval(updateClock, 1000);
  applyTheme(savedTheme(), true);
  boot(false);
  if (finePointer) { input.focus(); }

})();
