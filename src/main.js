import { Game }          from './core/Game.js';
import { Renderer }      from './ui/Renderer.js';
import { EffectManager } from './ui/Effects.js';
import { Scoreboard }    from './ui/Scoreboard.js';
import { SoundManager }  from './ui/SoundManager.js';
import { NetworkManager } from './ui/NetworkManager.js';

// ── Singletons ───────────────────────────────────────────────────────────────
const game       = new Game();
const scoreboard = new Scoreboard();
const sound      = new SoundManager();

let setupRenderer, playerRenderer, enemyRenderer;
let playerFX, enemyFX;
let rafId = null;

// ── App state ────────────────────────────────────────────────────────────────
let selectedShip = null;
let isHorizontal = true;
let gameMode     = 'ai';    // 'ai' | 'pvp'
let pvpSetupStep = 1;        // 1 = P1 setup, 2 = P2 setup
let timerInterval = null;
let pendingPassTo = null;    // used after a shot in pvp

// ── Network state ────────────────────────────────────────────────────────────
const net = new NetworkManager();
let netMyTurn     = false;
let netOpReady    = false;  // opponent fleet placed
let netMyReady    = false;  // my fleet placed & ready sent

// ── DOM shortcuts ────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const setupPhase      = $('setup-phase');
const battlePhase     = $('battle-phase');
const gameoverOverlay = $('gameover-overlay');
const scoresOverlay   = $('scores-overlay');
const passScreen      = $('pass-screen');

// ── Boot ─────────────────────────────────────────────────────────────────────
function init() {
  setupRenderer  = new Renderer('setup-canvas',  { showShips: true,  interactive: true });
  playerRenderer = new Renderer('player-canvas', { showShips: true,  interactive: false });
  enemyRenderer  = new Renderer('enemy-canvas',  { showShips: false, interactive: true });

  playerFX = new EffectManager();
  enemyFX  = new EffectManager();

  // Setup canvas
  setupRenderer.onCellClick = onSetupClick;
  setupRenderer.onHover     = () => renderSetup();

  // Enemy canvas — fires at the right board depending on mode/turn
  enemyRenderer.onCellClick = onEnemyClick;

  // Header
  $('sound-btn').addEventListener('click', toggleSound);
  $('scoreboard-btn').addEventListener('click', openScoreboard);

  // Mode selector
  $('mode-ai').addEventListener('click',  () => setMode('ai'));
  $('mode-pvp').addEventListener('click', () => setMode('pvp'));

  // Network mode button
  $('mode-net').addEventListener('click', () => {
    setMode('net');
    openNetLobby();
  });

  // Lobby
  $('net-host-btn').addEventListener('click', startHosting);
  $('net-join-btn').addEventListener('click', () => showNetStep('joining'));
  $('net-host-play-btn').addEventListener('click', () => {
    game.startSetup(false);
    enterNetSetup();
  });
  $('net-join-play-btn').addEventListener('click', () => {
    game.startSetup(false);
    enterNetSetup();
  });
  $('net-cancel-btn').addEventListener('click', () => {
    net.disconnect();
    gameMode = 'ai';
    setMode('ai');
    closeNetLobby();
  });
  $('net-retry-host-btn').addEventListener('click', () => { net.disconnect(); startHosting(); });
  $('copy-code-btn').addEventListener('click', () => {
    const code = net.roomCode || '';
    navigator.clipboard?.writeText(code).then(() => {
      $('copy-code-btn').textContent = '✓ Copied!';
      setTimeout(() => { $('copy-code-btn').textContent = '📋 Copy Code'; }, 2000);
    });
  });
  $('code-submit-btn').addEventListener('click', startJoining);
  $('code-input').addEventListener('keydown', e => { if (e.key === 'Enter') startJoining(); });

  // Setup controls
  $('rotate-btn').addEventListener('click', toggleRotate);
  $('random-btn').addEventListener('click', onRandom);
  $('clear-btn').addEventListener('click',  onClear);
  $('start-btn').addEventListener('click',  onStartOrNext);

  // Keyboard
  document.addEventListener('keydown', e => {
    if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) toggleRotate();
  });

  // Game-over overlay
  $('save-score-btn').addEventListener('click', saveScore);
  $('play-again-btn').addEventListener('click', playAgain);
  $('view-scores-btn').addEventListener('click', openScoreboard);

  // Scoreboard overlay
  $('close-scores-btn').addEventListener('click', closeScoreboard);
  $('clear-scores-btn').addEventListener('click', () => {
    if (confirm('Clear all scores?')) { scoreboard.clear(); renderScoreboard(); }
  });
  scoresOverlay.addEventListener('click', e => { if (e.target === scoresOverlay) closeScoreboard(); });

  // Pass screen
  $('pass-ready-btn').addEventListener('click', onPassReady);

  // Game callbacks
  game.onStateChange = handleStateChange;
  game.onShot        = handleShot;

  game.startSetup(false);
  startRenderLoop();
}

