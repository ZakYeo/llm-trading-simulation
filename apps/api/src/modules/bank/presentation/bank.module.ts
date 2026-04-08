import { Module } from '@nestjs/common';

import { BankController } from './rest/bank.controller.js';

@Module({
  controllers: [BankController],
})
export class BankModule {}
