import { Submission } from "../types";

interface SubmitExamRequest {
  examId: string;
  studentId: string;
  answers: Record<string, unknown>;
  status: Submission["status"];
}

interface SubmitExamResponse {
  submission: Submission;
  requiresManualGrading: boolean;
}

export async function submitExamForScoring(
  payload: SubmitExamRequest
): Promise<SubmitExamResponse> {
  const response = await fetch("/api/score-exam", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error || "Unable to submit exam";
    throw new Error(message);
  }

  return body as SubmitExamResponse;
}
