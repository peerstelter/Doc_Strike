import { Ship, FLEET } from './Ship.js';
import { Board } from './Board.js';
import { Admiral } from '../ai/Admiral.js';

// ── Fleet configurations per board size ──────────────────────────────────────
export const FLEET_CONFIGS = {
  10: [
    { name: 'Carrier',    size: 5, emoji: '🛳️', color: '#2196f3' },
    { name: 'Battleship', size: 4, emoji: '⚓',  color: '#9c27b0' },
    { name: 'Cruiser',    size: 3, emoji: '🚢',  color: '#4caf50' },
    { name: 'Submarine',  size: 3, emoji: '🚤',  color: '#ff9800' },
    { name: 'Destroyer',  size: 2, emoji: '🛥️',  color: '#f44336' },
  ],
  15: [
    // 10 ships, 34 cells (~15% of 225) — proportional extended fleet
    { name: 'Carrier',    size: 5, emoji: '🛳️', color: '#2196f3' },
    { name: 'Carrier',    size: 5, emoji: '🛳️', color: '#1565c0' },
    { name: 'Battleship', size: 4, emoji: '⚓',  color: '#9c27b0' },
    { name: 'Battleship', size: 4, emoji: '⚓',  color: '#6a1b9a' },
    { name: 'Cruiser',    size: 3, emoji: '🚢',  color: '#4caf50' },
    { name: 'Cruiser',    size: 3, emoji: '🚢',  color: '#2e7d32' },
    { name: 'Submarine',  size: 3, emoji: '🚤',  color: '#ff9800' },
    { name: 'Submarine',  size: 3, emoji: '🚤',  color: '#e65100' },
    { name: 'Destroyer',  size: 2, emoji: '🛥️',  color: '#f44336' },
    { name: 'Destroyer',  size: 2, emoji: '🛥️',  color: '#b71c1c' },
  ],
  20: [
    // 20 ships, 68 cells (~17% of 400) — large fleet
    { name: 'Carrier',    size: 5, emoji: '🛳️', color: '#2196f3' },
    { name: 'Carrier',    size: 5, emoji: '🛳️', color: '#1565c0' },
    { name: 'Carrier',    size: 5, emoji: '🛳️', color: '#0d47a1' },
    { name: 'Carrier',    size: 5, emoji: '🛳️', color: '#01579b' },
    { name: 'Battleship', size: 4, emoji: '⚓',  color: '#9c27b0' },
    { name: 'Battleship', size: 4, emoji: '⚓',  color: '#6a1b9a' },
    { name: 'Battleship', size: 4, emoji: '⚓',  color: '#4a148c' },
    { name: 'Battleship', size: 4, emoji: '⚓',  color: '#7b1fa2' },
    { name: 'Cruiser',    size: 3, emoji: '🚢',  color: '#4caf50' },
    { name: 'Cruiser',    size: 3, emoji: '🚢',  color: '#2e7d32' },
    { name: 'Cruiser',    size: 3, emoji: '🚢',  color: '#1b5e20' },
    { name: 'Cruiser',    size: 3, emoji: '🚢',  color: '#388e3c' },
    { name: 'Submarine',  size: 3, emoji: '🚤',  color: '#ff9800' },
    { name: 'Submarine',  size: 3, emoji: '🚤',  color: '#e65100' },
    { name: 'Submarine',  size: 3, emoji: '🚤',  color: '#bf360c' },
    { name: 'Submarine',  size: 3, emoji: '🚤',  color: '#f57c00' },
    { name: 'Destroyer',  size: 2, emoji: '🛥️',  color: '#f44336' },
    { name: 'Destroyer',  size: 2, emoji: '🛥️',  color: '#c62828' },
    { name: 'Destroyer',  size: 2, emoji: '🛥️',  color: '#b71c1c' },
    { name: 'Destroyer',  size: 2, emoji: '🛥️',  color: '#e53935' },
  ],
};

