import { Ship, FLEET } from './Ship.js';
import { Board } from './Board.js';
import { Admiral } from '../ai/Admiral.js';

export class Game {
  constructor() {
    this.playerBoard = new Board();
    this.enemyBoard  = new Board();
    this.admiral     = new Admiral('medium');

    this.state        = 'setup'; // setup | setup2 | battle | gameover
    this.playerTurn   = true;
    this.pvpMode      = false;
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

  _makeFleet() {
    return FLEET.map(cfg => new Ship(cfg));
  }

  _randomPlace(board, fleet) {
    board.reset();
    for (const ship of fleet) {
      ship.reset();
      let placed = false, attempts = 0;
      while (!placed && attempts < 2000) {
        const row = Math.floor(Math.random() * 10);
        const col = Math.floor(Math.random() * 10);
        placed = board.placeShip(ship, row, col, Math.random() > 0.5);
        attempts++;
      }
    }
  }

  // ── Setup (shared / P1) ──────────────────

  startSetup(pvp = false) {
    this.pvpMode     = pvp;
    this.playerFleet = this._makeFleet();
    this.enemyFleet  = this._makeFleet();
    this.playerBoard.reset();
    this.enemyBoard.reset();
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

  startSetup2() {
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
