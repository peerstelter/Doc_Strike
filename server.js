import { WebSocketServer } from 'ws';

const PORT = process.env.PORT    || 3001;
const PATH = process.env.WS_PATH || undefined;   // e.g. "/ws" behind a reverse proxy
const wss  = new WebSocketServer({ port: PORT, ...(PATH ? { path: PATH } : {}) });
const rooms = new Map(); // code -> { host, guest }

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
  const other = ws.role === 'host' ? room.guest : room.host;
  tx(other, msg);
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
        ws.roomCode = code;
        ws.role     = 'host';
        tx(ws, { type: 'created', code });
        console.log(`Room created: ${code}`);
        break;
      }
      case 'join': {
        const code = (msg.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const room = rooms.get(code);
        if (!room)      { tx(ws, { type: 'error', msg: 'Room not found.' }); return; }
        if (room.guest) { tx(ws, { type: 'error', msg: 'Room is full.'   }); return; }
        room.guest  = ws;
        ws.roomCode = code;
        ws.role     = 'guest';
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
          console.log(`Battle started in room: ${ws.roomCode}`);
        } else {
          relay(ws, { type: 'opponent_fleet_ready' });
        }
        break;
      }
      default:
        relay(ws, msg);
        break;
    }
  });

  ws.on('close', () => {
    if (!ws.roomCode) return;
    const room = rooms.get(ws.roomCode);
    if (room) {
      const other = ws.role === 'host' ? room.guest : room.host;
      tx(other, { type: 'opponent_disconnected' });
      rooms.delete(ws.roomCode);
      console.log(`Room closed: ${ws.roomCode}`);
    }
  });
});

console.log(`⚓ Naval Strike WS server on ws://0.0.0.0:${PORT}`);
