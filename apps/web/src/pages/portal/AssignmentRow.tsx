import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Assignment } from '@aiit/shared';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/primitives/Button';
import { TextArea } from '@/components/common/Field';
import { apiFetch } from '@/lib/api';

const STATUS_LABEL: Record<Assignment['status'], string> = {
  upcoming: 'Upcoming',
  overdue: 'Overdue',
  submitted: 'Submitted',
  graded: 'Graded',
};

/** No MIME restriction -- a submission can legitimately be any document type. Mirrors the submissions bucket's own file_size_limit (see the storage_bucket_limits migration) and POST /assignments/:id/submissions's own server-side limit -- this is just the fast client-side rejection, both of those are the real enforcement. */
const SUBMISSION_MAX_BYTES = 25 * 1024 * 1024;

export function AssignmentRow({ assignment, onSubmitted }: { assignment: Assignment; onSubmitted: () => void }) {
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const canSubmit = assignment.status !== 'graded';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!note.trim() && !file) {
      setError('Add a note or attach a file before submitting.');
      return;
    }
    if (file && file.size > SUBMISSION_MAX_BYTES) {
      setError('That file is too large (max 25MB).');
      return;
    }

    setError(undefined);
    setSubmitting(true);
    try {
      const body = new FormData();
      if (file) body.append('file', file);
      if (note.trim()) body.append('note', note.trim());
      await apiFetch(`/assignments/${assignment.id}/submissions`, { method: 'POST', body });
      setNote('');
      setFile(null);
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit this assignment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li className="task" data-status={assignment.status} data-reveal>
      <div className="task__main">
        <p className="task__status">{STATUS_LABEL[assignment.status]}</p>
        <h2 className="task__title">{assignment.title}</h2>
        <p className="task__course">{assignment.course.title}</p>
        <p className="task__description">{assignment.description}</p>
      </div>

      <div className="task__side">
        <p className="task__meta">
          {assignment.status === 'graded' && assignment.submission?.grade
            ? `Grade: ${assignment.submission.grade}`
            : assignment.dueAt
              ? `Due ${formatDate(assignment.dueAt)}`
              : 'No due date'}
        </p>
        {assignment.status === 'graded' && assignment.submission?.feedback ? (
          <p className="task__feedback">{assignment.submission.feedback}</p>
        ) : null}
        {assignment.status === 'submitted' && assignment.submission?.submittedAt ? (
          <p className="task__submitted-note">Submitted {formatDate(assignment.submission.submittedAt)}</p>
        ) : null}

        {canSubmit ? (
          <form className="task__submit" onSubmit={handleSubmit}>
            {error ? (
              <p className="task__error" role="alert">
                {error}
              </p>
            ) : null}
            <TextArea
              label={assignment.submission ? 'Update your note' : 'Your note'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe what you did, or paste a link to your work"
            />
            <label className="task__file-label">
              Attach a file (optional)
              <input
                type="file"
                className="task__file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <Button as="button" type="submit" size="sm" loading={submitting}>
              {assignment.submission ? 'Resubmit' : 'Submit'}
            </Button>
          </form>
        ) : null}
      </div>
    </li>
  );
}
