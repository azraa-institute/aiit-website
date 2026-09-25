import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AssignmentSubmissions, SubmissionRow } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useApiFetch } from '@/lib/useApiFetch';
import { formatWhen } from '@/pages/admin/adminData';

const STATUS_LABEL: Record<SubmissionRow['status'], string> = {
  submitted: 'Needs grading',
  graded: 'Graded',
  not_submitted: 'Not handed in',
};

function GradeForm({ row, onSaved }: { row: SubmissionRow; onSaved: () => void }) {
  const [grade, setGrade] = useState(row.grade ?? '');
  const [feedback, setFeedback] = useState(row.feedback ?? '');
  const [saving, setSaving] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string>();

  async function openFile() {
    setOpening(true);
    setError(undefined);
    try {
      const { url } = await apiFetch<{ url: string; fileName: string }>(`/instructor/submissions/${row.submissionId}/file`);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the file.');
    } finally {
      setOpening(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      await apiFetch(`/instructor/submissions/${row.submissionId}/grade`, {
        method: 'PATCH',
        body: JSON.stringify({ grade, feedback: feedback || undefined }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the grade.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="adm-grade" onSubmit={save}>
      {row.note ? (
        <div>
          <p className="adm-eyebrow">Student&apos;s note</p>
          <p className="adm-prewrap">{row.note}</p>
        </div>
      ) : null}
      {row.hasFile ? (
        <button type="button" className="adm-btn adm-btn--ghost" disabled={opening} onClick={openFile}>
          {opening ? 'Opening…' : `Open file: ${row.fileName}`}
        </button>
      ) : (
        <p className="adm-muted">No file attached.</p>
      )}
      <div className="adm-grid">
        <label className="adm-field">
          <span>Grade (e.g. 85, A, Pass)</span>
          <input required maxLength={20} value={grade} onChange={(e) => setGrade(e.target.value)} />
        </label>
        <label className="adm-field adm-field--wide">
          <span>Feedback for the student (optional)</span>
          <textarea rows={3} maxLength={5000} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        </label>
      </div>
      {error ? <p className="adm-error" role="alert">{error}</p> : null}
      <div className="adm-actions">
        <button type="submit" className="adm-btn adm-btn--primary" disabled={saving || !grade.trim()}>
          {saving ? 'Saving…' : row.status === 'graded' ? 'Update grade' : 'Save grade'}
        </button>
      </div>
      <p className="adm-muted">The student is notified when you save.</p>
    </form>
  );
}

export default function InstructorAssignmentPage() {
  const { id = '' } = useParams();
  const state = useApiFetch<AssignmentSubmissions>(`/instructor/assignments/${id}/submissions`);
  const [open, setOpen] = useState<string | null>(null);

  if (state.status === 'loading') return <p className="adm-muted">Loading submissions…</p>;
  if (state.status === 'error') {
    return (
      <div className="adm-page">
        <p className="adm-error" role="alert">{state.message}</p>
        <Link to="/instructor/courses" className="adm-btn adm-btn--ghost">
          Back to my courses
        </Link>
      </div>
    );
  }
  const { assignment, rows } = state.data;

  return (
    <div className="adm-page">
      <div className="adm-page__head">
        <div>
          <p className="adm-eyebrow">
            <Link to={`/instructor/courses/${assignment.courseId}?tab=assignments`}>{assignment.courseTitle}</Link> /
          </p>
          <h1 className="adm-title">{assignment.title}</h1>
          <p className="adm-intro adm-prewrap">{assignment.description}</p>
          <p className="adm-muted">
            {assignment.dueAt ? `Due ${formatWhen(assignment.dueAt)}` : 'No deadline'} · {assignment.submitted} of {assignment.enrolled} handed in ·{' '}
            {assignment.graded} graded
          </p>
        </div>
      </div>

      {rows.length === 0 ? <p className="adm-muted">No students are enrolled in this course yet.</p> : null}

      <ul className="adm-list" role="list">
        {rows.map((r) => {
          const expandable = r.status !== 'not_submitted' && r.submissionId;
          const key = r.submissionId ?? r.studentId;
          return (
            <li className="adm-card adm-card--stack" key={key}>
              <div className="adm-card__row">
                <div className="adm-card__main">
                  <h3>
                    {r.studentName ?? 'No name yet'}{' '}
                    <span className={cn('adm-status', r.status === 'submitted' && 'adm-status--live')}>{STATUS_LABEL[r.status]}</span>
                  </h3>
                  <p className="adm-card__meta">
                    {r.studentEmail ?? '—'}
                    {r.submittedAt ? ` · handed in ${formatWhen(r.submittedAt)}` : ''}
                    {r.grade ? ` · grade ${r.grade}` : ''}
                  </p>
                </div>
                {expandable ? (
                  <div className="adm-card__actions">
                    <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setOpen(open === key ? null : key)}>
                      {open === key ? 'Close' : r.status === 'graded' ? 'View / edit grade' : 'Review and grade'}
                    </button>
                  </div>
                ) : null}
              </div>
              {open === key && expandable ? (
                <GradeForm
                  row={r}
                  onSaved={() => {
                    setOpen(null);
                    state.reload();
                  }}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
