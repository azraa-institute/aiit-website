import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type {
  InstructorAnnouncement,
  InstructorAssignment,
  InstructorCourse,
  InstructorQuizDetail,
  InstructorQuizQuestion,
  InstructorQuizSummary,
  RosterStudent,
} from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiFetch } from '@/lib/useApiFetch';
import { formatWhen, fromLocalInput, toLocalInput } from '@/pages/admin/adminData';

type Tab = 'students' | 'assignments' | 'practice' | 'announcements';

function StudentsTab({ courseId }: { courseId: string }) {
  const state = useApiFetch<RosterStudent[]>(`/instructor/courses/${courseId}/students`);
  if (state.status === 'loading') return <p className="adm-muted">Loading students…</p>;
  if (state.status === 'error') return <p className="adm-error" role="alert">{state.message}</p>;
  if (state.data.length === 0) return <p className="adm-muted">No students are enrolled yet.</p>;

  return (
    <div className="adm-tablewrap">
      <table className="adm-table adm-table--rows">
        <thead>
          <tr>
            <th>Student</th>
            <th>Email</th>
            <th>Time zone</th>
            <th className="num">Classes attended</th>
            <th className="num">Handed in</th>
            <th className="num">Graded</th>
          </tr>
        </thead>
        <tbody>
          {state.data.map((s) => (
            <tr key={s.id}>
              <td>
                {s.name ?? 'No name yet'}
                {s.suspended ? <span className="adm-status adm-status--suspended">suspended</span> : null}
              </td>
              <td>{s.email ?? '—'}</td>
              <td>{s.timeZone ?? '—'}</td>
              <td className="num">
                {s.classesAttended} / {s.classesHeld}
              </td>
              <td className="num">{s.assignmentsSubmitted}</td>
              <td className="num">{s.assignmentsGraded}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface AssignmentForm {
  id?: string;
  title: string;
  description: string;
  dueAt: string;
}

function AssignmentsTab({ courseId }: { courseId: string }) {
  const state = useApiFetch<InstructorAssignment[]>(`/instructor/courses/${courseId}/assignments`);
  const [form, setForm] = useState<AssignmentForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(undefined);
    const body = {
      title: form.title,
      description: form.description,
      dueAt: form.dueAt ? fromLocalInput(form.dueAt) : null,
    };
    try {
      if (form.id) await apiFetch(`/instructor/assignments/${form.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      else await apiFetch(`/instructor/courses/${courseId}/assignments`, { method: 'POST', body: JSON.stringify(body) });
      setForm(null);
      state.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the assignment.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setError(undefined);
    try {
      await apiFetch(`/instructor/assignments/${id}`, { method: 'DELETE' });
      setConfirmDelete(null);
      state.reload();
    } catch (err) {
      setConfirmDelete(null);
      setError(err instanceof Error ? err.message : 'Could not delete the assignment.');
    }
  }

  return (
    <>
      {!form ? (
        <div className="adm-actions adm-actions--top">
          <button type="button" className="adm-btn adm-btn--primary" onClick={() => { setForm({ title: '', description: '', dueAt: '' }); setError(undefined); }}>
            New assignment
          </button>
        </div>
      ) : (
        <form className="adm-form" onSubmit={save}>
          <h2 className="adm-form__title">{form.id ? 'Edit assignment' : 'New assignment'}</h2>
          <div className="adm-grid">
            <label className="adm-field adm-field--wide">
              <span>Title</span>
              <input required minLength={2} maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="adm-field adm-field--wide">
              <span>What students should do</span>
              <textarea required rows={5} maxLength={5000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
            <label className="adm-field">
              <span>Due (optional, your time zone)</span>
              <input type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
            </label>
          </div>
          {!form.id ? <p className="adm-muted">Enrolled students are notified as soon as you create it.</p> : null}
          {error ? <p className="adm-error" role="alert">{error}</p> : null}
          <div className="adm-actions">
            <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create assignment'}
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" disabled={saving} onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && !form ? <p className="adm-error" role="alert">{error}</p> : null}
      {state.status === 'loading' ? <p className="adm-muted">Loading assignments…</p> : null}
      {state.status === 'error' ? <p className="adm-error" role="alert">{state.message}</p> : null}
      {state.status === 'ready' && state.data.length === 0 && !form ? (
        <p className="adm-muted">No assignments yet. Create the first one to give your students work.</p>
      ) : null}
      {state.status === 'ready' && state.data.length > 0 ? (
        <ul className="adm-list" role="list">
          {state.data.map((a) => (
            <li className="adm-card" key={a.id}>
              <div className="adm-card__main">
                <h3>
                  <Link to={`/instructor/assignments/${a.id}`}>{a.title}</Link>
                </h3>
                <p className="adm-card__meta">
                  {a.dueAt ? `Due ${formatWhen(a.dueAt)}` : 'No deadline'} · {a.submitted} of {a.enrolled} handed in · {a.graded} graded
                </p>
              </div>
              <div className="adm-card__actions">
                {confirmDelete === a.id ? (
                  <>
                    <span className="adm-muted">Delete this assignment?</span>
                    <button type="button" className="adm-btn adm-btn--danger" onClick={() => remove(a.id)}>
                      Delete
                    </button>
                    <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setConfirmDelete(null)}>
                      Keep
                    </button>
                  </>
                ) : (
                  <>
                    <Link to={`/instructor/assignments/${a.id}`} className="adm-btn adm-btn--primary">
                      Submissions
                    </Link>
                    <button
                      type="button"
                      className="adm-btn adm-btn--ghost"
                      onClick={() => { setForm({ id: a.id, title: a.title, description: a.description, dueAt: a.dueAt ? toLocalInput(a.dueAt) : '' }); setError(undefined); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    >
                      Edit
                    </button>
                    <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setConfirmDelete(a.id)}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

interface QuizForm {
  id?: string;
  title: string;
  description: string;
  questions: InstructorQuizQuestion[];
}

const EMPTY_QUESTION = (): InstructorQuizQuestion => ({
  prompt: '',
  options: [
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
  ],
});

function QuizzesTab({ courseId }: { courseId: string }) {
  const state = useApiFetch<InstructorQuizSummary[]>(`/instructor/courses/${courseId}/quizzes`);
  const [form, setForm] = useState<QuizForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [error, setError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function newQuiz() {
    setForm({ title: '', description: '', questions: [EMPTY_QUESTION()] });
    setError(undefined);
  }

  async function editQuiz(id: string) {
    setLoadingQuiz(true);
    setError(undefined);
    try {
      const quiz = await apiFetch<InstructorQuizDetail>(`/instructor/quizzes/${id}`);
      setForm({ id: quiz.id, title: quiz.title, description: quiz.description ?? '', questions: quiz.questions });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load that quiz.');
    } finally {
      setLoadingQuiz(false);
    }
  }

  function updateQuestion(qi: number, patch: Partial<InstructorQuizQuestion>) {
    if (!form) return;
    const questions = form.questions.map((q, i) => (i === qi ? { ...q, ...patch } : q));
    setForm({ ...form, questions });
  }

  function updateOption(qi: number, oi: number, text: string) {
    if (!form) return;
    const questions = form.questions.map((q, i) =>
      i === qi ? { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, text } : o)) } : q,
    );
    setForm({ ...form, questions });
  }

  function setCorrectOption(qi: number, oi: number) {
    if (!form) return;
    const questions = form.questions.map((q, i) =>
      i === qi ? { ...q, options: q.options.map((o, j) => ({ ...o, isCorrect: j === oi })) } : q,
    );
    setForm({ ...form, questions });
  }

  function addOption(qi: number) {
    if (!form) return;
    updateQuestion(qi, { options: [...form.questions[qi].options, { text: '', isCorrect: false }] });
  }

  function removeOption(qi: number, oi: number) {
    if (!form || form.questions[qi].options.length <= 2) return;
    const options = form.questions[qi].options.filter((_, j) => j !== oi);
    if (!options.some((o) => o.isCorrect)) options[0].isCorrect = true;
    updateQuestion(qi, { options });
  }

  function addQuestion() {
    if (!form) return;
    setForm({ ...form, questions: [...form.questions, EMPTY_QUESTION()] });
  }

  function removeQuestion(qi: number) {
    if (!form || form.questions.length <= 1) return;
    setForm({ ...form, questions: form.questions.filter((_, i) => i !== qi) });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(undefined);
    const body = {
      title: form.title,
      description: form.description || undefined,
      questions: form.questions.map((q) => ({ prompt: q.prompt, options: q.options })),
    };
    try {
      if (form.id) await apiFetch(`/instructor/quizzes/${form.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      else await apiFetch(`/instructor/courses/${courseId}/quizzes`, { method: 'POST', body: JSON.stringify(body) });
      setForm(null);
      state.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this quiz.');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setError(undefined);
    try {
      await apiFetch(`/instructor/quizzes/${id}`, { method: 'DELETE' });
      setConfirmDelete(null);
      state.reload();
    } catch (err) {
      setConfirmDelete(null);
      setError(err instanceof Error ? err.message : 'Could not delete this quiz.');
    }
  }

  return (
    <>
      {!form ? (
        <div className="adm-actions adm-actions--top">
          <button type="button" className="adm-btn adm-btn--primary" disabled={loadingQuiz} onClick={newQuiz}>
            New practice quiz
          </button>
        </div>
      ) : (
        <form className="adm-form" onSubmit={save}>
          <h2 className="adm-form__title">{form.id ? 'Edit practice quiz' : 'New practice quiz'}</h2>
          <p className="adm-muted">Not graded. Students can take it as many times as they like.</p>
          <div className="adm-grid">
            <label className="adm-field adm-field--wide">
              <span>Title</span>
              <input required minLength={2} maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="adm-field adm-field--wide">
              <span>Description (optional)</span>
              <textarea rows={2} maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
          </div>

          {form.questions.map((q, qi) => (
            <fieldset key={qi} className="adm-slots">
              <legend>Question {qi + 1}</legend>
              <label className="adm-field adm-field--wide">
                <span>Prompt</span>
                <textarea
                  required
                  rows={2}
                  maxLength={500}
                  value={q.prompt}
                  onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
                />
              </label>
              {q.options.map((o, oi) => (
                <div key={oi} className="adm-slot">
                  <input
                    type="radio"
                    name={`correct-${qi}`}
                    checked={o.isCorrect}
                    onChange={() => setCorrectOption(qi, oi)}
                    aria-label={`Option ${oi + 1} is correct`}
                  />
                  <input
                    required
                    maxLength={300}
                    placeholder={`Option ${oi + 1}`}
                    value={o.text}
                    onChange={(e) => updateOption(qi, oi, e.target.value)}
                  />
                  {q.options.length > 2 ? (
                    <button type="button" className="adm-btn adm-btn--ghost" onClick={() => removeOption(qi, oi)}>
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
              <div className="adm-actions">
                <button type="button" className="adm-btn adm-btn--ghost" onClick={() => addOption(qi)}>
                  Add option
                </button>
                {form.questions.length > 1 ? (
                  <button type="button" className="adm-btn adm-btn--ghost" onClick={() => removeQuestion(qi)}>
                    Remove question
                  </button>
                ) : null}
              </div>
            </fieldset>
          ))}

          <div className="adm-actions">
            <button type="button" className="adm-btn adm-btn--ghost" onClick={addQuestion}>
              Add question
            </button>
          </div>

          {error ? <p className="adm-error" role="alert">{error}</p> : null}
          <div className="adm-actions">
            <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
              {saving ? 'Saving…' : form.id ? 'Save changes' : 'Create quiz'}
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" disabled={saving} onClick={() => setForm(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && !form ? <p className="adm-error" role="alert">{error}</p> : null}
      {state.status === 'loading' ? <p className="adm-muted">Loading practice quizzes…</p> : null}
      {state.status === 'error' ? <p className="adm-error" role="alert">{state.message}</p> : null}
      {state.status === 'ready' && state.data.length === 0 && !form ? (
        <p className="adm-muted">No practice quizzes yet. Create the first one for your students to self-check their learning.</p>
      ) : null}
      {state.status === 'ready' && state.data.length > 0 ? (
        <ul className="adm-list" role="list">
          {state.data.map((q) => (
            <li className="adm-card" key={q.id}>
              <div className="adm-card__main">
                <h3>{q.title}</h3>
                <p className="adm-card__meta">
                  {q.questionCount} question{q.questionCount === 1 ? '' : 's'} · {q.attempts} attempt{q.attempts === 1 ? '' : 's'}
                </p>
              </div>
              <div className="adm-card__actions">
                {confirmDelete === q.id ? (
                  <>
                    <span className="adm-muted">Delete this quiz?</span>
                    <button type="button" className="adm-btn adm-btn--danger" onClick={() => remove(q.id)}>
                      Delete
                    </button>
                    <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setConfirmDelete(null)}>
                      Keep
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="adm-btn adm-btn--primary" disabled={loadingQuiz} onClick={() => editQuiz(q.id)}>
                      Edit
                    </button>
                    <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setConfirmDelete(q.id)}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

function AnnouncementsTab({ courseId }: { courseId: string }) {
  const state = useApiFetch<InstructorAnnouncement[]>(`/instructor/courses/${courseId}/announcements`);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  async function send(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const a = await apiFetch<InstructorAnnouncement>(`/instructor/courses/${courseId}/announcements`, {
        method: 'POST',
        body: JSON.stringify({ title, body }),
      });
      setNotice(`Sent to ${a.recipientCount} student${a.recipientCount === 1 ? '' : 's'}.`);
      setTitle('');
      setBody('');
      state.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the announcement.');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <form className="adm-form" onSubmit={send}>
        <h2 className="adm-form__title">Announce to this course</h2>
        <p className="adm-muted">Every enrolled student gets a notification in their portal.</p>
        <div className="adm-grid">
          <label className="adm-field adm-field--wide">
            <span>Title</span>
            <input required minLength={2} maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="adm-field adm-field--wide">
            <span>Message</span>
            <textarea required rows={4} maxLength={3000} value={body} onChange={(e) => setBody(e.target.value)} />
          </label>
        </div>
        {error ? <p className="adm-error" role="alert">{error}</p> : null}
        {notice ? <p className="adm-notice" role="status">{notice}</p> : null}
        <div className="adm-actions">
          <button type="submit" className="adm-btn adm-btn--primary" disabled={sending}>
            {sending ? 'Sending…' : 'Send announcement'}
          </button>
        </div>
      </form>

      {state.status === 'ready' && state.data.length > 0 ? (
        <ul className="adm-list" role="list">
          {state.data.map((a) => (
            <li className="adm-card" key={a.id}>
              <div className="adm-card__main">
                <h3>{a.title}</h3>
                <p className="adm-card__meta">
                  {formatWhen(a.createdAt)} · sent to {a.recipientCount} student{a.recipientCount === 1 ? '' : 's'}
                </p>
                <p className="adm-prewrap">{a.body}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}

export default function InstructorCoursePage() {
  const { courseId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'students';
  const courses = useApiFetch<InstructorCourse[]>('/instructor/courses');
  const course = courses.status === 'ready' ? courses.data.find((c) => c.id === courseId) : undefined;

  if (courses.status === 'loading') return <p className="adm-muted">Loading…</p>;
  if (courses.status === 'error') return <p className="adm-error" role="alert">{courses.message}</p>;
  if (!course) {
    return (
      <div className="adm-page">
        <p className="adm-notice">You do not teach this course.</p>
        <Link to="/instructor/courses" className="adm-btn adm-btn--ghost">
          Back to my courses
        </Link>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'students', label: `Students (${course.enrolled})` },
    { id: 'assignments', label: `Assignments (${course.assignments})` },
    { id: 'practice', label: `Practice (${course.quizzes})` },
    { id: 'announcements', label: 'Announcements' },
  ];

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">
            <Link to="/instructor/courses">My courses</Link> /
          </p>
          <h1 className="adm-title">{course.title}</h1>
        </div>
      </div>

      <div className="adm-tabs" role="tablist" aria-label="Course sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={cn(tab === t.id && 'is-active')}
            onClick={() => setParams({ tab: t.id }, { replace: true })}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'students' ? <StudentsTab courseId={course.id} /> : null}
      {tab === 'assignments' ? <AssignmentsTab courseId={course.id} /> : null}
      {tab === 'practice' ? <QuizzesTab courseId={course.id} /> : null}
      {tab === 'announcements' ? <AnnouncementsTab courseId={course.id} /> : null}
    </div>
  );
}
