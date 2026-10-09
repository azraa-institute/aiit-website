import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { QuizAttemptResult, QuizDetail, QuizSummary } from '@aiit/shared';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { apiFetch } from '@/lib/api';
import { useApiFetch } from '@/lib/useApiFetch';
import { Button } from '@/components/primitives/Button';
import { PortalEmpty } from './PortalEmpty';
import { PortalLoader } from './PortalLoader';
import './practice.css';

function QuizCard({ quiz, onOpen }: { quiz: QuizSummary; onOpen: () => void }) {
  return (
    <li className="practice-card">
      <div className="practice-card__main">
        <p className="practice-card__course">{quiz.course.title}</p>
        <h3 className="practice-card__title">{quiz.title}</h3>
        {quiz.description ? <p className="practice-card__desc">{quiz.description}</p> : null}
        <p className="practice-card__meta">
          {quiz.questionCount} question{quiz.questionCount === 1 ? '' : 's'}
          {quiz.bestScorePct !== null ? ` · Best score ${quiz.bestScorePct}%` : ''}
        </p>
      </div>
      <Button as="button" variant="secondary" onClick={onOpen}>
        {quiz.attempts > 0 ? 'Retake' : 'Start'}
      </Button>
    </li>
  );
}

function QuizRunner({ quizId, onExit }: { quizId: string; onExit: () => void }) {
  const state = useApiFetch<QuizDetail>(`/practice/${quizId}`);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  if (state.status === 'loading') return <PortalLoader label="Loading quiz" />;
  if (state.status === 'error') {
    return (
      <PortalEmpty title="Couldn't load this quiz" body={state.message} action={{ label: 'Back to Practice', to: '/portal/practice' }} />
    );
  }

  const quiz = state.data;
  const allAnswered = quiz.questions.every((q) => answers[q.id]);

  async function submit() {
    setSubmitting(true);
    setError(undefined);
    try {
      const payload = { answers: Object.entries(answers).map(([questionId, optionId]) => ({ questionId, optionId })) };
      const res = await apiFetch<QuizAttemptResult>(`/practice/${quizId}/attempts`, { method: 'POST', body: JSON.stringify(payload) });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your answers.');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const byQuestion = new Map(result.results.map((r) => [r.questionId, r]));
    return (
      <div className="practice-run">
        <button type="button" className="practice-run__back" onClick={onExit}>
          &larr; Back to Practice
        </button>
        <h1 className="practice-run__title">{quiz.title}</h1>
        <p className="practice-result__score">
          You scored <strong>{result.scorePct}%</strong> ({result.correctCount} of {result.totalQuestions} correct)
        </p>
        <ol className="practice-questions">
          {quiz.questions.map((q, i) => {
            const r = byQuestion.get(q.id);
            return (
              <li key={q.id} className="practice-question">
                <p className="practice-question__prompt">
                  {i + 1}. {q.prompt}
                </p>
                <ul className="practice-options">
                  {q.options.map((o) => {
                    const isSelected = r?.selectedOptionId === o.id;
                    const isCorrect = r?.correctOptionId === o.id;
                    return (
                      <li
                        key={o.id}
                        className={`practice-option practice-option--result${isCorrect ? ' is-correct' : ''}${isSelected && !isCorrect ? ' is-wrong' : ''}`}
                      >
                        {o.text}
                        {isCorrect ? ' ✓' : isSelected ? ' ✗' : ''}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
        <Button as="button" onClick={onExit}>
          Back to Practice
        </Button>
      </div>
    );
  }

  return (
    <div className="practice-run">
      <button type="button" className="practice-run__back" onClick={onExit}>
        &larr; Back to Practice
      </button>
      <h1 className="practice-run__title">{quiz.title}</h1>
      {quiz.description ? <p className="practice-run__desc">{quiz.description}</p> : null}
      {error ? (
        <p className="auth__alert" role="alert">
          {error}
        </p>
      ) : null}
      <ol className="practice-questions">
        {quiz.questions.map((q, i) => (
          <li key={q.id} className="practice-question">
            <p className="practice-question__prompt">
              {i + 1}. {q.prompt}
            </p>
            <ul className="practice-options">
              {q.options.map((o) => (
                <li key={o.id}>
                  <label className={`practice-option${answers[q.id] === o.id ? ' is-selected' : ''}`}>
                    <input
                      type="radio"
                      name={q.id}
                      value={o.id}
                      checked={answers[q.id] === o.id}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                    />
                    {o.text}
                  </label>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <Button as="button" onClick={submit} loading={submitting} disabled={!allAnswered}>
        Submit answers
      </Button>
    </div>
  );
}

export default function PracticePage() {
  const state = useApiFetch<QuizSummary[]>('/me/practice');
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  useScrollReveal([state.status, activeQuizId]);

  if (state.status === 'loading') return <PortalLoader label="Loading your practice quizzes" />;
  if (state.status === 'error') return null;

  if (activeQuizId) {
    return (
      <div className="portal-page">
        <QuizRunner quizId={activeQuizId} onExit={() => setActiveQuizId(null)} />
      </div>
    );
  }

  const quizzes = state.data;
  const byCourse = new Map<string, QuizSummary[]>();
  for (const q of quizzes) byCourse.set(q.course.title, [...(byCourse.get(q.course.title) ?? []), q]);

  return (
    <div className="portal-page">
      <header className="portal-page__head" data-reveal>
        <p className="portal-eyebrow">Practice</p>
        <h1 className="portal-page__title">Practice quizzes</h1>
        <p className="portal-page__intro">
          Low-stakes self-checks between live sessions, not graded, take them as many times as you like.
        </p>
      </header>

      {quizzes.length === 0 ? (
        <PortalEmpty
          title="No practice quizzes yet"
          body="Once your instructor adds a practice quiz to a course you're enrolled in, it will appear here."
          action={{ label: 'Browse your courses', to: '/portal/courses' }}
        />
      ) : (
        [...byCourse.entries()].map(([courseTitle, items]) => (
          <section key={courseTitle} className="portal-section" data-reveal>
            <p className="portal-eyebrow">{courseTitle}</p>
            <ul className="practice-list" role="list">
              {items.map((q) => (
                <QuizCard key={q.id} quiz={q} onOpen={() => setActiveQuizId(q.id)} />
              ))}
            </ul>
          </section>
        ))
      )}

      <p className="settings__foot" data-reveal>
        Not finding what you&apos;re looking for? <Link to="/portal/support">Contact the AIIT team</Link>.
      </p>
    </div>
  );
}
