import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { GameService } from './game/game.service';

@Controller()
/** Root API controller */
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly gameService: GameService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    const stats = this.gameService.getStats();
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      game: {
        players: stats.playerCount,
        bullets: stats.bulletCount,
        totalKills: stats.totalKills,
      },
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    };
  }
}
