import { Injectable } from '@nestjs/common';

@Injectable()
/** Application root service */
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
