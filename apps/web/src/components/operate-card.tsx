interface OperateCardProps {
  selectedSessionId: string;
  currentRound?: number;
  turnCount: number;
  isRunning: boolean;
  isAdvancing: boolean;
  runError?: string;
  advanceError?: string;
  onTurnCountChange: (value: number) => void;
  onRunTurns: () => void;
  onAdvanceRound: () => void;
  interestRateBps: string;
  onInterestRateBpsChange: (value: string) => void;
}
export function OperateCard(props: OperateCardProps) {
  return (
    <section className="operate-toolbar" aria-label="Run controls">
      <div className="run-controls panel">
        <h2>Run turns</h2>
        <label className="field turn-field">
          <span>
            Turn count <small>1–10</small>
          </span>
          <input
            type="number"
            aria-label="Turn count"
            min={1}
            max={10}
            value={props.turnCount}
            onChange={(event) =>
              props.onTurnCountChange(
                Math.min(
                  10,
                  Math.max(1, Number.parseInt(event.target.value || '1', 10)),
                ),
              )
            }
          />
        </label>
        <div className="turn-preset-row">
          {[1, 2, 4, 8].map((count) => (
            <button
              type="button"
              key={count}
              className={
                count === props.turnCount ? 'turn-preset active' : 'turn-preset'
              }
              aria-label={`${count} turn${count === 1 ? '' : 's'}`}
              aria-pressed={count === props.turnCount}
              onClick={() => props.onTurnCountChange(count)}
            >
              {count}
            </button>
          ))}
        </div>
        <button
          className="action-button primary"
          type="button"
          disabled={
            !props.selectedSessionId || props.isRunning || props.isAdvancing
          }
          onClick={props.onRunTurns}
        >
          {props.isRunning
            ? `Running ${props.turnCount} turns…`
            : `Run next ${props.turnCount} turn${props.turnCount === 1 ? '' : 's'}`}
        </button>
      </div>
      <div className="advance-controls panel">
        <h2>Advance round</h2>
        <div className="round-options">
          <label className="field">
            <span>Treasury interest per round (bps)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={props.interestRateBps}
              onChange={(event) =>
                props.onInterestRateBpsChange(event.target.value)
              }
            />
          </label>
        </div>
        <button
          className="action-button secondary"
          type="button"
          disabled={
            !props.selectedSessionId || props.isRunning || props.isAdvancing
          }
          onClick={props.onAdvanceRound}
        >
          {props.isAdvancing ? 'Advancing round…' : 'Advance round settlement'}
        </button>
        <small>
          Turns stay in this round. Advance to apply interest and eligible
          settlements.
        </small>
      </div>
      {props.runError && (
        <p className="error-copy" role="alert">
          {props.runError}
        </p>
      )}
      {props.advanceError && (
        <p className="error-copy" role="alert">
          {props.advanceError}
        </p>
      )}
    </section>
  );
}
