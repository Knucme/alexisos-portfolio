/* ===================================================================
   AlexisOS - content.js
   ALL SITE CONTENT LIVES HERE. The terminal (script.js) only reads it.

   To add a blog post, video, project, or game, edit the matching
   config object below. Nothing in script.js needs to change.

   Configs in this file:
     PROFILE   - name, title, intro text, contact links
     SERVICE   - the text version of the resume (education, skills, work)
     VIDEOS    - Vimeo playlists (tech, cs)
     PROJECTS  - project records
     GAMES     - simulations (Doom embed, Hex Cube, Hangman)
     HANGMAN_WORDS - word bank for Hangman
     GOD_MODE  - picture + quotes for the hidden god mode
     BLOGS     - data-logs (tech, leetcode)
   =================================================================== */

/* ----------------------------------------------------------------
   PROFILE
   ---------------------------------------------------------------- */
const PROFILE = {
  name: "Alexis Gonzalez",
  title: "Junior Software Engineer // Backend Focus",
  location: "Menifee, California",
  intro: [
    "Navy veteran turning a long-standing interest in problem solving into a software engineering career, with a focus on backend development.",
    "Pursuing a B.S. in Computer Science at CSU San Marcos. Graduate of Fullstack Academy's Software Engineering Immersive.",
    "Looking for a junior backend or fullstack role."
  ],
  email: "me@argonzalez.com",
  github: "https://github.com/Knucme",
  linkedin: "https://www.linkedin.com/in/a-gonzo/",
  resumePage: "resume.html",
  resumePdf: "resume/Alexis-Gonzalez-Resume.pdf"
};

/* ----------------------------------------------------------------
   SERVICE RECORD (text version of the resume)
   The full PDF opens from resume.html.
   ---------------------------------------------------------------- */
