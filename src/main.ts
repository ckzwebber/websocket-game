import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Security headers
  app.use(helmet());

  const corsOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:5173');

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log('══════════════════════════════════════════');
  logger.log('  Arena — Multiplayer Shooter Server');
  logger.log(`  Port: ${port}`);
  logger.log(`  CORS: ${corsOrigin}`);
  logger.log(`  Env: ${config.get<string>('NODE_ENV', 'development')}`);
  logger.log('  Status: Ready for connections');
  logger.log('══════════════════════════════════════════');
}
bootstrap();
