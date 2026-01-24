import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
/** WebSocket payload validation pipe */
export class WsValidationPipe implements PipeTransform {
  async transform(value: any) {
    // The pipe is applied per-handler via decorator metadata;
    // raw primitives / already-validated objects pass through.
    if (typeof value !== 'object' || value === null) return value;

    const errors = await validate(value, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const messages = errors.flatMap((e) =>
        Object.values(e.constraints ?? {}),
      );
      throw new BadRequestException(messages);
    }

    return value;
  }
}

/**
 * Helper: transform plain payload into a class instance, then validate.
 * Use inside individual gateway handlers for full control.
 */
export async function validatePayload<T extends object>(
  cls: new () => T,
  payload: unknown,
): Promise<T> {
  const instance = plainToInstance(cls, payload);
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    const messages = errors.flatMap((e) =>
      Object.values(e.constraints ?? {}),
    );
    throw new BadRequestException(messages);
  }

  return instance;
}
