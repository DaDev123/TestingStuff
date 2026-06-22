'use strict';

const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = parseInt(process.env.PORT || '3000', 10);

// roomCode -> { messages: Array, sockets: Set<ws>, userCount: number }
const rooms = new Map();

function getRoom(code) {
  if (!rooms.has(code)) {
    rooms.set(code, { messages: [], sockets: new Set() });
  }
  return rooms.get(code);
}

function broadcast(roomCode, message, excludeSocket) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const data = JSON.stringify(message);
  for (const socket of room.sockets) {
    if (socket === excludeSocket) continue;
    if (socket.readyState === 1 /* OPEN */) {
      socket.send(data);
    }
  }
}

function broadcastAll(roomCode, message) {
  broadcast(roomCode, message, null);
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (socket, req) => {
  let roomCode = null;
  let username = null;

  socket.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg !== 'object') return;

    // JOIN
    if (msg.type === 'join' && typeof msg.room === 'string' && typeof msg.username === 'string') {
      // Leave old room
      if (roomCode) {
        const old = rooms.get(roomCode);
        if (old) {
          old.sockets.delete(socket);
          broadcastAll(roomCode, { type: 'system', text: `${username} left the room.`, count: old.sockets.size });
          if (old.sockets.size === 0) rooms.delete(roomCode);
        }
      }

      roomCode = msg.room.trim().toUpperCase().slice(0, 12);
      username = msg.username.trim().slice(0, 24) || 'Anonymous';

      const room = getRoom(roomCode);
      room.sockets.add(socket);

      // Confirm join + send history
      socket.send(JSON.stringify({
        type: 'joined',
        room: roomCode,
        username,
        history: room.messages.slice(-50),
        count: room.sockets.size,
      }));

      // Notify others
      broadcast(roomCode, { type: 'system', text: `${username} joined the room.`, count: room.sockets.size }, socket);
      return;
    }

    // CHAT MESSAGE
    if (msg.type === 'chat' && roomCode && typeof msg.text === 'string') {
      const text = msg.text.trim().slice(0, 500);
      if (!text) return;

      const entry = {
        type: 'chat',
        username,
        text,
        ts: Date.now(),
      };

      const room = getRoom(roomCode);
      room.messages.push(entry);
      if (room.messages.length > 200) room.messages.shift(); // keep last 200

      broadcastAll(roomCode, entry);
      return;
    }
  });

  socket.on('close', () => {
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (room) {
      room.sockets.delete(socket);
      if (room.sockets.size === 0) {
        rooms.delete(roomCode);
      } else {
        broadcastAll(roomCode, { type: 'system', text: `${username} left the room.`, count: room.sockets.size });
      }
    }
  });

  socket.on('error', () => {});
});

server.listen(PORT, () => {
  console.log(`Room server listening on port ${PORT}`);
});
