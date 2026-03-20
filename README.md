# ⚓ NAVAL STRIKE
### A Modern 2D Battleship Experience

![Version](https://img.shields.io/badge/version-1.0.0-00d4ff?style=flat-square)
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

**Naval Strike** is a slick, browser-based reimagining of the classic *Schiffe versenken* (Battleship) game. Built with modern web technologies, it features animated ocean grids, satisfying explosion effects, a persistent scoreboard, a smart AI opponent — and full **real-time online PVP** over WebSockets.

No downloads. No installs. Just open and play.

---

## 🎮 Features

| Feature | Description |
|---|---|
| 🤖 **Smart AI Opponent** | Three difficulty levels — Easy / Medium / Hard with adaptive hunt-and-target logic |
| 👥 **Local PVP** | Pass-the-device play with a secure hand-off screen between turns |
| 🌐 **Online PVP** | Real-time network play via 6-character room codes over WebSockets |
| 🌊 **Animated Ocean Grid** | Dynamic canvas rendering with ship placement previews |
| 💥 **Hit & Miss Effects** | Explosion particles on hits, splash animations on misses |
| 📊 **Scoreboard** | Persistent leaderboard tracking wins, accuracy, and best time (stored in `localStorage`) |
| 🔊 **Sound Design** | Cannon fire, explosions, and atmospheric ocean audio |
| 📱 **Responsive Design** | Fully playable on desktop, tablet, and mobile |
| ⚡ **PWA** | Installable on any device — works offline (vs AI & local PVP) |

---

## 🛠️ Tech Stack

```
Frontend    →  HTML5 Canvas + CSS3 + Vanilla JavaScript (ES modules)
Online PVP  →  Node.js WebSocket relay server (ws package)
Storage     →  localStorage
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

# Terminal 1 — WebSocket relay (required for Online PVP)
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
   └── vs AI · Local PVP · Online PVP

2. DEPLOY YOUR FLEET
   └── Click ships to select, click the grid to place. Press Rotate or R to rotate.

3. ENGAGE THE ENEMY
   └── Click any cell on the enemy grid to fire a shot.

4. TRACK THE BATTLE
   └── Hits are marked with 🔥 explosions. Misses with 💧 splashes.

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
  │◄─── room code: ABC-123 ─────────────► enters ABC123
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

## 🚢 Fleet Composition

| Ship | Size |
|---|:---:|
| 🛳️ Carrier | 5 |
| ⚓ Battleship | 4 |
| 🚢 Cruiser | 3 |
| 🚤 Submarine | 3 |
| 🛥️ Destroyer | 2 |

---

## 📊 Scoreboard

Scores are saved locally in `localStorage` under the key `naval-strike-scores-v1`.

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
```

---

## 📁 Project Structure

```
naval-strike/
├── src/
│   ├── core/
│   │   ├── Board.js           # 10×10 grid, ship placement, shot logic
│   │   ├── Game.js            # State machine (setup → battle → gameover)
│   │   └── Ship.js            # Ship model
│   ├── ai/
│   │   └── Admiral.js         # AI opponent (hunt/target + probability map)
│   ├── ui/
│   │   ├── Renderer.js        # Canvas renderer
│   │   ├── Effects.js         # Hit/miss/sunk animations
│   │   ├── SoundManager.js    # Web Audio sound effects
│   │   ├── Scoreboard.js      # localStorage scoreboard
│   │   └── NetworkManager.js  # WebSocket client (auto-detects dev vs prod URL)
│   ├── main.js                # App entry point & UI wiring
│   └── style.css
├── server.js                  # WebSocket relay server (Node.js)
├── Dockerfile                 # Frontend: multi-stage Vite build → Nginx Alpine
├── Dockerfile.ws              # WS relay: Node Alpine (installs only ws@8)
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
- [ ] Custom ship skins & themes
- [ ] Fog of war mode
- [ ] Tournament bracket system
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
