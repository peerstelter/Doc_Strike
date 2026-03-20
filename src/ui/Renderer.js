const LABEL = 28;  // px for row/col labels

/**
 * Renders a 10×10 Battleship grid onto a <canvas> element.
 * Supports HiDPI / Retina displays and touch events.
 */
export class Renderer {
  /**
   * @param {string}  canvasId
   * @param {object}  opts
   * @param {boolean} opts.showShips    - draw ships on this board (true for player)
   * @param {boolean} opts.interactive  - enable click / hover / touch events
   */
  constructor(canvasId, opts = {}) {
    this.canvas     = document.getElementById(canvasId);
    this.ctx        = this.canvas.getContext('2d');
    this.showShips  = opts.showShips  ?? true;
    this.interactive = opts.interactive ?? false;

    // Hover state (used for shot-aiming or placement preview)
    this.hoverCell       = null;
    this.previewShip     = null;  // Ship being placed (setup only)
    this.previewHoriz    = true;

    // Callbacks
    this.onCellClick = null;  // (row, col) => void
    this.onHover     = null;  // (cell | null) => void

    this._dpr = window.devicePixelRatio || 1;
    this._cell = 44;  // logical cell size, updated by resize()
    this._size = LABEL + 10 * this._cell;

    this._resize();
    window.addEventListener('resize', () => this._resize());

    if (this.interactive) {
      this.canvas.addEventListener('mousemove', e => this._onMove(e));
      this.canvas.addEventListener('mouseleave', () => this._onLeave());
      this.canvas.addEventListener('click',     e => this._onClick(e));
      this.canvas.addEventListener('touchstart', e => this._onTouch(e), { passive: false });
      this.canvas.addEventListener('touchmove',  e => this._onTouchMove(e), { passive: false });
      this.canvas.addEventListener('touchend',   e => this._onTouchEnd(e), { passive: false });
    }
  }

  // ── Sizing ──────────────────────────────

  _resize() {
    const dpr    = this._dpr;
    // Fit canvas to container width, capped at a comfortable size
    const avail  = Math.min(
      this.canvas.parentElement?.clientWidth || 480,
      window.innerWidth * 0.95
    );
    const cell   = Math.max(26, Math.min(46, Math.floor((avail - LABEL) / 10)));
    const logical = LABEL + 10 * cell;

    this._cell  = cell;
    this._size  = logical;

    this.canvas.width  = logical * dpr;
    this.canvas.height = logical * dpr;
    this.canvas.style.width  = logical + 'px';
    this.canvas.style.height = logical + 'px';
    this.ctx.scale(dpr, dpr);
  }

  get cellSize() { return this._cell; }
  get canvasSize() { return this._size; }

  // ── Event helpers ────────────────────────

  _cellFromXY(x, y) {
    const col = Math.floor((x - LABEL) / this._cell);
    const row = Math.floor((y - LABEL) / this._cell);
    if (col < 0 || col >= 10 || row < 0 || row >= 10) return null;
    return { row, col };
  }

