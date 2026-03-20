export class Tournament {
  /**
   * @param {string[]} players  — array of player name strings (2, 4, or 8)
   * @param {number}   boardSize — 10, 15, or 20
   */
  constructor(players, boardSize = 10) {
    // Randomly seed the bracket
    this.players  = [...players].sort(() => Math.random() - 0.5);
    this.boardSize = boardSize;
    this.bracket  = this._buildBracket();
    this.champion = null;
  }

  _buildBracket() {
    const rounds = [];
    let seeds = [...this.players];

    // Round 1 — pair up seeds
    const r1 = [];
    for (let i = 0; i < seeds.length; i += 2) {
      r1.push({ p1: seeds[i], p2: seeds[i + 1], winner: null });
    }
    rounds.push(r1);

    // Subsequent rounds — players TBD
    let prev = r1;
    while (prev.length > 1) {
      const round = [];
      for (let i = 0; i < prev.length; i += 2) {
        round.push({ p1: null, p2: null, winner: null });
      }
      rounds.push(round);
      prev = round;
    }
    return rounds;
  }

  // Index of the current round (first round with an unplayed match)
  get currentRoundIdx() {
    for (let r = 0; r < this.bracket.length; r++) {
      if (this.bracket[r].some(m => m.winner === null)) return r;
    }
    return this.bracket.length - 1;
  }

  // Index of the current match within the current round
  get currentMatchIdx() {
    const r = this.currentRoundIdx;
    return this.bracket[r].findIndex(m => m.winner === null);
  }

  get currentMatch() {
    return this.bracket[this.currentRoundIdx][this.currentMatchIdx];
  }

  get isComplete() {
    const last = this.bracket[this.bracket.length - 1];
    return last[0].winner !== null;
  }

  /** Call after a match finishes. winner = player name string. */
  recordWinner(winner) {
    const rIdx = this.currentRoundIdx;
    const mIdx = this.currentMatchIdx;
    const match = this.bracket[rIdx][mIdx];
    match.winner = winner;

    // Seed winner into next round
    if (rIdx + 1 < this.bracket.length) {
      const next = this.bracket[rIdx + 1][Math.floor(mIdx / 2)];
      if (mIdx % 2 === 0) next.p1 = winner;
      else                 next.p2 = winner;
    }

    if (this.isComplete) this.champion = winner;
  }

  getRoundName(idx) {
    const n = this.bracket.length;
    if (idx === n - 1) return 'Final';
    if (idx === n - 2) return 'Semi-Finals';
    if (idx === n - 3) return 'Quarter-Finals';
    return `Round ${idx + 1}`;
  }

  /** Return total number of matches played so far */
  get matchesPlayed() {
    return this.bracket.flat().filter(m => m.winner !== null).length;
  }

  /** Return total number of matches in the tournament */
  get totalMatches() {
    return this.bracket.flat().length;
  }
}