// ── Mode ─────────────────────────────────────────────────────────────────────
function setMode(mode) {
  gameMode = mode;
  $('mode-ai').classList.toggle('active', mode === 'ai');
  $('mode-pvp').classList.toggle('active', mode === 'pvp');
  $('mode-net').classList.toggle('active', mode === 'net');
  $('difficulty-select').style.display = mode === 'ai' ? '' : 'none';
  if (pvpSetupStep === 1) {
    $('setup-title').textContent = mode === 'pvp' ? '🎖️ Player 1 — Deploy Your Fleet' : 'Deploy Your Fleet';
    $('start-btn').textContent   = mode === 'pvp' ? 'Done → Pass to Player 2' : '⚔️ Start Battle!';
  }
}

// ── Render loop ──────────────────────────────────────────────────────────────
function startRenderLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  function loop() {
    if (game.state === 'battle' || game.state === 'gameover') {
      drawBattleBoards();
    }
    rafId = requestAnimationFrame(loop);
  }
  loop();
}

function drawBattleBoards() {
  // In PVP on P2's turn, swap the perspective
  if (game.pvpMode && !game.playerTurn) {
    playerRenderer.showShips = true;
    enemyRenderer.showShips  = false;
    playerRenderer.draw(game.enemyBoard, playerFX);   // P2 sees own board on left
    enemyRenderer.draw(game.playerBoard, enemyFX);    // P2 fires at P1's board on right
  } else {
    playerRenderer.showShips = true;
    enemyRenderer.showShips  = false;
    playerRenderer.draw(game.playerBoard, playerFX);
    enemyRenderer.draw(game.enemyBoard, enemyFX);
  }
}

function renderSetup() {
  setupRenderer.previewHoriz = isHorizontal;
  setupRenderer.draw(game.state === 'setup2' ? game.enemyBoard : game.playerBoard, null);
}

// ── State machine ─────────────────────────────────────────────────────────────
function handleStateChange(state, data) {
  if (state === 'setup') {
    pvpSetupStep = 1;
    showPhase('setup');
    $('setup-title').textContent = gameMode === 'pvp' ? '🎖️ Player 1 — Deploy Your Fleet' : 'Deploy Your Fleet';
    $('mode-selector').classList.toggle('hidden', false);
    $('start-btn').textContent = gameMode === 'pvp' ? 'Done → Pass to Player 2' : '⚔️ Start Battle!';
    selectedShip = null; setupRenderer.previewShip = null;
    isHorizontal = true;
    refreshShipList(game.playerFleet);
    renderSetup();
    updateStartBtn();

  } else if (state === 'setup2') {
    pvpSetupStep = 2;
    showPhase('setup');
    $('setup-title').textContent = '🎖️ Player 2 — Deploy Your Fleet';
    $('mode-selector').classList.add('hidden');
    $('start-btn').textContent = '⚔️ Start Battle!';
    selectedShip = null; setupRenderer.previewShip = null;
    isHorizontal = true;
    refreshShipList(game.enemyFleet);
    renderSetup();
    updateStartBtn();

  } else if (state === 'battle') {
    showPhase('battle');
    updateBattleLabels();
    refreshFleetStrips();
    startTimer();

  } else if (state === 'pass') {
    // Show pass-device interstitial
    pendingPassTo = data.to;
    showPassScreen(data.to);

  } else if (state === 'gameover') {
    stopTimer();
    showGameOver(data);
  }
}

