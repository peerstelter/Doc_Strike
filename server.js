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
const tournaments = new Map();

function genTCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = 'T' + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (tournaments.has(code));
  return code;
}

function tTx(t, type, data = {}) {
  for (const p of t.players) {
    if (p.ws?.readyState === 1) tx(p.ws, { type, ...data });
  }
}

function tRoundName(idx, total) {
  if (idx === total - 1) return 'Final';
  if (idx === total - 2) return 'Semi-Finals';
  if (idx === total - 3) return 'Quarter-Finals';
  return `Round ${idx + 1}`;
}

function tBuildBracket(players) {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const bracket = [];
  let seeds = shuffled.map(p => p.name);
  const r1 = [];
  for (let i = 0; i < seeds.length; i += 2)
    r1.push({ p1: seeds[i], p2: seeds[i + 1], winner: null, roomCode: null });
  bracket.push(r1);
  let prev = r1;
  while (prev.length > 1) {
    const round = [];
    for (let i = 0; i < prev.length; i += 2)
      round.push({ p1: null, p2: null, winner: null, roomCode: null });
    bracket.push(round);
    prev = round;
  }
  return bracket;
}

function tStartRound(t) {
  const round = t.bracket[t.round];
  for (let i = 0; i < round.length; i++) {
    const m = round[i];
    const pl1 = t.players.find(p => p.name === m.p1);
    const pl2 = t.players.find(p => p.name === m.p2);
    if (!pl1 || !pl2) continue;

    // Create a game room on the server with both players already in it
    const code = genCode();
    rooms.set(code, { host: pl1.ws, guest: pl2.ws });
    pl1.ws.roomCode = code; pl1.ws.role = 'host'; pl1.ws.isReady = false;
    pl2.ws.roomCode = code; pl2.ws.role = 'guest'; pl2.ws.isReady = false;
    m.roomCode = code;

    const rName = tRoundName(t.round, t.bracket.length);
    tx(pl1.ws, { type: 't_match', opponent: m.p2, isHost: true,  roomCode: code, boardSize: t.boardSize, roundName: rName });
    tx(pl2.ws, { type: 't_match', opponent: m.p1, isHost: false, roomCode: code, boardSize: t.boardSize, roundName: rName });
    console.log(`Tournament ${t.code}: ${m.p1} vs ${m.p2} → room ${code}`);
  }
}

function tAdvance(t) {
  const round = t.bracket[t.round];
  if (t.round + 1 < t.bracket.length) {
    const next = t.bracket[t.round + 1];
    for (let i = 0; i < round.length; i++) {
      const nm = next[Math.floor(i / 2)];
      if (i % 2 === 0) nm.p1 = round[i].winner;
      else             nm.p2 = round[i].winner;
    }
    t.round++;
    tTx(t, 't_round', { bracket: t.bracket, round: t.round });
    console.log(`Tournament ${t.code}: round ${t.round} starting`);
    setTimeout(() => tStartRound(t), 3000);
  } else {
    const champion = round[0].winner;
    tTx(t, 't_done', { champion, bracket: t.bracket });
    console.log(`Tournament ${t.code}: champion = ${champion}`);
    setTimeout(() => tournaments.delete(t.code), 300_000);
  }
}
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
  ws.roomCode       = null;
  ws.role           = null;
  ws.isReady        = false;
  ws.tournamentCode = null;

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
      case 't_create': {
        const sz  = [2, 4, 8].includes(msg.size) ? msg.size : 2;
        const nm  = String(msg.name  || 'Player').slice(0, 16).trim() || 'Player';
        const bs  = [10, 15, 20].includes(msg.boardSize) ? msg.boardSize : 10;
        const code = genTCode();
        const player = { name: nm, ws };
        const t = { code, size: sz, boardSize: bs, players: [player], bracket: null, round: 0 };
        tournaments.set(code, t);
        ws.tournamentCode = code;
        tx(ws, { type: 't_created', code, players: [nm], size: sz });
        console.log(`Tournament created: ${code} (${sz} players, ${bs}x${bs})`);
        break;
      }

      case 't_join': {
        const code = String(msg.code || '').toUpperCase().trim();
        const t    = tournaments.get(code);
        if (!t)           { tx(ws, { type: 't_error', msg: 'Tournament not found.' }); break; }
        if (t.bracket)    { tx(ws, { type: 't_error', msg: 'Tournament already started.' }); break; }
        if (t.players.length >= t.size) { tx(ws, { type: 't_error', msg: 'Tournament is full.' }); break; }
        if (t.players.some(p => p.ws === ws)) break;

        const nm = String(msg.name || 'Player').slice(0, 16).trim() || 'Player';
        t.players.push({ name: nm, ws });
        ws.tournamentCode = code;

        const names = t.players.map(p => p.name);
        tTx(t, 't_update', { players: names, size: t.size });
        console.log(`Tournament ${code}: ${nm} joined (${t.players.length}/${t.size})`);

        if (t.players.length === t.size) {
          t.bracket = tBuildBracket(t.players);
          tTx(t, 't_start', { bracket: t.bracket, boardSize: t.boardSize });
          console.log(`Tournament ${code}: bracket ready, starting in 3s`);
          setTimeout(() => tStartRound(t), 3000);
        }
        break;
      }

      case 't_result': {
        const t = ws.tournamentCode ? tournaments.get(ws.tournamentCode) : null;
        if (!t?.bracket) break;
        const round = t.bracket[t.round];
        const pl    = t.players.find(p => p.ws === ws);
        if (!pl) break;
        const match = round.find(m => (m.p1 === pl.name || m.p2 === pl.name) && !m.winner);
        if (!match) break;

        // Determine winner from role + won flag
        const iAmP1 = ws.role === 'host'; // host is always p1 in the match
        match.winner = msg.won
          ? (iAmP1 ? match.p1 : match.p2)
          : (iAmP1 ? match.p2 : match.p1);

        tTx(t, 't_round', { bracket: t.bracket, round: t.round });
        console.log(`Tournament ${t.code}: ${match.winner} wins ${match.p1} vs ${match.p2}`);

        if (round.every(m => m.winner)) {
          setTimeout(() => tAdvance(t), 2000);
        }
        break;
      }

      default: relay(ws, msg); break;
    }
  });

  ws.on('close', () => {
    if (ws.roomCode) {
      const room = rooms.get(ws.roomCode);
      if (room) {
        tx(ws.role === 'host' ? room.guest : room.host, { type: 'opponent_disconnected' });
        rooms.delete(ws.roomCode);
        console.log(`Room closed: ${ws.roomCode}`);
      }
    }
    if (ws.tournamentCode) {
      const t = tournaments.get(ws.tournamentCode);
      if (t && !t.bracket) {
        // Only remove from lobby if tournament hasn't started yet
        t.players = t.players.filter(p => p.ws !== ws);
        tTx(t, 't_update', { players: t.players.map(p => p.name), size: t.size });
      }
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
