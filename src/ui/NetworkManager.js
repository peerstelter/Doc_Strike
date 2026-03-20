export class NetworkManager {
  constructor() {
    this.ws       = null;
    this.role     = null;   // 'host' | 'guest'
    this.roomCode = null;
    this.onMessage    = null; // (msg) => void
    this.onDisconnect = null; // () => void
  }

  get wsUrl() {
    // Production (served over HTTPS): route through reverse proxy at /ws
    if (location.protocol === 'https:') return `wss://${location.host}/ws`;
    // Development: connect directly to the WS server port
    return `ws://${location.hostname}:3001`;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try { this.ws = new WebSocket(this.wsUrl); }
      catch (e) { reject(e); return; }

      const timer = setTimeout(() => reject(new Error('timeout')), 5000);

      this.ws.onopen    = () => { clearTimeout(timer); resolve(); };
      this.ws.onerror   = ()  => { clearTimeout(timer); reject(new Error('Connection refused')); };
      this.ws.onmessage = e  => {
        try { const m = JSON.parse(e.data); if (this.onMessage) this.onMessage(m); } catch {}
      };
      this.ws.onclose   = () => { if (this.onDisconnect) this.onDisconnect(); };
    });
  }

  send(type, data = {}) {
    if (this.ws?.readyState === WebSocket.OPEN)
      this.ws.send(JSON.stringify({ type, ...data }));
  }

  createRoom()   { this.send('create'); }
  joinRoom(code) { this.send('join', { code }); }
  fleetReady()   { this.send('fleet_ready'); }
  fire(row, col) { this.send('fire', { row, col }); }

  sendResult(row, col, hit, sunk, shipName, gameOver) {
    this.send('result', { row, col, hit, sunk, shipName: shipName || null, gameOver });
  }

  disconnect() { this.ws?.close(); this.ws = null; this.role = null; this.roomCode = null; }
  get connected() { return this.ws?.readyState === WebSocket.OPEN; }
}