function showPhase(phase) {
  setupPhase.classList.toggle('hidden',  phase !== 'setup');
  battlePhase.classList.toggle('hidden', phase !== 'battle');
}

// ── Setup interactions ───────────────────────────────────────────────────────
function onSetupClick(row, col) {
  if (!selectedShip) return;
  const placed = pvpSetupStep === 2
    ? game.placeP2Ship(selectedShip, row, col, isHorizontal)
    : game.placePlayerShip(selectedShip, row, col, isHorizontal);

  if (placed) {
    sound.playPlace();
    selectedShip = null;
    setupRenderer.previewShip = null;
    refreshShipList(pvpSetupStep === 2 ? game.enemyFleet : game.playerFleet);
    renderSetup();
    updateStartBtn();
  }
}

function selectShip(ship) {
  if (ship.placed) return;
  selectedShip               = ship;
  setupRenderer.previewShip  = ship;
  setupRenderer.previewHoriz = isHorizontal;
  refreshShipList(pvpSetupStep === 2 ? game.enemyFleet : game.playerFleet);
}

function toggleRotate() {
  isHorizontal                   = !isHorizontal;
  setupRenderer.previewHoriz      = isHorizontal;
  $('rotate-btn').classList.toggle('active', !isHorizontal);
  renderSetup();
}

function onRandom() {
  if (pvpSetupStep === 2) { game.randomPlaceP2(); }
  else                    { game.randomPlacePlayer(); }
  refreshShipList(pvpSetupStep === 2 ? game.enemyFleet : game.playerFleet);
  renderSetup();
  updateStartBtn();
}

function onClear() {
  if (pvpSetupStep === 2) { game.clearP2Ships(); }
  else                    { game.clearPlayerShips(); }
  selectedShip = null; setupRenderer.previewShip = null;
  refreshShipList(pvpSetupStep === 2 ? game.enemyFleet : game.playerFleet);
  renderSetup();
  updateStartBtn();
}

function onStartOrNext() {
  if (gameMode === 'net') {
    netFleetReady();
    return;
  }
  if (gameMode === 'pvp' && pvpSetupStep === 1) {
    showPassScreen(2, () => game.startSetup2());
  } else if (gameMode === 'pvp' && pvpSetupStep === 2) {
    showPassScreen(1, () => {
      game.startBattlePVP();
      setStatus('Player 1 — Fire!', '');
    });
  } else {
    const diff = $('difficulty-select').value;
    game.startBattle(diff);
    setStatus('Fire at will!', '');
  }
  updateBattleStats();
}

function updateStartBtn() {
  const allPlaced = pvpSetupStep === 2 ? game.allP2ShipsPlaced() : game.allShipsPlaced();
  $('start-btn').disabled = !allPlaced;
}

function refreshShipList(fleet) {
  const list = $('ship-list');
  list.innerHTML = '';
  for (const ship of fleet) {
    const item = document.createElement('div');
    item.className = 'ship-item' +
      (ship.placed          ? ' placed'   : '') +
      (ship === selectedShip ? ' selected' : '');
    item.innerHTML = `
      <span class="ship-emoji">${ship.emoji}</span>
      <span class="ship-name">${ship.name}</span>
      <span class="ship-blocks">${('<span class="ship-block" style="background:' + ship.color + '"></span>').repeat(ship.size)}</span>
    `;
    if (!ship.placed) item.addEventListener('click', () => selectShip(ship));
    list.appendChild(item);
  }
}

