# arena-server

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)

Authoritative server for Arena, a real-time top-down PvP multiplayer game. Frontend at [ckzwebber/arena-client](https://github.com/ckzwebber/arena-client).

## Stack

- NestJS + TypeScript
- Socket.IO via `@nestjs/websockets`
- Node.js 20+

## How it works

The server holds full authority over game state: player positions, bullet physics, collision detection, and kill tracking. Clients send only inputs and receive the full state on every tick. The game loop runs at 60 FPS and broadcasts a unified snapshot with all players and bullets each frame.

Each tick:

1. Move players from queued inputs, applying AABB collision between players and world boundary clamping.
2. Advance bullet positions, remove out-of-bounds or expired bullets.
3. Detect bullet-player collision (circle), apply damage, accumulate hit events.
4. If HP reaches zero, register kill, mark player as dead, schedule respawn in 2s.
5. Emit `state:update` with all players and bullets, plus accumulated `kill` and `hit` events.

## WebSocket events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join` | `{ nickname }` | Join the match |
| `move` | `{ direction }` | Start moving (up/down/left/right) |
| `move:stop` | `{ direction }` | Stop moving |
| `shoot` | `{ angle }` | Shoot at given angle (radians) |
| `aim` | `{ angle }` | Update aim direction |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `joined` | `{ id }` | Confirms entry with socket ID |
| `state:update` | `{ players[], bullets[] }` | Full state at 60 FPS |
| `kill` | `{ killerId, killerName, victimId, victimName }` | Kill notification |
| `hit` | `{ targetId, shooterId, x, y }` | Hit notification |

## HTTP endpoint

### `GET /health`

Returns server status. Used by an external cronjob to keep the instance alive on free-tier hosting.

```json
{
  "status": "ok",
  "uptime": 1234.56,
  "timestamp": "2026-05-12T14:30:00.000Z",
  "game": {
    "players": 3,
    "bullets": 7,
    "totalKills": 42
  },
  "memory": {
    "rss_mb": 64,
    "heapUsed_mb": 38
  }
}
```

## Setup

```bash
pnpm install
pnpm start:dev
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |

## License

MIT
