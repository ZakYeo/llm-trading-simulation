import type { AgentRole } from '@llm-sim/shared-types';

const agentRoles: AgentRole[] = [
  'banker',
  'analyst',
  'lawyer',
  'influencer',
  'trader',
];

export function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Phase 0 Foundation</p>
        <h1>LLM Trading Simulation</h1>
        <p className="lede">
          A multi-agent negotiation and treasury simulator with MCP agents, a
          NestJS orchestrator, a bank service, and a replayable frontend.
        </p>
      </section>

      <section className="panel">
        <h2>Planned agents</h2>
        <div className="agent-grid">
          {agentRoles.map((role) => (
            <article key={role} className="agent-card">
              <span>{role}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