// ── Pass screen ───────────────────────────────────────────────────────────────
let _passCallback = null;

function showPassScreen(toPlayer, callback) {
  _passCallback = callback || null;
  pendingPassTo = toPlayer;
  $('pass-title').textContent = 'Pass the device';
  $('pass-sub').textContent   = `Hand the device to Player ${toPlayer} — don't peek!`;
  $('pass-badge').textContent = `⚓ Player ${toPlayer}'s Turn`;
  passScreen.classList.remove('hidden');
}

function onPassReady() {
  passScreen.classList.add('hidden');
  if (_passCallback) {
    const cb = _passCallback;
    _passCallback = null;
    cb();
  } else {
    // Mid-battle pass: resume the right turn
    updateBattleLabels();
  }
}

// ── Battle ───────────────────────────────────────────────────────────────────
function onEnemyClick(row, col) {
  if (game.state !== 'battle') return;

  // Network game
  if (gameMode === 'net') {
    if (!netMyTurn) return;
    if (game.enemyBoard.isFired(row, col)) return;
    // Mark as pending (optimistic — will be confirmed by result message)
    game.shotsFired++;
    updateBattleStats();
    sound.playFire();
    net.fire(row, col);
    netMyTurn = false;
    setStatus('Waiting for result…', '');
    return;
  }

  if (game.pvpMode) {
    if (game.playerTurn) {
      if (game.enemyBoard.isFired(row, col)) return;
      sound.playFire(); game.playerFire(row, col);
    } else {
      if (game.playerBoard.isFired(row, col)) return;
      sound.playFire(); game.p2Fire(row, col);
    }
  } else {
    if (!game.playerTurn) return;
    if (game.enemyBoard.isFired(row, col)) return;
    sound.playFire(); game.playerFire(row, col);
  }
  updateBattleStats();
}

function handleShot(result, isPlayer, row, col) {
  const effects  = isPlayer ? enemyFX  : playerFX;
  const renderer = isPlayer ? enemyRenderer : playerRenderer;

  // In PVP P2's turn, renderer mapping is swapped
  const actualFX = (game.pvpMode && !game.playerTurn)
    ? (isPlayer ? playerFX : enemyFX)
    : (isPlayer ? enemyFX  : playerFX);
  const actualRenderer = (game.pvpMode && !game.playerTurn)
    ? (isPlayer ? playerRenderer : enemyRenderer)
    : (isPlayer ? enemyRenderer  : playerRenderer);

  const { x, y } = actualRenderer.cellCenter(row, col);

  if (result.hit) {
    if (result.sunk) {
      actualFX.addSunk(x, y);
      sound.playSunk();
      const who = game.pvpMode
        ? (isPlayer ? 'P1 sunk' : 'P2 sunk')
        : (isPlayer ? 'You sunk the' : 'AI sunk your');
      setStatus(`${who} ${result.ship.name}! 💥`, 'sunk');
      refreshFleetStrips();
    } else {
      actualFX.addHit(x, y);
      sound.playHit();
      setStatus(game.pvpMode
        ? (isPlayer ? 'Player 1 hit! 🔥' : 'Player 2 hit! 🔥')
        : (isPlayer ? 'Hit! 🔥' : 'AI hit your ship! 🔥'),
        'hit');
    }
  } else {
    actualFX.addMiss(x, y);
    sound.playMiss();
    setStatus(game.pvpMode
      ? (isPlayer ? 'Player 1 missed! 💧' : 'Player 2 missed! 💧')
      : (isPlayer ? 'Miss! 💧' : 'AI missed! 💧'),
      'miss');
  }

  updateBattleStats();

  // For AI mode, restore prompt after AI fires
  if (!game.pvpMode && !isPlayer && game.state === 'battle') {
    setTimeout(() => {
      if (game.state === 'battle' && game.playerTurn) {
        setStatus('Your turn — fire!', '');
      }
    }, 1200);
  }
}

