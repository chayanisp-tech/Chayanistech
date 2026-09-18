import { getServerDocument } from "../server/firestoreRest.js";
import { AnswerKeyQuestion, scoreSubmission } from "../server/scoring.js";

const EXAM_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { examId, answers } = req.body || {};
  if (
    typeof examId !== "string" ||
    !EXAM_ID_PATTERN.test(examId) ||
    !answers ||
    typeof answers !== "object" ||
    Array.isArray(answers)
  ) {
    return res.status(400).json({ error: "Invalid scoring request" });
  }

  try {
    // This collection must never be readable by student clients.
    const answerKey = await getServerDocument("exam_answer_keys", examId);
    if (!answerKey || !Array.isArray(answerKey.questions)) {
      return res.status(404).json({ error: "Answer key not found" });
    }

    const result = scoreSubmission(
      answerKey.questions as AnswerKeyQuestion[],
      answers as Record<string, unknown>
    );

    // Do not return answerIndex or per-question correctness.
    return res.status(200).json(result);
  } catch (error) {
    console.error("Server scoring failed", error);
    return res.status(500).json({ error: "Unable to score submission" });
  }
}
