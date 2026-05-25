VIDEOS FOLDER
=============

Put your video files in this folder. The Videos window in AlexOS
plays them as click-to-play players.

By default the Videos window looks for these files:

  demo-reel.mp4
  project-walkthrough.mp4
  coding-timelapse.mp4

To change the names, add videos, or remove videos, edit the VIDEOS
list near the top of script.js. Each entry looks like:

  {
    title: "Demo Reel",
    description: "A short caption.",
    file: "videos/demo-reel.mp4"
  }

TIPS
----
- Use .mp4 files encoded with H.264 video and AAC audio for the
  widest browser support.
- Keep file sizes reasonable so the page stays quick to load.
- If a file is missing, the Videos window shows a small note
  instead of a broken player, so the rest of the page still works.
