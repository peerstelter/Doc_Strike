import { createServer }                                        from 'http';
import { mkdirSync, existsSync, readFileSync, writeFileSync,
         renameSync }                                          from 'fs';
import { join }                                               from 'path';
import { WebSocketServer }                                    from 'ws';

const PORT     = process.env.PORT     || 3001;
const DATA_DIR = process.env.DATA_DIR || '/data';
const SCORES   = join(DATA_DIR, 'scores.json');

// ── Persistence ───────────────────────────────────────────────────────────────
mkdirSync(DATA_DIR, { recursive: true });

function loadAll() {
  try { return JSON.parse(readFileSync(SCORES, 'utf8')); }
  catch { return []; }
}

function saveAll(entries) {
  const tmp = SCORES + '.tmp';
  writeFileSync(tmp, JSON.stringify(entries));
  renameSync(tmp, SCORES);
}

// ── Scoring ───────────────────────────────────────────────────────────────────
function calcScore(won, shots, hits, duration) {
  if (!won) return 0;
  const acc = shots > 0 ? (hits / shots) * 100 : 0;
  return Math.max(0, 1000 + Math.round(acc * 8) - Math.floor(duration * 2));
}

function sanitize(str) {
  return String(str || '').replace(/[<>&"'/\\]/g, '').slice(0, 20).trim() || 'Anonymous';
}

// Aggregate raw game entries into a per-player leaderboard row
function aggregate(entries, mode) {
  const map = {};
  for (const e of entries.filter(x => x.mode === mode)) {
    if (!map[e.name]) {
      map[e.name] = { name: e.name, wins: 0, losses: 0,
                      totalShots: 0, totalHits: 0, bestTime: 0, score: 0 };
    }
    const p = map[e.name];
    if (e.won) {
      p.wins++;
      if (!p.bestTime || e.duration < p.bestTime) p.bestTime = e.duration;
    } else {
      p.losses++;
    }
    p.totalShots += e.shots;
    p.totalHits  += e.hits;
    p.score      += e.score;
  }
  return Object.values(map)
    .sort((a, b) => b.score - a.score || b.wins - a.wins);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, status, data) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 2048) reject(new Error('too large')); });
    req.on('end',  () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('bad json')); } });
  });
}

// ── HTTP + WS server ──────────────────────────────────────────────────────────
const rooms  = new Map();
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); res.end(); return; }

  // GET /health
  if (url.pathname === '/health') {
    return json(res, 200, { status: 'ok', rooms: rooms.size });
  }

  // GET /api/scores?mode=ai|local|online
  if (url.pathname === '/api/scores' && req.method === 'GET') {
    const mode  = url.searchParams.get('mode');
    const valid = ['ai', 'local', 'online'];
    if (!valid.includes(mode)) return json(res, 400, { error: 'mode must be ai | local | online' });
    return json(res, 200, aggregate(loadAll(), mode));
  }

  // POST /api/scores
  if (url.pathname === '/api/scores' && req.method === 'POST') {
    let body;
    try { body = await readBody(req); } catch { return json(res, 400, { error: 'invalid body' }); }

    const { name, mode, won, shots, hits, accuracy, duration } = body;
    if (!['ai', 'local', 'online'].includes(mode)) return json(res, 400, { error: 'invalid mode' });

    const s   = Math.max(0, Math.min(200, parseInt(shots)    || 0));
    const h   = Math.max(0, Math.min(s,   parseInt(hits)     || 0));
    const d   = Math.max(0, Math.min(7200, parseInt(duration) || 0));
    const entry = {
      id:       Date.now().toString(),
      name:     sanitize(name),
      mode,
      won:      !!won,
      shots:    s,
      hits:     h,
      accuracy: Math.round((s > 0 ? h / s : 0) * 100),
      duration: d,
      score:    calcScore(!!won, s, h, d),
      date:     new Date().toISOString(),
    };
    const all = loadAll();
    all.push(entry);
    saveAll(all);
    console.log(`Score saved: ${entry.name} [${mode}] won=${entry.won} score=${entry.score}`);
    return json(res, 201, entry);
  }

  res.writeHead(404); res.end();
});

const wss = new WebSocketServer({ server });

// ── WebSocket relay ───────────────────────────────────────────────────────────
function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function tx(ws, msg) {
  if (ws?.readyState === 1) ws.send(JSON.stringify(msg));
}

function relay(ws, msg) {
  const room = rooms.get(ws.roomCode);
  if (!room) return;
  tx(ws.role === 'host' ? room.guest : room.host, msg);
}

wss.on('connection', ws => {
  ws.roomCode = null;
  ws.role     = null;
  ws.isReady  = false;

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {
      case 'create': {
        const code = genCode();
        rooms.set(code, { host: ws, guest: null });
        ws.roomCode = code; ws.role = 'host';
        tx(ws, { type: 'created', code });
        console.log(`Room created: ${code}`);
        break;
      }
      case 'join': {
        const code = (msg.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const room = rooms.get(code);
        if (!room)      { tx(ws, { type: 'error', msg: 'Room not found.' }); return; }
        if (room.guest) { tx(ws, { type: 'error', msg: 'Room is full.'   }); return; }
        room.guest = ws; ws.roomCode = code; ws.role = 'guest';
        tx(ws,        { type: 'joined', code });
        tx(room.host, { type: 'opponent_joined' });
        console.log(`Room joined: ${code}`);
        break;
      }
      case 'fleet_ready': {
        ws.isReady = true;
        const room = rooms.get(ws.roomCode);
        if (!room) return;
        if (room.host?.isReady && room.guest?.isReady) {
          tx(room.host,  { type: 'start', yourTurn: true  });
          tx(room.guest, { type: 'start', yourTurn: false });
          console.log(`Battle started: ${ws.roomCode}`);
        } else {
          relay(ws, { type: 'opponent_fleet_ready' });
        }
        break;
      }
      default: relay(ws, msg); break;
    }
  });

  ws.on('close', () => {
    if (!ws.roomCode) return;
    const room = rooms.get(ws.roomCode);
    if (room) {
      tx(ws.role === 'host' ? room.guest : room.host, { type: 'opponent_disconnected' });
      rooms.delete(ws.roomCode);
      console.log(`Room closed: ${ws.roomCode}`);
    }
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`⚓ Naval Strike server on port ${PORT}`);
  console.log(`   Health:    http://0.0.0.0:${PORT}/health`);
  console.log(`   Scores:    http://0.0.0.0:${PORT}/api/scores?mode=ai`);
  console.log(`   Data dir:  ${DATA_DIR}`);
});
