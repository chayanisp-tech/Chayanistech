import { Submission, Exam } from "../types";

interface ExamSuccessProps {
  submission: Submission;
  exams: Exam[];
  onGoHome: () => void;
  onCheckStatus: () => void;
}

export default function ExamSuccess({
  submission,
  exams,
  onGoHome,
  onCheckStatus,
}: ExamSuccessProps) {
  const exam = exams.find((e) => e.id === submission.examId);

  let totalChoiceCount = 0;
  let totalChoicePoints = 0;
  let earnedChoicePoints = 0;

  let totalSubjectiveCount = 0;
  let totalSubjectivePoints = 0;

  if (exam) {
    exam.questions.forEach((q) => {
      const studentAns = submission.answers[q.id];
      if (q.type === "subjective") {
        totalSubjectiveCount++;
        totalSubjectivePoints += q.points;
      } else {
        totalChoiceCount++;
        totalChoicePoints += q.points;
        if (studentAns !== undefined && studentAns === q.answerIndex) {
          earnedChoicePoints += q.points;
        }
      }
    });
  }
  // Format submission date/time
  const formattedTime = () => {
    try {
      const date = new Date(submission.submittedAt);
      return date.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch (e) {
      return "00:00:00";
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center font-sans bg-[#fff8f7] text-[#251817] px-6 py-12 relative overflow-hidden">
      {/* Top Bar matching Screen 1 */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#fff8f7] h-16 flex items-center">
        <div className="flex justify-between items-center px-8 w-full max-w-7xl mx-auto">
          <span className="text-xl font-bold text-[#8e171c]">ExamMaster Pro</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-[#ffe9e7] text-[#8e171c] px-4 py-1.5 rounded-full font-bold text-sm">
              <span className="material-symbols-outlined text-[18px]">alarm</span>
              <span>00:00:00</span>
            </div>
<div className="w-10 h-10 rounded-full border border-[#e0bfbc] bg-[#fbe3e0] text-[#8e171c] flex items-center justify-center shadow-sm shrink-0">
        <span className="material-symbols-outlined text-[22px]">person</span>
      </div>
          </div>
        </div>
      </header>

      {/* Main Success Content Canvas */}
      <div className="relative z-10 w-full max-w-4xl text-center flex flex-col items-center mt-12">
        {/* Giant checkmark/warning badge */}
        {submission.status === "ทุจริต" ? (
          <div className="w-24 h-24 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-xl shadow-amber-500/10 mb-8 animate-pulse">
            <span className="material-symbols-outlined text-[54px]" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>
              warning
            </span>
          </div>
        ) : (
          <div className="w-24 h-24 rounded-full bg-[#8e171c] flex items-center justify-center text-white shadow-xl shadow-[#8e171c]/10 mb-8 animate-bounce">
            <span className="material-symbols-outlined text-[54px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 600" }}>
              check_circle
            </span>
          </div>
        )}

        {/* Headings */}
        <h1 className="text-4xl md:text-5xl font-black text-[#8e171c] mb-3 tracking-tight">
          {submission.status === "ทุจริต" ? "ระงับการสอบ (บังคับส่งคำตอบ)" : "ส่งข้อสอบเรียบร้อยแล้ว"}
        </h1>
        <p className="text-base text-[#59413f] mb-12 max-w-2xl">
          {submission.status === "ทุจริต" 
            ? "ตรวจพบการเปิดแท็บอื่น สลับหน้าต่าง หรือคลิกออกนอกหน้าจอระหว่างการทำข้อสอบ ระบบจึงทำการบังคับส่งคำตอบปัจจุบันของคุณทันทีเพื่อป้องกันการทุจริต" 
            : "ระบบได้รับข้อสอบของคุณแล้ว ขอบคุณที่ตั้งใจทำข้อสอบ"}
        </p>

        {/* Info Grid - 2 Main Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl mb-6">
          {/* Left card: Exam Title */}
          <div className="md:col-span-2 bg-[#fff0ef] border border-[#e0bfbc]/50 rounded-3xl p-6 flex items-center gap-5 text-left shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#ffdad7] text-[#8e171c] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[32px]">translate</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-[#8c706e] block uppercase">วิชาที่สอบ</span>
              <span className="text-xl md:text-2xl font-extrabold text-[#251817] leading-tight">
                {submission.examTitle}
              </span>
            </div>
          </div>

          {/* Right card: Cloud Status */}
          <div className={`${submission.status === "ทุจริต" ? "bg-amber-600" : "bg-[#8e171c]"} text-white rounded-3xl p-6 flex flex-col justify-center items-center shadow-sm relative overflow-hidden`}>
            <span className="material-symbols-outlined text-[40px] text-[#ffdad7] mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>
              {submission.status === "ทุจริต" ? "gavel" : "cloud_done"}
            </span>
            <span className="text-sm font-semibold text-[#ffd0cc]">สถานะ</span>
            <span className="text-lg font-bold">{submission.status === "ทุจริต" ? "พยายามทุจริต" : "สมบูรณ์"}</span>
          </div>
        </div>

        {/* Score and Auto-Grading Cards */}
        {submission.status !== "ทุจริต" && (
          <div className="bg-white border border-[#e0bfbc]/60 rounded-3xl p-6 md:p-8 shadow-sm w-full max-w-3xl mb-6 text-left space-y-6">
            <h3 className="text-xl font-bold text-[#251817] flex items-center gap-2 border-b border-[#e0bfbc]/30 pb-3">
              <span className="material-symbols-outlined text-[#8e171c]">summarize</span>
              <span>ผลคะแนนและสถานะคำตอบรายส่วน</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Choice Section */}
              <div className="bg-[#fff8f7] border border-[#e0bfbc]/40 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2b6a2b] bg-[#eaf5ea] p-1.5 rounded-xl text-[20px]">task_alt</span>
                  <div>
                    <h4 className="font-bold text-[#251817] text-sm">คะแนนส่วนปรนัย (หลายตัวเลือก)</h4>
                    <p className="text-[11px] text-[#8c706e] font-semibold">ตรวจคำตอบและคิดคะแนนให้ทันที</p>
                  </div>
                </div>
                <div className="pt-2">
                  {totalChoiceCount > 0 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-[#8e171c]">{earnedChoicePoints}</span>
                      <span className="text-sm font-bold text-[#8c706e]">/ {totalChoicePoints} คะแนน</span>
                    </div>
                  ) : (
                    <p className="text-xs text-[#59413f] italic">ไม่มีข้อสอบส่วนปรนัย</p>
                  )}
                </div>
              </div>

              {/* Subjective Section */}
              <div className="bg-[#fff8f7] border border-[#e0bfbc]/40 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#8e171c] bg-[#ffe9e7] p-1.5 rounded-xl text-[20px]">hourglass_empty</span>
                  <div>
                    <h4 className="font-bold text-[#251817] text-sm">คะแนนส่วนข้อเขียน (อัตนัย)</h4>
                    <p className="text-[11px] text-[#8c706e] font-semibold">รอคุณครูผู้สอนตรวจและให้คะแนน</p>
                  </div>
                </div>
                <div className="pt-2 flex items-center justify-between">
                  {totalSubjectiveCount > 0 ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-bold text-[#8c706e]">มีจำนวนข้อเขียน:</span>
                        <span className="text-xl font-black text-[#8e171c]">{totalSubjectiveCount} ข้อ</span>
                      </div>
                      <span className="px-3 py-1 bg-[#ffe9e7] text-[#8e171c] rounded-full text-[10px] font-black border border-[#e0bfbc]/30 uppercase tracking-wider animate-pulse">
                        รอคุณครูตรวจ
                      </span>
                    </>
                  ) : (
                    <p className="text-xs text-[#2b6a2b] font-bold">ไม่มีข้อสอบส่วนอัตนัย (ตรวจเสร็จครบถ้วน!)</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Small Data Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mb-12">
          {/* Submitted At Time */}
          <div className="bg-white border border-[#e0bfbc]/50 rounded-2xl p-5 shadow-sm">
            <span className="text-xs font-semibold text-[#8c706e] block mb-1">เวลาที่ส่ง</span>
            <span className="text-2xl font-black text-[#8e171c]">
              {formattedTime()}
            </span>
          </div>

          {/* Answered / Total ratio */}
          <div className="bg-white border border-[#e0bfbc]/50 rounded-2xl p-5 shadow-sm">
            <span className="text-xs font-semibold text-[#8c706e] block mb-1">ทำไปทั้งหมด</span>
            <span className="text-2xl font-black text-[#8e171c]">
              {submission.answeredCount} / {submission.totalQuestions} ข้อ
            </span>
          </div>

          {/* Submission ID */}
          <div className="bg-white border border-[#e0bfbc]/50 rounded-2xl p-5 shadow-sm">
            <span className="text-xs font-semibold text-[#8c706e] block mb-1">รหัสการส่ง</span>
            <span className="text-lg font-bold text-[#251817]">
              {submission.submissionId}
            </span>
          </div>
        </div>

        {/* Bottom Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full">
          <button
            onClick={onGoHome}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#8e171c] hover:bg-[#8c161b] text-white font-bold rounded-full shadow-lg shadow-[#8e171c]/15 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">home</span>
            กลับสู่หน้าหลัก
          </button>

          <button
            onClick={onCheckStatus}
            className="w-full sm:w-auto px-8 py-3.5 bg-white hover:bg-[#ffe9e7] border-2 border-[#8e171c] text-[#8e171c] font-bold rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">analytics</span>
            ตรวจสอบสถานะการส่ง
          </button>
        </div>

        {/* Notice Alert */}
        <div className="mt-8 flex flex-col items-center gap-2">
          {submission.status === "ทุจริต" ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-3xl p-5 max-w-lg text-xs font-semibold flex items-start gap-3 text-left">
              <span className="material-symbols-outlined text-[20px] text-amber-600 shrink-0">info</span>
              <div>
                <p className="font-bold mb-1">⚠️ โอกาสแก้สอบแก้ตัว!</p>
                <p className="font-medium text-amber-700 leading-relaxed">
                  เนื่องจากคุณพยายามทำพฤติกรรมสลับแท็บ/ออกนอกหน้าจอในครั้งแรก ระบบจึงตัดคำตอบทันที อย่างไรก็ตาม คุณยังคงได้รับโอกาสเข้าสอบแก้ตัวใหม่อีก <strong>1 ครั้งถ้วน</strong> โดยสามารถล็อกอินเข้าระบบด้วยรหัสนักเรียนเดิมและกดปุ่มเริ่มสอบใหม่อีกครั้ง
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-[#59413f]">
              <span className="material-symbols-outlined text-[16px] text-[#8e171c]">info</span>
              <span>คุณสามารถตรวจสอบคะแนนสอบได้ในช่วงเย็นตามเวลาที่กำหนด</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
