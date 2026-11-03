import type { DepositNegotiation } from '@llm-sim/shared-types';
import type { GameSession } from './game-session.js';
import { assertDepositRate } from './banker-custody-position.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';

export interface DepositMessageTerms {
  requestAmount?: string;
  requestId?: string;
  offerAmount?: string;
  rateBps?: number;
  declineOfferId?: string;
}
export function negotiateDeposit(
  session: GameSession,
  id: string,
  senderId: string,
  recipientId: string,
  terms: DepositMessageTerms,
): GameSession {
  const modes = [
    terms.requestAmount !== undefined,
    terms.requestId !== undefined,
    terms.declineOfferId !== undefined,
  ].filter(Boolean).length;
  if (
    modes !== 1 ||
    (terms.requestId === undefined &&
      (terms.offerAmount !== undefined || terms.rateBps !== undefined))
  )
    throw new DomainInvariantError(
      'Use exactly one deposit request, offer, or decline.',
    );
  const sender = session.agents.find((a) => a.id === senderId);
  const recipient = session.agents.find((a) => a.id === recipientId);
  if (!sender || !recipient || senderId === recipientId)
    throw new DomainInvariantError('Invalid deposit participants.');
  const book = session.depositNegotiations;
  if (terms.declineOfferId) {
    const offer = book.find(
      (o) =>
        o.id === terms.declineOfferId &&
        o.kind === 'offer' &&
        o.traderAgentId === senderId &&
        o.bankerAgentId === recipientId &&
        o.status === 'pending' &&
        o.roundNumber === session.currentRound,
    );
    if (!offer) throw new DomainInvariantError('No pending offer to decline.');
    return session.withDepositNegotiations(
      book.map((o) => (o.id === offer.id ? { ...o, status: 'declined' } : o)),
    );
  }
  const amount = Money.fromDecimal(
    terms.requestAmount ?? terms.offerAmount ?? '0',
  );
  if (amount.isNegative() || amount.isZero())
    throw new DomainInvariantError('Deposit amount must be positive.');
  let entry: DepositNegotiation;
  if (terms.requestAmount) {
    if (sender.role !== 'trader' || recipient.role !== 'banker')
      throw new DomainInvariantError(
        'A trader must initiate the deposit request.',
      );
    entry = {
      id,
      kind: 'request',
      traderAgentId: senderId,
      bankerAgentId: recipientId,
      roundNumber: session.currentRound,
      amount: amount.toDecimal(),
      status: 'pending',
    };
  } else {
    if (sender.role !== 'banker' || recipient.role !== 'trader')
      throw new DomainInvariantError('Only bankers can quote deposit rates.');
    const request = book.find(
      (o) =>
        o.id === terms.requestId &&
        o.kind === 'request' &&
        o.traderAgentId === recipientId &&
        o.bankerAgentId === senderId &&
        o.roundNumber === session.currentRound &&
        o.status === 'pending',
    );
    if (!request)
      throw new DomainInvariantError(
        'A current trader request is required before quoting.',
      );
    assertDepositRate(terms.rateBps!);
    entry = {
      id,
      kind: 'offer',
      requestId: request.id,
      traderAgentId: recipientId,
      bankerAgentId: senderId,
      roundNumber: session.currentRound,
      amount: amount.toDecimal(),
      rateBps: terms.rateBps,
      status: 'pending',
    };
  }
  return session.withDepositNegotiations([
    ...book.map((o) =>
      entry.kind === 'offer' &&
      o.kind === 'offer' &&
      o.requestId === entry.requestId &&
      o.status === 'pending'
        ? { ...o, status: 'superseded' as const }
        : o,
    ),
    entry,
  ]);
}
export function acceptDepositOffer(
  session: GameSession,
  offerId: string | undefined,
  traderId: string,
  bankerId: string,
  amount: Money,
) {
  const offer = session.depositNegotiations.find(
    (o) =>
      o.id === offerId &&
      o.kind === 'offer' &&
      o.traderAgentId === traderId &&
      o.bankerAgentId === bankerId &&
      o.status === 'pending' &&
      o.roundNumber === session.currentRound,
  );
  if (!offer || offer.amount !== amount.toDecimal())
    throw new DomainInvariantError(
      'Deposit requires a current, unused offer for these participants and exact amount.',
    );
  assertDepositRate(offer.rateBps!);
  return {
    offer,
    session: session.withDepositNegotiations(
      session.depositNegotiations.map((o) =>
        o.id === offer.id || o.id === offer.requestId
          ? { ...o, status: 'accepted' }
          : o,
      ),
    ),
  };
}
