export interface AnswerKeyQuestion {
  id: string;
  type?: "choice" | "subjective";
  answerIndex?: number;
  points: number;
}

export interface ScoreResult {
  objectiveScore: number;
  totalPoints: number;
  answeredCount: number;
  totalQuestions: number;
  requiresManualGrading: boolean;
}

const hasSubjectiveAnswer = (answer: unknown): boolean => {
  if (!answer || typeof answer !== "object") return false;

  const value = answer as { text?: unknown; drawing?: unknown };
  return (
    (typeof value.text === "string" && value.text.trim().length > 0) ||
    (typeof value.drawing === "string" && value.drawing.length > 0)
  );
};

/**
 * Pure scoring function shared by the server endpoint and tests.
 * It deliberately returns no correct answers or per-question correctness.
 */
export function scoreSubmission(
  questions: AnswerKeyQuestion[],
  answers: Record<string, unknown>
): ScoreResult {
  let objectiveScore = 0;
  let totalPoints = 0;
  let answeredCount = 0;
  let requiresManualGrading = false;

  for (const question of questions) {
    const points = Number.isFinite(question.points) ? question.points : 0;
    totalPoints += points;

    const answer = answers[question.id];
    if (question.type === "subjective") {
      requiresManualGrading = true;
      if (hasSubjectiveAnswer(answer)) answeredCount += 1;
      continue;
    }

    if (answer === undefined || answer === null || answer === "") continue;

    answeredCount += 1;
    if (Number(answer) === Number(question.answerIndex)) {
      objectiveScore += points;
    }
  }

  return {
    objectiveScore,
    totalPoints,
    answeredCount,
    totalQuestions: questions.length,
    requiresManualGrading,
  };
}
