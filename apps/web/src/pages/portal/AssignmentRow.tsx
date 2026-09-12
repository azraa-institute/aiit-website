import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Assignment } from '@aiit/shared';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/primitives/Button';
import { TextArea } from '@/components/common/Field';
import { apiFetch } from '@/lib/api';
import { uploadFile } from '@/lib/storage';
import { useAuth } from '@/lib/AuthContext';

const STATUS_LABEL: Record<Assignment['status'], string> = {
  upcoming: 'Upcoming',
  overdue: 'Overdue',
  submitted: 'Submitted',
  graded: 'Graded',
};

/** Bucket must exist in Supabase Storage (see infra doc) -- learners can only write under their own uid prefix, matching the DB's RLS trust model. */
const SUBMISSIONS_BUCKET = 'submissions';

export function AssignmentRow({ assignment, onSubmitted }: { assignment: Assignment; onSubmitted: () => void }) {
  const { session } = useAuth();
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const canSubmit = assignment.status !== 'graded';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) {
      setError('Sign in again to submit this assignment.');
      return;
    }
    if (!note.trim() && !file) {
      setError('Add a note or attach a file before submitting.');
      return;
    }

    setError(undefined);
    setSubmitting(true);
    try {
      let fileKey: string | undefined;
      if (file) {
        fileKey = await uploadFile(SUBMISSIONS_BUCKET, `${session.user.id}/${assignment.id}/${file.name}`, file);
      }
      await apiFetch(`/assignments/${assignment.id}/submissions`, {
        method: 'POST',
        body: JSON.stringify({ fileKey, note: note.trim() || undefined }),
      });
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
