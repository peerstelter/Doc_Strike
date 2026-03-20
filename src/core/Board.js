export class Board {
  constructor(size = 10) {
    this.size = size;
    this.reset();
  }

  reset() {
    // null           = empty, not fired
    // { ship }       = ship present, not hit
    // { fired:true } = miss (was empty)
    // { ship, fired:true } = hit
    this.grid = Array.from({ length: this.size }, () => Array(this.size).fill(null));
    this.ships = [];
    this.hitShots  = []; // [{row,col}]
    this.missShots = []; // [{row,col}]
  }

  get rowLabels() {
    return 'ABCDEFGHIJKLMNOPQRST'.slice(0, this.size).split('');
  }

  // ── Placement ──────────────────────────────

  canPlace(size, row, col, horizontal) {
    for (let i = 0; i < size; i++) {
      const r = horizontal ? row     : row + i;
      const c = horizontal ? col + i : col;
      if (r < 0 || r >= this.size || c < 0 || c >= this.size) return false;
      if (this.grid[r][c] !== null) return false;
    }
    return true;
  }

  placeShip(ship, row, col, horizontal) {
    if (!this.canPlace(ship.size, row, col, horizontal)) return false;
    ship.horizontal = horizontal;
    ship.cells = [];
    for (let i = 0; i < ship.size; i++) {
      const r = horizontal ? row     : row + i;
      const c = horizontal ? col + i : col;
      this.grid[r][c] = { ship };
      ship.cells.push({ row: r, col: c });
    }
    ship.placed = true;
    this.ships.push(ship);
    return true;
  }

  removeShip(ship) {
    for (const { row, col } of ship.cells) {
      this.grid[row][col] = null;
    }
    this.ships = this.ships.filter(s => s !== ship);
    ship.reset();
  }

  // ── Firing ────────────────────────────────

  isFired(row, col) {
    const cell = this.grid[row][col];
    return cell !== null && cell.fired === true;
  }

  fire(row, col) {
    if (this.isFired(row, col)) return null;
    const cell = this.grid[row][col];
    if (cell && cell.ship) {
      cell.fired = true;
      cell.ship.hit();
      this.hitShots.push({ row, col });
      return { hit: true, sunk: cell.ship.isSunk(), ship: cell.ship };
    } else {
      this.grid[row][col] = { fired: true };
      this.missShots.push({ row, col });
      return { hit: false };
    }
  }

  allSunk() {
    return this.ships.length > 0 && this.ships.every(s => s.isSunk());
  }

  getUnfiredCells() {
    const cells = [];
    for (let r = 0; r < this.size; r++)
      for (let c = 0; c < this.size; c++)
        if (!this.isFired(r, c)) cells.push({ row: r, col: c });
    return cells;
  }
}
