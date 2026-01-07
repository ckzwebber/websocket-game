/**
 * 🔥 WebSocket Game Stress Test
 *
 * Uso:
 *   node stress-test.mjs                     → 200 bots, ramp 5/s
 *   node stress-test.mjs --bots 500          → 500 bots
 *   node stress-test.mjs --bots 1000 --ramp 20  → 1000 bots, 20 conectam por segundo
 *   node stress-test.mjs --url ws://192.168.1.5:3000  → servidor remoto
 *
 * Pré-requisito:
 *   pnpm add -D socket.io-client
 */

import { io } from 'socket.io-client';

// ── CLI args ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const SERVER_URL = getArg('url', 'http://localhost:3000');
const TOTAL_BOTS = parseInt(getArg('bots', '200'), 10);
const RAMP_PER_SEC = parseInt(getArg('ramp', '5'), 10);
const ACTION_INTERVAL_MS = parseInt(getArg('interval', '50'), 10); // ms entre ações por bot
const DURATION_SEC = parseInt(getArg('duration', '60'), 10); // duração total em segundos

// ── Stats ───────────────────────────────────────────────────────────
let connected = 0;
let disconnected = 0;
let errors = 0;
let eventsSent = 0;
let eventsReceived = 0;
const sockets = [];

const DIRECTIONS = ['up', 'down', 'left', 'right'];
const randomDir = () => DIRECTIONS[Math.floor(Math.random() * 4)];
const randomAngle = () => Math.random() * Math.PI * 2;
const randomNick = (i) => `bot_${i}_${Math.random().toString(36).slice(2, 6)}`;

// ── Criar um bot ────────────────────────────────────────────────────
function spawnBot(index) {
  const socket = io(SERVER_URL, {
    transports: ['websocket'], // pula polling, vai direto pro WS
    forceNew: true,
    reconnection: false,
    timeout: 10000,
  });

  socket.on('connect', () => {
    connected++;
    // Join
    socket.emit('join', { nickname: randomNick(index) });
    eventsSent++;
  });

  socket.on('state:update', () => {
    eventsReceived++;
  });
  socket.on('hit', () => {
    eventsReceived++;
  });
  socket.on('kill', () => {
    eventsReceived++;
  });
  socket.on('joined', () => {
    eventsReceived++;
  });

  socket.on('disconnect', () => {
    disconnected++;
  });
  socket.on('connect_error', (err) => {
    errors++;
    if (errors <= 5)
      console.error(`  ❌ Bot ${index} connect_error: ${err.message}`);
  });

  // Spam de ações
  const actionLoop = setInterval(() => {
    if (!socket.connected) return;

    // Move
    socket.emit('move', { direction: randomDir() });
    eventsSent++;

    // Aim
    socket.emit('aim', { angle: randomAngle() });
    eventsSent++;

    // Shoot (50% das vezes)
    if (Math.random() > 0.5) {
      socket.emit('shoot', { angle: randomAngle() });
      eventsSent++;
    }

    // Move stop (30% das vezes)
    if (Math.random() > 0.7) {
      socket.emit('move:stop', { direction: randomDir() });
      eventsSent++;
    }
  }, ACTION_INTERVAL_MS);

  socket.actionLoop = actionLoop;
  sockets.push(socket);
}

// ── Dashboard ───────────────────────────────────────────────────────
function printStats() {
  const mem = process.memoryUsage();
  const mbUsed = (mem.heapUsed / 1024 / 1024).toFixed(1);
  process.stdout.write(
    `\r  🤖 ${connected}/${TOTAL_BOTS} online | ` +
      `📤 ${eventsSent.toLocaleString()} sent | ` +
      `📥 ${eventsReceived.toLocaleString()} recv | ` +
      `❌ ${errors} errs | ` +
      `💀 ${disconnected} dc | ` +
      `🧠 ${mbUsed} MB   `,
  );
}

// ── Main ────────────────────────────────────────────────────────────
console.log('');
console.log('  ╔══════════════════════════════════════════╗');
console.log('  ║     🔥 WEBSOCKET STRESS TEST 🔥         ║');
console.log('  ╠══════════════════════════════════════════╣');
console.log(`  ║  Server:    ${SERVER_URL.padEnd(28)}║`);
console.log(`  ║  Bots:      ${String(TOTAL_BOTS).padEnd(28)}║`);
console.log(`  ║  Ramp:      ${(RAMP_PER_SEC + '/s').padEnd(28)}║`);
console.log(
  `  ║  Interval:  ${(ACTION_INTERVAL_MS + 'ms per bot').padEnd(28)}║`,
);
console.log(`  ║  Duration:  ${(DURATION_SEC + 's').padEnd(28)}║`);
console.log('  ╚══════════════════════════════════════════╝');
console.log('');

let spawned = 0;
const rampInterval = setInterval(() => {
  for (let i = 0; i < RAMP_PER_SEC && spawned < TOTAL_BOTS; i++) {
    spawnBot(spawned);
    spawned++;
  }
  if (spawned >= TOTAL_BOTS) clearInterval(rampInterval);
}, 1000);

const statsInterval = setInterval(printStats, 500);

// Encerrar após a duração
setTimeout(() => {
  clearInterval(rampInterval);
  clearInterval(statsInterval);
  printStats();
  console.log('\n');
  console.log('  ┌──────────────────────────────────────────┐');
  console.log('  │           📊 RESULTADO FINAL              │');
  console.log('  ├──────────────────────────────────────────┤');
  console.log(`  │  Bots conectados:   ${connected}`);
  console.log(`  │  Eventos enviados:  ${eventsSent.toLocaleString()}`);
  console.log(`  │  Eventos recebidos: ${eventsReceived.toLocaleString()}`);
  console.log(`  │  Erros conexão:     ${errors}`);
  console.log(`  │  Desconexões:       ${disconnected}`);
  console.log(
    `  │  Throughput TX:     ~${Math.round(eventsSent / DURATION_SEC).toLocaleString()} eventos/s`,
  );
  console.log(
    `  │  Throughput RX:     ~${Math.round(eventsReceived / DURATION_SEC).toLocaleString()} eventos/s`,
  );
  console.log('  └──────────────────────────────────────────┘');
  console.log('');
  console.log('  Desconectando todos os bots...');

  sockets.forEach((s) => {
    clearInterval(s.actionLoop);
    s.disconnect();
  });

  setTimeout(() => process.exit(0), 2000);
}, DURATION_SEC * 1000);

// Ctrl+C graceful
process.on('SIGINT', () => {
  console.log('\n\n  ⚡ Interrompido! Desconectando...');
  sockets.forEach((s) => {
    clearInterval(s.actionLoop);
    s.disconnect();
  });
  setTimeout(() => process.exit(0), 1000);
});