export class Game {
  constructor() {
    this.playerBoard = new Board();
    this.enemyBoard  = new Board();
    this.admiral     = new Admiral('medium');

    this.state        = 'setup'; // setup | setup2 | battle | gameover
    this.playerTurn   = true;
    this.pvpMode      = false;
    this.boardSize    = 10;
    this.playerFleet  = [];
    this.enemyFleet   = [];

    // PVP per-player shot tracking
    this.p1Shots = 0; this.p1Hits = 0;
    this.p2Shots = 0; this.p2Hits = 0;

    this.shotsFired = 0;
    this.shotsHit   = 0;
    this.startTime  = null;

    // Callbacks set by main.js
    this.onStateChange = null;  // (state, data) => void
    this.onShot        = null;  // (result, isPlayer, row, col) => void
  }

  // ── Fleet helpers ────────────────────────

  _makeFleet(boardSize = 10) {
    const configs = FLEET_CONFIGS[boardSize] || FLEET_CONFIGS[10];
    return configs.map(cfg => new Ship(cfg));
  }

  _randomPlace(board, fleet) {
    board.reset();
    for (const ship of fleet) {
      ship.reset();
      let placed = false, attempts = 0;
      while (!placed && attempts < 2000) {
        const row = Math.floor(Math.random() * board.size);
        const col = Math.floor(Math.random() * board.size);
        placed = board.placeShip(ship, row, col, Math.random() > 0.5);
        attempts++;
      }
    }
  }

  // ── Setup (shared / P1) ──────────────────

  startSetup(pvp = false, boardSize = 10) {
    this.pvpMode     = pvp;
    this.boardSize   = boardSize;
    this.playerBoard = new Board(boardSize);
    this.enemyBoard  = new Board(boardSize);
    this.playerFleet = this._makeFleet(boardSize);
    this.enemyFleet  = this._makeFleet(boardSize);
    this.admiral.reset();
    this.state      = 'setup';
    this.playerTurn = true;
    this.shotsFired = 0; this.shotsHit  = 0;
    this.p1Shots    = 0; this.p1Hits    = 0;
    this.p2Shots    = 0; this.p2Hits    = 0;
    this.startTime  = null;
    this._emit('setup', { pvp, player: 1 });
  }

  randomPlacePlayer() {
    this._randomPlace(this.playerBoard, this.playerFleet);
    this._emit('setup', { pvp: this.pvpMode, player: 1 });
  }

  clearPlayerShips() {
    for (const ship of this.playerFleet)
      if (ship.placed) this.playerBoard.removeShip(ship);
    this._emit('setup', { pvp: this.pvpMode, player: 1 });
  }

  placePlayerShip(ship, row, col, horizontal) {
    return this.playerBoard.placeShip(ship, row, col, horizontal);
  }

  allShipsPlaced() { return this.playerFleet.every(s => s.placed); }

  // ── PVP: Setup phase 2 (Player 2) ────────

  startSetup2(boardSize) {
    // boardSize is already set from startSetup; accept optional override
    if (boardSize !== undefined) this.boardSize = boardSize;
    this.state = 'setup2';
    this._emit('setup2', { pvp: true, player: 2 });
  }

  randomPlaceP2() {
    this._randomPlace(this.enemyBoard, this.enemyFleet);
    this._emit('setup2', { pvp: true, player: 2 });
  }

  clearP2Ships() {
    for (const ship of this.enemyFleet)
      if (ship.placed) this.enemyBoard.removeShip(ship);
    this._emit('setup2', { pvp: true, player: 2 });
  }

  placeP2Ship(ship, row, col, horizontal) {
    return this.enemyBoard.placeShip(ship, row, col, horizontal);
  }

  allP2ShipsPlaced() { return this.enemyFleet.every(s => s.placed); }

  // ── Battle (vs AI) ───────────────────────

  startBattle(difficulty) {
    if (!this.allShipsPlaced()) return false;
    this.pvpMode = false;
    this.admiral = new Admiral(difficulty);
    this._randomPlace(this.enemyBoard, this.enemyFleet);
    this.state = 'battle'; this.playerTurn = true;
    this.startTime = Date.now();
    this._emit('battle', { pvp: false });
    return true;
  }

