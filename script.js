/* ===================================================================
   AlexisOS - script.js
   Handles windows, the Start menu, the taskbar, the clock, and the
   fake terminal. Plain JavaScript, no frameworks.

   HOW IT WORKS:
   - Every window in index.html has the id "win-<name>" (e.g. win-projects).
   - Desktop icons / Start menu items carry data-window="<name>".
   - openWindow(name) shows a window; the taskbar tracks what is open.
   =================================================================== */

(function () {
  "use strict";

  /* ----------------------------------------------------------------
     STATE
     ---------------------------------------------------------------- */
  let zIndexCounter = 100;        // Increments so the newest window is on top.
  let cascadeOffset = 0;          // Diagonal offset, used only if every spot is full.

  /* Window placement is dynamic — see findWindowSpot() below. A window
     opens centered; if the center is taken it moves to the nearest free
     space (left, right, above, or below) so windows never overlap. */

  /* ----------------------------------------------------------------
     VIDEOS CONFIG
     The Videos window is a folder that contains two sub-folders of
     Vimeo tutorials:
       tech  - short tutorials on tech topics
       cs    - walkthroughs of computer science concepts
     Add a new video by copying an existing entry into the right
     category's "videos" array. Each video is embedded from Vimeo,
     so viewers just hit play in the window - no downloads or links.

     For each video set:
       title       - shown above the player
       description - optional short caption under the title
       vimeo       - Vimeo video ID or URL. Accepts any of:
                       "76979871"                       (public video)
                       "76979871/a1b2c3d4e5"            (unlisted, id/hash)
                       "https://vimeo.com/76979871"     (full URL)
                       "https://vimeo.com/76979871/abc" (full URL with hash)
     ---------------------------------------------------------------- */
  const VIDEOS = {
    tech: {
      name: "Tech Tutorials",
      glyph: "🛠️",
      description: "Short tutorials on tech topics — the kind of stuff I've had to figure out and want to save others from figuring out from scratch.",
      videos: [
        // Add tutorials here. Each entry: { title, description, vimeo }.
      ]
    },
    cs: {
      name: "Computer Science Tutorials",
      glyph: "🎓",
      description: "Walkthroughs of computer science concepts — algorithms, data structures, and the ideas I've found worth explaining.",
      videos: [
        // Add tutorials here. Each entry: { title, description, vimeo }.
      ]
    }
  };

  /* ----------------------------------------------------------------
     PROJECTS CONFIG
     This is the single place to edit your projects. Each project
     appears in the Projects window and, when clicked, opens a
     detail window.

     For each project set:
       name        - the project title
       tech        - short tech stack line
       description - a longer paragraph about the project
       github      - "owner/repo" on GitHub, or "" if there is none yet.
                     Example: github: "Knucme/poker-shuffler"
                     When set, the detail window shows a "View on GitHub"
                     link and a button that pulls live repo info.
     ---------------------------------------------------------------- */
  const PROJECTS = {
    pos: {
      name: "SE370 Point of Sale System",
      tech: "Java",
      description: "I built this point of sale system for my SE370 " +
        "software engineering course. I'll write up the architecture, " +
        "the features I worked on, and what I learned here.",
      github: ""
    },
    survey: {
      name: "Statistics Survey Website",
      tech: "HTML, CSS, JavaScript",
      description: "A web app I made for collecting and analyzing survey " +
        "responses. I'll add details on the stack I used and the " +
        "insights it produced.",
      github: ""
    },
    horus: {
      name: "Horus Heresy Spoiler-Free Character Tracker",
      tech: "JavaScript",
      description: "A tool I'm building to track characters across the " +
        "Horus Heresy series without spoilers. I'll explain how the " +
        "spoiler free filtering works here.",
      github: ""
    },
    poker: {
      name: "Java Poker Card Shuffler",
      tech: "Java",
      description: "A Java program I wrote that models a deck of cards " +
        "and different shuffling algorithms. I'll add notes on the " +
        "algorithms and how I tested them.",
      github: ""
    }
  };

  /* ----------------------------------------------------------------
     GAMES CONFIG
     Each game shows up as an icon in the Games window. Clicking an
     icon opens that game in its own window.

     For each game set:
       name        - the game's title
       glyph       - an emoji used as a fallback icon if no image is
                     found at the "image" path below
       image       - path to the game's icon image
                     (save it as images/games/<name>.png)
       type        - "doom" for the playable Doom embed, or
                     "placeholder" for a game that isn't built yet
       description - shown for "placeholder" games

     DOOM_ARCHIVE_ID is the Internet Archive item used for Doom. Swap
     it for another identifier to use a different version.
     ---------------------------------------------------------------- */
  const DOOM_ARCHIVE_ID = "msdos_DOOM_1993";

  const GAMES = [
    {
      name: "Doom",
      glyph: "👹",
      image: "images/games/doom.png",
      type: "doom"
    },
    {
      name: "Snake",
      glyph: "🐍",
      image: "images/games/snake.png",
      type: "placeholder",
      description: "I haven't built Snake yet. I'm planning to make it a " +
        "playable mini-game — check back soon!"
    },
    {
      name: "Tic Tac Toe",
      glyph: "⭕",
      image: "images/games/tictactoe.png",
      type: "placeholder",
      description: "Tic Tac Toe isn't built yet. I'm planning to add it " +
        "as a playable mini-game — check back soon!"
    },
    {
      name: "Text Adventure",
      glyph: "📜",
      image: "images/games/textadventure.png",
      type: "placeholder",
      description: "My Text Adventure game is still in the works. I'm " +
        "planning to make it playable — check back soon!"
    }
  ];

  /* ----------------------------------------------------------------
     BLOG CONFIG
     The Blog window is a folder that contains two sub-folders:
       tech      - writeups on tech problems I've solved
       leetcode  - LeetCode problems I found challenging, with writeups
     Add new posts by copying an existing entry inside the right
     category's "posts" array. To add a whole new category, add a new
     top-level key here (its name, glyph, description, and posts).

     For each post set:
       id       - short unique key (used for the terminal file name)
       title    - the post headline
       subtitle - optional smaller line under the title
       date     - date string (e.g. "2026")
       tags     - array of short tag labels (optional)
       excerpt  - one-line summary shown in the post list
       vimeo    - Vimeo video ID as a string, or "" for no video
                  (e.g. vimeo: "76979871")
       content  - an array of blocks; each block is one of:
                    { p: "..." }        -> paragraph
                    { h3: "..." }       -> section heading
                    { ul: ["...","..."] } -> bulleted list
     ---------------------------------------------------------------- */
  const BLOGS = {
    tech: {
      name: "Tech Blog",
      glyph: "📝",
      description: "Writeups on real tech problems I've solved.",
      posts: [
        {
          id: "printer-thermal-paper",
          title: "A Portable Printer That Wouldn't Print",
          subtitle: "",
          date: "2025",
          tags: ["Hardware", "Printer", "Troubleshooting"],
          excerpt: "A truck driver at the gate I worked showed up with a brand-new portable printer that would take print jobs and feed paper but print nothing. The fix was simple once I knew what to look for.",
          vimeo: "",
          content: [
            { p: "Not all troubleshooting happens at a help desk. This one happened in 2025 at a truck gate, where drivers get their paperwork sorted before a load moves. A driver rolled up to my window frustrated because she couldn't print a single sheet of paper." },
            { h3: "The setup: no BOL, no load" },
            { p: "If you haven't worked around freight: the bill of lading (BOL) is the document that makes a shipment official. It lists the load, the destination, and who's responsible. No BOL, no load. At a busy gate, one stuck driver holds up everyone behind her too." },
            { p: "This driver had come prepared. She'd just bought a portable printer, one of those small battery-powered units that lives in the cab and prints from a phone. Smart buy for the job. Except it wasn't printing, the paperwork wasn't getting done, and the truck wasn't moving." },
            { h3: "Talk to the driver first" },
            { p: "Before touching anything, I asked her about the printer. That's where the most useful clue came from: it was brand new. She'd bought it recently and this was one of its first real jobs." },
            { p: "That matters. A printer that worked for months and stopped points at something that changed. A printer that has never worked points at setup: wrong settings, wrong assumptions, or wrong supplies." },
            { h3: "Check the obvious" },
            { p: "I worked through the layers one at a time. Physically, the printer looked fine. I opened it up and confirmed the paper roll was seated properly and feeding correctly, since a misloaded roll is the top cause of 'new printer won't print.' It was fed right." },
            { p: "Next, the connection. Her phone paired with the printer without any issue. When she sent the BOL, the printer accepted the job. No errors, no timeouts. The printer said yes to everything and produced a blank page. Paper moved, job completed, nothing on the sheet." },
            { p: "That combination narrows things down. If the phone couldn't connect, the problem is Bluetooth or the app. If the printer rejected the job, the problem is a driver or format. But 'accepts the job, feeds the paper, prints nothing' means the data path is working and the failure is at the last step, where marks are supposed to end up on the page." },
            { h3: "Read the specs" },
            { p: "I looked up the printer's brand and model on my phone. There was the answer: it was a thermal printer. Thermal printers don't use ink or toner. The printhead is a row of small heating elements, and the 'ink' is in the paper itself, a heat-sensitive coating that darkens where the head heats it. Receipt printers work the same way, which is why grocery receipts fade in a hot car." },
            { p: "Feed a thermal printer plain paper and it will do everything correctly. Accept the job, heat the printhead, feed the page, and produce nothing, because plain paper has no coating to react. The printer wasn't broken. Plain paper just doesn't have the coating that thermal printers need." },
            { h3: "The fix" },
            { p: "I asked her whether the printer came with any rolls of its own. She checked the packaging and found a starter roll of thermal paper. We swapped it in, she resent the BOL, and the printer printed it cleanly on the first try. Paperwork in hand, load accepted, and the line at the gate started moving again. Cost: zero dollars, about ten minutes." },
            { h3: "Takeaways" },
            { ul: [
              "Ask the user about the hardware before touching it. 'It's brand new' pointed the whole investigation at setup and supplies instead of a fault.",
              "Troubleshoot in layers: physical, connection, output. Each layer that comes back clean narrows where the fault can hide. 'Job accepted but nothing prints' ruled out everything except the page itself.",
              "Know your printer types. Thermal printers have no ink. The paper is the consumable, and the wrong roll fails silently with no error.",
              "Check what came in the box. Manufacturers include starter supplies for exactly this reason. The fix was in her cab the whole time.",
              "Thirty seconds of reading about the model beats twenty minutes of poking at settings."
            ] },
            { p: "One more thing: if you're not sure whether a roll is thermal paper or plain, drag a fingernail across it. Thermal paper leaves a faint gray streak where the coating reacts to friction. Plain paper won't mark. It's the fastest way to tell them apart." }
          ]
        },
        {
          id: "drive-swap",
          title: "The Hard Drive Swap That Refused to Boot",
          subtitle: "",
          date: "2026",
          tags: ["Hardware", "BIOS", "Windows"],
          excerpt: "Moving an SSD from an old Dell to a newer HP desktop should have been a quick swap. It wasn't. The fix came down to UEFI vs. legacy boot, plus getting HP Sure Recover out of the way.",
          vimeo: "",
          content: [
            { p: "I wanted to move my SSD from an old Dell OptiPlex 3020 running Windows 10 into a newer HP desktop. Both machines already had the same model of drive, so I figured it would be a quick swap. It took a few days. Most of that was figuring out UEFI vs. legacy boot, and getting past an HP feature that kept trying to reinstall Windows on top of my data." },
            { h3: "The first symptom: 'Start PXE over IPv4'" },
            { p: "First boot with the swapped drive, I got a black screen that said 'Start PXE over IPv4.' That message looks like a network problem, but it isn't. It means the firmware couldn't find anything bootable on any of the drives, so it tried the network as a last resort." },
            { p: "Before assuming the drive was the problem, I checked the BIOS. The drive was detected as 'SATA0: Samsung SSD 870 EVO 500GB.' The cable was seated. The computer could see the drive. It just wouldn't boot from it." },
            { h3: "UEFI vs. legacy boot" },
            { p: "Modern PCs can boot two different ways. UEFI expects a GPT-formatted drive. Legacy BIOS boot expects an MBR-formatted drive. If the firmware is set to boot one way but the drive is formatted the other way, the firmware acts like there's no operating system on the drive at all." },
            { p: "The HP shipped with Windows 11, so it was set up for UEFI and Secure Boot. My drive came from a 2014 Dell, so it was almost certainly MBR and legacy. In the HP's BIOS I switched 'Configure Legacy Support and Secure Boot' to 'Legacy Support Enable and Secure Boot Disable,' confirmed the change with the four-digit code HP asks for, and moved the SSD to the top of the legacy boot order." },
            { p: "Now instead of the PXE screen I got a white 'HP Sure Recover' screen saying no operating system was found and offering to reinstall Windows. It warned in bold that this would erase everything on the drive. I did not accept." },
            { h3: "Testing the drive on its own" },
            { p: "To rule out the drive itself, I put it back in the Dell. It booted straight into Windows. Two built-in Windows tools confirmed the setup. msinfo32 (System Information) showed 'BIOS Mode: Legacy,' so the install really was MBR and legacy mode on the HP was the right call. Disk Management showed a small RECOVERY partition flagged 'System, Active' (that's where the startup files live) next to the main C: partition. The drive was healthy, bootable, and self-contained. So why wouldn't the HP boot it?" },
            { h3: "What was actually happening" },
            { p: "Back in the HP, with the legacy settings confirmed and Fast Boot off, the Sure Recover screen showed up again. This time I pressed Esc to cancel it, and Windows 10 booted normally. The drive had been bootable in the HP the whole time." },
            { p: "The sequence was: the HP tries its UEFI boot list first, doesn't find anything (the drive is legacy-formatted), and calls that a boot failure. Instead of falling through to the legacy boot list, where my drive was sitting, HP Sure Recover intercepts the failure and shows the reinstall prompt. Every boot would stop at that screen, and its default action is wiping the drive." },
            { h3: "The fix" },
            { p: "Two BIOS changes fixed it. On the Advanced tab I opened HP Sure Recover and disabled the option that tries to recover on boot failure. In Boot Options I unchecked 'UEFI Boot Order' entirely, leaving only the legacy list. With no UEFI list to fail on, the firmware goes straight to the legacy list and boots Windows. A couple of restarts later, it was booting on its own." },
            { h3: "Takeaways" },
            { ul: [
              "A PXE boot screen isn't a network problem. It means the firmware couldn't find anything to boot from. Check drive detection first, then boot mode.",
              "The model of the drive doesn't matter. What matters is how the OS was installed on it. MBR needs legacy boot, GPT needs UEFI.",
              "Before moving a boot drive, spend two minutes on the source machine. msinfo32 shows the BIOS mode. Disk Management shows where the boot files actually live.",
              "If a recovery screen offers to erase the drive, press Esc first. My data was fine the whole time.",
              "Firmware 'protection' features assume the factory setup. Once you change the setup, they can get in the way."
            ] },
            { p: "One thing still to sort out: Windows licenses are tied to the motherboard they were activated on, so the HP will eventually flag Windows as not activated. That's a separate task. The rest of it, three different 'no OS here' screens for a healthy bootable drive, came down to a boot-mode mismatch and a recovery feature that kept intercepting the fallback." }
          ]
        }
      ]
    },
    leetcode: {
      name: "LeetCode",
      glyph: "🧩",
      description: "LeetCode problems I found challenging, with my full writeup — first attempts, where I got stuck, and what finally clicked.",
      posts: [
        // I'll add my LeetCode writeups here as I work through problems.
        // Copy the drive-swap post above as a template.
      ]
    }
  };

  /* ----------------------------------------------------------------
     ELEMENT REFERENCES
     ---------------------------------------------------------------- */
  const desktop        = document.getElementById("desktop");
  const startButton    = document.getElementById("start-button");
  const startMenu      = document.getElementById("start-menu");
  const taskbarWindows = document.getElementById("taskbar-windows");
  const clockEl        = document.getElementById("clock");

  /* ================================================================
     WINDOW MANAGEMENT
     ================================================================ */

  /* Bring a window to the front and mark its taskbar button active. */
  function focusWindow(win) {
    zIndexCounter += 1;
    win.style.zIndex = zIndexCounter;

    // Update taskbar button highlighting.
    document.querySelectorAll(".taskbar-window-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.window === win.dataset.name);
    });
  }

  /* ----------------------------------------------------------------
     WINDOW PLACEMENT
     A new window opens centered. If the center is already taken, it
     is placed in the nearest free space (left, right, above, below,
     then the corners) so that open windows never overlap.
     ---------------------------------------------------------------- */

  /* True if rectangles a and b overlap at all. */
  function rectsOverlap(a, b) {
    return a.left < b.left + b.width &&
           b.left < a.left + a.width &&
           a.top  < b.top  + b.height &&
           b.top  < a.top  + a.height;
  }

  /* Rectangles of every window that is currently open (visible),
     skipping the one passed in. */
  function openWindowRects(exclude) {
    const rects = [];
    document.querySelectorAll(".window").forEach(function (w) {
      if (w === exclude || w.classList.contains("hidden")) {
        return;
      }
      rects.push({
        left:   w.offsetLeft,
        top:    w.offsetTop,
        width:  w.offsetWidth,
        height: w.offsetHeight
      });
    });
    return rects;
  }

  /* Find a non-overlapping spot for a window. Tries the center first,
     then left / right / above / below, then the four corners. Falls
     back to a small diagonal cascade if every spot is taken. */
  function findWindowSpot(win) {
    const gap   = 20;
    const areaW = window.innerWidth;
    const areaH = window.innerHeight - 36;   // Desktop minus the taskbar.
    const winW  = win.offsetWidth  || 460;
    const winH  = win.offsetHeight || 320;

    const cx = (areaW - winW) / 2;           // Centered left.
    const cy = (areaH - winH) / 2;           // Centered top.

    // Candidate positions, tried in this order.
    const candidates = [
      { left: cx,              top: cy              }, // center
      { left: cx - winW - gap, top: cy              }, // left
      { left: cx + winW + gap, top: cy              }, // right
      { left: cx,              top: cy - winH - gap }, // above
      { left: cx,              top: cy + winH + gap }, // below
      { left: cx - winW - gap, top: cy - winH - gap }, // top-left
      { left: cx + winW + gap, top: cy - winH - gap }, // top-right
      { left: cx - winW - gap, top: cy + winH + gap }, // bottom-left
      { left: cx + winW + gap, top: cy + winH + gap }  // bottom-right
    ];

    const others = openWindowRects(win);

    for (let i = 0; i < candidates.length; i++) {
      // Clamp the candidate so the window stays fully on screen.
      const left = Math.min(Math.max(candidates[i].left, 8),
                            Math.max(8, areaW - winW - 8));
      const top  = Math.min(Math.max(candidates[i].top, 8),
                            Math.max(8, areaH - winH - 8));
      const rect = { left: left, top: top, width: winW, height: winH };

      // Accept the first spot that overlaps no open window.
      let free = true;
      for (let j = 0; j < others.length; j++) {
        if (rectsOverlap(rect, others[j])) {
          free = false;
          break;
        }
      }
      if (free) {
        return { left: left, top: top };
      }
    }

    // Every spot is taken: fall back to a small diagonal cascade.
    const left = Math.min(40 + cascadeOffset, Math.max(8, areaW - winW - 8));
    const top  = Math.min(40 + cascadeOffset, Math.max(8, areaH - winH - 8));
    cascadeOffset = (cascadeOffset + 28) % 170;
    return { left: left, top: top };
  }

  /* Open (or restore) a window by its short name, e.g. "projects".
     Special case: "resume" is not an in-app window - it opens the
     standalone resume.html PDF page in a new browser tab. */
  function openWindow(name) {
    if (name === "resume") {
      window.open("resume.html", "_blank", "noopener");
      return;
    }

    const win = document.getElementById("win-" + name);
    if (!win) {
      return;
    }

    win.dataset.name = name;

    // Was the window closed (hidden) before this click?
    const wasHidden = win.classList.contains("hidden");

    // Show the window so its real size can be measured for placement.
    win.classList.remove("hidden");

    // Place the window every time it opens from a closed state, so it
    // lands centered or in the nearest free space. (Restoring a
    // minimized window from the taskbar does not call openWindow, so
    // minimized windows still come back exactly where they were.)
    if (wasHidden) {
      const spot = findWindowSpot(win);
      win.style.left = spot.left + "px";
      win.style.top  = spot.top  + "px";
    }

    focusWindow(win);
    addTaskbarButton(name, win);

    // If it is the terminal, focus the input for immediate typing.
    if (name === "terminal") {
      const input = document.getElementById("terminal-input");
      if (input) {
        input.focus();
      }
    }
  }

  /* Hide a window without removing it (Close). */
  function closeWindow(win) {
    win.classList.add("hidden");
    removeTaskbarButton(win.dataset.name);
  }

  /* Minimize: hide the window but keep its taskbar button. */
  function minimizeWindow(win) {
    win.classList.add("hidden");
    const btn = taskbarWindows.querySelector(
      '[data-window="' + win.dataset.name + '"]'
    );
    if (btn) {
      btn.classList.remove("active");
    }
  }

  /* ================================================================
     TASKBAR BUTTONS
     ================================================================ */

  function addTaskbarButton(name, win) {
    // Don't add a duplicate button if the window is already tracked.
    if (taskbarWindows.querySelector('[data-window="' + name + '"]')) {
      return;
    }

    const btn = document.createElement("button");
    btn.className = "taskbar-window-btn";
    btn.dataset.window = name;
    btn.textContent = win.dataset.title || name;

    // Clicking a taskbar button toggles minimize / restore + focus.
    btn.addEventListener("click", function () {
      const isHidden = win.classList.contains("hidden");
      const isActive = btn.classList.contains("active");

      if (isHidden) {
        // Restore a minimized window.
        win.classList.remove("hidden");
        focusWindow(win);
      } else if (isActive) {
        // Already focused and visible -> minimize it.
        minimizeWindow(win);
      } else {
        // Visible but behind something -> bring to front.
        focusWindow(win);
      }
    });

    taskbarWindows.appendChild(btn);
  }

  function removeTaskbarButton(name) {
    const btn = taskbarWindows.querySelector('[data-window="' + name + '"]');
    if (btn) {
      btn.remove();
    }
  }

  /* ================================================================
     WINDOW DRAGGING
     ================================================================ */

  /* True on phone-sized screens. Matches the CSS phone breakpoint, so
     windows there are full-screen and dragging is turned off. */
  function isMobile() {
    return window.matchMedia("(max-width: 600px)").matches;
  }

  function makeDraggable(win) {
    const titleBar = win.querySelector(".window-title-bar");
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    titleBar.addEventListener("mousedown", function (e) {
      // Ignore drags that start on the control buttons.
      if (e.target.classList.contains("win-btn")) {
        return;
      }
      // No dragging on phones - windows are full-screen there.
      if (isMobile()) {
        return;
      }
      dragging = true;
      offsetX = e.clientX - win.offsetLeft;
      offsetY = e.clientY - win.offsetTop;
      focusWindow(win);
      e.preventDefault();
    });

    document.addEventListener("mousemove", function (e) {
      if (!dragging) {
        return;
      }
      let newLeft = e.clientX - offsetX;
      let newTop  = e.clientY - offsetY;

      // Keep the window roughly on-screen.
      const maxLeft = window.innerWidth - 60;
      const maxTop  = window.innerHeight - 70;   // Above the taskbar.
      newLeft = Math.min(Math.max(newLeft, -win.offsetWidth + 80), maxLeft);
      newTop  = Math.min(Math.max(newTop, 0), maxTop);

      win.style.left = newLeft + "px";
      win.style.top  = newTop + "px";
    });

    document.addEventListener("mouseup", function () {
      dragging = false;
    });
  }

  /* ================================================================
     WIRE UP EACH WINDOW
     ================================================================ */

  document.querySelectorAll(".window").forEach(function (win) {
    makeDraggable(win);

    // Clicking anywhere on a window brings it to the front.
    win.addEventListener("mousedown", function () {
      focusWindow(win);
    });

    // Minimize button.
    win.querySelector(".win-min").addEventListener("click", function (e) {
      e.stopPropagation();
      minimizeWindow(win);
    });

    // Close button.
    win.querySelector(".win-close").addEventListener("click", function (e) {
      e.stopPropagation();
      closeWindow(win);
    });
  });

  /* ================================================================
     DESKTOP ICONS
     ================================================================ */

  document.querySelectorAll(".desktop-icon").forEach(function (icon) {
    // Single click opens the window (simple and reliable for v1).
    icon.addEventListener("click", function () {
      openWindow(icon.dataset.window);
    });
  });

  /* ================================================================
     START MENU
     ================================================================ */

  function toggleStartMenu(forceClose) {
    const willClose = forceClose || !startMenu.classList.contains("hidden");
    startMenu.classList.toggle("hidden", willClose);
    startButton.classList.toggle("active", !willClose);
  }

  startButton.addEventListener("click", function (e) {
    e.stopPropagation();
    toggleStartMenu(false);
  });

  // Start menu items open their window and close the menu.
  document.querySelectorAll(".start-menu-item").forEach(function (item) {
    item.addEventListener("click", function () {
      openWindow(item.dataset.window);
      toggleStartMenu(true);
    });
  });

  // Clicking anywhere else closes the Start menu.
  document.addEventListener("click", function (e) {
    if (!startMenu.contains(e.target) && e.target !== startButton) {
      toggleStartMenu(true);
    }
  });

  /* ================================================================
     CLOCK  (updates every minute)
     ================================================================ */

  function updateClock() {
    // Always show Pacific time, regardless of the visitor's location.
    // "America/Los_Angeles" handles PST/PDT (daylight saving) automatically.
    const time = new Date().toLocaleTimeString("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "numeric",
      minute: "2-digit"
    });
    clockEl.textContent = time + " PT";
  }

  updateClock();
  setInterval(updateClock, 60 * 1000);   // Refresh once per minute.

  /* ================================================================
     FAKE TERMINAL
     ================================================================ */

  const terminalInput  = document.getElementById("terminal-input");
  const terminalOutput = document.getElementById("terminal-output");

  /* ---------------------------------------------------------------
     VIRTUAL FILE SYSTEM
     This is a FAKE file system that lives only in the browser - it
     does NOT touch the visitor's real computer. Folders are objects,
     files are strings (their contents). Edit the text freely.
     The "projects" folder is filled in automatically from the
     PROJECTS config near the top of this file.
     --------------------------------------------------------------- */
  const FILE_SYSTEM = {
    "about.txt":
      "AlexisOS v1.0\n\n" +
      "A Windows XP inspired personal portfolio, built with plain\n" +
      "HTML, CSS, and JavaScript.\n\n" +
      "Use 'ls' (or 'dir') to list files, 'cd <folder>' to move\n" +
      "around, and 'cat <file>' to read a file.",
    "contact.txt":
      "CONTACT\n\n" +
      "Email:    me@argonzalez.com\n" +
      "GitHub:   github.com/Knucme\n" +
      "LinkedIn: linkedin.com/in/a-gonzo",
    "projects": {
      // Filled in by the loop below.
    },
    "blogs": {
      // Filled in by the loop below.
    },
    "resume": {
      "education.txt":
        "EDUCATION\n\n" +
        "California State University San Marcos\n" +
        "  B.S. Computer Science | Jan 2026 - Dec 2027\n\n" +
        "Fullstack Academy\n" +
        "  Software Engineering Immersive | Oct 2023 - Apr 2024\n\n" +
        "NPower - IT Fundamentals | Feb 2023 - Jun 2023\n" +
        "  Earned Google IT Support and CompTIA ITF+ certifications.",
      "skills.txt":
        "SKILLS\n\n" +
        "Languages:   Java, JavaScript, Python, SQL\n" +
        "Frameworks:  Spring Boot, Node.js, Express, React\n" +
        "Tools:       PostgreSQL, REST APIs, WebSockets, JWT, Git\n" +
        "Learning:    automated testing, Docker, cloud deployment",
      "experience.txt":
        "EXPERIENCE\n\n" +
        "Security Supervisor - Allied Universal\n" +
        "  Mar 2016 - Sep 2020 | Oceanside, California\n" +
        "  Led a team of security officers across multiple shifts.\n\n" +
        "Master at Arms - US Navy\n" +
        "  Jan 2011 - Sep 2019 | San Diego, California\n" +
        "  Navy law enforcement and security; led teams and ran\n" +
        "  training programs."
    }
  };

  // Build a text file inside /projects for each project in PROJECTS.
  Object.keys(PROJECTS).forEach(function (id) {
    const p = PROJECTS[id];
    FILE_SYSTEM.projects[id + ".txt"] =
      p.name + "\n" +
      "Tech: " + p.tech + "\n\n" +
      p.description +
      (p.github ? "\n\nGitHub: github.com/" + p.github : "");
  });

  // Convert a blog post's structured content into plain text for the
  // terminal file view.
  function blogPostToText(post) {
    let out = post.title + "\n";
    if (post.subtitle) { out += "(" + post.subtitle + ")\n"; }
    out += post.date;
    if (post.tags && post.tags.length) { out += "  |  " + post.tags.join(", "); }
    out += "\n\n";
    post.content.forEach(function (block) {
      if (block.h3) {
        out += "\n" + block.h3.toUpperCase() + "\n\n";
      } else if (block.p) {
        out += block.p + "\n\n";
      } else if (block.ul) {
        block.ul.forEach(function (item) { out += "  - " + item + "\n"; });
        out += "\n";
      }
    });
    return out.trimEnd();
  }

  // Build the /blogs folder tree: one sub-folder per BLOGS category,
  // each holding one text file per post.
  FILE_SYSTEM.blogs = {};
  Object.keys(BLOGS).forEach(function (catId) {
    FILE_SYSTEM.blogs[catId] = {};
    BLOGS[catId].posts.forEach(function (post) {
      FILE_SYSTEM.blogs[catId][post.id + ".txt"] = blogPostToText(post);
    });
  });

  // The folder the terminal is currently "in". [] means the root.
  let currentPath = [];

  /* ---------------------------------------------------------------
     FILE SYSTEM HELPERS
     --------------------------------------------------------------- */

  /* Return the folder/file object at a given path array, or null. */
  function getNode(pathArray) {
    let node = FILE_SYSTEM;
    for (let i = 0; i < pathArray.length; i++) {
      if (!node || typeof node !== "object") {
        return null;
      }
      node = node[pathArray[i]];
    }
    return node;
  }

  /* Turn a path argument (e.g. "../resume") into a path array,
     or return null if it does not point to anything that exists. */
  function resolvePath(arg) {
    // Absolute paths start at the root; otherwise start where we are.
    let path = (arg.charAt(0) === "/") ? [] : currentPath.slice();
    const parts = arg.split("/");

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part === "" || part === ".") {
        continue;                       // Ignore empty and "current dir".
      }
      if (part === "~") {
        path = [];                      // "~" jumps to the root.
        continue;
      }
      if (part === "..") {
        path = path.slice(0, -1);       // ".." goes up one level.
        continue;
      }
      const here = getNode(path);
      if (!here || typeof here !== "object" || !(part in here)) {
        return null;                    // No such file or folder.
      }
      path = path.concat(part);
    }
    return path;
  }

  /* Current path as a string, e.g. "/" or "/projects". */
  function pathString() {
    return "/" + currentPath.join("/");
  }

  /* The prompt text, e.g. "alex@alexos:/projects$". */
  function promptString() {
    return "alex@alexos:" + pathString() + "$";
  }

  /* Update the prompt shown next to the input box. */
  function updatePromptDisplay() {
    const promptEl = document.querySelector(".terminal-prompt");
    if (promptEl) {
      promptEl.textContent = promptString();
    }
  }

  /* ---------------------------------------------------------------
     FILE SYSTEM COMMANDS
     --------------------------------------------------------------- */

  /* "ls" / "dir" - list the contents of a folder. */
  function listDir(arg) {
    const target = (arg === "") ? currentPath : resolvePath(arg);
    if (target === null) {
      return "ls: no such file or directory: " + arg;
    }
    const node = getNode(target);
    if (typeof node === "string") {
      return arg;                       // Argument pointed at a file.
    }
    const keys = Object.keys(node);
    if (keys.length === 0) {
      return "(empty folder)";
    }
    // Folders get a trailing slash so they stand out.
    return keys.map(function (k) {
      return (typeof node[k] === "object") ? k + "/" : k;
    }).join("    ");
  }

  /* "cd" - change the current folder. */
  function changeDir(arg) {
    if (arg === "" || arg === "~" || arg === "/") {
      currentPath = [];                 // No argument -> go to the root.
      updatePromptDisplay();
      return;
    }
    const target = resolvePath(arg);
    if (target === null) {
      terminalPrint("cd: no such directory: " + arg);
      return;
    }
    if (typeof getNode(target) === "string") {
      terminalPrint("cd: not a directory: " + arg);
      return;
    }
    currentPath = target;
    updatePromptDisplay();
  }

  /* "cat" - print the contents of a file. */
  function readFile(arg) {
    if (arg === "") {
      return "cat: missing file name";
    }
    const target = resolvePath(arg);
    if (target === null) {
      return "cat: no such file: " + arg;
    }
    const node = getNode(target);
    if (typeof node === "object") {
      return "cat: " + arg + " is a directory";
    }
    return node;
  }

  /* ---------------------------------------------------------------
     SIMPLE INFO COMMANDS
     Edit the text here to change what each prints.
     --------------------------------------------------------------- */
  const TERMINAL_COMMANDS = {
    help:
      "Available commands:\n" +
      "  help             - show this list\n" +
      "  about            - about AlexisOS\n" +
      "  ls / dir [path]  - list files in a folder\n" +
      "  cd <folder>      - change folder (use 'cd ..' to go up)\n" +
      "  pwd              - show the current folder\n" +
      "  cat <file>       - show a file's contents\n" +
      "  projects         - list my projects\n" +
      "  resume           - resume summary\n" +
      "  games            - list games\n" +
      "  blogs            - list blog folders\n" +
      "  contact          - contact info\n" +
      "  clear            - clear the screen\n\n" +
      "Tip: try 'ls', then 'cd blogs/tech', then 'cat drive-swap.txt'.",
    about:
      "AlexisOS v1.0\n" +
      "A Windows XP inspired personal portfolio, built with plain HTML, CSS, and JS.",
    projects:
      "Projects:\n" +
      "  1. SE370 Point of Sale System\n" +
      "  2. Statistics Survey Website\n" +
      "  3. Horus Heresy Spoiler-Free Character Tracker\n" +
      "  4. Java Poker Card Shuffler\n" +
      "(Open the Projects window, or 'cd projects' to explore.)",
    resume:
      "Resume:\n" +
      "  Click the Resume icon on the desktop to open my resume\n" +
      "  PDF in a new tab. Or 'cd resume' for a text version.",
    games:
      "Games:\n" +
      "  - Doom (playable - open the Games window)\n" +
      "  - Snake (coming soon)\n" +
      "  - Tic Tac Toe (coming soon)\n" +
      "  - Text Adventure (coming soon)",
    blogs:
      "Blogs:\n" +
      "  tech/       - Writeups on tech problems I've solved\n" +
      "  leetcode/   - LeetCode problems with writeups\n" +
      "(Open the Blogs window, or 'cd blogs' then 'ls' to explore.)",
    contact:
      "Contact:\n" +
      "  Email:    me@argonzalez.com\n" +
      "  GitHub:   github.com/Knucme\n" +
      "  LinkedIn: linkedin.com/in/a-gonzo"
  };

  /* Append a line of text to the terminal output area. */
  function terminalPrint(text) {
    terminalOutput.textContent += "\n" + text;
    // Auto-scroll to the newest line.
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }

  /* Run a single command string. */
  function runCommand(raw) {
    // Echo the command next to the prompt as it was when typed.
    terminalPrint(promptString() + " " + raw);

    const trimmed = raw.trim();
    if (trimmed === "") {
      return;
    }

    // Split into the command word and everything after it (the argument).
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg = parts.slice(1).join(" ");

    // File-system commands.
    switch (cmd) {
      case "clear":
        terminalOutput.textContent = "";
        return;
      case "ls":
      case "dir":
        terminalPrint(listDir(arg));
        return;
      case "cd":
        changeDir(arg);
        return;
      case "pwd":
        terminalPrint(pathString());
        return;
      case "cat":
      case "type":                      // "type" is the DOS equivalent.
        terminalPrint(readFile(arg));
        return;
    }

    // Simple info commands.
    if (TERMINAL_COMMANDS.hasOwnProperty(cmd)) {
      terminalPrint(TERMINAL_COMMANDS[cmd]);
    } else {
      terminalPrint('Command not found: "' + cmd + '". Type "help".');
    }
  }

  if (terminalInput) {
    terminalInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        runCommand(terminalInput.value);
        terminalInput.value = "";
      }
    });
    updatePromptDisplay();              // Show the starting prompt ("/").
  }

  /* ================================================================
     PROJECTS WINDOW + DETAIL WINDOW
     ================================================================ */

  /* Build the clickable project list inside the Projects window. */
  function renderProjectsList() {
    const listEl = document.getElementById("projects-list");
    if (!listEl) {
      return;
    }
    listEl.innerHTML = "";

    Object.keys(PROJECTS).forEach(function (id) {
      const p = PROJECTS[id];

      const item = document.createElement("button");
      item.className = "project-item";
      item.dataset.project = id;

      const nameEl = document.createElement("span");
      nameEl.className = "project-item-name";
      nameEl.textContent = p.name;

      const techEl = document.createElement("span");
      techEl.className = "project-item-tech";
      techEl.textContent = p.tech;

      item.appendChild(nameEl);
      item.appendChild(techEl);

      item.addEventListener("click", function () {
        openProjectDetail(id);
      });

      listEl.appendChild(item);
    });
  }

  /* Fill and open the detail window for one project. */
  function openProjectDetail(id) {
    const p = PROJECTS[id];
    if (!p) {
      return;
    }

    const win  = document.getElementById("win-project-detail");
    const body = document.getElementById("project-detail-body");

    // Show the project name in the title bar.
    win.querySelector(".window-title").textContent = p.name;
    win.dataset.title = p.name;

    // Rebuild the detail body from scratch.
    body.innerHTML = "";

    const h2 = document.createElement("h2");
    h2.textContent = p.name;
    body.appendChild(h2);

    const tech = document.createElement("p");
    tech.className = "detail-tech";
    const techLabel = document.createElement("strong");
    techLabel.textContent = "Tech: ";
    tech.appendChild(techLabel);
    tech.appendChild(document.createTextNode(p.tech));
    body.appendChild(tech);

    const desc = document.createElement("p");
    desc.textContent = p.description;
    body.appendChild(desc);

    // GitHub area.
    const ghWrap = document.createElement("div");
    ghWrap.className = "detail-github";

    if (p.github) {
      // "View on GitHub" opens the repo in a new browser tab.
      const link = document.createElement("a");
      link.className = "action-btn";
      link.href = "https://github.com/" + p.github;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "View on GitHub ↗";
      ghWrap.appendChild(link);

      // "Load live GitHub info" pulls repo stats into the window.
      const loadBtn = document.createElement("button");
      loadBtn.className = "action-btn";
      loadBtn.textContent = "Load live GitHub info";
      ghWrap.appendChild(loadBtn);

      const info = document.createElement("div");
      info.className = "github-info";
      ghWrap.appendChild(info);

      loadBtn.addEventListener("click", function () {
        loadGitHubInfo(p.github, info, loadBtn);
      });
    } else {
      // No repo set yet.
      const note = document.createElement("p");
      note.className = "detail-note";
      note.textContent =
        "No GitHub repo linked yet. Add one in the PROJECTS config " +
        "in script.js (set github: \"owner/repo\").";
      ghWrap.appendChild(note);
    }

    body.appendChild(ghWrap);

    openWindow("project-detail");

    // Keep the taskbar button label in sync with the current project.
    const tbBtn = document.querySelector(
      '.taskbar-window-btn[data-window="project-detail"]'
    );
    if (tbBtn) {
      tbBtn.textContent = p.name;
    }
  }

  /* Fetch live repo info from the GitHub API and show it in the window. */
  function loadGitHubInfo(repoPath, infoEl, btn) {
    infoEl.textContent = "Loading repo info from GitHub...";
    btn.disabled = true;

    fetch("https://api.github.com/repos/" + repoPath)
      .then(function (res) {
        if (!res.ok) {
          throw new Error("GitHub returned status " + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        infoEl.innerHTML = "";

        // Each row is a [label, value] pair.
        const rows = [
          ["Description", data.description || "(none)"],
          ["Language", data.language || "(not set)"],
          ["Stars", data.stargazers_count],
          ["Forks", data.forks_count],
          ["Open issues", data.open_issues_count],
          ["Last updated", new Date(data.pushed_at).toLocaleDateString()]
        ];

        rows.forEach(function (row) {
          const line = document.createElement("div");
          line.className = "gh-row";

          const label = document.createElement("span");
          label.className = "gh-label";
          label.textContent = row[0] + ": ";

          const value = document.createElement("span");
          value.textContent = row[1];

          line.appendChild(label);
          line.appendChild(value);
          infoEl.appendChild(line);
        });

        btn.disabled = false;
        btn.textContent = "Refresh GitHub info";
      })
      .catch(function (err) {
        infoEl.textContent =
          "Could not load GitHub info (" + err.message + "). " +
          "Check the repo path in script.js — the repo may be " +
          "private or may not exist yet.";
        btn.disabled = false;
      });
  }

  /* ================================================================
     VIDEOS WINDOW
     The Videos window is a folder that contains two playlist
     sub-folders (Tech Tutorials, Computer Science Tutorials).
     Clicking a folder shows an inline list of Vimeo players; each
     video plays in place with the standard Vimeo controls.
     ================================================================ */

  // Tracks what the Videos window is currently showing:
  //   null   -> root (the two playlist folders)
  //   catId  -> that playlist's list of Vimeo videos
  let videosCurrentCategory = null;

  /* Convert a Vimeo ID / hash / URL into a valid /embed/ URL. */
  function vimeoEmbedUrl(v) {
    if (!v) {
      return "";
    }
    // Strip protocol and any vimeo.com / player.vimeo.com / /video/ prefix.
    let s = v.replace(
      /^https?:\/\/(www\.)?(player\.)?vimeo\.com\/(video\/)?/,
      ""
    );
    // Handle "?h=..." style hashes from Vimeo's share URLs.
    if (s.indexOf("?h=") !== -1) {
      const parts = s.split("?h=");
      return "https://player.vimeo.com/video/" + parts[0] +
             "?h=" + parts[1].split(/[?&#]/)[0];
    }
    // Otherwise it should be "id" or "id/hash".
    const bits = s.split("/");
    return "https://player.vimeo.com/video/" + bits[0] +
           (bits[1] ? "?h=" + bits[1] : "");
  }

  /* Render the Videos window body (root folder view or a playlist). */
  function renderVideosWindow() {
    const body = document.getElementById("videos-body");
    if (!body) {
      return;
    }
    body.innerHTML = "";
    if (videosCurrentCategory === null || !VIDEOS[videosCurrentCategory]) {
      renderVideosRoot(body);
    } else {
      renderVideosCategory(body, videosCurrentCategory);
    }
  }

  /* Root view: two folder icons, one per VIDEOS category. */
  function renderVideosRoot(body) {
    const h2 = document.createElement("h2");
    h2.textContent = "Videos";
    body.appendChild(h2);

    const intro = document.createElement("p");
    intro.textContent = "Open a folder to watch the playlist.";
    body.appendChild(intro);

    // Reuses the same folder-grid styling as the Blogs window.
    const grid = document.createElement("div");
    grid.className = "blog-folder-grid";

    Object.keys(VIDEOS).forEach(function (catId) {
      const cat = VIDEOS[catId];
      const folder = document.createElement("button");
      folder.className = "blog-folder";

      const glyph = document.createElement("span");
      glyph.className = "blog-folder-glyph";
      glyph.textContent = cat.glyph;
      folder.appendChild(glyph);

      const name = document.createElement("span");
      name.className = "blog-folder-name";
      name.textContent = cat.name;
      folder.appendChild(name);

      const count = document.createElement("span");
      count.className = "blog-folder-count";
      const n = cat.videos.length;
      count.textContent = n + " video" + (n === 1 ? "" : "s");
      folder.appendChild(count);

      folder.addEventListener("click", function () {
        videosCurrentCategory = catId;
        renderVideosWindow();
      });

      grid.appendChild(folder);
    });

    body.appendChild(grid);
  }

  /* Category view: breadcrumb, description, then an inline Vimeo player
     for every video in the playlist. */
  function renderVideosCategory(body, catId) {
    const cat = VIDEOS[catId];

    // Breadcrumb "back to Videos" link.
    const crumb = document.createElement("a");
    crumb.className = "blog-breadcrumb";
    crumb.href = "#";
    crumb.textContent = "← Videos";
    crumb.addEventListener("click", function (e) {
      e.preventDefault();
      videosCurrentCategory = null;
      renderVideosWindow();
    });
    body.appendChild(crumb);

    const h2 = document.createElement("h2");
    h2.textContent = cat.name;
    body.appendChild(h2);

    if (cat.description) {
      const desc = document.createElement("p");
      desc.textContent = cat.description;
      body.appendChild(desc);
    }

    // Empty state (used before any videos are added to this playlist).
    if (cat.videos.length === 0) {
      const empty = document.createElement("p");
      empty.className = "blog-empty";
      empty.textContent =
        "No videos here yet — I'll upload some to Vimeo and add them soon.";
      body.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = "videos-list";

    cat.videos.forEach(function (video) {
      const item = document.createElement("div");
      item.className = "videos-item";

      const title = document.createElement("div");
      title.className = "videos-item-title";
      title.textContent = video.title;
      item.appendChild(title);

      if (video.description) {
        const desc = document.createElement("div");
        desc.className = "videos-item-description";
        desc.textContent = video.description;
        item.appendChild(desc);
      }

      // Responsive 16:9 iframe wrapper for the Vimeo player.
      const frameWrap = document.createElement("div");
      frameWrap.className = "videos-item-frame";
      const frame = document.createElement("iframe");
      frame.src = vimeoEmbedUrl(video.vimeo);
      frame.title = video.title;
      frame.setAttribute("allowfullscreen", "");
      frame.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
      frame.setAttribute("frameborder", "0");
      frameWrap.appendChild(frame);
      item.appendChild(frameWrap);

      list.appendChild(item);
    });

    body.appendChild(list);
  }

  /* ================================================================
     GAMES WINDOW
     The Games window is a folder of game icons. Clicking an icon
     opens that game in its own window: the playable Doom embed, or
     a placeholder for a game that is not built yet.
     ================================================================ */

  /* Build the grid of game icons inside the Games window. */
  function renderGamesGrid() {
    const grid = document.getElementById("games-grid");
    if (!grid) {
      return;
    }
    grid.innerHTML = "";

    GAMES.forEach(function (game, index) {
      const icon = document.createElement("button");
      icon.className = "game-icon";
      icon.dataset.gameIndex = index;

      // Show the game's image; if the file is missing, fall back to
      // the emoji glyph so the icon still looks complete.
      const img = document.createElement("img");
      img.className = "game-icon-img";
      img.src = game.image;
      img.alt = "";
      img.addEventListener("error", function () {
        const glyph = document.createElement("span");
        glyph.className = "game-icon-glyph";
        glyph.textContent = game.glyph;
        if (img.parentNode) {
          img.parentNode.replaceChild(glyph, img);
        }
      });
      icon.appendChild(img);

      const name = document.createElement("span");
      name.className = "game-icon-name";
      name.textContent = game.name;
      icon.appendChild(name);

      // Games that are not built yet get a small "Coming soon" tag.
      if (game.type === "placeholder") {
        const tag = document.createElement("span");
        tag.className = "game-icon-tag";
        tag.textContent = "Coming soon";
        icon.appendChild(tag);
      }

      icon.addEventListener("click", function () {
        openGame(index);
      });

      grid.appendChild(icon);
    });
  }

  /* Open a game in the shared game window. */
  function openGame(index) {
    const game = GAMES[index];
    if (!game) {
      return;
    }

    const win  = document.getElementById("win-game");
    const body = document.getElementById("game-body");

    // Show the game's name in the title bar.
    win.querySelector(".window-title").textContent = game.name;
    win.dataset.title = game.name;

    // Rebuild the window body from scratch.
    body.innerHTML = "";

    const h2 = document.createElement("h2");
    h2.textContent = game.name;
    body.appendChild(h2);

    if (game.type === "doom") {
      // Playable Doom: embed it from the Internet Archive.
      const frame = document.createElement("iframe");
      frame.className = "doom-frame";
      frame.src = "https://archive.org/embed/" + DOOM_ARCHIVE_ID;
      frame.title = "Doom";
      frame.setAttribute("allowfullscreen", "");
      body.appendChild(frame);

      const note = document.createElement("p");
      note.className = "doom-note";
      note.textContent =
        "Runs the freely distributed shareware episode, embedded from " +
        "the Internet Archive. Click into the game to start, then use " +
        "the arrow keys to move and Mouse to fire.";
      body.appendChild(note);
    } else {
      // Placeholder: a game that is not built yet.
      const desc = document.createElement("p");
      desc.textContent = game.description;
      body.appendChild(desc);

      const tagWrap = document.createElement("p");
      const badge = document.createElement("span");
      badge.className = "coming-soon";
      badge.textContent = "Coming soon";
      tagWrap.appendChild(badge);
      body.appendChild(tagWrap);
    }

    openWindow("game");

    // Keep the taskbar button label in sync with the current game.
    const tbBtn = document.querySelector(
      '.taskbar-window-btn[data-window="game"]'
    );
    if (tbBtn) {
      tbBtn.textContent = game.name;
    }
  }

  /* ================================================================
     BLOG WINDOW
     The Blog window is a list of tech posts. Clicking a post opens
     the shared blog-post window with the full write-up (and an
     optional Vimeo video embedded above the text).
     ================================================================ */

  // Tracks what the Blog window is currently showing:
  //   null   -> root (the two category folders)
  //   catId  -> that category's list of posts
  let blogCurrentCategory = null;

  /* Render the Blog window body (root folder view or a category). */
  function renderBlogWindow() {
    const body = document.getElementById("blogs-body");
    if (!body) {
      return;
    }
    body.innerHTML = "";
    if (blogCurrentCategory === null || !BLOGS[blogCurrentCategory]) {
      renderBlogRoot(body);
    } else {
      renderBlogCategory(body, blogCurrentCategory);
    }
  }

  /* Root view: two folder icons, one per BLOGS category. */
  function renderBlogRoot(body) {
    const h2 = document.createElement("h2");
    h2.textContent = "Blog";
    body.appendChild(h2);

    const intro = document.createElement("p");
    intro.textContent = "Open a folder to browse the writeups inside.";
    body.appendChild(intro);

    const grid = document.createElement("div");
    grid.className = "blog-folder-grid";

    Object.keys(BLOGS).forEach(function (catId) {
      const cat = BLOGS[catId];
      const folder = document.createElement("button");
      folder.className = "blog-folder";

      const glyph = document.createElement("span");
      glyph.className = "blog-folder-glyph";
      glyph.textContent = cat.glyph;
      folder.appendChild(glyph);

      const name = document.createElement("span");
      name.className = "blog-folder-name";
      name.textContent = cat.name;
      folder.appendChild(name);

      const count = document.createElement("span");
      count.className = "blog-folder-count";
      const n = cat.posts.length;
      count.textContent = n + " post" + (n === 1 ? "" : "s");
      folder.appendChild(count);

      folder.addEventListener("click", function () {
        blogCurrentCategory = catId;
        renderBlogWindow();
      });

      grid.appendChild(folder);
    });

    body.appendChild(grid);
  }

  /* Category view: a breadcrumb back to the root plus the post list. */
  function renderBlogCategory(body, catId) {
    const cat = BLOGS[catId];

    // Breadcrumb "back to Blog" link.
    const crumb = document.createElement("a");
    crumb.className = "blog-breadcrumb";
    crumb.href = "#";
    crumb.textContent = "← Blog";
    crumb.addEventListener("click", function (e) {
      e.preventDefault();
      blogCurrentCategory = null;
      renderBlogWindow();
    });
    body.appendChild(crumb);

    const h2 = document.createElement("h2");
    h2.textContent = cat.name;
    body.appendChild(h2);

    if (cat.description) {
      const desc = document.createElement("p");
      desc.textContent = cat.description;
      body.appendChild(desc);
    }

    // Empty state (used before any posts are added to this category).
    if (cat.posts.length === 0) {
      const empty = document.createElement("p");
      empty.className = "blog-empty";
      empty.textContent = "No writeups here yet — check back soon.";
      body.appendChild(empty);
      return;
    }

    const list = document.createElement("div");
    list.className = "blog-list";

    cat.posts.forEach(function (post) {
      const item = document.createElement("button");
      item.className = "blog-item";
      item.dataset.postId = post.id;

      const title = document.createElement("div");
      title.className = "blog-item-title";
      title.textContent = post.title;
      item.appendChild(title);

      const meta = document.createElement("div");
      meta.className = "blog-item-meta";
      const metaText = post.date +
        (post.tags && post.tags.length ? "  •  " + post.tags.join(", ") : "");
      meta.textContent = metaText;
      item.appendChild(meta);

      if (post.excerpt) {
        const excerpt = document.createElement("div");
        excerpt.className = "blog-item-excerpt";
        excerpt.textContent = post.excerpt;
        item.appendChild(excerpt);
      }

      item.addEventListener("click", function () {
        openBlogPost(catId, post.id);
      });

      list.appendChild(item);
    });

    body.appendChild(list);
  }

  /* Open a blog post in the shared blog-post window. */
  function openBlogPost(catId, postId) {
    const cat = BLOGS[catId];
    if (!cat) {
      return;
    }
    const post = cat.posts.find(function (p) { return p.id === postId; });
    if (!post) {
      return;
    }

    const win  = document.getElementById("win-blog-post");
    const body = document.getElementById("blog-post-body");

    // Show the post's title in the title bar.
    win.querySelector(".window-title").textContent = post.title;
    win.dataset.title = post.title;

    // Rebuild the body from scratch.
    body.innerHTML = "";

    const h2 = document.createElement("h2");
    h2.textContent = post.title;
    body.appendChild(h2);

    if (post.subtitle) {
      const sub = document.createElement("p");
      sub.className = "blog-post-subtitle";
      sub.textContent = post.subtitle;
      body.appendChild(sub);
    }

    const meta = document.createElement("p");
    meta.className = "blog-post-meta";
    const metaText = post.date +
      (post.tags && post.tags.length ? "  •  " + post.tags.join(", ") : "");
    meta.textContent = metaText;
    body.appendChild(meta);

    // Optional Vimeo video, shown above the content.
    if (post.vimeo) {
      const wrap = document.createElement("div");
      wrap.className = "blog-post-vimeo";
      const frame = document.createElement("iframe");
      frame.src = "https://player.vimeo.com/video/" + post.vimeo;
      frame.title = post.title + " video";
      frame.setAttribute("allowfullscreen", "");
      frame.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
      frame.setAttribute("frameborder", "0");
      wrap.appendChild(frame);
      body.appendChild(wrap);
    }

    // Content blocks: paragraphs, headings, and bullet lists.
    const content = document.createElement("div");
    content.className = "blog-post-content";
    post.content.forEach(function (block) {
      if (block.h3) {
        const h3 = document.createElement("h3");
        h3.textContent = block.h3;
        content.appendChild(h3);
      } else if (block.p) {
        const p = document.createElement("p");
        p.textContent = block.p;
        content.appendChild(p);
      } else if (block.ul) {
        const ul = document.createElement("ul");
        block.ul.forEach(function (item) {
          const li = document.createElement("li");
          li.textContent = item;
          ul.appendChild(li);
        });
        content.appendChild(ul);
      }
    });
    body.appendChild(content);

    openWindow("blog-post");

    // Keep the taskbar button label in sync with the current post.
    const tbBtn = document.querySelector(
      '.taskbar-window-btn[data-window="blog-post"]'
    );
    if (tbBtn) {
      tbBtn.textContent = post.title;
    }
  }

  /* ================================================================
     STARTUP
     Build the project, video, game, and blog lists, then open the
     Welcome window (centered). Every other window stays closed
     until its desktop icon or Start menu item is clicked.
     ================================================================ */
  renderProjectsList();
  renderVideosWindow();
  renderGamesGrid();
  renderBlogWindow();
  openWindow("welcome");

})();
