VELOCITY v0.5
Run: open index.html in Chrome (internet needed once per load for three.js from the CDN).
If your browser blocks anything, serve this folder with:  python3 -m http.server 8000   then open http://localhost:8000
Files: js/core.js (scene, materials, tuning CFG) | js/world.js (collision world) | js/sandbox.js | js/course.js (Course 01 + gates)
       js/player.js (input, movement, abilities, gates/timing) | js/main.js (camera/render loop, menu, level loading)
Add a level: write a build function returning {id,spawn,yaw,course,bound}, register it in LEVELS (main.js), add a menu button.
