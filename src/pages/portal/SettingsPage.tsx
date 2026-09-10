import { Link } from 'react-router-dom';
import { useScrollReveal } from '@/lib/useScrollReveal';

const SETTINGS = [
  {
    title: 'Sign-in & security',
    body: 'Email address and password for your AIIT account.',
  },
  {
    title: 'Region & language',
    body: 'Your country and preferred language, used for pricing and scheduling.',
  },
  {
    title: 'Notifications',
    body: 'Choose which course, certificate and webinar updates reach you by email.',
  },
  {
    title: 'Payment methods',
    body: 'Cards and billing details held for course enrolments.',
  },
];

export default function SettingsPage() {
  useScrollReveal([]);

  return (
    <div className="portal-page">
      <header className="portal-page__head" data-reveal>
        <p className="portal-eyebrow">Account settings</p>
        <h1 className="portal-page__title">Your account</h1>
        <p className="portal-page__intro">
          Account and billing settings are managed securely on the main AIIT account system. This is
          an overview of what you can change there.
        </p>
      </header>

      <ul className="settings" role="list" data-reveal>
        {SETTINGS.map((s) => (
          <li key={s.title} className="settings__row">
            <h2 className="settings__title">{s.title}</h2>
            <p className="settings__body">{s.body}</p>
          </li>
        ))}
      </ul>

      <p className="settings__foot" data-reveal>
        Need help with your account?{' '}
        <Link to="/contact">Contact the AIIT team</Link>.
      </p>
    </div>
  );
}
