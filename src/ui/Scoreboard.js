const KEY = 'naval-strike-scores-v1';

export class Scoreboard {
  load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }

  save(entries) {
    localStorage.setItem(KEY, JSON.stringify(entries));
  }

  addResult(name, { playerWon, shots, hits, duration }) {
    const entries = this.load();
    const acc     = shots > 0 ? Math.round((hits / shots) * 100) : 0;
    // Score formula: win bonus + accuracy bonus - time penalty
    const pts     = playerWon ? Math.max(0, 1000 + acc * 8 - duration * 2) : 0;

    const existing = entries.find(e => e.name === name);
    if (existing) {
      if (playerWon) {
        existing.wins++;
        if (existing.bestTime === 0 || duration < existing.bestTime)
          existing.bestTime = duration;
      } else {
        existing.losses++;
      }
      existing.totalShots += shots;
      existing.totalHits  += hits;
      existing.score      += pts;
    } else {
      entries.push({
        name,
        wins:       playerWon ? 1 : 0,
        losses:     playerWon ? 0 : 1,
        totalShots: shots,
        totalHits:  hits,
        bestTime:   playerWon ? duration : 0,
        score:      pts,
      });
    }

    entries.sort((a, b) => b.score - a.score || b.wins - a.wins);
    this.save(entries);
    return entries;
  }

  clear() {
    localStorage.removeItem(KEY);
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  getAccuracy(entry) {
    if (!entry.totalShots) return '—';
    return Math.round((entry.totalHits / entry.totalShots) * 100) + '%';
  }
}
