# ⚓ NAVAL STRIKE
### A Modern 2D Battleship Experience

![Version](https://img.shields.io/badge/version-2.0.0-00d4ff?style=flat-square)
![License](https://img.shields.io/badge/license-Proprietary-red?style=flat-square)
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

**Naval Strike** is a slick, browser-based reimagining of the classic *Schiffe versenken* (Battleship) game. Built with modern web technologies, it features animated ocean grids, satisfying explosion effects, a persistent scoreboard, a smart AI opponent, full **real-time online PVP** over WebSockets, **four visual themes**, a **Fog of War** combat mode, and a **fully online tournament bracket** where every player uses their own device.

No downloads. No installs. Just open and play.

---

## 🎮 Features

| Feature | Description |
|---|---|
| 🤖 **Smart AI Opponent** | Three difficulty levels — Easy / Medium / Hard with adaptive hunt-and-target logic |
| 👥 **Local PVP** | Pass-the-device play with a secure hand-off screen and result-visible delay between turns |
| 🌐 **Online PVP** | Real-time network play via 6-character room codes over WebSockets |
| 🏆 **Online Tournament** | Server-managed single-elimination brackets (2 / 4 / 8 players) — every player on their own device |
| 🎨 **4 Visual Themes** | Ocean · Arctic · Inferno · Jungle — cycle with the 🌊 header button |
| 🌫️ **Fog of War Mode** | Restrict firing to cells adjacent to previous shots — true hidden-information gameplay |
| 📐 **Variable Board Sizes** | Choose 10×10 · 15×15 · 20×20 for local and online matches |
| 🌊 **Animated Ocean Grid** | Dynamic canvas rendering with ship placement previews |
| 💥 **Hit & Miss Effects** | Explosion particles on hits, splash animations on misses |
| 📊 **Scoreboard** | Server-side leaderboard tracking wins, accuracy, and best time per mode |
| 🔊 **Sound Design** | Cannon fire, explosions, and atmospheric ocean audio |
| 📱 **Responsive Design** | Fully playable on desktop, tablet, and mobile |
| ⚡ **PWA** | Installable on any device — works offline (vs AI & local PVP) |

---

## 🛠️ Tech Stack

```
Frontend    →  HTML5 Canvas + CSS3 + Vanilla JavaScript (ES modules)
Online PVP  →  Node.js WebSocket relay server (ws package)
Scores      →  server-side scores.json, exposed via REST API (/api/scores)
Build       →  Vite + vite-plugin-pwa
Deploy      →  Docker (Nginx Alpine + Node Alpine) + deploy.sh
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js `>= 18.x`
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/peerstelter/Doc_Strike.git
cd Doc_Strike

# Install dependencies
npm install

# Terminal 1 — WebSocket relay (required for Online PVP & Tournaments)
npm run server        # ws://localhost:3001

# Terminal 2 — Vite dev server
npm run dev           # http://localhost:5173
```

> Online PVP auto-detects the environment:
> - **HTTP** (dev) → connects directly to `ws://localhost:3001`
> - **HTTPS** (production) → routes through the reverse proxy at `wss://yourdomain/ws`

---

## 🎯 How to Play

```
1. CHOOSE YOUR MODE
   └── vs AI · Local PVP · Online PVP · Tournament

2. DEPLOY YOUR FLEET
   └── Click ships to select, click the grid to place. Press Rotate or R to rotate.
       Use 🎲 Random for a quick placement, or 🌫️ Fog of War to enable the fog mechanic.

3. ENGAGE THE ENEMY
   └── Click any revealed cell on the enemy grid to fire a shot.

4. TRACK THE BATTLE
   └── Hits are marked with 🔥 explosions. Misses with 💧 splashes.
       In Fog of War, each shot reveals only the adjacent cells around it.

5. SINK ALL SHIPS TO WIN
   └── First admiral to destroy the enemy fleet wins the round.

6. CHECK THE SCOREBOARD
   └── Your result is saved — climb the ranks!
```

---

## 🌐 Online PVP — how it works

```
Player 1 (Host)                     Player 2 (Guest)
  │                                       │
  ├── 🌐 Online → Host                    ├── 🌐 Online → Join
  │                                       │
  │◄─── room code: AB3K7Z ─────────────► enters AB3K7Z
  │                                       │
  │         ◄─── WebSocket relay ───►     │
  │                                       │
  ├── places fleet → Ready ─────────────► places fleet → Ready
  │                                       │
  └────────────── battle starts ──────────┘
```

- The relay server forwards only `fire` / `result` messages — it never sees board state
- Each player's board is authoritative on their own device
- Host fires first

---

## 🏆 Online Tournament — how it works

```
Organiser                        Players (each on own device)
  │                                       │
  ├── 🏆 Tournament → Create              ├── 🏆 Tournament → Join
  │   (set player count: 2/4/8)          │   (enter T-XXXXX code)
  │                                       │
  │◄─── share code: TXXXXX ─────────────►│ lobby fills up
  │                                       │
  │    Server builds bracket & auto-assigns match rooms
  │                                       │
  ├── deploy fleet → battle ────────────► deploy fleet → battle
  │                                       │
  └── winner advances automatically ─────┘
                  ↓
         next round starts
                  ↓
           🏆 Champion crowned
```

- Single-elimination bracket — 2, 4, or 8 players
- Server manages the entire bracket: seeding, room creation, round advancement
- Players never need to manually host/join — the server places them in rooms automatically
- Tournament code format: `TXXXXX` (6 characters, T prefix distinguishes from regular room codes)
- Between rounds, all players see the live bracket with results

---

## 🌫️ Fog of War

When **Fog of War** is enabled in setup:

- The entire enemy grid starts **hidden** (fogged)
- Your **first shot** can be anywhere on the board
- Each subsequent shot **only reveals cells adjacent** (up/down/left/right) to cells you've already fired at
- Fogged cells **block clicks** — you must work your way outward from known positions
- The fog is rendered with a dark overlay + subtle texture on the canvas

This turns the game into a true hidden-information challenge rather than a pure guessing game.

---

## 🎨 Themes

Cycle through themes with the **🌊 button** in the header. Each theme changes both the UI colours and the canvas rendering colours:

| Theme | Feel |
|---|---|
| 🌊 **Ocean** | Classic deep-sea blues (default) |
| 🧊 **Arctic** | Icy whites and cold greys |
| 🔥 **Inferno** | Dark reds and molten oranges |
| 🌿 **Jungle** | Deep greens and earthy tones |

---

## 🚢 Fleet Composition

Fleet size scales with the board. Each config keeps roughly 15–17% cell coverage.

**10×10 — 5 ships**

| Ship | Size |
|---|:---:|
| 🛳️ Carrier | 5 |
| ⚓ Battleship | 4 |
| 🚢 Cruiser | 3 |
| 🚤 Submarine | 3 |
| 🛥️ Destroyer | 2 |

**15×15 — 10 ships** · **20×20 — 20 ships** (proportionally larger fleets with duplicate ship types)

---

## 📊 Scoreboard

Scores are stored **server-side** in `scores.json` on the WebSocket server and exposed via a REST API:

```
GET  /api/scores?mode=ai|local|online   →  aggregated leaderboard
POST /api/scores                        →  submit a game result
```

The frontend fetches live standings after each game. In dev (`http://`) it hits `localhost:3001/api` directly; in production (`https://`) it routes through the reverse proxy at `/api`.

```
┌──────────────────────────────────────────────────────────┐
│  RANK  │  PLAYER        │  W   │  L  │  ACC  │  BEST    │
├──────────────────────────────────────────────────────────┤
│   1    │  KapitänKlaus  │  42  │  7  │ 74%   │  3:21    │
│   2    │  OceanHunter   │  38  │  12 │ 71%   │  4:05    │
│   3    │  NavyAce99     │  31  │  9  │ 68%   │  4:30    │
└──────────────────────────────────────────────────────────┘
```

---

## 🤖 AI Difficulty Levels

| Level | Behavior |
|---|---|
| 🟢 **Easy** | Random shots with no memory |
| 🟡 **Medium** | Hunts adjacent cells after a hit |
| 🔴 **Hard** | Uses probability density maps to maximise hit chance each turn |

---

## 🐳 Production Deployment (Alpine Linux + Docker)

### One-command deploy

```sh
sh <(wget -qO- https://raw.githubusercontent.com/peerstelter/Doc_Strike/main/deploy.sh)
```

The script will:
- Install Docker and Git if missing
- Clone / pull the repo to `/opt/naval-strike`
- Ask for port numbers on first run and save them to `.env`
- Build both Docker images and start the containers
- **Print the exact Nginx Proxy Manager config at the end**

### Update

```sh
cd /opt/naval-strike && git pull && docker compose up -d --build
```

### Health check

```sh
curl http://localhost:WS_PORT/health
# {"status":"ok","rooms":0}
```

---

## 🔀 Nginx Proxy Manager config

Create a **Proxy Host** for your domain:

| Field | Value |
|---|---|
| Forward Hostname / IP | your server IP |
| Forward Port | `FRONTEND_PORT` (default `8080`) |
| Websockets Support | ✅ ON |
| SSL | Request a Let's Encrypt certificate |

**Advanced → Custom Nginx Configuration** (the deploy script prints this filled in):

```nginx
location /ws {
    proxy_pass         http://YOUR_SERVER_IP:WS_PORT;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade    $http_upgrade;
    proxy_set_header   Connection "Upgrade";
    proxy_set_header   Host       $host;
    proxy_set_header   X-Real-IP  $remote_addr;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}

location /api {
    proxy_pass         http://YOUR_SERVER_IP:WS_PORT;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-Proto $scheme;
}
```

---

## 📁 Project Structure

```
naval-strike/
├── src/
│   ├── core/
│   │   ├── Board.js           # Grid, ship placement, shot logic (variable size)
│   │   ├── Game.js            # State machine (setup → battle → gameover)
│   │   └── Ship.js            # Ship model
│   ├── ai/
│   │   └── Admiral.js         # AI opponent (hunt/target + probability map)
│   ├── ui/
│   │   ├── Renderer.js        # Canvas renderer (HiDPI, themes, fog of war)
│   │   ├── Effects.js         # Hit/miss/sunk animations
│   │   ├── SoundManager.js    # Web Audio sound effects
│   │   ├── Scoreboard.js      # Scoreboard (server-side REST API)
│   │   ├── NetworkManager.js  # WebSocket client (PVP + tournament messages)
│   │   ├── Tournament.js      # (legacy local bracket — superseded by server)
│   │   └── themes.js          # Theme definitions & applyTheme() helper
│   ├── main.js                # App entry point & UI wiring
│   └── style.css
├── server.js                  # WebSocket relay + tournament manager (Node.js)
├── Dockerfile                 # Frontend: multi-stage Vite build → Nginx Alpine
├── Dockerfile.ws              # WS relay: Node Alpine
├── docker-compose.yml         # Orchestrates both containers, ports from .env
├── nginx.conf                 # Nginx config for the frontend container
├── nginx-proxy.conf.example   # Sample datacenter reverse proxy config
├── deploy.sh                  # Alpine one-shot deployment script
├── .env.example               # Port configuration template
└── LICENSE
```

---

## 🗺️ Roadmap

- [x] Smart AI opponent with adaptive targeting
- [x] Local pass-and-play PVP
- [x] Online PVP via WebSocket room codes ✅
- [x] Docker deployment with Alpine deploy script ✅
- [x] PWA — installable on mobile and desktop
- [x] Custom ship themes (Ocean, Arctic, Inferno, Jungle) ✅
- [x] Fog of War mode (real click-restriction mechanic) ✅
- [x] Variable board sizes (10×10, 15×15, 20×20) ✅
- [x] Online tournament bracket (2/4/8 players, own device each) ✅
- [ ] Mobile app wrapper (Capacitor)

---

## 📄 License

Copyright © 2026 Peer Stelter. All rights reserved.
Unauthorized use, reproduction, or distribution is strictly prohibited.
See [LICENSE](./LICENSE) for full terms.

---

<div align="center">

Made with ❤️ and too much coffee ☕

**[⭐ Star this repo](https://github.com/peerstelter/Doc_Strike)** if you enjoy the game!

</div>
