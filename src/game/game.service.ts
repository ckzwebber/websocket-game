import { Injectable, Logger } from '@nestjs/common';
import {
  Player,
  Bullet,
  PlayerDTO,
  BulletDTO,
  KillEvent,
  HitEvent,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  PLAYER_SIZE,
  PLAYER_SPEED,
  PLAYER_MAX_HP,
  BULLET_SPEED,
  BULLET_RADIUS,
  BULLET_DAMAGE,
  BULLET_LIFETIME,
  SHOOT_COOLDOWN,
  RESPAWN_DELAY,
} from './game.types';

@Injectable()
/** Core game logic service managing players, bullets and physics */
export class GameService {
  private readonly logger = new Logger('GameService');
  private players = new Map<string, Player>();
  private bullets = new Map<string, Bullet>();
  private pendingKills: KillEvent[] = [];
  private pendingHits: HitEvent[] = [];
  private bulletCounter: number = 0;

  addPlayer(socketId: string, nickname: string) {
    const player: Player = {
      id: socketId,
      nickname,
      x: Math.floor(Math.random() * (WORLD_WIDTH - 200)) + 100,
      y: Math.floor(Math.random() * (WORLD_HEIGHT - 200)) + 100,
      angle: 0,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      alive: true,
      kills: 0,
      deaths: 0,
      input: { up: false, down: false, left: false, right: false },
      lastShotAt: 0,
    };
    this.players.set(socketId, player);
    this.logger.log(
      `[+] Player joined: "${nickname}" (${socketId}) at (${player.x}, ${player.y})`,
    );
  }

  removePlayer(socketId: string) {
    const leaving = this.players.get(socketId);
    if (leaving) {
      this.logger.log(
        `[-] Player left: "${leaving.nickname}" (${socketId}) | K:${leaving.kills} D:${leaving.deaths}`,
      );
    }
    this.players.delete(socketId);
    this.bullets.forEach((b, id) => {
      if (b.ownerId === socketId) this.bullets.delete(id);
    });
  }

  setInput(
    id: string,
    direction: 'up' | 'down' | 'left' | 'right',
    value: boolean,
  ) {
    const player = this.players.get(id);
    if (!player) return;
    player.input[direction] = value;
  }

  setAim(id: string, angle: number) {
    const player = this.players.get(id);
    if (!player) return;
    player.angle = angle;
  }

  shoot(id: string, angle: number): boolean {
    const player = this.players.get(id);
    if (!player || !player.alive) return false;

    const now = Date.now();
    if (now - player.lastShotAt < SHOOT_COOLDOWN) return false;

    player.lastShotAt = now;
    player.angle = angle;

    const bulletId = `b_${id}_${this.bulletCounter++}`;
    const cx = player.x + PLAYER_SIZE / 2;
    const cy = player.y + PLAYER_SIZE / 2;

    this.bullets.set(bulletId, {
      id: bulletId,
      ownerId: id,
      x: cx + Math.cos(angle) * (PLAYER_SIZE / 2 + 4),
      y: cy + Math.sin(angle) * (PLAYER_SIZE / 2 + 4),
      vx: Math.cos(angle) * BULLET_SPEED,
      vy: Math.sin(angle) * BULLET_SPEED,
      createdAt: now,
    });

    return true;
  }

  getPlayerDTOs(): PlayerDTO[] {
    return [...this.players.values()].map((p) => ({
      id: p.id,
      nickname: p.nickname,
      x: p.x,
      y: p.y,
      angle: p.angle,
      hp: p.hp,
      maxHp: p.maxHp,
      alive: p.alive,
      kills: p.kills,
      deaths: p.deaths,
    }));
  }

  getBulletDTOs(): BulletDTO[] {
    return [...this.bullets.values()].map((b) => ({
      id: b.id,
      ownerId: b.ownerId,
      x: b.x,
      y: b.y,
    }));
  }

  flushKills(): KillEvent[] {
    const kills = [...this.pendingKills];
    this.pendingKills = [];
    return kills;
  }

  flushHits(): HitEvent[] {
    const hits = [...this.pendingHits];
    this.pendingHits = [];
    return hits;
  }

  getStats() {
    let totalKills = 0;
    this.players.forEach((p) => (totalKills += p.kills));
    return {
      playerCount: this.players.size,
      bulletCount: this.bullets.size,
      totalKills,
    };
  }

  private respawnPlayer(player: Player) {
    player.x = Math.floor(Math.random() * (WORLD_WIDTH - 200)) + 100;
    player.y = Math.floor(Math.random() * (WORLD_HEIGHT - 200)) + 100;
    player.hp = PLAYER_MAX_HP;
    player.alive = true;
    player.input = { up: false, down: false, left: false, right: false };
    this.logger.debug(
      `[↻] Respawn: "${player.nickname}" at (${player.x}, ${player.y})`,
    );
  }

  private checkCollision(
    ax: number,
    ay: number,
    aw: number,
    ah: number,
    bx: number,
    by: number,
    bw: number,
    bh: number,
  ): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  update() {
    const now = Date.now();

    this.players.forEach((p) => {
      if (!p.alive) return;

      let nx = p.x;
      let ny = p.y;

      if (p.input.up) ny -= PLAYER_SPEED;
      if (p.input.down) ny += PLAYER_SPEED;
      if (p.input.left) nx -= PLAYER_SPEED;
      if (p.input.right) nx += PLAYER_SPEED;

      nx = Math.max(0, Math.min(nx, WORLD_WIDTH - PLAYER_SIZE));
      ny = Math.max(0, Math.min(ny, WORLD_HEIGHT - PLAYER_SIZE));

      let blocked = false;
      this.players.forEach((other) => {
        if (other.id === p.id || !other.alive) return;
        if (
          this.checkCollision(
            nx,
            ny,
            PLAYER_SIZE,
            PLAYER_SIZE,
            other.x,
            other.y,
            PLAYER_SIZE,
            PLAYER_SIZE,
          )
        ) {
          blocked = true;
        }
      });

      if (!blocked) {
        p.x = nx;
        p.y = ny;
      }
    });

    this.bullets.forEach((b, id) => {
      if (now - b.createdAt > BULLET_LIFETIME) {
        this.bullets.delete(id);
        return;
      }

      b.x += b.vx;
      b.y += b.vy;

      if (b.x < 0 || b.x > WORLD_WIDTH || b.y < 0 || b.y > WORLD_HEIGHT) {
        this.bullets.delete(id);
        return;
      }

      this.players.forEach((p) => {
        if (p.id === b.ownerId || !p.alive) return;

        const pcx = p.x + PLAYER_SIZE / 2;
        const pcy = p.y + PLAYER_SIZE / 2;
        const dx = b.x - pcx;
        const dy = b.y - pcy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < PLAYER_SIZE / 2 + BULLET_RADIUS) {
          this.bullets.delete(id);
          p.hp -= BULLET_DAMAGE;

          this.pendingHits.push({
            targetId: p.id,
            shooterId: b.ownerId,
            x: b.x,
            y: b.y,
          });

          if (p.hp <= 0) {
            p.hp = 0;
            p.alive = false;
            p.deaths++;

            const killer = this.players.get(b.ownerId);
            if (killer) {
              killer.kills++;
              this.pendingKills.push({
                killerId: killer.id,
                killerName: killer.nickname,
                victimId: p.id,
                victimName: p.nickname,
              });
              this.logger.warn(
                `[☠] Kill: "${killer.nickname}" → "${p.nickname}" | ${killer.kills} total kills`,
              );
            }

            setTimeout(() => this.respawnPlayer(p), RESPAWN_DELAY);
          }
        }
      });
    });
  }
}
