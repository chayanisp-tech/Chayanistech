import { createServerDocument, getServerDocument } from "../server/firestoreRest.js";
import { AnswerKeyQuestion, scoreSubmission } from "../server/scoring.js";

const EXAM_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const STUDENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { examId, studentId, answers, status = "สมบูรณ์" } = req.body || {};
  if (
    typeof examId !== "string" ||
    !EXAM_ID_PATTERN.test(examId) ||
    typeof studentId !== "string" ||
    !STUDENT_ID_PATTERN.test(studentId) ||
    !answers ||
    typeof answers !== "object" ||
    Array.isArray(answers) ||
    Object.keys(answers).length > 500 ||
    !["สมบูรณ์", "ทุจริต"].includes(status)
  ) {
    return res.status(400).json({ error: "Invalid scoring request" });
  }

  try {
    const submissionId = examId + "_" + studentId;
    const [answerKey, publicExam, student, existingSubmission] = await Promise.all([
      // This collection must never be readable by student clients.
      getServerDocument("exam_answer_keys", examId),
      getServerDocument("exams_public", examId),
      getServerDocument("students", studentId),
      getServerDocument("submissions", submissionId),
    ]);

    if (!answerKey || !Array.isArray(answerKey.questions) || !publicExam) {
      return res.status(404).json({ error: "Answer key not found" });
    }
    if (!student) return res.status(404).json({ error: "Student not found" });
    if (existingSubmission) {
      return res.status(409).json({ error: "Exam already submitted" });
    }

    const allowedQuestionIds = new Set(
      (answerKey.questions as AnswerKeyQuestion[]).map((question) => question.id)
    );
    const sanitizedAnswers = Object.fromEntries(
      Object.entries(answers as Record<string, unknown>)
        .filter(([questionId]) => allowedQuestionIds.has(questionId))
    );

    const result = scoreSubmission(
      answerKey.questions as AnswerKeyQuestion[],
      sanitizedAnswers
    );

    const submission = {
      submissionId,
      studentId,
      studentName: String(student.name || ""),
      studentClassName: String(student.className || ""),
      examId,
      examTitle: String(publicExam.title || ""),
      score: status === "ทุจริต" ? 0 : result.objectiveScore,
      totalPoints: result.totalPoints,
      answeredCount: result.answeredCount,
      totalQuestions: result.totalQuestions,
      submittedAt: new Date().toISOString(),
      status,
      answers: sanitizedAnswers,
    };

    // The server writes the authoritative score. The browser never writes it.
    await createServerDocument("submissions", submissionId, submission);

    // Do not return answerIndex or per-question correctness.
    const { answers: _answers, ...safeSubmission } = submission;
    return res.status(201).json({
      submission: safeSubmission,
      requiresManualGrading: result.requiresManualGrading,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "DocumentAlreadyExistsError") {
      return res.status(409).json({ error: "Exam already submitted" });
    }
    console.error("Server scoring failed", error);
    return res.status(500).json({ error: "Unable to score submission" });
  }
}
