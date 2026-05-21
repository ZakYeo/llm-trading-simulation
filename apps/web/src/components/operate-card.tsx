import { useState } from 'react';

import {
  CardBody,
  CardCollapseButton,
  CardHeader,
  CardShell,
} from './card-shell';

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
}

export function OperateCard({
  selectedSessionId,
  currentRound,
  turnCount,
  isRunning,
  isAdvancing,
  runError,
  advanceError,
  onTurnCountChange,
  onRunTurns,
  onAdvanceRound,
}: OperateCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const normalizedTurnCount = Number.isNaN(turnCount)
    ? 1
    : Math.min(10, Math.max(1, turnCount));

  return (
    <CardShell className="rail-card">
      <CardHeader
        kicker="Controls"
        title="Run Controls"
        compact
        icon="play_circle"
        iconTone="primary"
        actions={
          <>
            <span className="status-chip muted">Round {currentRound ?? 1}</span>
            <CardCollapseButton
              isExpanded={isExpanded}
              expandLabel="Maximise operate section"
              collapseLabel="Minimise operate section"
              onToggle={() => setIsExpanded((current) => !current)}
            />
          </>
        }
      />

      <CardBody isExpanded={isExpanded}>
        <>
          <label className="field">
            <span>Turn count</span>
            <input
              type="number"
              min={1}
              max={10}
              value={normalizedTurnCount}
              onChange={(event) =>
                onTurnCountChange(
                  Number.parseInt(event.target.value || '1', 10),
                )
              }
            />
          </label>

          <div className="turn-preset-row">
            {[1, 2, 4, 8].map((preset) => (
              <button
                key={preset}
                className={
                  preset === normalizedTurnCount
                    ? 'turn-preset active'
                    : 'turn-preset'
                }
                type="button"
                onClick={() => onTurnCountChange(preset)}
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="action-stack">
            <button
              className="action-button primary"
              type="button"
              disabled={!selectedSessionId || isRunning}
              onClick={onRunTurns}
            >
              {isRunning
                ? `Running ${normalizedTurnCount} turn${normalizedTurnCount === 1 ? '' : 's'}...`
                : `Run next ${normalizedTurnCount} turn${normalizedTurnCount === 1 ? '' : 's'}`}
            </button>

            <button
              className="action-button secondary"
              type="button"
              disabled={!selectedSessionId || isAdvancing}
              onClick={onAdvanceRound}
            >
              {isAdvancing ? 'Advancing round...' : 'Advance round settlement'}
            </button>
          </div>

          {runError ? <p className="error-copy">{runError}</p> : null}
          {advanceError ? <p className="error-copy">{advanceError}</p> : null}
        </>
      </CardBody>
    </CardShell>
  );
}