function setStatus(text, type = '') {
  const el = $('status-msg');
  el.textContent = text;
  el.className   = 'status-msg' + (type ? ' ' + type : '');
}

function updateBattleStats() {
  $('shots-val').textContent = game.shotsFired;
  $('hits-val').textContent  = game.shotsHit;
  const acc = game.getAccuracy();
  $('acc-val').textContent   = acc !== null ? acc + '%' : '—';
}

function updateBattleLabels() {
  if (!game.pvpMode) {
    document.querySelector('#player-canvas').parentElement.querySelector('.grid-label').textContent = 'Your Waters';
    document.querySelector('#enemy-canvas').parentElement.querySelector('.grid-label').textContent  = 'Enemy Waters';
    return;
  }
  const p = game.playerTurn ? 1 : 2;
  document.querySelector('#player-canvas').parentElement.querySelector('.grid-label').textContent = `Player ${p}'s Waters`;
  document.querySelector('#enemy-canvas').parentElement.querySelector('.grid-label').textContent  = `Player ${p === 1 ? 2 : 1}'s Waters`;
  setStatus(`Player ${p} — Fire!`, '');
}

function refreshFleetStrips() {
  renderFleetStrip('player-fleet-strip', game.playerFleet);
  renderFleetStrip('enemy-fleet-strip',  game.enemyFleet);
}

function renderFleetStrip(id, fleet) {
  const el = $(id);
  el.innerHTML = '';
  for (const ship of fleet) {
    const span = document.createElement('span');
    span.className   = 'ship-status' + (ship.isSunk() ? ' sunk' : '');
    span.title       = ship.name + (ship.isSunk() ? ' (sunk)' : '');
    span.textContent = ship.emoji;
    el.appendChild(span);
  }
}

// ── Timer ─────────────────────────────────────────────────────────────────────
function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    const s = game.getElapsed();
    $('timer-val').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }, 1000);
}
function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

// ── Game Over ─────────────────────────────────────────────────────────────────
function showGameOver(data) {
  const { pvp, playerWon, duration } = data;

  if (playerWon) {
    sound.playVictory();
    $('result-icon').textContent  = '🏆';
    $('result-title').textContent = pvp ? 'PLAYER 1 WINS!' : 'VICTORY!';
    $('result-title').style.color = '#00e676';
    $('result-sub').textContent   = pvp
      ? 'Player 1 sank the enemy fleet!'
      : 'Admiral, you have conquered the seas!';
  } else {
    sound.playDefeat();
    $('result-icon').textContent  = pvp ? '🥇' : '💀';
    $('result-title').textContent = pvp ? 'PLAYER 2 WINS!' : 'DEFEAT';
    $('result-title').style.color = pvp ? '#00e676' : '#ff5722';
    $('result-sub').textContent   = pvp
      ? 'Player 2 sank the enemy fleet!'
      : 'The enemy fleet has prevailed. Try again!';
  }

  let statsHtml = '';
  if (pvp) {
    statsHtml = `
      <div class="stat-card"><span class="val">${data.p1.shots}</span><span class="lbl">P1 Shots</span></div>
      <div class="stat-card"><span class="val">${data.p1.accuracy}%</span><span class="lbl">P1 Accuracy</span></div>
      <div class="stat-card"><span class="val">${data.p2.shots}</span><span class="lbl">P2 Shots</span></div>
      <div class="stat-card"><span class="val">${data.p2.accuracy}%</span><span class="lbl">P2 Accuracy</span></div>
      <div class="stat-card" style="grid-column:span 2"><span class="val">${scoreboard.formatTime(duration)}</span><span class="lbl">Total Time</span></div>
    `;
  } else {
    statsHtml = `
      <div class="stat-card"><span class="val">${data.shots}</span><span class="lbl">Shots Fired</span></div>
      <div class="stat-card"><span class="val">${data.hits}</span><span class="lbl">Hits</span></div>
      <div class="stat-card"><span class="val">${data.accuracy}%</span><span class="lbl">Accuracy</span></div>
      <div class="stat-card"><span class="val">${scoreboard.formatTime(duration)}</span><span class="lbl">Time</span></div>
    `;
  }
  $('final-stats').innerHTML = statsHtml;

  const lastName = localStorage.getItem('naval-strike-last-name') || '';
  $('player-name-input').value = pvp
    ? (playerWon ? 'Player 1' : 'Player 2')
    : lastName;
  $('save-score-btn').textContent = '💾 Save';
  $('save-score-btn').disabled    = false;

  gameoverOverlay.classList.remove('hidden');
}

