import { Dialog } from '../../../shared/ui/dialog';
interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}
const helpSections = [
  {
    title: 'Start a session',
    body: 'Create a session with the starting balance and agent personalities you want, or connect to a saved session. The banker and traders negotiate independently.',
  },
  {
    title: 'Run turns',
    body: 'Choose 1–10 turns and run them at your own pace. Messages and actions appear in Simulation as they happen. Running turns does not advance the round.',
  },
  {
    title: 'Advance the round',
    body: 'Advance when you want to apply custody interest and settle eligible market positions. You can adjust the interest rate in Round options before advancing.',
  },
  {
    title: 'Follow the finances',
    body: 'Finances shows account balances, custody principal and interest, opportunities, and market positions. Open an item to inspect its details.',
  },
  {
    title: 'Review the history',
    body: 'History contains the complete audit trail. Filter by treasury, market, messages, actions or transfers, and choose an event or round window.',
  },
];
export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;
  return (
    <Dialog title="A guide to your trading journal" onClose={onClose}>
      <p className="help-intro">
        A simulation of negotiation, trust, and financial decisions. You set the
        pace; the agents make the choices.
      </p>
      <div className="help-grid">
        {helpSections.map((section, index) => (
          <section key={section.title} className="help-card">
            <h3>
              <span className="help-number">0{index + 1}</span>
              {section.title}
            </h3>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
