/* ===================================================================
   AlexisOS - eggs.js
   Hidden commands for curious visitors. None of these appear in HELP.
   Loaded after script.js and uses the hooks in window.AlexisOS.

   Includes the CONDITION CRITICAL triggers' cousins (that one lives in
   script.js), plus a small capture-the-flag: the flag is hidden,
   base64-encoded, in an HTML comment in index.html.
   =================================================================== */
(function () {
  "use strict";
  const OS = window.AlexisOS;
  if (!OS) { return; }

  const el = OS.el;
  function out(text, cls, delay) { OS.enqueue(el("div", "line" + (cls ? " " + cls : ""), text), delay); }
  function args(raw) { return raw.trim().split(/\s+/).slice(1); }

  /* ---------------- rm -rf / ---------------- */
  OS.register("rm", function (raw) {
    OS.echo(raw);
    const a = args(raw).join(" ");
    if (!/-(rf|fr)\b/.test(a) || !/(^|\s)\/(\*)?(\s|$)/.test(a)) {
      OS.say("rm: cannot remove: permission denied. The machine spirit protects its own.", "alert");
      return;
    }
    ["/deck4", "/reactor", "/life-support", "/crew-logs", "/servitors", "/chapel", "/bridge"].forEach(function (d) {
      out("removing " + d + " ...", "dim", 170);
    });
    out("removing /home/alexis ...", "alert", 600);
    out("JUST KIDDING. THE MACHINE SPIRIT KEEPS BACKUPS.", "", 200);
  });

  /* ---------------- cat ---------------- */
  const FLAG_B64 = "RkxBR3t2MWcxbF8wZl80NWhfczB1cmMzX3IzNGQzcn0=";

  OS.register("cat", function (raw) {
    OS.echo(raw);
    const file = (args(raw)[0] || "").toLowerCase();
    if (file === "/etc/passwd") {
      [
        "root:x:0:0:Captain Varro:/bridge:/bin/false          [DECEASED]",
        "navigator:x:1001:100:Lt. Okonkwo:/bridge:/bin/false   [DECEASED]",
        "enginseer:x:1002:100:Magos Tel-9:/reactor:/bin/false  [DECEASED]",
        "medicae:x:1003:100:Sister Ilsa:/apothecarion:/bin/false [DECEASED]",
        "servitor:x:1004:100:3-Kappa:/deck4:/bin/false         [NO RESPONSE]",
        "visitor:x:1337:1337:You:/home/visitor:/bin/cogitator  [ACTIVE]"
      ].forEach(function (l, i) { out(l, i === 5 ? "" : "dim", 90); });
      return;
    }
    if (file === "flag.txt" || file === "flag") {
      OS.say("cat: flag.txt: Permission denied.", "alert");
      OS.say("The flag isn't in a file. It's somewhere a curious tech would look. Submit it with: flag FLAG{...}", "dim");
      return;
    }
    if (!file) { OS.say("cat: missing file operand", "alert"); return; }
    OS.say("cat: " + file + ": No such file or directory", "alert");
  });

  /* ---------------- capture the flag ---------------- */
  function checkFlag(raw) {
    const guess = raw.trim().replace(/^(flag|submit)\s+/i, "");
    if (!guess || /^flag$/i.test(raw.trim())) {
      OS.say("USAGE: flag FLAG{...}   (hint: view the page source)", "dim");
      return;
    }
    if (guess === FLAG_B64) {
      OS.say("CLOSE. THAT'S STILL ENCODED.", "alert");
      return;
    }
    let ok = false;
    try { ok = btoa(guess) === FLAG_B64; } catch (e) { ok = false; }
    if (!ok) {
      OS.say("INVALID FLAG. THE MACHINE SPIRIT IS UNIMPRESSED.", "alert");
      return;
    }
    out("+++ FLAG ACCEPTED +++", "win", 200);
    out("Nice work. You read the source, decoded the key, and came back to submit it.", "", 200);
    out("That's the kind of curiosity I bring to backend and security work.", "", 200);
    out("If you're hiring, I'd like to hear from you: me@argonzalez.com", "", 200);
  }
  OS.register("flag", function (raw) { OS.echo(raw.replace(/\{.*\}/, "{...}")); checkFlag(raw); });
  OS.register("submit", function (raw) { OS.echo(raw.replace(/\{.*\}/, "{...}")); checkFlag(raw); });

  /* ---------------- who ---------------- */
  OS.register("who", function (raw) {
    OS.echo(raw);
    const t = new Date().toTimeString().slice(0, 5);
    out("visitor   tty1         " + t + "  (you)");
    out("UNKNOWN   vox/ch9      ??:??  (origin: aft cargo)", "alert");
  });

  /* ---------------- ping ---------------- */
  OS.register("ping", function (raw) {
    OS.echo(raw);
    const host = args(raw)[0] || "argonzalez.com";
    out("PING " + host + ": 56 data bytes", "", 300);
    [12, 48, 210].forEach(function (ms, i) {
      out("64 bytes from " + host + ": icmp_seq=" + i + " ttl=64 time=" + ms + " ms", "dim", 420);
    });
    out("64 bytes from UNKNOWN HOST: icmp_seq=3 ttl=0 time=-1 ms", "alert", 700);
    out("REPLY FROM UNKNOWN HOST. IT KNOWS YOU'RE HERE.", "alert glitch", 300);
  });

  /* ---------------- top / htop ---------------- */
  function top(raw) {
    OS.echo(raw);
    out("  PID USER      %CPU %MEM  STATE    COMMAND");
    [
      ["    1", "root     ", " 99.9", " 41.0", "R      ", "machine_spirit"],
      ["  404", "servitor ", "  0.0", "  2.1", "Z      ", "servitor_3kappa <defunct>"],
      ["  666", "???      ", " 13.0", "  6.6", "S      ", "vox_ch9_listener"],
      [" 1207", "root     ", "  0.1", "  0.4", "S      ", "crew_log_daemon (last write: 1,207 days ago)"],
      [" 1337", "visitor  ", "  0.3", "  0.1", "R      ", "cogitator --session you"]
    ].forEach(function (r) {
      out(r[0] + " " + r[1] + r[2] + " " + r[3] + "  " + r[4] + r[5], r[0].trim() === "666" ? "alert" : "dim", 60);
    });
  }
  OS.register("top", top);
  OS.register("htop", top);

  /* ---------------- git ---------------- */
  OS.register("git", function (raw) {
    OS.echo(raw);
    if (args(raw)[0] === "blame") {
      out("^a1e5c0de (Alexis Gonzalez) every line of this terminal");
      out("Every line authored by: Alexis Gonzalez. No one else to blame.", "dim");
      return;
    }
    OS.say("git: this cogitator has no working tree. Try: git blame", "dim");
  });

  /* ---------------- vim (the trap) ---------------- */
  function vim(raw) {
    OS.echo(raw);
    out("~", "dim"); out("~", "dim"); out("~        VIM - Vi IMproved (cogitator edition)", "dim");
    out("~        type  :q!  to exit", "dim"); out("~", "dim");
    out("-- NORMAL --", "", 60);
    OS.trap({
      fn: function (text) {
        const t = text.trim();
        if (t === ":q!" || t === ":qa!") {
          OS.untrap();
          OS.say("You escaped vim. Most people never do.", "");
          return;
        }
        if (t === ":q" || t === ":wq" || t === ":x" || t === "zz" || t === "ZZ") {
          OS.say(t === ":q"
            ? "E37: No write since last change (add ! to override)"
            : "E45: 'readonly' option is set (add ! to override)", "alert");
          return;
        }
        if (/^(exit|quit|menu|help|back)$/i.test(t)) {
          OS.say("E492: Not an editor command: " + t, "alert");
          return;
        }
        OS.say(t ? "-- NORMAL --  (that did nothing useful)" : "-- NORMAL --", "dim");
      },
      esc: function () { OS.say("-- NORMAL --  (ESC won't save you here)", "dim"); }
    });
  }
  OS.register("vim", vim);
  OS.register("vi", vim);
  OS.register("nano", function (raw) { OS.echo(raw); OS.say("nano? On this ship we use vim. Try it.", "dim"); });
  OS.register("emacs", function (raw) { OS.echo(raw); OS.say("emacs: a fine operating system, lacking a decent editor. Try vim.", "dim"); });

  /* ---------------- ssh root@vigil-7 ----------------
     Password prompt. Input is masked, never echoed, and never saved. */
  OS.register("ssh", function (raw) {
    OS.echo(raw);
    const target = args(raw)[0] || "visitor@vigil-7";
    let tries = 0;
    out(target + "'s password:", "");
    OS.input.type = "password";
    OS.input.autocomplete = "new-password";
    function done() {
      OS.untrap();
      OS.input.type = "text";
      OS.input.autocomplete = "off";
      OS.input.value = "";
    }
    OS.trap({
      fn: function () {
        tries++;
        if (tries < 3) {
          OS.say("Permission denied, please try again.", "alert");
          out(target + "'s password:", "");
          return;
        }
        done();
        OS.say(target + ": Permission denied (publickey,password).", "alert");
        OS.say("3 failed attempts. Incident logged. Have you considered Security+? I'm working on mine.", "dim");
      },
      esc: function () { done(); OS.say("Connection closed.", "dim"); }
    });
  });

  /* ---------------- history (the last crew member's) ---------------- */
  OS.register("history", function (raw) {
    OS.echo(raw);
    [
      "  1  status --reactor",
      "  2  vox open ch9",
      "  3  vox close ch9",
      "  4  vox close ch9 --force",
      "  5  seal deck4",
      "  6  whoami",
      "  7  who",
      "  8  sudo seal deck4",
      "  9  ls /crew",
      " 10  echo 'if anyone finds this, do not answer channel 9'",
      " 11  vox open ch9"
    ].forEach(function (l, i) { out(l, i >= 9 ? "alert" : "dim", 80); });
  });

  /* ---------------- general quarters ---------------- */
  OS.register("general quarters", function (raw) {
    OS.echo(raw);
    const wasCritical = OS.isCritical();
    out("BONG  BONG  BONG  BONG  BONG", "alert", 250);
    out("GENERAL QUARTERS, GENERAL QUARTERS. ALL HANDS MAN YOUR BATTLE STATIONS.", "alert", 250);
    out("UP AND FORWARD ON THE STARBOARD SIDE, DOWN AND AFT ON THE PORT SIDE.", "", 250);
    OS.enqueue(function () {
      document.body.classList.add("red-alert");
      setTimeout(function () {
        if (!wasCritical && !OS.isCritical()) { document.body.classList.remove("red-alert"); }
        OS.say("SECURE FROM GENERAL QUARTERS.", "dim");
      }, 8000);
    });
  });

  /* ---------------- anchors aweigh ---------------- */
  OS.register("anchors aweigh", function (raw) {
    OS.echo(raw);
    OS.say("ANCHOR UP. GETTING UNDERWAY.", "");
    if (OS.reduceMotion) { return; }
    const width = 46;
    const ship = "__|__|__\\";
    let pos = 0;
    OS.holdTicker(true);
    OS.ticker.classList.remove("alert");
    const timer = setInterval(function () {
      let water = "";
      for (let i = 0; i < width; i++) { water += (i + pos) % 4 === 0 ? "~" : "-"; }
      const at = Math.min(pos, width - ship.length);
      OS.ticker.textContent = water.slice(0, at) + ship + water.slice(at + ship.length);
      pos++;
      if (pos > width + 4) {
        clearInterval(timer);
        OS.holdTicker(false);
      }
    }, 110);
  });

  /* ---------------- small ones ---------------- */
  OS.register("hooyah", function (raw) { OS.echo(raw); OS.say("HOOYAH. FAIR WINDS AND FOLLOWING SEAS, SAILOR.", ""); });
  OS.register("hooya",  function (raw) { OS.echo(raw); OS.say("HOOYAH. FAIR WINDS AND FOLLOWING SEAS, SAILOR.", ""); });
  OS.register("coffee", function (raw) { OS.echo(raw); OS.say("INSUFFICIENT RECAF. MORALE DROPPING.", "alert"); });
  OS.register("brew",   function (raw) { OS.echo(raw); OS.say("brew: no such keg. INSUFFICIENT RECAF. MORALE DROPPING.", "alert"); });
  OS.register("42",     function (raw) { OS.echo(raw); OS.say("THE ANSWER IS CORRECT. THE QUESTION REMAINS CLASSIFIED.", ""); });
  OS.register("konami", function (raw) { OS.echo(raw); OS.say("Not typed. Pressed. You know the sequence.", "dim"); });

  /* ---------------- hire ---------------- */
  function hire(raw) {
    OS.echo(raw);
    out("+++ PERSONNEL TRANSFER ORDER +++", "", 200);
    out("SUBJECT ........ ALEXIS GONZALEZ", "", 120);
    out("BILLET ......... BACKEND / FULLSTACK DEVELOPER", "", 120);
    out("STATUS ......... APPROVED", "", 120);
    out("ROUTING TO VOX-CHANNELS ...", "dim", 700);
    OS.enqueue(function () { OS.goContact(); });
  }
  OS.register("hire", hire);
  OS.register("hire alexis", hire);
  OS.register("hire me", hire);

  /* ---------------- matrix ---------------- */
  OS.register("matrix", function (raw) {
    OS.echo(raw);
    if (OS.reduceMotion) { OS.say("THE DATA RAIN IS DISABLED (reduced motion).", "dim"); return; }
    const crt = document.getElementById("crt");
    const c = document.createElement("canvas");
    c.className = "matrix-rain";
    crt.appendChild(c);
    const ctx = c.getContext && c.getContext("2d");
    if (!ctx) { c.remove(); return; }
    const size = 18;
    c.width = crt.clientWidth;
    c.height = crt.clientHeight;
    const cols = Math.ceil(c.width / size);
    const drops = [];
    for (let i = 0; i < cols; i++) { drops.push(Math.random() * -40); }
    const color = getComputedStyle(document.body).getPropertyValue("--amber").trim() || "#ffb000";
    const glyphs = "01ABCDEF#$%&*+=<>[]{}/\\";
    const timer = setInterval(function () {
      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = color;
      ctx.font = size + "px VT323, monospace";
      for (let i = 0; i < cols; i++) {
        ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * size, drops[i] * size);
        if (drops[i] * size > c.height && Math.random() > 0.97) { drops[i] = 0; }
        drops[i]++;
      }
    }, 55);
    function stop() {
      clearInterval(timer);
      c.remove();
      document.removeEventListener("keydown", stop, true);
      document.removeEventListener("click", stop, true);
    }
    setTimeout(stop, 7000);
    setTimeout(function () {
      document.addEventListener("keydown", stop, true);
      document.addEventListener("click", stop, true);
    }, 300);
    OS.say("WAKE UP, VISITOR. (press any key)", "dim");
  });

  /* ---------------- Konami code: green phosphor "god mode" ---------------- */
  const KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  let kpos = 0;
  document.addEventListener("keydown", function (e) {
    const k = (e.key || "").toLowerCase();
    kpos = k === KONAMI[kpos] ? kpos + 1 : (k === KONAMI[0] ? 1 : 0);
    if (kpos === KONAMI.length) {
      kpos = 0;
      e.preventDefault();
      const on = !document.body.classList.contains("green-mode");
      document.body.classList.toggle("green-mode", on);
      OS.input.value = "";
      OS.say(on ? "+++ GOD MODE ENABLED. PHOSPHOR RECALIBRATED. +30 LIVES. +++"
                : "+++ GOD MODE DISABLED. AMBER RESTORED. +++", on ? "win" : "");
    }
  });
})();
