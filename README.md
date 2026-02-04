# Arena — Multiplayer Shooter Server


Real-time multiplayer top-down shooter backend built with NestJS and Socket.IO.

## Tech Stack

- **Framework**: NestJS
- **WebSocket**: Socket.IO via `@nestjs/websockets`
- **Language**: TypeScript
- **Runtime**: Node.js

## Architecture

```
src/
├── main.ts              # Bootstrap, CORS config
├── app.module.ts        # Root module
├── app.controller.ts    # Health check
├── app.service.ts       # App service
└── game/
    ├── game.types.ts    # Shared types & constants
    ├── game.service.ts  # Core game logic (physics, collision, shooting)
    └── game.gateway.ts  # WebSocket gateway (events, game loop)
```

## Game Loop

The server runs a **60 FPS** authoritative game loop:

1. **Player Movement** — Server-side position updates with AABB collision between players
2. **Bullet Physics** — Velocity-based bullet movement with lifetime and bounds checking
3. **Hit Detection** — Circle-based bullet-player collision detection
4. **Kill System** — HP tracking, death handling, auto-respawn after 2 seconds
5. **State Broadcast** — Unified `state:update` event with all players and bullets every tick

## WebSocket Events

### Client → Server

| Event       | Payload         | Description                       |
| ----------- | --------------- | --------------------------------- |
| `join`      | `{ nickname }`  | Join the game                     |
| `move`      | `{ direction }` | Start moving (up/down/left/right) |
| `move:stop` | `{ direction }` | Stop moving                       |
| `shoot`     | `{ angle }`     | Fire bullet at angle (radians)    |
| `aim`       | `{ angle }`     | Update aim direction              |

### Server → Client

| Event          | Payload                                          | Description                 |
| -------------- | ------------------------------------------------ | --------------------------- |
| `joined`       | `{ id }`                                         | Confirm join with socket ID |
| `state:update` | `{ players[], bullets[] }`                       | Full game state (60fps)     |
| `kill`         | `{ killerId, killerName, victimId, victimName }` | Kill notification           |
| `hit`          | `{ targetId, shooterId, x, y }`                  | Hit notification            |

## Game Constants

| Constant        | Value     | Description                 |
| --------------- | --------- | --------------------------- |
| World Size      | 2000×2000 | Play area dimensions        |
| Player Size     | 28px      | Player hitbox               |
| Player Speed    | 5         | Movement speed per tick     |
| Max HP          | 100       | Starting health             |
| Bullet Speed    | 14        | Bullet velocity per tick    |
| Bullet Damage   | 18        | Damage per hit              |
| Shoot Cooldown  | 180ms     | Minimum time between shots  |
| Bullet Lifetime | 1500ms    | Maximum bullet age          |
| Respawn Delay   | 2000ms    | Time to respawn after death |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Install & Run

```bash
pnpm install
pnpm start:dev
```

### Environment Variables

| Variable      | Default                 | Description         |
| ------------- | ----------------------- | ------------------- |
| `PORT`        | `3000`                  | Server port         |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |

### Build for Production

```bash
pnpm build
pnpm start:prod
```

## Logging

The server outputs structured, color-coded logs via NestJS Logger:

| Symbol | Event               | Level |
| ------ | ------------------- | ----- |
| `[+]`  | Player joined       | log   |
| `[-]`  | Player left         | log   |
| `[★]`  | Player entered game | log   |
| `[→]`  | Client connected    | log   |
| `[←]`  | Client disconnected | log   |
| `[☠]`  | Kill event          | warn  |
| `[↻]`  | Player respawned    | debug |
| `[📊]` | Periodic stats      | log   |

Stats are logged every 30 seconds when players are online.
