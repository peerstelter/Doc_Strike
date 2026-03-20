/**
 * Admiral — AI opponent for Naval Strike
 *
 * Easy:   Pure random shots
 * Medium: Hunt/Target — after a hit, focuses adjacent cells and tracks ship direction
 * Hard:   Probability density map + Hunt/Target hybrid
 */
export class Admiral {
  constructor(difficulty = 'medium') {
    this.difficulty = difficulty;
    this.reset();
  }

  reset() {
    this.hitStack    = [];  // confirmed hits not yet part of a sunk ship
    this.targetQueue = [];  // prioritised cells to try next
    this.parity      = Math.floor(Math.random() * 2); // 0 or 1, for checkerboard hunt
  }

  // ── Public API ──────────────────────────

  chooseCell(board) {
    switch (this.difficulty) {
      case 'easy':   return this._randomShot(board);
      case 'hard':   return this._probabilityShot(board);
      default:       return this._huntTargetShot(board);
    }
  }

  onResult(result, row, col, board) {
    if (this.difficulty === 'easy') return;

    if (result.hit) {
      if (result.sunk) {
        // Remove sunk ship's cells from hitStack
        const sunkSet = new Set(result.ship.cells.map(c => `${c.row},${c.col}`));
        this.hitStack = this.hitStack.filter(h => !sunkSet.has(`${h.row},${h.col}`));
        // Rebuild queue from any remaining unsunk hits
        this._rebuildQueue(board);
      } else {
        this.hitStack.push({ row, col });
        this._rebuildQueue(board);
      }
    }
  }

  // ── Strategies ──────────────────────────

  _randomShot(board) {
    const cells = board.getUnfiredCells();
    return cells[Math.floor(Math.random() * cells.length)];
  }

  _huntTargetShot(board) {
    // Remove stale cells from queue
    this.targetQueue = this.targetQueue.filter(({ row, col }) => !board.isFired(row, col));

    if (this.targetQueue.length > 0) return this.targetQueue.shift();

    // Hunt mode: checkerboard pattern maximises expected coverage
    return this._huntShot(board);
  }

  _huntShot(board) {
    const candidates = [];
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++)
        if (!board.isFired(r, c) && (r + c) % 2 === this.parity)
          candidates.push({ row: r, col: c });

    // Fallback if checkerboard exhausted
    if (candidates.length === 0) return this._randomShot(board);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  _probabilityShot(board) {
    // Still use the targetQueue when we have active hits
    this.targetQueue = this.targetQueue.filter(({ row, col }) => !board.isFired(row, col));
    if (this.targetQueue.length > 0 && this.hitStack.length > 0)
      return this.targetQueue.shift();

    // Build probability density map
    const density = Array.from({ length: 10 }, () => Array(10).fill(0));
    const unsunk  = board.ships.filter(s => !s.isSunk());

    for (const ship of unsunk) {
      // Horizontal placements
      for (let r = 0; r < 10; r++)
        for (let c = 0; c <= 10 - ship.size; c++)
          if (this._fits(board, ship.size, r, c, true))
            for (let i = 0; i < ship.size; i++) density[r][c + i]++;

      // Vertical placements
      for (let r = 0; r <= 10 - ship.size; r++)
        for (let c = 0; c < 10; c++)
          if (this._fits(board, ship.size, r, c, false))
            for (let i = 0; i < ship.size; i++) density[r + i][c]++;
    }

    // Pick the unfired cell with highest density
    let best = null, maxD = -1;
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++)
        if (!board.isFired(r, c) && density[r][c] > maxD) {
          maxD = density[r][c];
          best = { row: r, col: c };
        }

    return best || this._randomShot(board);
  }

  // ── Helpers ─────────────────────────────

  _fits(board, size, row, col, horizontal) {
    for (let i = 0; i < size; i++) {
      const r = horizontal ? row     : row + i;
      const c = horizontal ? col + i : col;
      const cell = board.grid[r][c];
      // A miss blocks any ship placement through it
      if (cell && cell.fired && !cell.ship) return false;
    }
    return true;
  }

  _rebuildQueue(board) {
    this.targetQueue = [];
    if (this.hitStack.length === 0) return;

    if (this.hitStack.length >= 2) {
      const rows = this.hitStack.map(h => h.row);
      const cols = this.hitStack.map(h => h.col);
      const sameRow = new Set(rows).size === 1;
      const sameCol = new Set(cols).size === 1;

      if (sameRow) {
        const row    = rows[0];
        const minCol = Math.min(...cols);
        const maxCol = Math.max(...cols);
        if (minCol > 0 && !board.isFired(row, minCol - 1))
          this.targetQueue.push({ row, col: minCol - 1 });
        if (maxCol < 9 && !board.isFired(row, maxCol + 1))
          this.targetQueue.push({ row, col: maxCol + 1 });
        return;
      }
      if (sameCol) {
        const col    = cols[0];
        const minRow = Math.min(...rows);
        const maxRow = Math.max(...rows);
        if (minRow > 0 && !board.isFired(minRow - 1, col))
          this.targetQueue.push({ row: minRow - 1, col });
        if (maxRow < 9 && !board.isFired(maxRow + 1, col))
          this.targetQueue.push({ row: maxRow + 1, col });
        return;
      }
    }

    // Single hit (or mixed orientation — shouldn't happen but be safe)
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const { row, col } of this.hitStack) {
      for (const [dr, dc] of dirs) {
        const r = row + dr, c = col + dc;
        if (r >= 0 && r < 10 && c >= 0 && c < 10 && !board.isFired(r, c))
          this.targetQueue.push({ row: r, col: c });
      }
    }
  }
}
