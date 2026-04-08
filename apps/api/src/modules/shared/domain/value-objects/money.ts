import { DomainInvariantError } from '../errors/domain-invariant.error.js';

const SCALE = 10_000n;

function normalizeFraction(fraction: string): string {
  return fraction.padEnd(4, '0').slice(0, 4);
}

export class Money {
  private constructor(private readonly minorUnits: bigint) {}

  static zero(): Money {
    return new Money(0n);
  }

  static fromDecimal(value: string): Money {
    if (!/^-?\d+(\.\d{1,4})?$/.test(value)) {
      throw new DomainInvariantError(
        `Money values must have at most 4 decimal places: ${value}`,
      );
    }

    const isNegative = value.startsWith('-');
    const normalized = isNegative ? value.slice(1) : value;
    const [whole, fraction = ''] = normalized.split('.');
    const units =
      BigInt(whole) * SCALE + BigInt(normalizeFraction(fraction || '0'));

    return new Money(isNegative ? -units : units);
  }

  static fromMinorUnits(value: bigint): Money {
    return new Money(value);
  }

  add(other: Money): Money {
    return new Money(this.minorUnits + other.minorUnits);
  }

  subtract(other: Money): Money {
    return new Money(this.minorUnits - other.minorUnits);
  }

  multiplyBps(rateBps: number): Money {
    if (!Number.isInteger(rateBps) || rateBps < 0) {
      throw new DomainInvariantError(
        'Basis points must be a non-negative integer.',
      );
    }

    return new Money((this.minorUnits * BigInt(rateBps)) / 10_000n);
  }

  greaterThan(other: Money): boolean {
    return this.minorUnits > other.minorUnits;
  }

  greaterThanOrEqual(other: Money): boolean {
    return this.minorUnits >= other.minorUnits;
  }

  isNegative(): boolean {
    return this.minorUnits < 0;
  }

  isZero(): boolean {
    return this.minorUnits === 0n;
  }

  toMinorUnits(): bigint {
    return this.minorUnits;
  }

  toDecimal(): string {
    const sign = this.minorUnits < 0 ? '-' : '';
    const absolute = this.minorUnits < 0 ? -this.minorUnits : this.minorUnits;
    const whole = absolute / SCALE;
    const fraction = (absolute % SCALE).toString().padStart(4, '0');

    return `${sign}${whole.toString()}.${fraction}`;
  }
}
