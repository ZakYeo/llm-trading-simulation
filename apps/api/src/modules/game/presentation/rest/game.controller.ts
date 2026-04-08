import { Controller, Get } from '@nestjs/common';

@Controller('game')
export class GameController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'game',
    };
  }
}
