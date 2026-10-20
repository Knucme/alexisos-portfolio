/* ===================================================================
   AlexisOS // HANGMAN - hangman.js
   Guess the word one letter at a time. Every miss adds a part to a
   robot on the assembly stand; six misses and it's complete (you lose).
   Words come from HANGMAN_WORDS in content.js. Each round shows a note
   on why that skill matters, and words don't repeat until all are used.
   =================================================================== */
(function () {
  "use strict";

  const MAX_MISSES = 6;
  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  /* ---------- Robot on the stand (no rope) ----------
     stage 0 = empty stand, then: head, eyes, body, left arm, right arm, legs */
  function robot(stage, lost) {
    const s = stage;
    const eyes = lost ? "[x_x]" : (s >= 2 ? "[o_o]" : "[   ]");
    return [
      "  +---------+",
      "  |",
      "  |       " + (s >= 1 ? eyes : ""),
      "  |       " + (s >= 4 ? "/" : " ") + (s >= 3 ? "|=|" : "   ") + (s >= 5 ? "\\" : ""),
      "  |        " + (s >= 3 ? "|_|" : ""),
      "  |        " + (s >= 6 ? "/ \\" : ""),
      "  |    ===========",
      " _|_______________"
    ].join("\n");
  }

  function isLetter(ch) { return ch >= "A" && ch <= "Z"; }

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------- GAME STATE (no DOM) ---------- */
  function createGame(bank) {
    const game = { bank: bank, deck: [], entry: null, guessed: {}, misses: 0,
                   status: "playing", wins: 0, losses: 0, round: 0 };

    game.next = function () {
      if (!game.deck.length) {
        game.deck = shuffle(game.bank);
        // don't start a fresh deck with the word that was just played
        if (game.entry && game.deck.length > 1 && game.deck[0].word === game.entry.word) {
          game.deck.push(game.deck.shift());
        }
      }
      game.entry = game.deck.shift();
      game.guessed = {};
      game.misses = 0;
      game.status = "playing";
      game.round++;
    };

    game.word = function () { return game.entry.word.toUpperCase(); };

    game.solved = function () {
      return game.word().split("").every(function (ch) { return !isLetter(ch) || game.guessed[ch]; });
    };

    function finish() {
      if (game.solved()) { game.status = "won"; game.wins++; }
      else if (game.misses >= MAX_MISSES) { game.status = "lost"; game.losses++; }
    }

    /* Returns "hit", "miss", "repeat", "invalid", or "over". */
    game.guess = function (letter) {
      if (game.status !== "playing") { return "over"; }
      const L = String(letter).toUpperCase();
      if (!isLetter(L) || L.length !== 1) { return "invalid"; }
      if (game.guessed[L]) { return "repeat"; }
      game.guessed[L] = true;
      const hit = game.word().indexOf(L) >= 0;
      if (!hit) { game.misses++; }
      finish();
      return hit ? "hit" : "miss";
    };

    /* Guess the whole word. Wrong guesses cost one miss. */
    game.guessWord = function (text) {
      if (game.status !== "playing") { return "over"; }
      const clean = function (s) { return s.toUpperCase().replace(/[^A-Z]/g, ""); };
      if (clean(text) === clean(game.word())) {
        game.word().split("").forEach(function (ch) { if (isLetter(ch)) { game.guessed[ch] = true; } });
        finish();
        return "hit";
      }
      game.misses++;
      finish();
      return "miss";
    };

    game.masked = function (reveal) {
      return game.word().split("").map(function (ch) {
        if (ch === " ") { return "  "; }
        if (!isLetter(ch)) { return ch; }
        return (reveal || game.guessed[ch]) ? ch : "_";
      }).join(" ");
    };

    game.next();
    return game;
  }

  /* ---------- VIEW ---------- */
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text != null) { e.textContent = text; }
    return e;
  }

  function mount(game, opts) {
    const options = opts || {};
    const root = el("div", "hm");
    const stat = el("div", "hm-stat line dim");
    const body = el("div", "hm-body");
    const art = el("pre", "hm-robot");
    art.setAttribute("aria-hidden", "true");
    const side = el("div", "hm-side");
    const hint = el("div", "line hm-hint");
    const word = el("div", "hm-word");
    const misses = el("div", "line hm-misses");
    side.appendChild(hint);
    side.appendChild(word);
    side.appendChild(misses);
    body.appendChild(art);
    body.appendChild(side);

    const keys = el("div", "hm-keys");
    const log = el("div", "hm-log line dim");
    const note = el("div", "hm-note para");
    const again = el("button", "opt cbtn hm-again", "[ NEW WORD ]");
    again.type = "button";
    again.addEventListener("click", function (e) { e.stopPropagation(); newRound(); acted(); });

    root.appendChild(stat);
    root.appendChild(body);
    root.appendChild(keys);
    root.appendChild(log);
    root.appendChild(note);
    root.appendChild(again);

    function acted() { if (options.onAction) { options.onAction(); } }

    function say(text, cls) {
      log.className = "hm-log line " + (cls || "dim");
      log.textContent = text;
    }

    function flash(cls, ms) {
      root.classList.remove(cls);
      void root.offsetWidth;
      root.classList.add(cls);
      setTimeout(function () { root.classList.remove(cls); }, ms);
    }

    function draw() {
      const over = game.status !== "playing";
      stat.textContent = "ROUND " + game.round + "  //  WINS " + game.wins + "  //  LOSSES " + game.losses +
        "  //  WORDS LEFT IN BANK " + game.deck.length;
      art.textContent = robot(game.misses, game.status === "lost");
      art.classList.toggle("lost", game.status === "lost");
      hint.textContent = "HINT: " + game.entry.category;
      word.textContent = game.masked(over);
      word.classList.toggle("revealed", game.status === "lost");
      const wrong = Object.keys(game.guessed).filter(function (l) { return game.word().indexOf(l) < 0; });
      misses.textContent = "MISSES " + game.misses + "/" + MAX_MISSES + (wrong.length ? "  //  " + wrong.join(" ") : "");

      keys.innerHTML = "";
      ALPHABET.forEach(function (L) {
        const b = el("button", "opt hm-key", L);
        b.type = "button";
        if (game.guessed[L]) {
          b.disabled = true;
          b.classList.add(game.word().indexOf(L) >= 0 ? "hit" : "miss");
        } else if (over) {
          b.disabled = true;
        }
        b.addEventListener("click", function (e) { e.stopPropagation(); guess(L); acted(); });
        keys.appendChild(b);
      });

      note.style.display = over ? "" : "none";
      again.style.display = over ? "" : "none";
      if (over) { note.textContent = "WHY IT MATTERS: " + game.entry.note; }
    }

    function afterGuess(result, what) {
      draw();
      if (result === "over")    { say("ROUND OVER. CLICK NEW WORD OR TYPE NEW."); return; }
      if (result === "repeat")  { say("ALREADY TRIED " + what + "."); return; }
      if (result === "invalid") { say("LETTERS ONLY."); return; }
      if (game.status === "won") {
        say("+++ WORD DECODED: " + game.word() + ". ROBOT ASSEMBLY HALTED. +++", "win");
        flash("won", 2600);
        return;
      }
      if (game.status === "lost") {
        say("ROBOT FULLY ASSEMBLED. THE WORD WAS: " + game.word() + ".", "alert");
        flash("lost-flash", 1200);
        return;
      }
      say(result === "hit" ? what + ": MATCH." : what + ": NO MATCH. A PART IS ADDED TO THE ROBOT.",
          result === "hit" ? "good" : "dim");
    }

    function guess(L) { afterGuess(game.guess(L), L); }

    function newRound() {
      game.next();
      draw();
      say("NEW WORD LOADED. CLICK A LETTER OR TYPE ONE AT THE PROMPT.");
    }

    draw();
    say(game.status === "playing"
      ? "CLICK A LETTER OR TYPE ONE AT THE PROMPT. TYPE THE WHOLE WORD TO GUESS IT."
      : "ROUND OVER. CLICK NEW WORD OR TYPE NEW.");

    /* Typed input from the terminal prompt. */
    function command(text) {
      const t = String(text).trim();
      const w = t.toLowerCase();
      if (w === "new" || w === "next" || w === "again" || w === "replay" || w === "new word") {
        newRound(); return true;
      }
      if (w === "hint") { say("HINT: " + game.entry.category + ". " + game.word().replace(/[^A-Z]/g, "").length + " LETTERS."); return true; }
      if (/^[a-z]$/i.test(t)) { guess(t.toUpperCase()); return true; }
      if (/^[a-z][a-z +.\-]*$/i.test(t)) {
        afterGuess(game.guessWord(t), t.toUpperCase());
        return true;
      }
      return false;
    }

    return { el: root, command: command };
  }

  window.Hangman = { createGame: createGame, mount: mount, robot: robot, MAX_MISSES: MAX_MISSES };
})();
