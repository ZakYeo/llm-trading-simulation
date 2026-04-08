import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { ReplayReadModelPort } from '../ports/replay-read-model.port.js';

export interface GetGameReplayInput {
  gameSessionId: string;
}

export class GetGameReplayUseCase {
  constructor(private readonly replayReadModel: ReplayReadModelPort) {}

  async execute(input: GetGameReplayInput) {
    const replay = await this.replayReadModel.findByGameSessionId(
      input.gameSessionId,
    );

    if (!replay) {
      throw new DomainInvariantError('Game replay not found.');
    }

    return replay;
  }
}
