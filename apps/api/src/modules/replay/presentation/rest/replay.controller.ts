import { Controller, Get } from '@nestjs/common';

@Controller('replay')
export class ReplayController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'replay',
    };
  }
}