function saveScore() {
  const name = $('player-name-input').value.trim();
  if (!name) { $('player-name-input').focus(); return; }
  if (!game.pvpMode) localStorage.setItem('naval-strike-last-name', name);
  scoreboard.addResult(name, {
    playerWon: game.enemyBoard.allSunk(),
    shots:     game.pvpMode ? (game.playerTurn ? game.p1Shots : game.p2Shots) : game.shotsFired,
    hits:      game.pvpMode ? (game.playerTurn ? game.p1Hits  : game.p2Hits)  : game.shotsHit,
    duration:  game.getElapsed(),
  });
  $('save-score-btn').textContent = '✓ Saved!';
  $('save-score-btn').disabled    = true;
}

function playAgain() {
  gameoverOverlay.classList.add('hidden');
  playerFX.clear(); enemyFX.clear();
  selectedShip = null; isHorizontal = true;
  if (gameMode === 'net') { net.disconnect(); gameMode = 'ai'; }
  setMode(gameMode);
  game.startSetup(gameMode === 'pvp');
}

// ── Scoreboard ────────────────────────────────────────────────────────────────
function openScoreboard() { renderScoreboard(); scoresOverlay.classList.remove('hidden'); }
function closeScoreboard() { scoresOverlay.classList.add('hidden'); }

