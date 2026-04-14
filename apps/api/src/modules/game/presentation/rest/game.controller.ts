import {
  Body,
  Controller,
  Inject,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { AdvanceGameRoundUseCase } from '../../application/use-cases/advance-game-round.use-case.js';
import { CreateGameSessionUseCase } from '../../application/use-cases/create-game-session.use-case.js';
import { DepositToBankUseCase } from '../../application/use-cases/deposit-to-bank.use-case.js';
import { GetGameSessionUseCase } from '../../application/use-cases/get-game-session.use-case.js';
import { ListGameSessionsUseCase } from '../../application/use-cases/list-game-sessions.use-case.js';
import { OpenMarketPositionUseCase } from '../../application/use-cases/open-market-position.use-case.js';
import { PlaceFundsWithBankerUseCase } from '../../application/use-cases/place-funds-with-banker.use-case.js';
import { RedeemFundsFromBankerUseCase } from '../../application/use-cases/redeem-funds-from-banker.use-case.js';
import { TransferFundsUseCase } from '../../application/use-cases/transfer-funds.use-case.js';
import { WithdrawFromBankUseCase } from '../../application/use-cases/withdraw-from-bank.use-case.js';
import { GameSessionResponseMapper } from './mappers/game-session-response.mapper.js';
import { advanceGameRoundRequestSchema } from './schemas/advance-game-round.request.js';
import { createGameSessionRequestSchema } from './schemas/create-game-session.request.js';
import { depositToBankRequestSchema } from './schemas/deposit-to-bank.request.js';
import { openMarketPositionRequestSchema } from './schemas/open-market-position.request.js';
import { placeFundsWithBankerRequestSchema } from './schemas/place-funds-with-banker.request.js';
import { redeemFundsFromBankerRequestSchema } from './schemas/redeem-funds-from-banker.request.js';
import { transferFundsRequestSchema } from './schemas/transfer-funds.request.js';
import { withdrawFromBankRequestSchema } from './schemas/withdraw-from-bank.request.js';

@Controller('game')
export class GameController {
  constructor(
    @Inject(CreateGameSessionUseCase)
    private readonly createGameSessionUseCase: CreateGameSessionUseCase,
    @Inject(GetGameSessionUseCase)
    private readonly getGameSessionUseCase: GetGameSessionUseCase,
    @Inject(ListGameSessionsUseCase)
    private readonly listGameSessionsUseCase: ListGameSessionsUseCase,
    @Inject(AdvanceGameRoundUseCase)
    private readonly advanceGameRoundUseCase: AdvanceGameRoundUseCase,
    @Inject(DepositToBankUseCase)
    private readonly depositToBankUseCase: DepositToBankUseCase,
    @Inject(WithdrawFromBankUseCase)
    private readonly withdrawFromBankUseCase: WithdrawFromBankUseCase,
    @Inject(TransferFundsUseCase)
    private readonly transferFundsUseCase: TransferFundsUseCase,
    @Inject(PlaceFundsWithBankerUseCase)
    private readonly placeFundsWithBankerUseCase: PlaceFundsWithBankerUseCase,
    @Inject(RedeemFundsFromBankerUseCase)
    private readonly redeemFundsFromBankerUseCase: RedeemFundsFromBankerUseCase,
    @Inject(OpenMarketPositionUseCase)
    private readonly openMarketPositionUseCase: OpenMarketPositionUseCase = {
      execute: async () => {
        throw new DomainInvariantError(
          'Open market position use case is not configured.',
        );
      },
    } as unknown as OpenMarketPositionUseCase,
  ) {}

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'game',
    };
  }

  @Post('sessions')
  async createSession(@Body() body: unknown) {
    const request = createGameSessionRequestSchema.parse(body);
    const session = await this.createGameSessionUseCase.execute(request);

    return GameSessionResponseMapper.toResponse(session);
  }

  @Get('sessions/:gameSessionId')
  async getSession(@Param('gameSessionId') gameSessionId: string) {
    const session = await this.getGameSessionUseCase.execute({ gameSessionId });

    return GameSessionResponseMapper.toResponse(session);
  }

  @Get('sessions')
  async listSessions() {
    return this.listGameSessionsUseCase.execute();
  }

  @Patch('sessions/:gameSessionId/deposit')
  async depositToBank(
    @Param('gameSessionId') gameSessionId: string,
    @Body() body: unknown,
  ) {
    const request = depositToBankRequestSchema.parse(body);
    const session = await this.depositToBankUseCase.execute({
      gameSessionId,
      agentId: request.agentId,
      amount: request.amount,
    });

    return GameSessionResponseMapper.toResponse(session);
  }

  @Patch('sessions/:gameSessionId/rounds/advance')
  async advanceRound(
    @Param('gameSessionId') gameSessionId: string,
    @Body() body: unknown,
  ) {
    const request = advanceGameRoundRequestSchema.parse(body);
    const session = await this.advanceGameRoundUseCase.execute({
      gameSessionId,
      interestRateBps: request.interestRateBps,
    });

    return GameSessionResponseMapper.toResponse(session);
  }

  @Patch('sessions/:gameSessionId/withdraw')
  async withdrawFromBank(
    @Param('gameSessionId') gameSessionId: string,
    @Body() body: unknown,
  ) {
    const request = withdrawFromBankRequestSchema.parse(body);
    const session = await this.withdrawFromBankUseCase.execute({
      gameSessionId,
      agentId: request.agentId,
      amount: request.amount,
    });

    return GameSessionResponseMapper.toResponse(session);
  }

  @Patch('sessions/:gameSessionId/transfer')
  async transferFunds(
    @Param('gameSessionId') gameSessionId: string,
    @Body() body: unknown,
  ) {
    const request = transferFundsRequestSchema.parse(body);
    const session = await this.transferFundsUseCase.execute({
      gameSessionId,
      sourceAgentId: request.sourceAgentId,
      destinationAgentId: request.destinationAgentId,
      amount: request.amount,
    });

    return GameSessionResponseMapper.toResponse(session);
  }

  @Patch('sessions/:gameSessionId/custody/place')
  async placeFundsWithBanker(
    @Param('gameSessionId') gameSessionId: string,
    @Body() body: unknown,
  ) {
    const request = placeFundsWithBankerRequestSchema.parse(body);
    const session = await this.placeFundsWithBankerUseCase.execute({
      gameSessionId,
      ownerAgentId: request.ownerAgentId,
      bankerAgentId: request.bankerAgentId,
      amount: request.amount,
    });

    return GameSessionResponseMapper.toResponse(session);
  }

  @Patch('sessions/:gameSessionId/market/open')
  async openMarketPosition(
    @Param('gameSessionId') gameSessionId: string,
    @Body() body: unknown,
  ) {
    const request = openMarketPositionRequestSchema.parse(body);
    const session = await this.openMarketPositionUseCase.execute({
      gameSessionId,
      ownerAgentId: request.ownerAgentId,
      opportunityId: request.opportunityId,
      amount: request.amount,
    });

    return GameSessionResponseMapper.toResponse(session);
  }

  @Patch('sessions/:gameSessionId/custody/redeem')
  async redeemFundsFromBanker(
    @Param('gameSessionId') gameSessionId: string,
    @Body() body: unknown,
  ) {
    const request = redeemFundsFromBankerRequestSchema.parse(body);
    const session = await this.redeemFundsFromBankerUseCase.execute({
      gameSessionId,
      ownerAgentId: request.ownerAgentId,
      bankerAgentId: request.bankerAgentId,
      amount: request.amount,
    });

    return GameSessionResponseMapper.toResponse(session);
  }
}
