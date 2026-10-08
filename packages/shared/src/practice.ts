import type { EnrolledCourseSummary } from './enrollment';

/**
 * Practice quizzes -- the "Practice" phase of AIIT's five-phase model
 * (Learn / Practice / Certify / Progress / Globalize), low-stakes and
 * instructor-authored, distinct from graded Assignments. See
 * apps/api/src/modules/practice.
 */

export interface QuizOptionView {
  id: string;
  text: string;
}

export interface QuizQuestionView {
  id: string;
  prompt: string;
  options: QuizOptionView[];
}

/** List item -- shown before a learner opens a quiz. */
export interface QuizSummary {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  course: EnrolledCourseSummary;
  attempts: number;
  /** Highest score across every attempt so far, or null if never attempted. */
  bestScorePct: number | null;
}

/** Full quiz, options never carry isCorrect -- that would let a learner inspect the answer key client-side. */
export interface QuizDetail {
  id: string;
  title: string;
  description: string | null;
  course: EnrolledCourseSummary;
  questions: QuizQuestionView[];
}

export interface SubmitQuizAnswer {
  questionId: string;
  optionId: string;
}

export interface QuizAnswerResult {
  questionId: string;
  selectedOptionId: string | null;
  correctOptionId: string;
  correct: boolean;
}

export interface QuizAttemptResult {
  attemptId: string;
  scorePct: number;
  correctCount: number;
  totalQuestions: number;
  results: QuizAnswerResult[];
}

// ---- Instructor authoring ----

export interface InstructorQuizOption {
  text: string;
  isCorrect: boolean;
}

export interface InstructorQuizQuestion {
  prompt: string;
  options: InstructorQuizOption[];
}

export interface InstructorQuizSummary {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description: string | null;
  questionCount: number;
  attempts: number;
  createdAt: string;
}

/** Full quiz with answer keys -- only ever returned to the instructor who authored it (or admin). */
export interface InstructorQuizDetail extends InstructorQuizSummary {
  questions: InstructorQuizQuestion[];
}