  _xyFromEvent(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  _onMove(e) {
    const { x, y } = this._xyFromEvent(e);
    this.hoverCell = this._cellFromXY(x, y);
    if (this.onHover) this.onHover(this.hoverCell);
  }

  _onLeave() {
    this.hoverCell = null;
    if (this.onHover) this.onHover(null);
  }

  _onClick(e) {
    const { x, y } = this._xyFromEvent(e);
    const cell = this._cellFromXY(x, y);
    if (cell && this.onCellClick) this.onCellClick(cell.row, cell.col);
  }

  _onTouch(e) {
    e.preventDefault();
    const t = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = t.clientX - rect.left;
    const y = t.clientY - rect.top;
    this.hoverCell = this._cellFromXY(x, y);
    if (this.onHover) this.onHover(this.hoverCell);
  }

  _onTouchMove(e) {
    e.preventDefault();
    const t = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = t.clientX - rect.left;
    const y = t.clientY - rect.top;
    this.hoverCell = this._cellFromXY(x, y);
    if (this.onHover) this.onHover(this.hoverCell);
  }

  _onTouchEnd(e) {
    e.preventDefault();
    if (this.hoverCell && this.onCellClick)
      this.onCellClick(this.hoverCell.row, this.hoverCell.col);
    this.hoverCell = null;
    if (this.onHover) this.onHover(null);
  }

  // ── Drawing ──────────────────────────────

  draw(board, effects) {
    const ctx  = this.ctx;
    const S    = this._size;
    const C    = this._cell;
    const L    = LABEL;

    // Re-apply scale (lost after canvas resize)
    ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);

    // Background
    ctx.fillStyle = '#090d18';
    ctx.fillRect(0, 0, S, S);

    // ── Labels ──
    ctx.fillStyle   = '#5f8ab8';
    ctx.font        = `bold ${Math.max(10, C * 0.28)}px monospace`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    const COLS = '1234567890';
    const ROWS = 'ABCDEFGHIJ';
    for (let i = 0; i < 10; i++) {
      ctx.fillText(i < 9 ? COLS[i] : '10', L + i * C + C / 2, L / 2);
      ctx.fillText(ROWS[i], L / 2, L + i * C + C / 2);
    }

    // ── Cells ──
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const x    = L + c * C;
        const y    = L + r * C;
        const cell = board.grid[r][c];

        // Water base
        const even = (r + c) % 2 === 0;
        ctx.fillStyle = even ? '#0c2040' : '#09182e';
        ctx.fillRect(x + 1, y + 1, C - 2, C - 2);

        // Ship body (only shown if showShips)
        if (this.showShips && cell && cell.ship) {
          const ship = cell.ship;
          const alpha = cell.fired ? '88' : 'cc';
          ctx.fillStyle = ship.color + alpha;
          ctx.fillRect(x + 2, y + 2, C - 4, C - 4);

          // Rounded highlight
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(x + 2, y + 2, C - 4, Math.floor(C * 0.35));
        }

        // Miss marker
        if (cell && cell.fired && !cell.ship) {
          ctx.strokeStyle = '#4fc3f7';
          ctx.lineWidth   = 1.5;
          ctx.beginPath();
          ctx.arc(x + C / 2, y + C / 2, C * 0.22, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(79,195,247,0.25)';
          ctx.fill();
        }

        // Hit marker (X)
        if (cell && cell.fired && cell.ship) {
          const pad = Math.floor(C * 0.2);
          ctx.strokeStyle = '#ff5722';
          ctx.lineWidth   = Math.max(2, C * 0.07);
          ctx.lineCap     = 'round';
          ctx.beginPath();
          ctx.moveTo(x + pad, y + pad);
          ctx.lineTo(x + C - pad, y + C - pad);
          ctx.moveTo(x + C - pad, y + pad);
          ctx.lineTo(x + pad, y + C - pad);
          ctx.stroke();
        }

        // Grid lines
        ctx.strokeStyle = '#112236';
        ctx.lineWidth   = 0.5;
        ctx.strokeRect(x, y, C, C);
      }
    }

    // ── Placement preview (setup) ──
    if (this.previewShip && this.hoverCell) {
      const { row, col } = this.hoverCell;
      const ship = this.previewShip;
      const h    = this.previewHoriz;
      const valid = board.canPlace(ship.size, row, col, h);

      for (let i = 0; i < ship.size; i++) {
        const pr = h ? row     : row + i;
        const pc = h ? col + i : col;
        if (pr < 0 || pr >= 10 || pc < 0 || pc >= 10) continue;
        const x = L + pc * C;
        const y = L + pr * C;
        ctx.fillStyle = valid
          ? 'rgba(0,230,118,0.45)'
          : 'rgba(255,87,34,0.45)';
        ctx.fillRect(x + 1, y + 1, C - 2, C - 2);
      }
    }

    // ── Aim hover (battle) ──
    if (!this.previewShip && this.hoverCell && this.interactive) {
      const { row, col } = this.hoverCell;
      if (!board.isFired(row, col)) {
        const x = L + col * C;
        const y = L + row * C;
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth   = 2;
        ctx.strokeRect(x + 1, y + 1, C - 2, C - 2);
        ctx.fillStyle = 'rgba(0,212,255,0.12)';
        ctx.fillRect(x + 1, y + 1, C - 2, C - 2);

        // Crosshair lines
        ctx.strokeStyle = 'rgba(0,212,255,0.3)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(x + C / 2, L);
        ctx.lineTo(x + C / 2, S);
        ctx.moveTo(L, y + C / 2);
        ctx.lineTo(S, y + C / 2);
        ctx.stroke();
      }
    }

    // ── Effects ──
    if (effects) {
      effects.update();
      effects.draw(ctx);
    }
  }

  /**
   * Return canvas centre coordinates (logical px) for a given grid cell.
   */
  cellCenter(row, col) {
    return {
      x: LABEL + col * this._cell + this._cell / 2,
      y: LABEL + row * this._cell + this._cell / 2,
    };
  }
}
