// Arena world boundaries
export const WORLD_WIDTH = 2000;
export const WORLD_HEIGHT = 2000;
export const PLAYER_SIZE = 28; // pixels
export const PLAYER_SPEED = 5; // pixels per tick
export const PLAYER_MAX_HP = 100;
export const BULLET_SPEED = 14; // pixels per tick
export const BULLET_RADIUS = 4;
export const BULLET_DAMAGE = 18; // HP per hit
export const BULLET_LIFETIME = 1500;
export const SHOOT_COOLDOWN = 180; // milliseconds
export const RESPAWN_DELAY = 2000; // milliseconds

export interface Player {
  id: string;
  nickname: string;
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  kills: number;
  deaths: number;
  input: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  };
  lastShotAt: number;
}

export interface Bullet {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  createdAt: number;
}

export interface JoinGame {
  nickname: string;
}

export interface MovePayload {
  direction: 'up' | 'down' | 'left' | 'right';
}

export interface ShootPayload {
  angle: number;
}

export interface AimPayload {
  angle: number;
}

export interface PlayerDTO {
  id: string;
  nickname: string;
  x: number;
  y: number;
  angle: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  kills: number;
  deaths: number;
}

export interface BulletDTO {
  id: string;
  ownerId: string;
  x: number;
  y: number;
}

export interface KillEvent {
  killerId: string;
  killerName: string;
  victimId: string;
  victimName: string;
}

export interface HitEvent {
  targetId: string;
  shooterId: string;
  x: number;
  y: number;
}
