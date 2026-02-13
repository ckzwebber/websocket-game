import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GameService } from './game.service';
import {
  JoinGameDto,
  MovePayloadDto,
  ShootPayloadDto,
  AimPayloadDto,
} from './game.dto';
import { validatePayload } from '../common/ws-validation.pipe';
import { Server, Socket } from 'socket.io';

/**
 * Simple per-client rate limiter.
 * Tracks event counts in sliding windows.
 */
class ClientRateLimiter {
  private buckets = new Map<string, { count: number; resetAt: number }>();

  /** Returns true if the action is allowed. */
  allow(clientId: string, event: string, maxPerSec: number): boolean {
    const key = `${clientId}:${event}`;
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + 1000 });
      return true;
    }

    if (bucket.count >= maxPerSec) return false;
    bucket.count++;
    return true;
  }

  remove(clientId: string) {
    for (const key of this.buckets.keys()) {
      if (key.startsWith(`${clientId}:`)) {
        this.buckets.delete(key);
      }
    }
  }

  /** Periodic cleanup of expired buckets */
  cleanup() {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (now > bucket.resetAt) this.buckets.delete(key);
    }
  }
}

// Rate limits (events per second)
const RATE_LIMITS = {
  join: 1,
  move: 30,
  'move:stop': 30,
  shoot: 15,
  aim: 30,
} as const;

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
})
export class GameGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    OnModuleDestroy
{
  private readonly logger = new Logger('GameGateway');
  private readonly rateLimiter = new ClientRateLimiter();
  private gameLoopInterval: ReturnType<typeof setInterval>;
  private statsInterval: ReturnType<typeof setInterval>;
  private cleanupInterval: ReturnType<typeof setInterval>;

  @WebSocketServer()
  server: Server;

  constructor(
    private gameService: GameService,
    private configService: ConfigService,
  ) {}

  afterInit() {
    this.gameLoopInterval = setInterval(() => {
      this.gameService.update();

      const players = this.gameService.getPlayerDTOs();
      const bullets = this.gameService.getBulletDTOs();
      const kills = this.gameService.flushKills();
      const hits = this.gameService.flushHits();

      this.server.emit('state:update', { players, bullets });

      hits.forEach((hit) => {
        this.server.emit('hit', hit);
      });

      kills.forEach((kill) => {
        this.server.emit('kill', kill);
      });
    }, 1000 / 60); // 60 FPS

    this.statsInterval = setInterval(() => {
      const stats = this.gameService.getStats();
      if (stats.playerCount > 0) {
        this.logger.log(
          `[📊] Players: ${stats.playerCount} | Bullets: ${stats.bulletCount} | Total kills: ${stats.totalKills}`,
        );
      }
    }, 30000); // 30 seconds

    // Cleanup expired rate limit buckets every 10s
    this.cleanupInterval = setInterval(() => {
      this.rateLimiter.cleanup();
    }, 10000); // 10 seconds

    this.logger.log('Game loop started (60 ticks/s)');
  }

  onModuleDestroy() {
    clearInterval(this.gameLoopInterval);
    clearInterval(this.statsInterval);
    clearInterval(this.cleanupInterval);
    this.logger.log('Game loop stopped — server shutting down');
  }

  handleConnection(client: Socket) {
    this.logger.log(`[→] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`[←] Client disconnected: ${client.id}`);
    this.gameService.removePlayer(client.id);
    this.rateLimiter.remove(client.id);
  }

  @SubscribeMessage('join')
  async handleJoin(client: Socket, payload: unknown) {
    if (!this.rateLimiter.allow(client.id, 'join', RATE_LIMITS.join)) return;

    const dto = await validatePayload(JoinGameDto, payload).catch(() => null);
    if (!dto) {
      client.emit('error', {
        message: 'Nickname inválido (2-16 chars, sem caracteres especiais)',
      });
      return;
    }

    const nickname = dto.nickname.trim();
    this.gameService.addPlayer(client.id, nickname);
    this.logger.log(`[★] Player "${nickname}" joined (${client.id})`);

    client.emit('joined', { id: client.id });

    const players = this.gameService.getPlayerDTOs();
    const bullets = this.gameService.getBulletDTOs();
    this.server.emit('state:update', { players, bullets });
  }

  @SubscribeMessage('move')
  async handleMove(client: Socket, payload: unknown) {
    if (!this.rateLimiter.allow(client.id, 'move', RATE_LIMITS.move)) return;

    const dto = await validatePayload(MovePayloadDto, payload).catch(
      () => null,
    );
    if (!dto) return;

    this.gameService.setInput(client.id, dto.direction, true);
  }

  @SubscribeMessage('move:stop')
  async handleMoveStop(client: Socket, payload: unknown) {
    if (
      !this.rateLimiter.allow(client.id, 'move:stop', RATE_LIMITS['move:stop'])
    )
      return;

    const dto = await validatePayload(MovePayloadDto, payload).catch(
      () => null,
    );
    if (!dto) return;

    this.gameService.setInput(client.id, dto.direction, false);
  }

  @SubscribeMessage('shoot')
  async handleShoot(client: Socket, payload: unknown) {
    if (!this.rateLimiter.allow(client.id, 'shoot', RATE_LIMITS.shoot)) return;

    const dto = await validatePayload(ShootPayloadDto, payload).catch(
      () => null,
    );
    if (!dto) return;
    if (!Number.isFinite(dto.angle)) return;

    this.gameService.shoot(client.id, dto.angle);
  }

  @SubscribeMessage('aim')
  async handleAim(client: Socket, payload: unknown) {
    if (!this.rateLimiter.allow(client.id, 'aim', RATE_LIMITS.aim)) return;

    const dto = await validatePayload(AimPayloadDto, payload).catch(() => null);
    if (!dto) return;
    if (!Number.isFinite(dto.angle)) return;

    this.gameService.setAim(client.id, dto.angle);
  }
}
