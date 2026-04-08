import { Controller, Get } from '@nestjs/common';

@Controller('bank')
export class BankController {
  @Get('rates')
  getRates() {
    return {
      baseInterestRateBps: 250,
    };
  }
}
