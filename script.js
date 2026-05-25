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
     Each video plays from a local file in the "videos" folder.
     

     For each video set:
       title       - shown above the player
       description - a short caption under the player
       file        - path to the video file, relative to index.html
                     (for example "videos/demo-reel.mp4")
     ---------------------------------------------------------------- */
  const VIDEOS = [
    {
      title: "Blessing",
      description: "Test Video!",
      file: "videos/Blessing.mp4"
    },
    {
      title: "Demo Reel",
      description: "A short showcase of my work. I'll swap in my own demo " +
        "reel here — I just need to drop the clip into the videos folder.",
      file: "videos/demo-reel.mp4"
    },
    {
      title: "Project Walkthrough",
      description: "I'm planning to record a walkthrough of one of my " +
        "projects and add it here.",
      file: "videos/project-walkthrough.mp4"
    },
    {
      title: "Coding Timelapse",
      description: "I'll add a timelapse from one of my build sessions here.",
      file: "videos/coding-timelapse.mp4"
    },
  ];

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

  /* Open (or restore) a window by its short name, e.g. "projects". */
  function openWindow(name) {
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
    "hobbies.txt":
      "HOBBIES\n\n" +
      "- Programming\n" +
      "- Warhammer / 40K lore\n" +
      "- Gaming\n" +
      "- Reading sci-fi",
    "contact.txt":
      "CONTACT\n\n" +
      "Email:    me@argonzalez.com\n" +
      "GitHub:   github.com/Knucme\n" +
      "LinkedIn: linkedin.com/in/a-gonzo",
    "projects": {
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
      "  hobbies          - list hobbies\n" +
      "  contact          - contact info\n" +
      "  clear            - clear the screen\n\n" +
      "Tip: try 'ls', then 'cd projects', then 'cat poker.txt'.",
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
      "Resume sections: Education, Skills, Projects, Experience.\n" +
      "(Open the Resume window, or 'cd resume' to explore.)",
    games:
      "Games:\n" +
      "  - Doom (playable - open the Games window)\n" +
      "  - Snake (coming soon)\n" +
      "  - Tic Tac Toe (coming soon)\n" +
      "  - Text Adventure (coming soon)",
    hobbies:
      "Hobbies:\n" +
      "  - Programming\n" +
      "  - Warhammer / 40K lore\n" +
      "  - Gaming\n" +
      "  - Reading sci-fi",
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
     DOWNLOAD RESUME PLACEHOLDER
     ================================================================ */

  const downloadResumeBtn = document.getElementById("download-resume");
  if (downloadResumeBtn) {
    downloadResumeBtn.addEventListener("click", function () {
      alert("Resume download button is currently a placeholder. ill add my resume file later!");
    });
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
     ================================================================ */

  /* Build the click-to-play video list inside the Videos window. */
  function renderVideos() {
    const listEl = document.getElementById("videos-list");
    if (!listEl) {
      return;
    }
    listEl.innerHTML = "";

    VIDEOS.forEach(function (v) {
      const item = document.createElement("div");
      item.className = "video-item";

      // Title.
      const titleEl = document.createElement("h3");
      titleEl.textContent = v.title;
      item.appendChild(titleEl);

      // The video player. "controls" with no "autoplay" = click to play.
      const video = document.createElement("video");
      video.className = "video-player";
      video.controls = true;
      video.preload = "metadata";       // Don't download the whole file.
      video.src = v.file;

      // If the file is missing, swap the player for a friendly note.
      video.addEventListener("error", function () {
        const missing = document.createElement("div");
        missing.className = "video-missing";
        missing.textContent =
          "Video not found: " + v.file +
          " — add this file to the videos folder.";
        if (video.parentNode) {
          video.parentNode.replaceChild(missing, video);
        }
      });
      item.appendChild(video);

      // Caption.
      const descEl = document.createElement("p");
      descEl.className = "video-desc";
      descEl.textContent = v.description;
      item.appendChild(descEl);

      listEl.appendChild(item);
    });
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
     STARTUP
     Build the project, video, and game lists, then open the Welcome
     window (centered). Every other window stays closed until its
     desktop icon or Start menu item is clicked.
     ================================================================ */
  renderProjectsList();
  renderVideos();
  renderGamesGrid();
  openWindow("welcome");

})();
