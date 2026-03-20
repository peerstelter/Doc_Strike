export class Scoreboard {

  get apiBase() {
    // Production (HTTPS): same domain, routed via reverse proxy /api → WS server
    // Development (HTTP): direct to WS server port
    return location.protocol === 'https:'
      ? `${location.origin}/api`
      : `http://${location.hostname}:3001/api`;
  }

  async fetchScores(mode) {
    const res = await fetch(`${this.apiBase}/scores?mode=${mode}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json(); // aggregated leaderboard rows
  }

  async submit(name, mode, { playerWon, shots, hits, duration }) {
    const url = `${this.apiBase}/scores`;
    let res;
    try {
      res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mode, won: playerWon, shots, hits, duration }),
      });
    } catch (networkErr) {
      throw new Error(`Network error — is /api routed in NPM? (${url})`);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} from ${url}: ${body}`);
    }
    return res.json();
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
