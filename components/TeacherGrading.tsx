import React, { useState } from "react";
import { Submission, SyncStatus, Exam, Question } from "../types";

interface TeacherGradingProps {
  submissions: Submission[];
  exams: Exam[];
  onDeleteSubmission: (id: string) => void;
  onUpdateSubmission: (submission: Submission) => void;
  syncStatus: SyncStatus;
  onTriggerSync: () => void;
}

export default function TeacherGrading({
  submissions,
  exams,
  onDeleteSubmission,
  onUpdateSubmission,
  syncStatus,
  onTriggerSync,
}: TeacherGradingProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);

  const filtered = submissions.filter(
    (s) =>
      s.studentId.includes(searchTerm) ||
      s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.examTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.submissionId.includes(searchTerm)
  );

  const handleUpdateSubjectiveScore = (sub: Submission, qId: string, points: number) => {
    const currentAnswers = sub.answers ? { ...sub.answers } : {};
    
    // Update the answer item with the new score
    const currentAnsItem = currentAnswers[qId] || {};
    currentAnswers[qId] = {
      ...currentAnsItem,
      assignedScore: points,
    };

    // Re-calculate the submission's overall score
    // Find matching exam
    const matchingExam = exams.find((e) => e.id === sub.examId);
    let newScore = 0;
    
    if (matchingExam) {
      matchingExam.questions.forEach((q) => {
        if (q.type === "subjective") {
          const ans = currentAnswers[q.id];
          if (ans && typeof ans.assignedScore === "number") {
            newScore += ans.assignedScore;
          }
        } else {
          // Multiple choice
          const ans = currentAnswers[q.id];
          if (ans !== undefined && typeof ans === "number") {
            if (ans === q.answerIndex) {
              newScore += q.points;
            }
          }
        }
      });
    } else {
      // Fallback if exam can't be found
      newScore = sub.score; // keep as-is, just update the detail
    }

    const updatedSubmission: Submission = {
      ...sub,
      score: newScore,
      answers: currentAnswers,
    };

    onUpdateSubmission(updatedSubmission);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-[#251817] tracking-tight">การให้คะแนนและสถิติ</h1>
          <p className="text-sm text-[#59413f] mt-1">
            รายงานผลการทำข้อสอบของนักเรียน รายละเอียดคะแนน และสถานะการบันทึกประวัติการส่งข้อสอบ สามารถคลิกแต่ละแถวเพื่อดูรายละเอียดคำตอบและให้คะแนนข้อสอบอัตนัยได้
          </p>
        </div>
        
        {syncStatus.spreadsheetId && (
          <button
            onClick={onTriggerSync}
            disabled={syncStatus.isSyncing}
            className="px-5 py-2.5 bg-[#8e171c] hover:bg-[#8c161b] text-white rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-[#8e171c]/10 cursor-pointer disabled:opacity-75 shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">sync_saved_locally</span>
            <span>{syncStatus.isSyncing ? "กำลังบันทึกคะแนนลงไดรฟ์..." : "ซิงค์คะแนนลง Google Drive"}</span>
          </button>
        )}
      </div>

      {/* Main Table Grid */}
      <div className="bg-white border border-[#e0bfbc]/50 rounded-3xl p-6 shadow-sm">
        {/* Search Filter */}
        <div className="flex items-center gap-3 mb-6 relative max-w-md">
          <span className="material-symbols-outlined absolute left-4 text-[#8c706e] text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="ค้นหาด้วยรหัสนักเรียน, ชื่อ หรือวิชาที่สอบ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-full border border-[#e0bfbc] outline-none text-sm text-[#251817] focus:border-[#8e171c]"
          />
        </div>

        {/* Scores Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#e0bfbc]/30 text-xs font-bold text-[#8c706e] bg-[#fff8f7]">
                <th className="py-3 px-4">รหัสการส่ง</th>
                <th className="py-3 px-4">นักเรียน</th>
                <th className="py-3 px-4">ชั้นเรียน</th>
                <th className="py-3 px-4">วิชาที่สอบ</th>
                <th className="py-3 px-4 text-center">สัดส่วนคำตอบ</th>
                <th className="py-3 px-4 text-right">คะแนนสอบ</th>
                <th className="py-3 px-4 text-center">เวลาส่งสอบ</th>
                <th className="py-3 px-4 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0bfbc]/20">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#59413f]">
                    ยังไม่มีรายงานการทำข้อสอบตามตัวกรองนี้
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => {
                  const isPerfect = sub.score === sub.totalPoints;
                  const isExpanded = expandedSubmissionId === sub.submissionId;
                  const matchingExam = exams.find((e) => e.id === sub.examId);

                  return (
                    <React.Fragment key={sub.submissionId}>
                      <tr className={`hover:bg-[#fff8f7] transition-all text-xs ${isExpanded ? "bg-[#ffe9e7]/10" : ""}`}>
                        <td className="py-3 px-4 font-mono font-bold text-[#8c706e]">
                          {sub.submissionId}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-[#251817]">{sub.studentName}</div>
                          <div className="text-[10px] text-[#8c706e] font-mono">ID: {sub.studentId}</div>
                        </td>
                        <td className="py-3 px-4 font-medium text-[#59413f]">{sub.studentClassName}</td>
                        <td className="py-3 px-4 font-bold text-[#251817]">{sub.examTitle}</td>
                        <td className="py-3 px-4 text-center text-[#59413f]">
                          {sub.answeredCount} / {sub.totalQuestions} ข้อ
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-black text-sm ${isPerfect ? "text-[#8e171c]" : "text-[#8f4a46]"}`}>
                            {sub.score}
                          </span>
                          <span className="text-[10px] text-[#8c706e] font-bold"> / {sub.totalPoints}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-[#59413f]">
                          {new Date(sub.submittedAt).toLocaleTimeString("th-TH", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Expand toggle */}
                            <button
                              onClick={() => setExpandedSubmissionId(isExpanded ? null : sub.submissionId)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                isExpanded ? "bg-[#8e171c] text-white" : "hover:bg-[#ffe9e7] text-[#8e171c] bg-[#ffe9e7]/50"
                              }`}
                              title="ดูรายละเอียดข้อสอบและให้คะแนน"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {isExpanded ? "expand_less" : "analytics"}
                              </span>
                            </button>

                            {/* Delete submission */}
                            <button
                              onClick={() => {
                                if (window.confirm("คุณต้องการลบสิทธิ์หรือบันทึกผลคะแนนประวัติการส่งข้อสอบรายการนี้หรือไม่?")) {
                                  onDeleteSubmission(sub.submissionId);
                                }
                              }}
                              className="w-7 h-7 rounded-full hover:bg-red-50 text-red-500 flex items-center justify-center transition-colors cursor-pointer"
                              title="ลบผลการส่ง"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* COLLAPSIBLE DETAILED VIEW */}
                      {isExpanded && (
                        <tr className="bg-[#fffdfd] border-l-4 border-l-[#8e171c]">
                          <td colSpan={8} className="py-5 px-6 md:px-8 border-b border-[#e0bfbc]/30">
                            <div className="space-y-6">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#e0bfbc]/20 pb-4 gap-2">
                                <div className="space-y-0.5">
                                  <h5 className="font-bold text-sm text-[#8e171c] flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[18px]">assignment_ind</span>
                                    รายละเอียดคำตอบของ {sub.studentName} ({sub.studentId})
                                  </h5>
                                  <p className="text-[10px] text-[#59413f] font-semibold">
                                    ชั้นเรียน: {sub.studentClassName} • วิชา: {sub.examTitle}
                                  </p>
                                </div>
                                <span className="text-[10px] font-bold text-[#8c706e] bg-[#fff1f0] px-3 py-1 rounded-full border border-[#e0bfbc]/30 font-mono">
                                  ส่งเมื่อ: {new Date(sub.submittedAt).toLocaleString("th-TH")}
                                </span>
                              </div>

                              {/* Questions Details Loop */}
                              {matchingExam ? (
                                <div className="space-y-5">
                                  {matchingExam.questions.map((q, qIdx) => {
                                    const studentAns = sub.answers ? sub.answers[q.id] : undefined;
                                    const isSubjective = q.type === "subjective";

                                    return (
                                      <div key={q.id} className="p-4 rounded-2xl border border-[#e0bfbc]/40 bg-white space-y-3 shadow-sm hover:border-[#8e171c]/20 transition-all">
                                        <div className="flex justify-between items-start gap-4">
                                          <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                              <span className="text-[10px] font-bold text-[#8c706e] tracking-wider uppercase">
                                                ข้อ {qIdx + 1}
                                              </span>
                                              {isSubjective ? (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#ffe9e7] text-[#8e171c] font-black rounded text-[9px] uppercase">
                                                  <span className="material-symbols-outlined text-[10px]">edit_note</span>
                                                  อัตนัย
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#eaf5ea] text-[#2b6a2b] font-black rounded text-[9px] uppercase">
                                                  <span className="material-symbols-outlined text-[10px]">list_alt</span>
                                                  ปรนัย (5 ตัวเลือก)
                                                </span>
                                              )}
                                            </div>
                                            <p className="font-bold text-[#251817] text-xs md:text-sm">{q.text}</p>
                                          </div>
                                          <span className="text-xs font-bold text-[#8e171c] bg-[#ffdad7] px-2.5 py-1 rounded-full shrink-0">
                                            {q.points} คะแนน
                                          </span>
                                        </div>

                                        {/* Rendering answers based on type */}
                                        {isSubjective ? (
                                          <div className="space-y-4 pt-2 border-t border-[#e0bfbc]/10">
                                            {/* Text answer */}
                                            <div className="space-y-1 bg-[#fffbfb] p-3 rounded-xl border border-[#e0bfbc]/25 shadow-inner">
                                              <span className="text-[10px] font-bold text-[#8c706e] flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px]">keyboard</span>
                                                ข้อความที่พิมพ์ตอบ:
                                              </span>
                                              <p className="text-xs text-[#251817] whitespace-pre-wrap font-medium leading-relaxed">
                                                {studentAns?.text ? studentAns.text : <span className="text-gray-400 italic font-normal">ไม่มีการพิมพ์ข้อความตอบ</span>}
                                              </p>
                                            </div>

                                            {/* Drawing Image */}
                                            <div className="space-y-1.5">
                                              <span className="text-[10px] font-bold text-[#8c706e] flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px]">draw</span>
                                                รูปภาพวาดส่งประกอบคำตอบ:
                                              </span>
                                              {studentAns?.drawing ? (
                                                <div className="border border-[#e0bfbc]/30 rounded-xl bg-white p-2.5 w-full max-w-md shadow-sm">
                                                  <img
                                                    src={studentAns.drawing}
                                                    alt={`ภาพวาดข้อ ${qIdx + 1}`}
                                                    className="w-full h-auto object-contain max-h-64 rounded-lg"
                                                    referrerPolicy="no-referrer"
                                                  />
                                                </div>
                                              ) : (
                                                <p className="text-xs text-gray-400 italic p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                                  ไม่มีภาพวาดส่งประกอบในข้อนี้
                                                </p>
                                              )}
                                            </div>

                                            {/* Teacher Grading Panel */}
                                            <div className="bg-[#fff8f7] border border-[#ffdad7] p-3.5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 mt-4">
                                              <div className="space-y-0.5">
                                                <span className="text-[10px] font-bold text-[#8e171c] flex items-center gap-1">
                                                  <span className="material-symbols-outlined text-[12px]">grade</span>
                                                  ลงคะแนนโดยผู้สอน (Teacher Grading):
                                                </span>
                                                <p className="text-xs text-[#59413f]">
                                                  คะแนนที่ได้ปัจจุบัน: <span className="font-black text-[#8e171c] text-sm">{studentAns?.assignedScore !== undefined ? studentAns.assignedScore : 0}</span> จากคะแนนเต็ม {q.points} คะแนน
                                                </p>
                                              </div>
                                              
                                              {/* Score options container */}
                                              <div className="flex flex-wrap gap-1">
                                                {Array.from({ length: q.points + 1 }).map((_, pt) => {
                                                  const isCurrentSelected = studentAns?.assignedScore === pt || (studentAns?.assignedScore === undefined && pt === 0);
                                                  return (
                                                    <button
                                                      key={pt}
                                                      onClick={() => handleUpdateSubjectiveScore(sub, q.id, pt)}
                                                      className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center cursor-pointer transition-all ${
                                                        isCurrentSelected
                                                          ? "bg-[#8e171c] text-white font-black scale-110 shadow-sm"
                                                          : "bg-white text-[#59413f] border border-[#e0bfbc]/60 hover:bg-[#ffe9e7]"
                                                      }`}
                                                    >
                                                      {pt}
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="space-y-2 pt-2 border-t border-[#e0bfbc]/10">
                                            {/* Multiple choice values */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-medium">
                                              <div className="p-2.5 rounded-xl bg-[#eaf5ea] text-[#2b6a2b] flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[16px] shrink-0">check_circle</span>
                                                <span className="leading-tight">คำตอบที่ถูกต้อง: <b>ตัวเลือก {["A", "B", "C", "D", "E"][q.answerIndex]}</b> ({q.options[q.answerIndex]})</span>
                                              </div>
                                              <div className={`p-2.5 rounded-xl flex items-center gap-2 ${
                                                studentAns === q.answerIndex
                                                  ? "bg-[#eaf5ea] text-[#2b6a2b]"
                                                  : studentAns === undefined
                                                  ? "bg-gray-100 text-gray-500"
                                                  : "bg-[#fff0ef] text-[#ba1a1a]"
                                              }`}>
                                                <span className="material-symbols-outlined text-[16px] shrink-0">
                                                  {studentAns === q.answerIndex ? "check" : studentAns === undefined ? "help" : "close"}
                                                </span>
                                                <span className="leading-tight">
                                                  คำตอบของนักเรียน: {studentAns !== undefined ? <span><b>ตัวเลือก {["A", "B", "C", "D", "E"][studentAns]}</b> ({q.options[studentAns]})</span> : <span className="italic text-gray-400">ไม่ได้ระบุคำตอบ</span>}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-400 italic py-4">ไม่พบรายละเอียดของชุดข้อสอบนี้ในระบบ (ชุดข้อสอบอาจถูกลบไปแล้ว)</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
