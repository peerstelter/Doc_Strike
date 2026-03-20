# ⚓ NAVAL STRIKE
### A Modern 2D Battleship Experience

![Version](https://img.shields.io/badge/version-1.0.0-00d4ff?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-brightgreen?style=flat-square)
![Status](https://img.shields.io/badge/status-active-success?style=flat-square)
![Built With](https://img.shields.io/badge/built%20with-HTML%2FCS%2FJS-orange?style=flat-square)

---

```
  ██████╗  ██████╗  ██████╗     ███████╗████████╗██████╗ ██╗██╗  ██╗███████╗
  ██╔══██╗██╔═══██╗██╔════╝     ██╔════╝╚══██╔══╝██╔══██╗██║██║ ██╔╝██╔════╝
  ██║  ██║██║   ██║██║          ███████╗   ██║   ██████╔╝██║█████╔╝ █████╗  
  ██║  ██║██║   ██║██║          ╚════██║   ██║   ██╔══██╗██║██╔═██╗ ██╔══╝  
  ██████╔╝╚██████╔╝╚██████╗     ███████║   ██║   ██║  ██║██║██║  ██╗███████╗
  ╚═════╝  ╚═════╝  ╚═════╝     ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚══════╝
```

> *"The sea is the same as it has been since before men ever went on it in boats."*  
> — Ernest Hemingway

---

## 🌊 Overview

**Naval Strike** is a slick, browser-based reimagining of the classic *Schiffe versenken* (Battleship) game. Built with modern web technologies, it features animated ocean grids, satisfying explosion effects, a persistent global scoreboard, and a responsive AI opponent that adapts to your strategy.

No downloads. No installs. Just open and play.

---

## 🎮 Features

| Feature | Description |
|---|---|
| 🧠 **Smart AI Opponent** | The computer hunts your fleet with adaptive targeting logic — it doesn't just guess randomly |
| 🌊 **Animated Ocean Grid** | Dynamic water ripple effects and animated ships bring the battlefield to life |
| 💥 **Hit & Miss Effects** | Satisfying explosion particles on hits, splash animations on misses |
| 📊 **Global Scoreboard** | Persistent leaderboard tracking wins, losses, accuracy, and best game time |
| 🚢 **Drag & Drop Ship Placement** | Intuitive fleet setup — drag, rotate, and lock in your ships before battle |
| 🔊 **Sound Design** | Atmospheric ocean ambience, cannon fire, and explosion audio |
| 📱 **Responsive Design** | Fully playable on desktop, tablet, and mobile |
| ⚡ **Instant Replay** | Review your last battle move-by-move after the game ends |

---

## 🛠️ Tech Stack

```
Frontend    →  HTML5 Canvas + CSS3 Animations + Vanilla JavaScript (ES2022)
Storage     →  localStorage (offline) + optional Firebase (online scoreboard)
Audio       →  Web Audio API
Build       →  Vite
Deploy      →  GitHub Pages / Netlify / Vercel (zero-config)
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js `>= 18.x`
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/peerstelter/Doc_Strike.git
cd naval-strike

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open your browser at `http://localhost:5173` and start your engines. 🚢

### Production Build

```bash
npm run build
npm run preview
```

---

## 🎯 How to Play

```
1. DEPLOY YOUR FLEET
   └── Drag ships onto your grid. Press R to rotate. Click to place.

2. ENGAGE THE ENEMY
   └── Click any cell on the enemy grid to fire a shot.

3. TRACK THE BATTLE
   └── Hits are marked with 🔥 explosions. Misses with 💧 splashes.

4. SINK ALL SHIPS TO WIN
   └── First admiral to destroy the enemy fleet wins the round.

5. CHECK THE SCOREBOARD
   └── Your result is logged — climb the ranks!
```

---

## 🚢 Fleet Composition

| Ship | Size | Count |
|---|:---:|:---:|
| 🛳️ Carrier | 5 | ×1 |
| ⚓ Battleship | 4 | ×1 |
| 🚢 Cruiser | 3 | ×1 |
| 🚤 Submarine | 3 | ×1 |
| 🛥️ Destroyer | 2 | ×1 |

---

## 📊 Scoreboard System

The built-in scoreboard tracks the following stats per player:

```
┌──────────────────────────────────────────────────────────┐
│  RANK  │  PLAYER        │  W   │  L  │  ACC  │  BEST    │
├──────────────────────────────────────────────────────────┤
│   1    │  KapitänKlaus  │  42  │  7  │ 74%   │  3:21    │
│   2    │  OceanHunter   │  38  │  12 │ 71%   │  4:05    │
│   3    │  NavyAce99     │  31  │  9  │ 68%   │  4:30    │
└──────────────────────────────────────────────────────────┘
```

- **Wins / Losses** — simple W/L record
- **Accuracy** — percentage of shots that hit
- **Best Time** — fastest game completed
- **Score Points** — calculated from speed, accuracy, and difficulty

Scores are saved locally by default. Enable Firebase in `.env` to sync a live global leaderboard.

---

## ⚙️ Configuration

Create a `.env` file in the root:

```env
# Optional: Firebase for online scoreboard
VITE_FIREBASE_API_KEY=your_key_here
VITE_FIREBASE_PROJECT_ID=your_project_id

# AI difficulty (easy | medium | hard)
VITE_DEFAULT_DIFFICULTY=medium

# Enable/disable sound by default
VITE_SOUND_DEFAULT=true
```

---

## 🤖 AI Difficulty Levels

| Level | Behavior |
|---|---|
| 🟢 **Easy** | Random shots with no memory |
| 🟡 **Medium** | Hunts adjacent cells after a hit (classic strategy) |
| 🔴 **Hard** | Uses probability density maps to maximize hit chance each turn |

---

## 📁 Project Structure

```
naval-strike/
├── public/
│   ├── sounds/          # Audio assets
│   └── sprites/         # Ship and effect sprites
├── src/
│   ├── core/
│   │   ├── Board.js     # Grid logic
│   │   ├── Ship.js      # Ship model
│   │   └── Game.js      # Game state machine
│   ├── ai/
│   │   └── Admiral.js   # AI targeting logic
│   ├── ui/
│   │   ├── Renderer.js  # Canvas rendering
│   │   ├── Effects.js   # Animations & particles
│   │   └── Scoreboard.js
│   └── main.js
├── index.html
├── vite.config.js
└── README.md
```

---

## 🤝 Contributing

Contributions are very welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for our code of conduct and contribution guidelines.

---

## 🗺️ Roadmap

- [ ] Multiplayer via WebSockets (local network)
- [ ] Online 1v1 matchmaking
- [ ] Custom ship skins & themes
- [ ] Fog of war mode
- [ ] Tournament bracket system
- [ ] Mobile app wrapper (Capacitor)

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](./LICENSE) for more information.

---

## 🙏 Acknowledgments

- Inspired by the original *Schiffe versenken* board game
- Sound effects from [freesound.org](https://freesound.org)
- Explosion particle system adapted from the brilliant [tsParticles](https://particles.js.org/) library

---

<div align="center">

Made with ❤️ and too much coffee ☕

**[⭐ Star this repo](https://github.com/peerstelter/Doc_Strike)** if you enjoy the game!

</div>
