# Neon Maze — Pac-Man arcade game
A responsive, offline HTML5 Canvas arcade game with four ghost personalities, scatter/chase cycles, power pellets, fruit, particles, synthesized music and sound, and local high scores.

## Run locally
Keep `index.html`, `style.css`, and `game.js` in the same folder. Open `index.html` in a modern browser. No installation, server, or account is required. Press Play to unlock audio. High scores are saved when browser storage is available.

## Controls
- Arrow keys or WASD: move (turns are buffered).
- Swipe on the maze or use the direction pad on touch devices.
- P or Space: pause/resume; M: mute.
- Restart from the pause menu. Choose Easy, Normal or Hard on the start screen.

## Scoring
Pellet: 10; power pellet: 50; frightened ghosts: 200, 400, 800, 1600; fruit: 100 × level. Clear every pellet to advance. Three lives per game. Ghost speed increases with level, up to a cap.

## Publish on GitHub
Create an empty public repository named `pacman-game` at https://github.com/new (do not initialize with a README). In a terminal inside this folder:

```sh
git init
git add .
git commit -m "Build Neon Maze arcade game"
git branch -M main
git remote add origin https://github.com/nic7L/pacman-game.git
git push -u origin main
```

In repository Settings → Pages, choose Deploy from a branch, select `main` and `/ (root)`, then Save. Once deployment succeeds, open https://nic7L.github.io/pacman-game/.