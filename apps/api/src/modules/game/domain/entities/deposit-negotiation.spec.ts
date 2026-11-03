import { describe, it, expect } from 'vitest';
import { GameSession } from './game-session.js';
import { GameAgent } from './game-agent.js';
import { AccountBalance } from './account-balance.js';
import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { negotiateDeposit, acceptDepositOffer } from './deposit-negotiation.js';
import { BankerCustodyPosition } from './banker-custody-position.js';

const money = Money.fromDecimal;
function session() {
  return new GameSession({
    id: 'game',
    name: 'Negotiation',
    status: 'active',
    currentRound: 1,
    agents: ['banker', 'trader'].map(
      (role) =>
        new GameAgent({
          id: role,
          name: role,
          role: role as 'banker' | 'trader',
          balance: AccountBalance.open(money('100')),
          depositAccount: DepositAccount.open(),
        }),
    ),
  });
}
function requested() {
  return negotiateDeposit(session(), 'request', 'trader', 'banker', {
    requestAmount: '20',
  });
}
function quoted(rateBps = 150) {
  return negotiateDeposit(requested(), 'offer', 'banker', 'trader', {
    requestId: 'request',
    offerAmount: '20',
    rateBps,
  });
}
describe('Negotiated deposits', () => {
  it('requires a trader request before a banker can offer terms', () => {
    expect(() =>
      negotiateDeposit(session(), 'offer', 'banker', 'trader', {
        requestId: 'missing',
        offerAmount: '20',
        rateBps: 100,
      }),
    ).toThrow('request');
    expect(() =>
      negotiateDeposit(session(), 'request', 'banker', 'trader', {
        requestAmount: '20',
      }),
    ).toThrow('trader');
  });
  it.each([-1, 251, 1.5, NaN])('rejects rate %s', (rate) =>
    expect(() => quoted(rate)).toThrow('basis points'),
  );
  it.each([0, 250])('accepts inclusive boundary %s', (rate) =>
    expect(quoted(rate).depositNegotiations[1]?.rateBps).toBe(rate),
  );
  it('requires an exact amount and matching participants, rejects missing/expired/reused offers', () => {
    const s = quoted();
    for (const [id, trader, banker, amount] of [
      ['missing', 'trader', 'banker', '20'],
      ['offer', 'other', 'banker', '20'],
      ['offer', 'trader', 'other', '20'],
      ['offer', 'trader', 'banker', '21'],
    ])
      expect(() =>
        acceptDepositOffer(s, id, trader!, banker!, money(amount!)),
      ).toThrow('current');
    expect(() =>
      acceptDepositOffer(
        s.advanceRound(),
        'offer',
        'trader',
        'banker',
        money('20'),
      ),
    ).toThrow();
    const accepted = acceptDepositOffer(
      s,
      'offer',
      'trader',
      'banker',
      money('20'),
    );
    expect(() =>
      acceptDepositOffer(
        accepted.session,
        'offer',
        'trader',
        'banker',
        money('20'),
      ),
    ).toThrow();
  });
  it('supersedes revised quotes and rejects declined quotes', () => {
    const revised = negotiateDeposit(quoted(), 'offer2', 'banker', 'trader', {
      requestId: 'request',
      offerAmount: '20',
      rateBps: 200,
    });
    expect(() =>
      acceptDepositOffer(revised, 'offer', 'trader', 'banker', money('20')),
    ).toThrow();
    const declined = negotiateDeposit(revised, 'decline', 'trader', 'banker', {
      declineOfferId: 'offer2',
    });
    expect(() =>
      acceptDepositOffer(declined, 'offer2', 'trader', 'banker', money('20')),
    ).toThrow();
  });
});
describe('Custody deposit lots', () => {
  function empty() {
    return new BankerCustodyPosition({
      bankerAgentId: 'banker',
      ownerAgentId: 'trader',
      principal: money('0'),
      accruedInterest: money('0'),
    });
  }
  it('locks independent rates and accrues simple interest with a banker spread', () => {
    const p = empty()
      .placeFunds(money('20'), 100, 'first')
      .placeFunds(money('10'), 250, 'second');
    expect(p.interestForNextRound().toDecimal()).toBe('0.4500');
    expect(
      p.grossYieldForNextRound().subtract(p.interestForNextRound()).toDecimal(),
    ).toBe('0.3000');
    expect(p.accrue().accrue().accruedInterest.toDecimal()).toBe('0.9000');
  });
  it('withdraws interest first then oldest principal, preserving the remaining rate', () => {
    const p = empty()
      .placeFunds(money('20'), 100)
      .placeFunds(money('10'), 250)
      .accrue()
      .redeemFunds(money('25.45'));
    expect(p.lots).toEqual([{ principal: '5.0000', rateBps: 250 }]);
    expect(p.accruedInterest.toDecimal()).toBe('0.0000');
    expect(p.interestForNextRound().toDecimal()).toBe('0.1250');
  });
  it('preserves legacy principal and accrued interest at 250 bps', () => {
    const p = new BankerCustodyPosition({
      bankerAgentId: 'banker',
      ownerAgentId: 'trader',
      principal: money('10'),
      accruedInterest: money('1'),
    });
    expect(p.accrue().totalBalance().toDecimal()).toBe('11.2500');
  });
  it('handles zero-rate deposits and rejects excess withdrawals', () => {
    const p = empty().placeFunds(money('10'), 0).accrue();
    expect(p.accruedInterest.toDecimal()).toBe('0.0000');
    expect(p.grossYieldForNextRound().toDecimal()).toBe('0.2500');
    expect(() => p.redeemFunds(money('11'))).toThrow();
  });
});