const SERVICE = {
  headline: "Backend Developer | Computer Science Student | U.S. Navy Veteran",
  summary: "Computer Science student at CSU San Marcos building backend systems in Java and Spring Boot. Led a five person team through a full backend migration of a real time point of sale platform, owning the architecture, authentication, and access control design. Navy veteran with a security operations and IT support background.",
  skills: [
    "Languages:       Java, JavaScript, Python, C/C++, SQL, HTML/CSS",
    "Backend:         Spring Boot, Spring Security, Spring Data JPA / Hibernate, Node.js, Express, REST APIs, JWT, WebSockets",
    "Frontend/Tools:  React, Redux, PostgreSQL, Plotly, matplotlib, Tesseract / pytesseract, Git / GitHub, Maven, Linux"
  ],
  certifications: [
    "CompTIA IT Fundamentals (ITF+), 2023",
    "Google IT Support Specialization, 2023",
    "In progress: CompTIA A+ (expected Oct 2026), Network+ (Dec 2026), Security+ (Jan 2027)"
  ],
  experience: [
    "Security Supervisor | Allied Universal | Oct 2016 - Dec 2020 | Oceanside, CA",
    "  Supervised a team of 20+ security personnel and ensured compliance with site regulations and post orders.",
    "  Trained 30+ new hires on security protocols and built an environmental safety exam that site staff passed at a 95% rate.",
    "  Established a monitoring center for critical infrastructure, criminal reports, and incidents; resolved 200+ escalations at 90% satisfaction.",
    "Additional: Loss Prevention (Target, JC Penney), Safety Officer (Pechanga), Warehouse Security (Ross), Gate Security, Delivery Driver (DoorDash)"
  ],
  education: [
    "California State University San Marcos | B.S. Computer Science | Expected Dec 2027",
    "Fullstack Academy | Software Engineering Certificate | Oct 2023 - Apr 2024",
    "NPower Technical Training Academy | Tech Fundamentals Bootcamp | Feb 2023 - Jun 2023",
    "Relevant coursework: Software Engineering, Data Structures, Computer Organization & Assembly, Embedded Systems, Linux"
  ],
  military: [
    "Master-at-Arms | United States Navy Reserve | Jan 2011 - Sep 2019",
    "  Stood security watch for Secretary of Defense and Secretary of the Navy site visits; responded to 180+ calls for service and maintained records for 100+ operational actions.",
    "  Completed active duty basic and technical training, then served in a drilling Reserve status with an active duty mobilization to Germany.",
    "  Clearances: Secret (inactive, 2011-2021), Confidential (inactive, 2011-2019)."
  ]
};

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
    name: "SOS: Support of Sale (SE370 Team Lead)",
    tech: "Java, Spring Boot, PostgreSQL, React, Socket.IO",
    description: "A real time restaurant point of sale platform built by a " +
      "five person team I led for CSUSM SE370 (Spring 2026). It unifies " +
      "Back of House, Front of House, and Manager workflows over a shared " +
      "networked system. I owned the system architecture and wrote the " +
      "backend end to end, including a rewrite from Node/Express to Java " +
      "and Spring Boot that kept every REST endpoint, Socket.IO event, and " +
      "BCrypt password hash intact. I added JWT authentication, role based " +
      "access control with Spring Security, login rate limiting, session " +
      "expiry, audit logging, real time kitchen to floor order updates, and " +
      "PDF reports with OpenPDF. I also wrote the setup docs that got four " +
      "teammates running the full stack locally.",
    github: ""
  },
  fuel: {
    name: "Fuel Usage Reporting Dashboard",
    tech: "Python, Plotly, matplotlib, Tesseract OCR",
    description: "A Python dashboard I built (Jun 2023 to Mar 2024) for a " +
      "family owned owner operator trucking business, replacing fuel and " +
      "cost calculations that were tracked by hand. It reads expenses from " +
      "scanned receipts with Tesseract OCR, cleaning up each image first " +
      "(grayscale, thresholding, deskew, upscaling) and falling back to " +
      "manual entry when a scan won't parse. A per state map breaks down " +
      "miles, fuel, meals, and truck maintenance, and monthly reports export " +
      "to spreadsheet and PDF. I'm rebuilding it in 2026 as a public demo " +
      "with multi user accounts and a trend dashboard.",
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
   Each game is listed under SIMULATIONS in the terminal.

   For each game set:
     name - the game's title
     type - "doom" for the Doom embed, "cube" for the Hex Cube
            (the cube itself lives in cube.js)

   DOOM_ARCHIVE_ID is the Internet Archive item used for Doom. Swap
   it for another identifier to use a different version.
   ---------------------------------------------------------------- */
const DOOM_ARCHIVE_ID = "msdos_DOOM_1993";

const GAMES = [
  { name: "Doom",     type: "doom" },
  { name: "Hex Cube", type: "cube" },
  { name: "Hangman",  type: "hangman" }
];

/* ----------------------------------------------------------------
   GOD MODE (hidden: the Konami code)
   Shows a picture with a rotating quote below it while green matrix
   rain falls on the sides. Ends as soon as the visitor runs a command.

     image        - path to the picture
     quoteSeconds - how long each quote stays up
     quotes       - add new ones here. Each entry:
                      text   - the quote (use \n for line breaks)
                      author - who said it
                      source - optional book or speech title
   ---------------------------------------------------------------- */
const GOD_MODE = {
  image: "images/god-mode.png",
  quoteSeconds: 25,
  quotes: [
    {
      text: "A man who procrastinates in his choosing will inevitably have his choice made for him by circumstance.",
      author: "Hunter S. Thompson",
      source: "The Proud Highway: Saga of a Desperate Southern Gentleman"
    },
    {
      text: "La vida no es la que vivimos.\nLa vida es el honor y el recuerdo.\nPor eso más vale morir\ncon el pueblo vivo,\ny no vivir\ncon el pueblo muerto.\n\n" +
            "Life is not as it seems,\nLife is pride and personal history.\nThus it is better that one die\nand that the people should live,\nrather than one live\nand the people should die.\n\n~Lopitos",
      author: "Oscar Zeta Acosta",
      source: "The Revolt of the Cockroach People"
    },
    {
      text: "Don't bend; don't water it down; don't try to make it logical; don't edit your own soul according to the fashion. Rather, follow your most intense obsessions mercilessly.",
      author: "Franz Kafka",
      source: ""
    },
    {
      text: "You have to decide who you are and force the world to deal with you, not with its idea of you.",
      author: "James A. Baldwin",
      source: ""
    }
  ]
};

/* ----------------------------------------------------------------
   HANGMAN WORD BANK
   Each round picks a word from this list, and won't repeat one until
   every word has been played. After the round, the "note" is shown so
   the player learns why that skill matters for me as a hire.

   For each word set:
     word     - the answer (letters, spaces, and symbols like + or .
                are fine; only letters have to be guessed)
     category - shown as the hint while playing
     note     - shown when the round ends
   ---------------------------------------------------------------- */
const HANGMAN_WORDS = [
  /* ---- Languages ---- */
  { word: "JAVA", category: "LANGUAGE",
    note: "Java is my main backend language. I rewrote the SOS point of sale backend in Java and Spring Boot." },
  { word: "JAVASCRIPT", category: "LANGUAGE",
    note: "I work in JavaScript on both ends: Node and Express on the server, React in the browser. This site is plain JavaScript." },
  { word: "PYTHON", category: "LANGUAGE",
    note: "I built a fuel usage dashboard in Python for a family owned trucking business, replacing calculations that were done by hand." },
  { word: "SQL", category: "LANGUAGE",
    note: "I write SQL against PostgreSQL for the backends I build." },

  /* ---- Backend ---- */
  { word: "SPRING BOOT", category: "BACKEND",
    note: "I rebuilt a Node and Express backend in Spring Boot as a drop in replacement, keeping every REST endpoint and Socket.IO event the same." },
  { word: "SPRING SECURITY", category: "BACKEND",
    note: "I used Spring Security for JWT authentication and role based access control on the SOS platform." },
  { word: "HIBERNATE", category: "BACKEND",
    note: "I use Spring Data JPA and Hibernate to map Java objects to the database." },
  { word: "NODE.JS", category: "BACKEND",
    note: "Node.js and Express are where I learned backend development, and SOS started on them before I moved it to Spring Boot." },
  { word: "REST API", category: "BACKEND",
    note: "When I migrated the SOS backend I preserved every REST endpoint, so the React client needed no changes." },
  { word: "JWT", category: "SECURITY",
    note: "I implemented JWT authentication for the SOS platform, along with session expiry and a password policy." },
  { word: "WEBSOCKETS", category: "BACKEND",
    note: "I built real time kitchen to floor order updates for SOS, so orders show up without anyone refreshing." },
  { word: "ACCESS CONTROL", category: "SECURITY",
    note: "I designed role based access control for SOS, so each role only sees and does what it should." },
  { word: "RATE LIMITING", category: "SECURITY",
    note: "I added login rate limiting, request size caps, and audit logging to harden the SOS backend." },
  { word: "AUDIT LOGGING", category: "SECURITY",
    note: "SOS logs every login, order cancellation, and inventory change, so there's a record of who did what." },

  /* ---- Frontend and tools ---- */
  { word: "REACT", category: "FRONTEND",
    note: "I can work on the front end too. SOS uses a React client, and I kept it working through the backend rewrite." },
  { word: "REDUX", category: "FRONTEND",
    note: "I've used Redux to manage state in React apps." },
  { word: "POSTGRESQL", category: "DATABASE",
    note: "PostgreSQL is the database behind SOS and my other backend projects." },
  { word: "TESSERACT", category: "TOOL",
    note: "I used Tesseract OCR to read expenses from scanned receipts, with image cleanup before extraction and manual entry as a fallback." },
  { word: "MATPLOTLIB", category: "TOOL",
    note: "I used matplotlib and Plotly for the charts and the per state map in my fuel usage dashboard." },
  { word: "GITHUB", category: "TOOL",
    note: "I got four teammates from zero to running the full stack locally and pushing to GitHub." },
  { word: "MAVEN", category: "TOOL",
    note: "Maven handles builds and dependencies for my Spring Boot projects." },
  { word: "LINUX", category: "TOOL",
    note: "I'm comfortable on Linux, and it's part of my CSU San Marcos coursework." },

  /* ---- Leadership and background ---- */
  { word: "TEAM LEAD", category: "ROLE",
    note: "I led a five person team building a real time restaurant point of sale platform and owned the system architecture." },
  { word: "DOCUMENTATION", category: "SOFT SKILL",
    note: "I wrote the setup and phase docs for my SE370 team so everyone could get the project running on their own." },
  { word: "ONBOARDING", category: "SOFT SKILL",
    note: "I've onboarded four teammates on SOS and trained 30+ new hires as a security supervisor." },
  { word: "SUPERVISOR", category: "EXPERIENCE",
    note: "As a security supervisor at Allied Universal I led a team of 20+ and resolved 200+ escalations." },
  { word: "MASTER AT ARMS", category: "MILITARY",
    note: "I served as a Master-at-Arms in the Navy Reserve from 2011 to 2019, including a mobilization to Germany." },
  { word: "NAVY VETERAN", category: "BACKGROUND",
    note: "The Navy taught me discipline and how to stay calm under pressure, including security watch for Secretary of Defense visits." },
  { word: "SECRET CLEARANCE", category: "MILITARY",
    note: "I held a Secret clearance from 2011 to 2021." },

  /* ---- Education and certifications ---- */
  { word: "COMPUTER SCIENCE", category: "EDUCATION",
    note: "I'm working on a B.S. in Computer Science at CSU San Marcos, expected December 2027." },
  { word: "DATA STRUCTURES", category: "COURSEWORK",
    note: "Data Structures is part of my CS coursework, along with Computer Organization, Assembly, and Embedded Systems." },
  { word: "FULLSTACK ACADEMY", category: "EDUCATION",
    note: "I earned my Software Engineering Certificate from Fullstack Academy in 2024." },
  { word: "COMPTIA", category: "CERTIFICATION",
    note: "I hold CompTIA ITF+ and the Google IT Support certificate, and I'm working toward A+, Network+, and Security+." },
  { word: "SECURITY PLUS", category: "CERTIFICATION",
    note: "I'm working toward CompTIA Security+, building on my background in security operations." }
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
      },
      {
        id: "x570-bios-tpm",
        title: "Updating My X570 BIOS to Pass the Windows 11 TPM Check",
        subtitle: "",
        date: "2026",
        tags: ["Hardware", "BIOS", "Windows"],
        excerpt: "My MSI X570 Tomahawk was on launch-day firmware from 2020 and Windows 11 refused to install because it couldn't see a TPM. Turning on fTPM took three BIOS settings. Getting the BIOS updated in the first place took a smaller USB stick.",
        vimeo: "",
        content: [
          { p: "I'm rebuilding my gaming desktop around a new 2 TB SSD as the boot drive, with a clean install of Windows 11 Pro on it. Before touching the drive, I wanted to make sure the board would actually accept Windows 11. An earlier attempt had been blocked by the system-requirements check and I never chased it down." },
          { h3: "The setup" },
          { p: "The machine:" },
          { ul: [
            "Motherboard: MSI MAG X570 Tomahawk WiFi (MS-7C84)",
            "CPU: AMD Ryzen 9 3900X",
            "RAM: 64 GB DDR4",
            "GPU: RTX 2070 (RTX 5070 Ti on the way)",
            "Storage: 500 GB WD Black SN750 NVMe (old boot drive), two 2 TB Seagate HDDs, new 2 TB SSD"
          ] },
          { h3: "The error" },
          { p: "Running Windows 11 Setup from the desktop gave one line under 'Here's why':" },
          { p: "Setup: The PC must support TPM 2.0." },
          { p: "That was the only requirement it failed. The 3900X is on Microsoft's supported CPU list, and the board has plenty of RAM and storage, so the issue was something the firmware wasn't exposing, not a hardware limitation." },
          { h3: "Why fTPM was off" },
          { p: "AMD CPUs have a firmware TPM built into the processor (fTPM). MSI ships it disabled. So the TPM was there, just switched off. When I got into the BIOS to turn it on, the version at the top of the screen was the real story:" },
          { p: "BIOS Ver: E7C84AMS.100, build date 04/11/2020." },
          { p: "Version 1.00. Launch firmware. Twenty-some releases behind. That mattered for more than just Windows 11:" },
          { ul: [
            "Early AGESA versions have a known bug where fTPM causes periodic system-wide stutters in Windows 11 (fixed in AGESA 1.2.0.7, BIOS v1B for this board).",
            "Resizable BAR support was added in v15, relevant with a new GPU coming.",
            "Several CPU security patches (Inception, Sinkclose, CVE-2024-36877) landed in later versions.",
            "A 2020 BIOS predates the entire RTX 40/50 series; I'd rather not find out how it handles a PCIe 5 card."
          ] },
          { p: "Also, the board was running with CSM (legacy BIOS compatibility) enabled, which blocks Secure Boot. The BIOS actually throws a warning if you try to enable Secure Boot with CSM loaded. So the plan became: flash the newest BIOS first, then set fTPM, disable CSM, enable Secure Boot." },
          { h3: "Getting the BIOS file onto a stick (from a Mac)" },
          { p: "My only machine with a browser at the time was a Mac, which is fine. The flash itself happens inside the board's firmware. The Mac only has to get the file onto a USB stick." },
          { ul: [
            "Downloaded 7C84v1K4 (2026-08-21, the newest non-beta) from the MSI support page for the board.",
            "Unzipped it. The firmware is the single file named E7C84AMS.1K4.",
            "Formatted the stick in Disk Utility as MS-DOS (FAT) with the Master Boot Record scheme.",
            "Copied the file to the top level of the stick and ejected it."
          ] },
          { h3: "M-Flash couldn't see the stick" },
          { p: "MSI's built-in flasher is called M-Flash. You click it in the BIOS, the board reboots into a stripped-down flash environment, and you pick the file. Except it gave me this:" },
          { p: "M-Flash: Media Not Found. Please plug in USB media and press 'Retry' to try again." },
          { p: "The Drive column was empty. It wasn't reading the file wrong. It wasn't seeing the stick at all. I checked the obvious things in order:" },
          { ul: [
            "Format. Get Info on the Mac confirmed MS-DOS (FAT32). Not the problem.",
            "Port. Moved to a rear USB 2.0 port. No change.",
            "Detection at POST. The POST screen listed 'USB MASS #0: USB,' so the board saw the stick during boot but M-Flash still didn't. That pointed at M-Flash being picky, not a dead port.",
            "Partition scheme. GUID vs. MBR is a common M-Flash gotcha. Already on MBR.",
            "Size. The stick was 64 GB."
          ] },
          { p: "That last one was it. Older M-Flash builds (and the Flash BIOS button on this board) don't enumerate sticks larger than 32 GB. I swapped to a 2 GB stick, formatted it the same way, copied the file over, and M-Flash listed it immediately." },
          { p: "Lesson: when a BIOS flasher can't see a stick that the POST screen can, suspect the stick's size before the format. Use the smallest FAT32 stick you own." },
          { p: "One more thing I noticed along the way. The first Get Info screenshot on the Mac showed only 2 MB used on the 64 GB stick. The BIOS file is 18 MB. The 2 MB was macOS's hidden index files. The firmware hadn't actually been copied yet. Worth double-checking 'Used' before you walk the stick over to the PC." },
          { h3: "The flash" },
          { ul: [
            "BIOS, then M-FLASH, then Yes to reboot into flash mode.",
            "Selected the stick, then E7C84AMS.1K4. The screen showed Current V1.00 / Selected V1.K4.",
            "Yes. Hands off for about five minutes. No keyboard, no power button, don't touch the stick.",
            "The board rebooted on its own. The BIOS header now read E7C84AMS.1K4."
          ] },
          { p: "After a flash, all settings reset to factory defaults, which was fine since the whole point was to change them." },
          { h3: "The three settings" },
          { p: "Order matters. CSM has to be disabled and the board rebooted before the BIOS will let you touch Secure Boot." },
          { ul: [
            "Settings, Security, Trusted Computing: Security Device Support = Enabled, AMD fTPM switch = AMD CPU fTPM.",
            "Settings, Advanced, Windows OS Configuration: BIOS UEFI/CSM Mode = UEFI. F10 to save and reboot.",
            "Back into BIOS, Windows OS Configuration, Secure Boot: Enabled, mode Standard. F10 again."
          ] },
          { p: "That was the whole TPM 2.0 issue: a feature the CPU always had, hidden behind a default that was never turned on." },
          { h3: "What's next" },
          { p: "With the firmware current and the checks passing, the actual install is straightforward:" },
          { ul: [
            "Build the Windows 11 installer USB (Media Creation Tool, or Rufus with the ISO).",
            "Install the 2 TB SSD and physically unplug the SN750 and both HDDs, so Setup can't drop the boot partition on the old drive.",
            "Boot the USB in UEFI mode, install to the unallocated 2 TB, let Setup lay out the GPT partitions itself.",
            "Reconnect the other drives once the new install boots on its own, then wipe the old Windows off the SN750."
          ] },
          { p: "Part 2 will cover that install and the GPU swap." },
          { h3: "Quick reference" },
          { ul: [
            "Board: MSI MAG X570 Tomahawk WiFi. BIOS 7C84v10 (04/2020) to 7C84v1K4 (08/2026).",
            "Flash method: M-Flash, FAT32 / MBR stick, 2 GB, file at root.",
            "Blocker: 64 GB stick not enumerated by M-Flash ('Media Not Found').",
            "Settings changed: fTPM on, CSM off, Secure Boot on (in that order).",
            "Alternative if M-Flash fails: rename the file to MSI.ROM, use the Flash BIOS port and button with the PC powered off."
          ] }
        ]
      },
      {
        id: "tp-link-tx55e",
        title: "Adding Wi-Fi and Bluetooth to a Lenovo ThinkCentre with a TP-Link PCIe Card",
        subtitle: "",
        date: "2026",
        tags: ["Hardware", "PCIe", "Windows", "Networking"],
        excerpt: "I put a TP-Link Archer TX55E (Wi-Fi 6 + Bluetooth 5.3) PCIe card into a Lenovo ThinkCentre M720t I use as a learning machine. The install went by the manual for the most part, with one order-of-operations swap on the drivers.",
        vimeo: "",
        content: [
          { p: "I built a Lenovo ThinkCentre M720t into a learning box for practicing hardware work and running small labs. The one thing it was missing was wireless. The room I keep it in doesn't have an easy wall port, and I didn't want to run a cable across the floor. So I picked up a TP-Link Archer TX55E, a Wi-Fi 6 + Bluetooth 5.3 PCIe card, and put it in today." },
          { h3: "The machine" },
          { ul: [
            "Lenovo ThinkCentre M720t",
            "Intel Core i7-8700 (6 cores / 12 threads, up to 4.6 GHz)",
            "16 GB DDR4",
            "500 GB SSD, DVD-ROM",
            "Intel UHD 630 graphics",
            "Windows 11 Pro"
          ] },
          { h3: "The card" },
          { ul: [
            "TP-Link Archer TX55E (AX3000)",
            "Wi-Fi 6, dual-band 2402 Mbps + 574 Mbps",
            "Bluetooth 5.3",
            "PCIe x1, with an internal USB header cable for the Bluetooth side"
          ] },
          { h3: "The physical install" },
          { p: "Powered down, unplugged everything, and took the side panel off. The TX55E is a PCIe x1 card, so I put it in an open slot and screwed the bracket in." },
          { p: "The Bluetooth side of this card isn't over PCIe. It uses a short USB cable that plugs into an F_USB header on the motherboard. I found an open F_USB header near the front-panel headers and plugged it in. If that cable isn't connected, Bluetooth won't show up at all, even with the driver installed." },
          { p: "Attached the two antennas to the SMA connectors on the bracket, closed the case, plugged everything back in." },
          { h3: "One thing I did differently than the manual" },
          { p: "The manual has you disable any existing Bluetooth in Device Manager first, then install the card, then install the drivers in this order: Wi-Fi first, Bluetooth second." },
          { p: "On this machine I did the driver step in the opposite order. I disabled the built-in Bluetooth in Device Manager (the M720t has an onboard adapter), installed the Bluetooth driver from TP-Link, and then installed the Wi-Fi driver. Both radios came up cleanly right after that." },
          { p: "I don't know if the order matters on every setup, but if the manual's order stalls out, the reverse is worth trying." },
          { h3: "Result" },
          { p: "Both radios showed up in Windows. The Wi-Fi list populated, I connected to my network, and Bluetooth paired with my phone on the first try. Speedtest matched what I get on the same network from other devices, so the card isn't a bottleneck." },
          { h3: "Takeaways" },
          { ul: [
            "Combo Wi-Fi + Bluetooth PCIe cards use two connections: the PCIe slot for Wi-Fi, and an internal USB header cable for Bluetooth. Skip the USB cable and Bluetooth won't show up even after the driver installs.",
            "Disable any existing Bluetooth adapter in Device Manager before installing the new card. The manual says this and it's worth doing, especially on prebuilt machines like a ThinkCentre that already have onboard Bluetooth.",
            "If the manual's driver order gives you trouble, try the reverse. On this card, installing the Bluetooth driver before the Wi-Fi driver went in cleanly.",
            "F_USB header cables aren't strictly keyed on every board. Match the pin arrangement carefully so the connector doesn't go on backwards."
          ] }
        ]
      },
      {
        id: "0xc000000e-sata",
        title: "Windows Error 0xc000000e After a Motherboard Swap",
        subtitle: "",
        date: "2026",
        tags: ["Hardware", "Windows", "SATA", "Troubleshooting"],
        excerpt: "A user on r/PcBuildHelp couldn't boot Windows on a PC with a recently swapped motherboard. Windows Memory Diagnostic looping made it look like a RAM problem. The real error was 0xc000000e, and the fix was reseating a SATA cable.",
        vimeo: "",
        content: [
          { p: "A few days ago I helped someone on r/PcBuildHelp whose PC would not boot into Windows 10. The whole thing took about an hour of back and forth. The fix cost nothing, and along the way there was a very convincing red herring that's worth writing down. If you landed here because you searched the error code, skip to the fix. If you want the reasoning, keep reading." },
          { h3: "The setup" },
          { ul: [
            "i5-3450, Radeon R5 240, 8 GB + 2 GB DDR3 (mixed sticks)",
            "128 GB PNY SSD for Windows, 500 GB HDD for storage",
            "A no-name 'Kyo' B75 motherboard, installed about 3 months earlier",
            "Windows 10 Pro, legacy BIOS boot"
          ] },
          { p: "The PC had been working fine a week earlier. Then one day it stopped booting." },
          { h3: "The red herring: Windows Memory Diagnostic" },
          { p: "The first thing I was shown wasn't an error. It was a photo of the Windows Memory Diagnostic Tool sitting at 'test pass 1 of 2: 21% complete' after almost two hours. The test normally finishes in 15 to 40 minutes on a machine like this, so it was clearly hung. And every time the PC was restarted, it went straight back into the memory test." },
          { p: "That looks a lot like bad RAM. A memory test that freezes partway through can be a bad stick, and mixed 8 GB + 2 GB DIMMs on a cheap B75 board is exactly the combination that causes memory faults. I had started writing up a 'pull one stick at a time' plan." },
          { p: "Two things were actually going on:" },
          { ul: [
            "Windows schedules the memory test as a one-time boot entry (the bootsequence value in the BCD). It only unschedules itself after the test completes and Windows loads. If the test hangs, it runs again on every boot. The 'loop' wasn't evidence of anything except that the test never finished.",
            "The test was never the first symptom. The user had picked 'Windows Memory Diagnostic' off the Windows Boot Manager screen because that's what the failed-boot screen offers you. The real error had already happened before that."
          ] },
          { p: "Lesson: when someone shows you a diagnostic tool, ask what they saw before they ran it. The tool isn't the symptom." },
          { h3: "The real error" },
          { p: "The screen that came first was the Windows Boot Manager screen:" },
          { p: "Windows failed to start. A recent hardware or software change might be the cause." },
          { p: "Status: 0xc000000e" },
          { p: "Info: A required device isn't connected or can't be accessed." },
          { p: "This one is more specific than it looks. 0xc000000e means the boot loader (bootmgr) started fine, read its configuration, and then couldn't reach the drive or partition where Windows is installed. It has nothing to do with RAM. Something between the boot loader and the Windows partition is missing." },
          { p: "For this setup, the suspects in order were:" },
          { ul: [
            "The SSD isn't being detected: loose or failed SATA cable, bad SATA port, or a dead drive. Cheap B75 boards are known for flaky ports.",
            "BIOS settings got reset: a dead CMOS battery, or the board losing settings, can flip SATA mode between AHCI and IDE or change the boot order to the HDD. A recent motherboard swap makes this more likely.",
            "The BCD (boot configuration data) points at the wrong drive: fixable from a Windows install USB with bootrec."
          ] },
          { p: "All three are cheap to check, and the order goes from 'unplug and replug a cable' to 'run commands from a recovery USB.' Start with the thing that takes 30 seconds." },
          { h3: "The fix" },
          { p: "I asked the user to do these in order and stop when Windows booted:" },
          { ul: [
            "Power off. Unplug and re-seat the SATA cable on the SSD, both at the drive and at the motherboard. Try a different cable if one is available, and a different SATA port on the board.",
            "Boot into BIOS (Del at power-on) and confirm the SSD shows up in the storage list.",
            "While in BIOS, confirm SATA mode is AHCI, the SSD is first in the boot order, and the date/time have not reset (a reset date means the CMOS battery is dead).",
            "Only if the SSD is detected and Windows still fails: boot a Windows 10 install USB made with the Media Creation Tool, choose 'Repair your computer' (not 'Install now'), then Troubleshoot > Command Prompt and run bootrec /fixmbr, bootrec /fixboot, bootrec /rebuildbcd."
          ] },
          { p: "Step 1 fixed it. Re-seating the SATA cable brought the SSD back and Windows booted normally. No data lost, no reinstall, no new parts." },
          { h3: "What I'd do next if it were my machine" },
          { ul: [
            "Replace that SATA cable anyway. A cable that came loose once on a board that gets moved or bumped will do it again, and a new one costs almost nothing.",
            "Check the CMOS battery (CR2032). Not the cause this time, but the same symptom can come from a board that forgets its settings.",
            "Pull the 2 GB stick. Mixed 8 + 2 GB DIMMs didn't cause this problem, but they're still the most likely source of the next one.",
            "Back up anything important on that 128 GB PNY. Budget drive on an unknown power supply."
          ] },
          { h3: "Takeaways" },
          { ul: [
            "Ask what happened first. A running diagnostic isn't the original symptom, and it can send you down the wrong path for an hour.",
            "0xc000000e is a 'cannot find the Windows drive' error. Check the physical drive connection and BIOS before touching the boot configuration.",
            "Order your checks by cost, not by how clever they are. Re-seating a cable beats rebuilding the BCD every time it works.",
            "Mixed RAM on a no-name board is a real problem, just not always the current one. Don't let a plausible suspect skip the evidence."
          ] }
        ]
      },
      {
        id: "wifi-card-win10",
        title: "A PCIe Wi-Fi Card That Works on Every OS Except Windows 10",
        subtitle: "",
        date: "2026",
        tags: ["Hardware", "Windows", "Networking", "Troubleshooting"],
        excerpt: "A user on r/PcBuildHelp had a Wi-Fi card that could see networks but never connect, only on one Windows 10 install. This one didn't end with a fix, but it ended with an answer. Notes on the diagnosis, and on handling a frustrated user along the way.",
        vimeo: "",
        content: [
          { p: "This one didn't end with a fix, and that's part of why I'm writing it up. A user on r/PcBuildHelp had a PCIe Wi-Fi adapter that could see networks but never connect, on one specific Windows 10 install, while working fine everywhere else. The thread had a dozen replies, most of them telling him to buy a new card. He got short with me partway through. By the end he had a logical explanation, a reasonable decision about what to do, and he thanked me for the help." },
          { p: "There are two parts to this: how the diagnosis went, and how the conversation went." },
          { h3: "The setup" },
          { ul: [
            "PCIe Wi-Fi adapter: a generic red-heatsink card carrying an Intel Dual Band Wireless-AC 7260 (a 2013-era mini-PCIe card on a PCIe x1 riser; the USB header is for Bluetooth only)",
            "Main PC: Ryzen 5 7600X on an MSI PRO B840-P WIFI (AM5, 2025 board), Windows 10 Pro",
            "Symptom: adapter shows available networks, fails to connect, asks for the password again"
          ] },
          { h3: "The evidence he already had" },
          { p: "Before anyone replied, he had done more testing than most people do, and it was all in the original post:" },
          { ul: [
            "Same PC, Windows 11: works",
            "Same PC, Linux: works",
            "Same PC, Windows 7: works",
            "Same card, a different PC running Windows 10: works",
            "Main PC, Windows 10, a cheap USB Wi-Fi adapter: works",
            "Updated drivers, rolled back drivers, tried other networks: no change"
          ] },
          { p: "That list is a set of controlled tests. The card is cleared (works on another PC). The driver is cleared (same version works on another Win10 PC). The Windows 10 network stack on this install is cleared (the USB adapter connects). The router is cleared (a phone hotspot and a second router also failed, which he confirmed later). The only combination that fails is this card, this motherboard, and Windows 10." },
          { p: "Most of the thread ignored the list and answered \"old Intel card, buy a new one.\" That's not bad advice, but it doesn't answer what he asked, which was \"is something wrong with my PC?\" He kept repeating \"but it works on my other PC\" because nobody engaged with it." },
          { h3: "What the symptom means" },
          { p: "\"Sees the network, fails, asks for the password again\" is a specific failure. The card can transmit and receive, since it scanned and found the network. The connection started. The WPA2 four-way handshake, the key exchange right after you enter a password, didn't complete. Windows treats a failed handshake as a wrong password and prompts again. So the question is why the key exchange fails on this one combination." },
          { p: "With a known-good password, handshake failures usually come from a security mode mismatch (WPA3 transition mode on an old driver), a MAC address the access point rejects, or the card dropping out for a moment mid-exchange. The hotspot and second-router tests ruled out the first two. That left the card briefly losing its link." },
          { h3: "The lead he found himself" },
          { p: "He mentioned, almost in passing, that the only difference between his two PCs was that the main board only has long (x16-length) PCIe slots. Then he dismissed it: \"but I don't think that's the problem since the adapter works on the main PC using other operating systems.\"" },
          { p: "Right observation, wrong conclusion. Working on other OSes in that slot doesn't clear the slot. It means the slot is physically fine and the problem is in how Windows 10 drives it. On AM5 boards, the secondary x16-length slots are usually wired through the chipset instead of the CPU, and the Intel 7260 has a long history of problems with PCIe link power management (ASPM). Linux users have been turning it off for this card for years. A card that briefly drops its link under power management would fail the handshake exactly this way." },
          { h3: "The board was the answer" },
          { p: "Then he named the motherboard: MSI PRO B840-P WIFI. B840 is AMD's 2025 entry chipset, and AMD only publishes Windows 11 chipset drivers for it. There's no official Windows 10 package. Whatever chipset driver was installed on that machine was either generic or an older AM5 package that doesn't fully cover the platform." },
          { p: "He had also said earlier, and nobody picked up on it, that the board's onboard Wi-Fi \"only works on Win11.\" Same problem. That board was never meant to run Windows 10. The chipset side of the PCIe setup (power states, link management) isn't properly handled under Win10, and an old, picky card is the first thing to fail when that happens. Linux and Windows 7 drive the hardware generically and don't care. Windows 11 is what the board was built for." },
          { p: "The answer to his actual question: nothing is wrong with his PC. It's Windows 10 on a board that doesn't support it, with a card old enough to be the first thing that breaks." },
          { h3: "What I'd still try" },
          { ul: [
            "Power Options > Advanced > PCI Express > Link State Power Management > Off. Takes ten seconds and targets the suspected cause directly. He said he'd check it.",
            "Any ASPM or PCIe power-saving option in the BIOS, off.",
            "Otherwise, the real fixes are running Windows 11 on that machine (he already has it working) or using the USB adapter. He chose the USB adapter, which is reasonable."
          ] },
          { h3: "The conversation" },
          { p: "This is the part I want to remember. The thread was already hostile when I got there: a dozen \"buy a new card\" replies, a joke about the card looking too clean to be broken, and a user who had been repeating himself for an hour. My first comment made it worse before it made it better." },
          { h3: "Where I went wrong first" },
          { p: "My first reply was a long numbered list: run this, check that, paste this output. It was technically sound and it actually engaged with his evidence, which nobody else had done. But it was a wall of commands for someone who had already been told what to do five times. His reaction:" },
          { p: "\"Did you copy all of this from Google or ChatGPT? Because I already did all of that and it didn't fix anything. That's why I came asking here.\"" },
          { p: "That was fair. The content was fine, but the format said \"I didn't read your post, here's the standard checklist.\" I had read it, but he had no way of knowing that from a numbered list." },
          { h3: "Not taking the bait" },
          { p: "When someone questions you in public, it's tempting to defend yourself, which turns the thread into an argument about you instead of his problem. It's also tempting to over-apologize, which doesn't help him either. I did neither. I replied with a short explanation of why I asked for what I asked for, then asked for the one thing nobody in the thread had asked for: the actual output, not \"I did it.\"" },
          { p: "\"no, i just read your post. you said sees network / cant connect, so i asked for the log that says why. you say you did it, so whats the reason code?\"" },
          { p: "That showed I had read his post, because I quoted his own words back as the reason for the question. It also moved the conversation from \"do these steps\" to \"show me the result,\" which is where troubleshooting actually happens. \"I tried everything, nothing worked\" isn't data. A reason code is." },
          { h3: "Questions instead of instructions" },
          { p: "From then on I wrote every reply as \"have you tried X?\" instead of \"do X.\" Same content, different shape. With a defensive person that matters. A question lets him answer \"already did that\" and stay in the conversation. An instruction forces him to either go along with it or push back, and he had been pushing back on everyone. Once the replies were questions, he started giving real answers: same driver on both PCs, same advanced settings, hotspot fails too, the slot is the only difference." },
          { p: "I also stopped repeating things he said he had already done, even without proof. Pushing \"but did you really check the Event Viewer\" would have been technically correct and useless." },
          { h3: "Giving him credit for the lead" },
          { p: "When he brought up the slot and dismissed it, the easy reply was \"no, you're wrong, that's probably it.\" I wrote that version and deleted it. It opened with \"no\" and ended with a verdict, and he was one bad reply from leaving. The version I posted said the slot was the first real lead in the thread and that he had found it. Both versions made the same technical point. One of them kept him on the same side as me." },
          { h3: "A clean exit" },
          { p: "When he said he was going to give up and use a USB adapter, I didn't try to keep him troubleshooting. I gave him the one piece of context that made the decision a conclusion instead of a loss (the board has no Win10 support, which also explains the onboard Wi-Fi he mentioned earlier) and answered the question he had been asking the whole time: no, your PC isn't broken." },
          { p: "\"That's probably the logical reason. Thanks for your help bro, I appreciate your efforts.\"" },
          { h3: "Summary: what he said and what I did with it" },
          { ul: [
            "\"It works on my other PC and on other operating systems.\" I treated it as the central fact instead of talking past it.",
            "\"Did you copy all of this from Google or ChatGPT?\" I didn't defend, apologize, or argue. One sentence on why I asked, then I asked for the actual output.",
            "\"I checked the Event Viewer, I reset the service, I did the netsh commands.\" I treated \"I did it\" without output as no data, and switched from instructions to questions so he could say \"already did\" without losing face.",
            "\"The only difference I noticed is the slot. But I don't think that's the problem.\" I took his observation seriously and said so. He found the lead; my job was to not let him throw it away.",
            "\"It's the PRO B840-P WIFI. I'm probably going to give up.\" I gave him the context that turned giving up into a conclusion: the board has no Win10 support. And I answered his real question. His PC isn't broken."
          ] },
          { h3: "Takeaways" },
          { ul: [
            "Read the user's evidence before answering. He had already done five controlled tests. The thread ignored them, and that's why he got defensive.",
            "\"Works on other OSes\" clears the hardware, not the OS and hardware combination. The slot was a real lead.",
            "Check platform support first on a new board. A 2025 chipset with Windows 11-only drivers running Windows 10 explains a lot of \"works everywhere but here\" problems.",
            "A long checklist reads as \"I didn't read your post\" even when you did. Lead with one question that shows you read it.",
            "When someone takes a shot at you, answer the problem, not the shot. One sentence, then back to the data.",
            "Questions work better than instructions with a defensive person. Same content, and they can say \"already did that\" without losing face.",
            "When they find the lead, tell them. You don't need the credit; you need them to keep talking.",
            "A troubleshooting thread can end well without a fix. \"Here's why, and nothing is wrong with your machine\" is a result."
          ] }
        ]
      },
      {
        id: "new-build-ram-bisect",
        title: "New Build Won't Install Windows, Different Stop Code Every Time",
        subtitle: "",
        date: "2026",
        tags: ["Hardware", "RAM", "Windows", "Troubleshooting"],
        excerpt: "A brand new AM5 build kept blue-screening during the Windows 11 install with a different stop code each time. That pattern points at memory. Notes on narrowing it down by cost, and why \"works with one stick\" is only the start.",
        vimeo: "",
        content: [
          { p: "A user on r/PcBuildHelp had just finished a new build and couldn't get Windows 11 to install. Setup would get partway through, blue-screen, and restart. He posted a photo of one crash (KERNEL_MODE_HEAP_CORRUPTION) and added one detail that ended up being the whole diagnosis: the stop code was different every time." },
          { p: "This is a different kind of problem from the SATA cable and Windows 10 Wi-Fi threads. Those were about finding the one thing that was different. This one is about taking a system that's known to be bad and splitting it in half until the bad part is isolated." },
          { h3: "The setup" },
          { ul: [
            "Ryzen 5 9600X",
            "ASUS TUF Gaming B850M WiFi 7",
            "Radeon RX 9060 XT 16 GB",
            "2 x 16 GB Klevv Bolt V DDR5 (budget kit, likely 6000 MT/s)",
            "Brand new build, first OS install"
          ] },
          { h3: "Reading the symptom" },
          { p: "A stop code is Windows telling you which internal check failed when it crashed. If it's the same code every time, something specific is failing: one driver, one subsystem, one component. If it's a different code every time, nothing specific is failing. Data is getting corrupted on its way through the system, and whatever touches the bad data first is what crashes. On a new build that almost always means memory: a bad stick, a bad slot, RAM running at a speed the board can't hold, or, less often, a bad memory controller in the CPU." },
          { p: "The Windows installer is also just the first thing that puts real load on the memory. \"Windows won't install\" usually isn't a Windows problem. It's the first sign of a hardware problem that would have shown up in the first game anyway." },
          { h3: "Ruling out the install USB" },
          { p: "Another commenter suggested trying a Linux install first. That was a good test:" },
          { ul: [
            "If Linux installs and runs stable, the hardware is probably fine and the Windows USB is the suspect.",
            "If Linux also crashes during install, it's hardware and the Windows USB was never the problem."
          ] },
          { p: "Linux crashed partway through. The USB was cleared and hardware was confirmed, before anyone opened the case." },
          { h3: "Ordering the checks" },
          { p: "With \"hardware, probably memory\" established, the checks went in order of cost:" },
          { ul: [
            "Turn off EXPO (ASUS may label it D.O.C.P.) so the RAM runs at its default JEDEC speed. Free, and the most common fix on a new AM5 build, especially with a budget kit that probably isn't on the board's supported memory list.",
            "Run one stick at a time in slot A2 (second slot from the CPU). Free. Isolates a bad stick.",
            "Check the CPU socket for bent pins and make sure the CPU is seated flat. Five minutes with the cooler off.",
            "Run MemTest86 from a USB stick, one full pass. Free, takes about an hour, and turns \"it seems fine\" into a pass or fail.",
            "Only if everything above passes: the CPU itself. Another commenter had a 7600X that acted the same way and turned out to be a bad chip. It happens, but it's rare, and it's last because it's the most expensive thing to be wrong about."
          ] },
          { h3: "What he found" },
          { p: "He pulled the stick from slot B2 and Windows installed on the first try." },
          { p: "Then he asked a good question: is the second stick actually bad, and how would he test it? The honest answer was that he didn't know yet. \"Works with one stick\" has three possible explanations, and each has a different fix:" },
          { ul: [
            "The stick he pulled is bad (RMA the kit).",
            "Slot B2 on the board is bad (RMA the board).",
            "Both sticks are fine on their own, but the board can't run the pair together at the configured speed (BIOS update, or run them slower)."
          ] },
          { p: "If he RMAs the kit and it was actually the slot, he gets a new kit and the same crash. So the next step was a short set of swaps: move the suspect stick to the known-good slot, move the known-good stick to the suspect slot, then try both sticks with EXPO off. Each test takes a few minutes and the results don't overlap." },
          { h3: "The swap tests" },
          { ul: [
            "Stick 2 alone in A2. Crashes: stick 2 is bad, RMA the kit. Stable: stick 2 is fine.",
            "Stick 1 alone in B2. Crashes: slot B2 is bad, RMA the board. Stable: the slot is fine.",
            "Both sticks, EXPO off. Crashes: the pair won't run together even at stock speed, so try a BIOS update, then RMA the kit. Stable: the pair is fine at stock and the problem was EXPO.",
            "Both sticks, EXPO on. Crashes: the board can't hold the rated speed. Update the BIOS or set 5600 or 5200 manually."
          ] },
          { p: "Whatever setup he ends up on, a full MemTest86 pass before putting anything on the machine is the last step. That's the difference between \"it hasn't crashed yet\" and \"it's good.\"" },
          { h3: "Outcome" },
          { p: "The thread is still open. I'll update this once he reports which test failed and what he ended up changing." },
          { h3: "Takeaways" },
          { ul: [
            "A different stop code every time means memory until proven otherwise. The same code every time means go look up that code.",
            "\"Windows won't install\" on a new build is almost never a Windows problem. The installer is just the first heavy load.",
            "A second OS is a cheap way to rule out the install media. If it also fails, stop remaking USB sticks.",
            "Order checks by cost. EXPO off and one stick at a time are free. A CPU RMA is a week without a PC.",
            "\"Works with one stick\" is the start of the diagnosis, not the end. Bad stick, bad slot, and pair compatibility are three different problems with three different fixes.",
            "Finish with MemTest86. A full pass is what turns a guess into a result."
          ] }
        ]
      },
      {
        id: "laggy-pc-ram",
        title: "Fixing a Laggy Windows PC: A Full Drive and Mismatched RAM",
        subtitle: "",
        date: "2026",
        tags: ["Hardware", "RAM", "BIOS", "Windows"],
        excerpt: "My desktop was lagging everywhere, even switching browser tabs. Clearing 600 GB fixed most of it. Getting the RAM back to 3200 MHz took most of a day, because two Corsair kits with almost identical model numbers turned out to have different timings.",
        vimeo: "",
        content: [
          { p: "My Windows desktop was lagging everywhere, including simple things like switching browser tabs. This was October 8 and 9, 2026. There turned out to be two separate causes:" },
          { ul: [
            "A nearly full drive. Freeing about 600 GB removed most of the lag right away.",
            "RAM running at its slow default speed. A BIOS update had reset the memory to 2133 MHz instead of its rated 3200 MHz. Turning the fast profile back on gave a black screen, and figuring out why took most of a day."
          ] },
          { p: "The cause of the black screen: my four RAM sticks were two different Corsair kits with almost identical model numbers but different timings. The fix was to run one kit by itself. The PC now runs 32 GB at 3200 MHz." },
          { h3: "The system" },
          { ul: [
            "CPU: AMD Ryzen 9 3900X, 12 cores",
            "Motherboard: MSI MAG X570 TOMAHAWK WIFI (MS-7C84)",
            "BIOS: E7C84AMS.1K4, build date 08/14/2026",
            "RAM: 64 GB as four 16 GB Corsair Vengeance RGB Pro DDR4 sticks (two kits of 2 x 16 GB)",
            "GPU: Nvidia RTX 2070, 8 GB",
            "Storage: 2 TB NVMe SSD for Windows, plus two 2 TB Seagate hard drives",
            "OS: Windows 11"
          ] },
          { p: "A few terms: XMP is a speed profile stored on each RAM stick (MSI calls it A-XMP on AMD boards). CMOS is the small memory that holds the BIOS settings." },
          { h3: "Problem 1: the drive was almost full" },
          { p: "Symptom: general slowness and stutter across Windows, and a pause every time I opened the browser or switched tabs." },
          { p: "The drive my programs run from was nearly full. Windows uses free drive space as overflow memory, and browsers write cache files constantly. With almost no room left, every one of those writes stalls. SSDs also write a lot slower when they're nearly full." },
          { p: "I cleared about 600 GB and the heavy lag stopped immediately. Keep at least 15 to 20 percent of a drive free." },
          { p: "To check this yourself: Ctrl + Shift + Esc opens Task Manager. On the Performance tab, click each disk. A disk sitting near 100 percent active time while the PC stutters is the bottleneck." },
          { h3: "Problem 2: RAM stuck at 2133 MHz" },
          { p: "After the drive cleanup, there were still small hitches while browsing. Task Manager (Performance, Memory, Speed) showed 2133 MHz. The RAM is rated for 3200 MHz." },
          { p: "A month earlier I had updated the BIOS from the launch version to 1K4. A BIOS update wipes all settings, including the A-XMP profile that enables the rated speed. Ryzen 3000 chips are noticeably affected by slow memory." },
          { p: "In the BIOS I turned A-XMP on, picked Profile 1, and saved with F10. The PC powered on but the monitor stayed black." },
          { h3: "The mistake I made" },
          { p: "After a memory speed change, the motherboard runs memory training: it tests the sticks at the new settings before showing a picture. With a lot of RAM that can mean a black screen for one to two minutes, sometimes with a restart in the middle." },
          { p: "I didn't know that at first. I was powering the PC off about five seconds into the black screen, which interrupted the test every time. That made it impossible to tell a real failure from a test that just hadn't finished." },
          { p: "Lesson: after any RAM setting change, set a timer for three full minutes before touching the power button." },
          { h3: "Recovery: clearing CMOS" },
          { p: "When the board won't show a picture at all, the way back is to clear CMOS, which resets every BIOS setting to default. It doesn't touch Windows or any files." },
          { ul: [
            "Hold the power button until the PC shuts off. Switch the power supply off and unplug it.",
            "Press the case power button once to drain leftover power.",
            "Find the two pins labeled JBAT1. On this board they're the bottom pair in a column of six pins, to the right of the lower M.2 heatsink and left of the SYS_FAN headers.",
            "Touch both pins at once with a metal screwdriver tip for 10 seconds.",
            "Plug back in and power on. The screen reports that CMOS was cleared. Press F1 to enter setup."
          ] },
          { p: "Things to fix after every clear:" },
          { ul: [
            "The board goes back to CSM (legacy) boot mode. Set \"BIOS UEFI/CSM Mode\" back to UEFI.",
            "Check and re-enable Secure Boot and fTPM. Windows 11 and some game anti-cheat systems depend on them.",
            "Windows asked me to set a new sign-in PIN, because the PIN is tied to the fTPM.",
            "Switching to UEFI turns on \"Above 4G memory\" and \"Re-Size BAR Support\" automatically. That's normal.",
            "The reset screen offers Alt + F1 to load a saved overclocking profile. Don't load one that might contain the setting that just failed."
          ] },
          { h3: "Finding the cause" },
          { p: "With the timing mistake fixed, I tested one change at a time and waited three minutes on each:" },
          { ul: [
            "Test 1: A-XMP Profile 1 at 3200 MHz, all four sticks. Black screen, but not a fair test since I powered off too early.",
            "Test 2: A-XMP Profile 1 with the speed lowered to 2933 MHz, all four sticks. Black screen after 3+ minutes.",
            "Test 3: A-XMP Profile 1 at 3200 MHz, Pair B only in slots 2 and 4. Boots at 3200 MHz.",
            "Test 4: A-XMP Profile 1 at 3200 MHz, Pair A only in slots 2 and 4. Black screen.",
            "Test 5: 3200 MHz with timings set by hand to 16-20-20-38, Pair B only. Boots.",
            "Test 6: 3200 MHz with timings set by hand to 16-20-20-38, all four sticks. Black screen after 3 minutes."
          ] },
          { p: "Slots are counted from the CPU outward. A pair goes in slots 2 and 4, which is what the board prefers. Testing both pairs in the same two slots mattered: if only one thing changes between tests, the result points at that one thing." },
          { h3: "The answer was on the labels" },
          { p: "I had assumed all four sticks were the same because they were the same brand, size, and speed. The stickers said otherwise:" },
          { ul: [
            "Pair A: CMW32GX4M2E3200C16, 3200 MHz, timings 16-20-20-38 (looser), 1.35 V, version 4.49.",
            "Pair B: CMW32GX4M2C3200C16, 3200 MHz, timings 16-18-18-36 (stricter), 1.35 V, version 4.32."
          ] },
          { p: "One letter is different in the model number (E versus C). Timings are how many clock ticks the RAM is allowed to take to respond, so lower numbers are stricter. The BIOS showed the stricter 16-18-18-36 profile and applied it to all four sticks. Pair A is only rated for 16-20-20-38." },
          { p: "That also explains test 2. Dropping the speed to 2933 MHz kept the strict timings, so the looser kit was still being asked for more than its rating." },
          { p: "A fast-memory profile is only tested by the manufacturer for the sticks sold together in one box. Mixing kits, even from the same product line, isn't guaranteed to work at the rated speed. At the default 2133 MHz the difference doesn't matter, which is why the PC ran fine with all four." },
          { p: "Loosening the timings by hand to match Pair A (test 6) still didn't get all four sticks to boot, so on this CPU and board the four-stick combination won't reach 3200 MHz with these kits." },
          { h3: "Final setup" },
          { ul: [
            "RAM: Pair B only (CMW32GX4M2C3200C16) in slots 2 and 4, 32 GB at 3200 MHz.",
            "Pair A: removed and kept as a spare.",
            "BIOS: UEFI mode, A-XMP Profile 1 on."
          ] },
          { p: "For gaming and everyday use, 32 GB of fast RAM is a better trade than 64 GB of slow RAM. If a job ever needs the full 64 GB, all four sticks at 2133 MHz still works." },
          { h3: "Still to do" },
          { ul: [
            "Test Pair A alone at its own label settings (3200 MHz, 16-20-20-38, full three-minute wait). If it fails, it isn't meeting its advertised speed and Corsair's lifetime warranty may cover a replacement.",
            "Confirm Secure Boot and fTPM are on after the last CMOS clear.",
            "Install the current AMD chipset driver and Nvidia driver.",
            "Watch memory \"In use\" in Task Manager during heavy work for a week. If it never gets near 32 GB, no more RAM is needed. If it does, buy one boxed four-stick kit that was tested together, not a second pair."
          ] },
          { h3: "Takeaways" },
          { ul: [
            "Check Task Manager before guessing. The Performance tab shows which part is maxed out.",
            "Keep 15 to 20 percent of every drive free.",
            "A BIOS update resets everything. Re-check the memory profile, boot mode, Secure Boot, and fTPM afterward.",
            "Memory training takes minutes. A black screen for the first two to three minutes isn't a failure.",
            "Same brand and same speed doesn't mean same kit. Read the full model number, timings, and version on every stick.",
            "Change one thing per test and keep everything else the same.",
            "Know where the clear-CMOS pins are before experimenting with BIOS settings."
          ] },
          { h3: "Quick reference: MSI Click BIOS 5" },
          { p: "Press F7 in the BIOS to switch to Advanced mode first." },
          { ul: [
            "Enter the BIOS from Windows: Settings > System > Recovery > Advanced startup > Restart now > Troubleshoot > Advanced options > UEFI Firmware Settings",
            "Memory profile (A-XMP): OC > A-XMP",
            "Memory speed: OC > DRAM Frequency",
            "Memory timings: OC > Advanced DRAM Configuration (tCL, tRCDRD, tRCDWR, tRP, tRAS)",
            "UEFI boot mode: Settings > Advanced > Windows OS Configuration > BIOS UEFI/CSM Mode",
            "Secure Boot: Settings > Advanced > Windows OS Configuration > Secure Boot",
            "fTPM: Settings > Security > Trusted Computing > Security Device Support, AMD fTPM switch",
            "Save and exit: F10"
          ] }
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