  // ── Battle (PVP) ─────────────────────────

  startBattlePVP() {
    if (!this.allShipsPlaced() || !this.allP2ShipsPlaced()) return false;
    this.pvpMode = true;
    this.state = 'battle'; this.playerTurn = true;
    this.startTime = Date.now();
    this._emit('battle', { pvp: true, currentPlayer: 1 });
    return true;
  }

  // ── Firing ───────────────────────────────

  playerFire(row, col) {
    if (this.state !== 'battle' || !this.playerTurn) return null;
    if (this.enemyBoard.isFired(row, col)) return null;

    const result = this.enemyBoard.fire(row, col);
    if (!result) return null;

    this.shotsFired++; this.p1Shots++;
    if (result.hit) { this.shotsHit++; this.p1Hits++; }

    if (this.onShot) this.onShot(result, true, row, col);

    if (this.enemyBoard.allSunk()) { this._endGame(true); return result; }

    this.playerTurn = false;

    if (this.pvpMode) {
      // Signal main.js to show pass screen before P2 fires
      this._emit('pass', { to: 2 });
    } else {
      setTimeout(() => this._aiTurn(), 900);
    }
    return result;
  }

  // Called by main.js when P2 fires (PVP only)
  p2Fire(row, col) {
    if (this.state !== 'battle' || this.playerTurn) return null;
    if (this.playerBoard.isFired(row, col)) return null;

    const result = this.playerBoard.fire(row, col);
    if (!result) return null;

    this.p2Shots++;
    if (result.hit) this.p2Hits++;

    if (this.onShot) this.onShot(result, false, row, col);

    if (this.playerBoard.allSunk()) { this._endGame(false); return result; }

    this.playerTurn = true;
    // Signal main.js to show pass screen before P1 fires again
    this._emit('pass', { to: 1 });
    return result;
  }

  _aiTurn() {
    if (this.state !== 'battle') return;
    const cell = this.admiral.chooseCell(this.playerBoard);
    if (!cell) return;
    const result = this.playerBoard.fire(cell.row, cell.col);
    if (result) {
      this.admiral.onResult(result, cell.row, cell.col, this.playerBoard);
      if (this.onShot) this.onShot(result, false, cell.row, cell.col);
    }
    if (this.playerBoard.allSunk()) { this._endGame(false); return; }
    this.playerTurn = true;
  }

  _endGame(playerWon) {
    this.state = 'gameover';
    const duration = Math.floor((Date.now() - this.startTime) / 1000);

    let data;
    if (this.pvpMode) {
      const p1Acc = this.p1Shots > 0 ? Math.round((this.p1Hits / this.p1Shots) * 100) : 0;
      const p2Acc = this.p2Shots > 0 ? Math.round((this.p2Hits / this.p2Shots) * 100) : 0;
      data = {
        pvp: true, playerWon,
        p1: { shots: this.p1Shots, hits: this.p1Hits, accuracy: p1Acc },
        p2: { shots: this.p2Shots, hits: this.p2Hits, accuracy: p2Acc },
        duration,
        // For scoreboard: use winner's stats
        shots: playerWon ? this.p1Shots : this.p2Shots,
        hits:  playerWon ? this.p1Hits  : this.p2Hits,
        accuracy: playerWon ? p1Acc : p2Acc,
      };
    } else {
      const accuracy = this.shotsFired > 0
        ? Math.round((this.shotsHit / this.shotsFired) * 100) : 0;
      data = { pvp: false, playerWon, shots: this.shotsFired, hits: this.shotsHit, accuracy, duration };
    }
    this._emit('gameover', data);
  }

  getElapsed() {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  getAccuracy() {
    if (this.shotsFired === 0) return null;
    return Math.round((this.shotsHit / this.shotsFired) * 100);
  }

  // Used by network mode to trigger game over with custom stats
  endNetworkGame(playerWon, stats) {
    this.state = 'gameover';
    this._emit('gameover', { pvp: false, playerWon, ...stats });
  }

  _emit(state, data) {
    if (this.onStateChange) this.onStateChange(state, data);
  }
}