function renderScoreboard() {
  const entries = scoreboard.load();
  const body    = $('scores-body');
  const empty   = $('scores-empty');
  body.innerHTML = '';

  if (entries.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  entries.forEach((e, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1;
    const tr    = document.createElement('tr');
    tr.innerHTML = `
      <td>${medal}</td>
      <td>${e.name}</td>
      <td>${e.wins}</td>
      <td>${e.losses}</td>
      <td>${scoreboard.getAccuracy(e)}</td>
      <td>${e.bestTime ? scoreboard.formatTime(e.bestTime) : '—'}</td>
      <td>${e.score}</td>
    `;
    body.appendChild(tr);
  });
}

// ── Network lobby ─────────────────────────────────────────────────────────────
function openNetLobby() {
  showNetStep('choose');
  $('net-overlay').classList.remove('hidden');
}

function closeNetLobby() {
  $('net-overlay').classList.add('hidden');
}

function showNetStep(step) {
  ['net-choose', 'net-hosting', 'net-joining'].forEach(id => {
    $(id).classList.toggle('hidden', !id.endsWith(step === 'choose' ? 'choose' : step === 'hosting' ? 'hosting' : 'joining'));
  });
}

async function startHosting() {
  showNetStep('hosting');
  setNetStatus('host', '<span class="spinner"></span> Connecting…');
  $('net-host-play-btn').classList.add('hidden');
  $('net-retry-host-btn').classList.add('hidden');

  try {
    await net.connect();
  } catch {
    setNetStatus('host',
      `❌ Server unreachable at <code>${net.wsUrl}</code><br>
       Run <code>npm run server</code> in the project folder, then retry.`, 'err');
    $('net-retry-host-btn').classList.remove('hidden');
    return;
  }
  net.onMessage    = onNetMessage;
  net.onDisconnect = onNetDisconnect;
  net.createRoom();
}

async function startJoining() {
  const raw  = $('code-input').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (raw.length < 6) {
    setNetStatus('join', '❌ Enter the full 6-character code.', 'err');
    return;
  }
  setNetStatus('join', '<span class="spinner"></span> Connecting…');
  $('code-submit-btn').disabled = true;

  try {
    await net.connect();
  } catch {
    setNetStatus('join',
      `❌ Server unreachable at <code>${net.wsUrl}</code><br>
       Run <code>npm run server</code> in the project folder, then retry.`, 'err');
    $('code-submit-btn').disabled = false;
    return;
  }
  net.onMessage    = onNetMessage;
  net.onDisconnect = onNetDisconnect;
  net.joinRoom(raw);
}

function setNetStatus(side, html, cls = '') {
  const el = $(side === 'host' ? 'net-status-host' : 'net-status-join');
  el.className  = 'net-status' + (cls ? ' ' + cls : '');
  el.innerHTML  = html;
}

function onNetMessage(msg) {
  switch (msg.type) {

    case 'created': {
      net.role = 'host'; net.roomCode = msg.code;
      const disp = msg.code.slice(0,3) + '-' + msg.code.slice(3);
      $('room-code-display').textContent = disp;
      setNetStatus('host', '⏳ Waiting for opponent…');
      break;
    }

    case 'joined': {
      net.role = 'guest'; net.roomCode = msg.code;
      setNetStatus('join', '✅ Connected! Place your fleet then hit Ready.', 'ok');
      $('net-join-play-btn').classList.remove('hidden');
      break;
    }

    case 'opponent_joined': {
      setNetStatus('host', '✅ Opponent connected! Place your fleet then hit Ready.', 'ok');
      $('net-host-play-btn').classList.remove('hidden');
      break;
    }

    case 'opponent_fleet_ready': {
      netOpReady = true;
      updateNetReadyHint();
      break;
    }

    case 'start': {
      netMyTurn = msg.yourTurn;
      closeNetLobby();
      beginNetBattle();
      break;
    }

    case 'fire':
      handleNetIncomingFire(msg.row, msg.col);
      break;

    case 'result':
      handleNetShotResult(msg);
      break;

    case 'opponent_disconnected':
      onNetDisconnect();
      break;

    case 'error':
      setNetStatus('host', '❌ ' + msg.msg, 'err');
      setNetStatus('join', '❌ ' + msg.msg, 'err');
      $('code-submit-btn').disabled = false;
      break;
  }
}

function onNetDisconnect() {
  if (game.state === 'battle' || game.state === 'gameover') {
    setStatus('Opponent disconnected! 🔌', 'miss');
  } else {
    setNetStatus('host', '🔌 Disconnected.', 'err');
    setNetStatus('join', '🔌 Disconnected.', 'err');
  }
}

function updateNetReadyHint() {
  if (netMyReady && netOpReady) {
    $('setup-hint').textContent = '⏳ Waiting for server to start the game…';
  } else if (netOpReady) {
    $('setup-hint').textContent = '✅ Opponent is ready — finish placing your fleet!';
  }
}

// Called when player clicks "Deploy Fleet →" from lobby
function enterNetSetup() {
  closeNetLobby();
  gameMode     = 'net';
  pvpSetupStep = 1;
  netMyReady   = false;
  netOpReady   = false;
  showPhase('setup');
  $('mode-selector').classList.add('hidden');
  $('setup-title').textContent = '🌐 Deploy Your Fleet';
  $('start-btn').textContent   = '⚡ I\'m Ready!';
  selectedShip = null; setupRenderer.previewShip = null;
  isHorizontal = true;
  refreshShipList(game.playerFleet);
  renderSetup();
  updateStartBtn();
}

// Called when player clicks "I'm Ready!" in network setup
function netFleetReady() {
  netMyReady = true;
  net.fleetReady();
  $('start-btn').disabled    = true;
  $('start-btn').textContent = '⏳ Waiting for opponent…';
  $('setup-hint').textContent = netOpReady
    ? '⏳ Both ready — starting…'
    : '⏳ Waiting for opponent to place their fleet…';
}

function beginNetBattle() {
  game.state      = 'battle';
  game.startTime  = Date.now();
  game.playerTurn = netMyTurn;
  showPhase('battle');
  refreshFleetStrips();
  startTimer();
  // Add a small network indicator to the battle center
  const center = document.querySelector('.battle-center');
  if (center && !center.querySelector('.net-badge')) {
    const badge = document.createElement('div');
    badge.className   = 'net-badge';
    badge.textContent = '🌐 Online';
    center.insertBefore(badge, center.firstChild);
  }
  setStatus(netMyTurn ? 'Your turn — Fire! 🎯' : "Opponent's turn…", netMyTurn ? '' : '');
}

// Opponent fired at MY board
function handleNetIncomingFire(row, col) {
  if (game.playerBoard.isFired(row, col)) return;
  const result = game.playerBoard.fire(row, col);
  if (!result) return;

  const { x, y } = playerRenderer.cellCenter(row, col);
  if (result.hit) {
    if (result.sunk) { playerFX.addSunk(x, y); sound.playSunk(); }
    else             { playerFX.addHit(x, y);  sound.playHit();  }
    setStatus(`Opponent hit your ${result.sunk ? result.ship.name + '! 💥' : 'ship! 🔥'}`, result.sunk ? 'sunk' : 'hit');
  } else {
    playerFX.addMiss(x, y); sound.playMiss();
    setStatus('Opponent missed! 💧', 'miss');
  }

  refreshFleetStrips();
  const gameOver = game.playerBoard.allSunk();
  net.sendResult(row, col, result.hit, result.sunk, result.ship?.name || null, gameOver);

  if (gameOver) {
    game.endNetworkGame(false, {
      shots: game.shotsFired, hits: game.shotsHit,
      accuracy: game.getAccuracy() ?? 0,
      duration: game.getElapsed(),
    });
    return;
  }

  netMyTurn = true;
  setTimeout(() => { if (game.state === 'battle') setStatus('Your turn — Fire! 🎯', ''); }, 1000);
}

// I fired, and this is the result from opponent's board
function handleNetShotResult(msg) {
  const { row, col, hit, sunk, shipName, gameOver } = msg;

  // Mark on our enemy board display (no real ships, just markers)
  if (hit) {
    const fakeShip = { color: '#ff5722', isSunk: () => sunk, name: shipName || '?' };
    game.enemyBoard.grid[row][col] = { ship: fakeShip, fired: true };
    game.enemyBoard.hitShots.push({ row, col });
  } else {
    game.enemyBoard.grid[row][col] = { fired: true };
    game.enemyBoard.missShots.push({ row, col });
  }

  const { x, y } = enemyRenderer.cellCenter(row, col);
  if (hit) {
    if (sunk) {
      enemyFX.addSunk(x, y); sound.playSunk();
      setStatus(`You sunk the ${shipName}! 💥`, 'sunk');
    } else {
      enemyFX.addHit(x, y); sound.playHit();
      setStatus('Hit! 🔥', 'hit');
    }
  } else {
    enemyFX.addMiss(x, y); sound.playMiss();
    setStatus('Miss! 💧', 'miss');
  }

  updateBattleStats();
  refreshFleetStrips();

  if (gameOver) {
    game.endNetworkGame(true, {
      shots: game.shotsFired, hits: game.shotsHit,
      accuracy: game.getAccuracy() ?? 0,
      duration: game.getElapsed(),
    });
    return;
  }

  netMyTurn = false;
  setTimeout(() => { if (game.state === 'battle') setStatus("Opponent's turn…", ''); }, 1000);
}

// ── Sound ─────────────────────────────────────────────────────────────────────
function toggleSound() {
  const on = sound.toggle();
  $('sound-btn').textContent = on ? '🔊' : '🔇';
  $('sound-btn').classList.toggle('muted', !on);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
