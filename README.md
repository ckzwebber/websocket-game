# Arena — Backend

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)

Servidor autoritativo de um jogo multiplayer top-down PvP em tempo real, comunicação via Socket.IO. Frontend em [ckzwebber/websocket-game-front](https://github.com/ckzwebber/websocket-game-front).

Demo: `https://websocket-game-wwfh.onrender.com/health`

## Visão geral

O servidor mantém autoridade total sobre o estado do jogo: posições, física de balas, detecção de colisão e sistema de kills. O cliente envia apenas inputs e recebe o estado atualizado a cada tick. O game loop roda a 60 FPS e emite um broadcast unificado com todos os jogadores e balas a cada frame.

## Tecnologias

- NestJS + TypeScript
- Socket.IO via `@nestjs/websockets`
- Node.js 20+

## Arquitetura

```
┌──────────────┐    move, shoot, aim    ┌──────────────┐
│   Cliente    │ ──────────────────────►│   Servidor   │
│  Canvas 2D   │                        │   NestJS     │
│              │                        │              │
│  Prediction  │ ◄──────────────────────│ Autoridade   │
│ Reconciliação│  state:update, kill,   │  do estado   │
└──────────────┘       hit, joined      └──────────────┘
```

## Game loop

A cada tick (1000/60 ms):

1. Movimenta jogadores com base nos inputs recebidos, aplicando AABB collision entre players e clamping nos limites do mundo.
2. Avança posição de cada bala pela velocidade, remove as que saírem dos limites ou expirarem.
3. Detecta colisão bala-jogador (círculo), aplica dano e registra hit.
4. Se HP chegar a zero, registra kill, marca jogador como morto e agenda respawn em 2s.
5. Emite `state:update` com todos os jogadores e balas, mais eventos `kill` e `hit` acumulados no tick.

## Eventos WebSocket

### Client → Server

| Evento      | Payload         | Descrição                         |
| ----------- | --------------- | --------------------------------- |
| `join`      | `{ nickname }`  | Entrar na partida                 |
| `move`      | `{ direction }` | Iniciar movimento (up/down/left/right) |
| `move:stop` | `{ direction }` | Parar movimento                   |
| `shoot`     | `{ angle }`     | Atirar no ângulo dado (radianos)  |
| `aim`       | `{ angle }`     | Atualizar direção de mira         |

### Server → Client

| Evento         | Payload                                          | Descrição                    |
| -------------- | ------------------------------------------------ | ---------------------------- |
| `joined`       | `{ id }`                                         | Confirma entrada com socket ID |
| `state:update` | `{ players[], bullets[] }`                       | Estado completo (60fps)      |
| `kill`         | `{ killerId, killerName, victimId, victimName }` | Notificação de kill          |
| `hit`          | `{ targetId, shooterId, x, y }`                  | Notificação de hit           |

## Endpoint HTTP

### `GET /health`

Retorna o estado do servidor. Usado por cronjob externo para manter a instância ativa em free tier.

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

## Rodando localmente

```bash
pnpm install
pnpm start:dev
```

## Variáveis de ambiente

| Variável      | Padrão                  | Descrição           |
| ------------- | ----------------------- | ------------------- |
| `PORT`        | `3000`                  | Porta do servidor   |
| `CORS_ORIGIN` | `http://localhost:5173` | Origem CORS permitida |

## Licença

MIT
