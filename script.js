/* ===================================================================
   AlexOS - script.js
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
  let cascadeOffset = 0;          // Fallback stagger for any unlisted window.

  /* ----------------------------------------------------------------
     WINDOW START POSITIONS
     Each window opens at its own spot so they spread across the
     desktop instead of piling up in one corner.
     x / y are fractions of the desktop (0 = left/top, 1 = right/bottom).
     Edit these to rearrange where windows first appear.
     ---------------------------------------------------------------- */
  const WINDOW_POSITIONS = {
    welcome:  { center: true },          // Always opens in the middle.
    projects: { x: 0.04, y: 0.06 },
    resume:   { x: 0.40, y: 0.10 },
    games:    { x: 0.74, y: 0.06 },
    hobbies:  { x: 0.06, y: 0.50 },
    terminal: { x: 0.42, y: 0.52 },
    contact:  { x: 0.74, y: 0.48 },
    videos:   { x: 0.22, y: 0.20 },
    "project-detail": { x: 0.30, y: 0.16 }
  };

  /* ----------------------------------------------------------------
     VIDEOS CONFIG
     Each video plays from a local file in the "videos" folder.
     Drop your .mp4 files into that folder, then edit the list below.

     For each video set:
       title       - shown above the player
       description - a short caption under the player
       file        - path to the video file, relative to index.html
                     (for example "videos/demo-reel.mp4")
     ---------------------------------------------------------------- */
  const VIDEOS = [
    {
      title: "Demo Reel",
      description: "A short showcase of recent work. Placeholder — " +
        "replace videos/demo-reel.mp4 with your own clip.",
      file: "videos/demo-reel.mp4"
    },
    {
      title: "Project Walkthrough",
      description: "A walkthrough of one of my projects. Placeholder.",
      file: "videos/project-walkthrough.mp4"
    },
    {
      title: "Coding Timelapse",
      description: "A timelapse from a build session. Placeholder.",
      file: "videos/coding-timelapse.mp4"
    }
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
                     Example: github: "alexsmith/poker-shuffler"
                     When set, the detail window shows a "View on GitHub"
                     link and a button that pulls live repo info.
     ---------------------------------------------------------------- */
  const PROJECTS = {
    pos: {
      name: "SE370 Point of Sale System",
      tech: "Java",
      description: "A point-of-sale application built for a software " +
        "engineering course. Placeholder description — replace with " +
        "details about the architecture, features, and your role.",
      github: ""
    },
    survey: {
      name: "Statistics Survey Website",
      tech: "HTML, CSS, JavaScript",
      description: "A web app for collecting and analyzing survey " +
        "responses. Placeholder description — add the stack used and " +
        "what insights it produced.",
      github: ""
    },
    horus: {
      name: "Horus Heresy Spoiler-Free Character Tracker",
      tech: "JavaScript",
      description: "A tool that tracks characters across the Horus Heresy " +
        "series without revealing spoilers. Placeholder description — " +
        "describe how the spoiler filtering works.",
      github: ""
    },
    poker: {
      name: "Java Poker Card Shuffler",
      tech: "Java",
      description: "A Java program that models a deck of cards and " +
        "shuffling algorithms. Placeholder description — mention the " +
        "algorithms and any testing you did.",
      github: ""
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

  /* Open (or restore) a window by its short name, e.g. "projects". */
  function openWindow(name) {
    const win = document.getElementById("win-" + name);
    if (!win) {
      return;
    }

    // Remember whether this is the very first time the window opens.
    const firstOpen = !win.dataset.opened;

    // Show the window first so we can measure its real size below.
    win.classList.remove("hidden");

    // First time opening: place it at its assigned spot on the desktop.
    if (firstOpen) {
      win.dataset.opened = "true";
      win.dataset.name = name;

      // Usable desktop area (the taskbar is 36px tall).
      const areaW = window.innerWidth;
      const areaH = window.innerHeight - 36;
      // Window is now visible, so offsetWidth/Height are accurate.
      const winW  = win.offsetWidth  || 460;
      const winH  = win.offsetHeight || 320;

      const pos = WINDOW_POSITIONS[name];
      let left;
      let top;

      if (pos && pos.center) {
        // Center the window on the desktop.
        left = (areaW - winW) / 2;
        top  = (areaH - winH) / 2;
      } else if (pos) {
        // Convert the fractional position into pixels.
        left = pos.x * areaW;
        top  = pos.y * areaH;
      } else {
        // Fallback for any window not listed above: gentle cascade.
        left = 90 + cascadeOffset;
        top  = 40 + cascadeOffset;
        cascadeOffset = (cascadeOffset + 28) % 170;
      }

      // Clamp so the whole window stays on screen.
      left = Math.min(Math.max(left, 8), Math.max(8, areaW - winW - 8));
      top  = Math.min(Math.max(top, 8), Math.max(8, areaH - winH - 8));

      win.style.left = left + "px";
      win.style.top  = top + "px";
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
      "AlexOS v1.0\n\n" +
      "A Windows XP-inspired personal portfolio, built with plain\n" +
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
      "Email:    your-email-here\n" +
      "GitHub:   your-github-here\n" +
      "LinkedIn: your-linkedin-here",
    "projects": {
      // Filled in by the loop below.
    },
    "resume": {
      "education.txt":
        "EDUCATION\n\n" +
        "Placeholder - add your school, degree, and graduation year.",
      "skills.txt":
        "SKILLS\n\n" +
        "Placeholder - list languages, frameworks, and tools you know.",
      "experience.txt":
        "EXPERIENCE\n\n" +
        "Placeholder - add internships, jobs, or volunteer work."
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
      "  about            - about AlexOS\n" +
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
      "AlexOS v1.0\n" +
      "A Windows XP-inspired personal portfolio, built with plain HTML, CSS, and JS.",
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
      "Games (coming soon):\n" +
      "  - Snake\n" +
      "  - Tic Tac Toe\n" +
      "  - Text Adventure",
    hobbies:
      "Hobbies:\n" +
      "  - Programming\n" +
      "  - Warhammer / 40K lore\n" +
      "  - Gaming\n" +
      "  - Reading sci-fi",
    contact:
      "Contact:\n" +
      "  Email:    your-email-here\n" +
      "  GitHub:   your-github-here\n" +
      "  LinkedIn: your-linkedin-here"
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
      alert("Resume download is a placeholder. Add your resume file later!");
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
     STARTUP
     Build the project and video lists, then open the Welcome window
     (centered). Every other window stays closed until its desktop
     icon or Start menu item is clicked.
     ================================================================ */
  renderProjectsList();
  renderVideos();
  openWindow("welcome");

})();
