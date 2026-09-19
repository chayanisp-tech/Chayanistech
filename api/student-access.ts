import { getServerDocument } from "../server/firestoreRest.js";

const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { studentId, examIds } = req.body || {};
  if (
    typeof studentId !== "string" ||
    !ID_PATTERN.test(studentId) ||
    !Array.isArray(examIds) ||
    examIds.length > 100 ||
    examIds.some((id) => typeof id !== "string" || !ID_PATTERN.test(id))
  ) {
    return res.status(400).json({ error: "Invalid student access request" });
  }

  try {
    const student = await getServerDocument("students", studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const submissions = (await Promise.all(
      examIds.map((examId) =>
        getServerDocument("submissions", examId + "_" + studentId)
      )
    ))
      .filter(Boolean)
      .map((submission: any) => {
        const { answers: _answers, ...safeSubmission } = submission;
        return safeSubmission;
      });

    return res.status(200).json({
      student: { id: studentId, ...student },
      submissions,
    });
  } catch (error) {
    console.error("Student access lookup failed", error);
    return res.status(500).json({ error: "Unable to enter exam room" });
  }
}
