import React, { useState, useEffect, useRef } from "react";
import { Student, Exam, Question, Submission } from "../types";
import DrawingCanvas from "./DrawingCanvas";

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

interface StudentExamRoomProps {
  student: Student;
  activeExams: Exam[];
  submissions: Submission[];
  onExamSubmitted: (submission: Submission) => void;
  onGoBack: () => void;
}

export default function StudentExamRoom({
  student,
  activeExams,
  submissions,
  onExamSubmitted,
  onGoBack,
}: StudentExamRoomProps) {
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [isExamStarted, setIsExamStarted] = useState(false);

  // ตรวจสอบสถานะการเปิดหน้าจอด้านการตรวจทานคำตอบก่อนส่งจริง
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [confirmSubmitChecked, setConfirmSubmitChecked] = useState(false);

  // นับแต้มเตือนการทุจริตภายในห้องสอบ
  const [cheatCount, setCheatCount] = useState(0);
  const cheatCountRef = useRef(0);

  const answersRef = useRef(answers);
  const selectedExamRef = useRef(selectedExam);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    selectedExamRef.current = selectedExam;
  }, [selectedExam]);

  useEffect(() => {
    cheatCountRef.current = cheatCount;
  }, [cheatCount]);

  // ระบบดักจับการทุจริตแบบ 3 ครั้งตัดสิทธิ์ถาวร + คะแนนโมฆะ
  useEffect(() => {
    if (!isExamStarted) return;

    const handleCheatDetected = (actionType: string) => {
      const newCount = cheatCountRef.current + 1;
      setCheatCount(newCount);

      if (newCount === 1) {
        // ครั้งที่ 1: แจ้งเตือนข้อหาพฤติกรรมเสี่ยง
        alert(
          `⚠️ [คำเตือนครั้งที่ 1]\nระบบตรวจพบการ "${actionType}"\nกรุณาทำข้อสอบในหน้าจอข้อสอบด้วยความซื่อสัตย์และห้ามละสายตาเด็ดขาด`
        );
      } else if (newCount === 2) {
        // ครั้งที่ 2: แจ้งเตือนโอกาสสุดท้าย
        alert(
          `❌ [คำเตือนครั้งที่ 2]\nตรวจพบการ "${actionType}" อีกครั้ง!\n🚨 เหลืออีก "ครั้งสุดท้าย" เท่านั้น หากระบบตรวจพบพฤติกรรมทุจริตอีกเพียงครั้งเดียว จะถูกบังคับส่งกระดาษคำตอบและปรับตกทันที`
        );
      } else if (newCount >= 3) {
        // ครั้งที่ 3: บังคับส่งข้อสอบ คะแนนเป็นโมฆะ (0 คะแนน) และตัดสิทธิ์ถาวร
        const exam = selectedExamRef.current;
        if (!exam) return;

        alert(
          `🛑 [ระบบทำการล็อกอัตโนมัติเนื่องจากทุจริต]\n\nคุณทำผิดกฎความปลอดภัยครบ 3 ครั้ง ระบบได้ทำการบังคับส่งกระดาษคำตอบ และตัดสินว่า "ทุจริตการสอบ" คะแนนในรายวิชานี้ถือเป็นโมฆะ (ได้ 0 คะแนน) และคุณหมดสิทธิ์เข้าสอบวิชานี้อีกต่อไป`
        );

        const currentAnswers = answersRef.current;
        let totalPoints = 0;
        let actualAnsweredCount = 0;

        exam.questions.forEach((q) => {
          totalPoints += q.points;
          const ans = currentAnswers[q.id];
          if (q.type === "subjective") {
            if (ans && (ans.text?.trim() || ans.drawing)) {
              actualAnsweredCount++;
            }
          } else {
            if (ans !== undefined) {
              actualAnsweredCount++;
            }
          }
        });

        // สร้างข้อมูลส่งแบบ "ทุจริต" และให้คะแนนเป็น 0 (โมฆะ)
        const newSubmission: Submission = {
          submissionId: `EX-${Math.floor(100000 + Math.random() * 900000)}`,
          studentId: student.id,
          studentName: student.name,
          studentClassName: student.className,
          examId: exam.id,
          examTitle: exam.title,
          score: 0, // ปรับคะแนนเป็นโมฆะทันที
          totalPoints: totalPoints,
          answeredCount: actualAnsweredCount,
          totalQuestions: exam.questions.length,
          submittedAt: new Date().toISOString(),
          status: "ทุจริต",
          answers: currentAnswers,
        };

        setIsExamStarted(false);
        setSelectedExam(null);
        setCheatCount(0);
        onExamSubmitted(newSubmission);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleCheatDetected("สลับหน้าจอ หรือ เปลี่ยนแท็บเบราว์เซอร์");
      }
    };

    const handleWindowBlur = () => {
      handleCheatDetected("คลิกออกจากหน้าต่างข้อสอบ");
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      handleCheatDetected("คัดลอกข้อความข้อสอบ (Copy)");
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        handleCheatDetected("บันทึกหน้าจอ (Print Screen)");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("copy", handleCopy);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("copy", handleCopy);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExamStarted, student, onExamSubmitted]);

  const handleSubjectiveTextChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || {}), text },
    }));
  };

  const handleSubjectiveDrawingChange = (questionId: string, drawingDataUrl: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || {}), drawing: drawingDataUrl },
    }));
  };

  const exams = activeExams.filter((e) => e.isActive);

  // ตัวนับเวลาถอยหลังปกติ
  useEffect(() => {
    if (!isExamStarted || !selectedExam || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isExamStarted, selectedExam, secondsRemaining]);

  const handleStartExam = (exam: Exam) => {
    // สลับข้อสอบและชอยส์
    let randomizedQuestions = shuffleArray(exam.questions);
    randomizedQuestions = randomizedQuestions.map((q) => {
      if (q.type === "choice" && q.options && q.options.length > 0) {
        const mappedOptions = q.options.map((opt, idx) => ({
          text: opt,
          isCorrect: idx === q.answerIndex,
        }));
        const shuffledOptions = shuffleArray(mappedOptions);
        const newAnswerIndex = shuffledOptions.findIndex(opt => opt.isCorrect);

        return {
          ...q,
          options: shuffledOptions.map(opt => opt.text),
          answerIndex: newAnswerIndex,
        };
      }
      return q;
    });

    const randomizedExam = { ...exam, questions: randomizedQuestions };
    setSelectedExam(randomizedExam);
    setAnswers({});
    setCheatCount(0);
    setCurrentQuestionIndex(0);
    setSecondsRemaining(exam.timeLimitMinutes * 60);
    setIsExamStarted(true);
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const executeSubmitExam = () => {
    const exam = selectedExamRef.current;
    if (!exam) return;

    const currentAnswers = answersRef.current;
    let totalPoints = 0;
    let autoScore = 0;
    let actualAnsweredCount = 0;

    exam.questions.forEach((q) => {
      totalPoints += q.points;
      const ans = currentAnswers[q.id];
      if (q.type === "subjective") {
        if (ans && (ans.text?.trim() || ans.drawing)) {
          actualAnsweredCount++;
        }
      } else {
        if (ans !== undefined) {
          actualAnsweredCount++;
          if (ans === q.answerIndex) {
            autoScore += q.points;
          }
        }
      }
    });

    const newSubmission: Submission = {
      submissionId: `EX-${Math.floor(100000 + Math.random() * 900000)}`,
      studentId: student.id,
      studentName: student.name,
      studentClassName: student.className,
      examId: exam.id,
      examTitle: exam.title,
      score: autoScore,
      totalPoints: totalPoints,
      answeredCount: actualAnsweredCount,
      totalQuestions: exam.questions.length,
      submittedAt: new Date().toISOString(),
      status: "สมบูรณ์",
      answers: currentAnswers,
    };

    setIsExamStarted(false);
    setSelectedExam(null);
    setCheatCount(0);
    setShowReviewModal(false);
    setConfirmSubmitChecked(false);
    onExamSubmitted(newSubmission);
  };

  const handleSubmitExam = (isTimeUp = false) => {
    if (isTimeUp) {
      alert("🚨 หมดเวลาทำข้อสอบ! ระบบกำลังทำการส่งกระดาษคำตอบของคุณโดยอัตโนมัติ...");
      executeSubmitExam();
    } else {
      setShowReviewModal(true);
      setConfirmSubmitChecked(false);
    }
  };

  if (!selectedExam) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fff8f7] font-sans pt-24 px-6 pb-12 text-[#251817]">
        {/* Top Bar */}
        <header className="fixed top-0 left-0 w-full z-50 bg-[#fff8f7] border-b border-[#e0bfbc]/30 h-16 flex items-center">
          <div className="flex justify-between items-center px-6 w-full max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#8e171c] text-3xl">school</span>
              <span className="text-xl font-bold text-[#8e171c]">ChineseEdutest</span>
            </div>
            <div className="text-sm font-semibold text-[#59413f]">
              สวัสดี, <span className="text-[#8e171c]">{student.name}</span> ({student.id})
            </div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto w-full mt-6">
          <div className="mb-6 flex items-center gap-2">
            <button
              onClick={onGoBack}
              className="flex items-center gap-1 text-sm text-[#8f4a46] hover:text-[#8e171c] font-semibold cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              กลับสู่หน้าหลัก
            </button>
          </div>

          <h1 className="text-3xl font-bold text-[#251817] mb-2">เลือกรายวิชาที่ต้องการสอบ</h1>
          <p className="text-[#59413f] mb-8 text-sm">กรุณาเตรียมตัวให้พร้อมก่อนกดปุ่มเริ่มสอบ หากตรวจพบพฤติกรรมทุจริตครบ 3 ครั้งจะถูกปรับตกทันที</p>

          {exams.length === 0 ? (
            <div className="bg-white border border-[#e0bfbc]/40 rounded-3xl p-12 text-center">
              <span className="material-symbols-outlined text-[64px] text-[#8c706e] opacity-40 mb-4">upcoming</span>
              <p className="text-lg font-bold text-[#251817]">ไม่มีข้อสอบที่เปิดให้บริการในขณะนี้</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {exams.map((exam) => {
                const examSubmissions = submissions.filter(
                  (s) => s.studentId === student.id && s.examId === exam.id
                );
                const hasCompleted = examSubmissions.some((s) => s.status === "สมบูรณ์");
                const hasCheated = examSubmissions.some((s) => s.status === "ทุจริต");
                
                // หากเคยส่งแบบสมบูรณ์ หรือเคยถูกตัดสินว่าทุจริต จะหมดสิทธิ์สอบทันที (ไม่มีโอกาสแก้ตัวรอบหน้า)
                const isBlocked = hasCompleted || hasCheated;

                return (
                  <div
                    key={exam.id}
                    className="bg-white border border-[#e0bfbc]/60 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-4">
                        <span className="px-3 py-1 bg-[#ffdad7] text-[#8e171c] font-bold text-xs rounded-full">
                          {exam.courseCode}
                        </span>
                        <span className="text-xs text-[#8c706e] font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">timer</span>
                          {exam.timeLimitMinutes} นาที
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-[#251817] mb-2">{exam.title}</h3>
                      <p className="text-sm text-[#59413f] mb-4 line-clamp-3">{exam.description}</p>

                      <div className="mb-4">
                        {hasCompleted && (
                          <div className="px-4 py-2 bg-[#eaf5ea] border border-[#b2dbb2] text-[#2b6a2b] text-xs font-bold rounded-2xl flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            <span>คุณได้ส่งคำตอบเรียบร้อยแล้ว</span>
                          </div>
                        )}
                        {hasCheated && (
                          <div className="px-4 py-2 bg-[#ffebeb] border border-[#ffc2c2] text-[#c92a2a] text-xs font-bold rounded-2xl flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">error</span>
                            <span>หมดสิทธิ์สอบถาวร (ถูกตัดสินทุจริตการสอบ คะแนนเป็นโมฆะ)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-[#e0bfbc]/30 pt-4 flex items-center justify-between">
                      <span className="text-xs text-[#8c706e] font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">help</span>
                        {exam.questions.length} ข้อถาม
                      </span>
                      {isBlocked ? (
                        <button
                          disabled
                          className="px-5 py-2.5 bg-gray-200 text-gray-400 rounded-full font-bold text-sm cursor-not-allowed"
                        >
                          หมดสิทธิ์เข้าสอบ
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartExam(exam)}
                          className="px-5 py-2.5 bg-[#8e171c] hover:bg-[#8c161b] text-white rounded-full font-bold text-sm transition-all shadow-md shadow-[#8e171c]/10 cursor-pointer"
                        >
                          เริ่มทำข้อสอบ
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion: Question = selectedExam.questions[currentQuestionIndex];
  const actualAnsweredCount = selectedExam.questions.filter((q) => {
    const ans = answers[q.id];
    if (q.type === "subjective") return !!(ans?.text?.trim() || ans?.drawing);
    return ans !== undefined;
  }).length;

  const progressPercent = (actualAnsweredCount / selectedExam.questions.length) * 100;
  const isTimeCritical = secondsRemaining <= 300;

  return (
    <div className="min-h-screen flex flex-col bg-[#fff8f7] font-sans pt-16 text-[#251817] select-none">
      {/* Top Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white border-b border-[#e0bfbc]/30 h-16 shadow-sm">
        <div className="flex justify-between items-center px-6 h-full w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-[#8e171c] bg-[#ffdad7] px-3 py-1 rounded-full">{selectedExam.courseCode}</span>
            <span className="font-bold text-sm text-[#251817] hidden sm:inline">{selectedExam.title}</span>
          </div>
          {/* แสดงจำนวนครั้งที่ทำผิดกฎแบบเรียลไทม์มุมบนขวา */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
              ทำผิดกฎ: {cheatCount}/3 ครั้ง
            </span>
            <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-sm ${isTimeCritical ? "bg-[#ffdad6] text-[#ba1a1a] animate-pulse" : "bg-[#ffe9e7] text-[#8e171c]"}`}>
              <span className="material-symbols-outlined text-[18px]">alarm</span>
              <span>{formatTime(secondsRemaining)}</span>
            </div>
          </div>
        </div>
        <div className="w-full bg-[#fbe3e0] h-1.5">
          <div className="bg-[#8e171c] h-1.5 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-4xl w-full mx-auto px-6 py-12">
        {showReviewModal ? (
          <div className="bg-white border border-[#e0bfbc]/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 animate-fade-in mt-4">
            <div className="border-b border-[#e0bfbc]/30 pb-4">
              <h2 className="text-2xl font-bold text-[#251817] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8e171c] text-3xl">task_alt</span>
                ตรวจทานคำตอบของคุณอีก 1 รอบก่อนส่ง
              </h2>
              <p className="text-sm text-[#59413f] mt-1">
                กรุณาตรวจสอบการตอบคำถามแต่ละข้อด้านล่างนี้ให้ละเอียด เมื่อกดยืนยันส่งข้อสอบแล้วจะไม่สามารถแก้ไขได้อีกในทุกกรณี
              </p>
            </div>

            {/* สรุปจำนวนข้อตอบ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#fff8f7] p-4 rounded-2xl border border-[#e0bfbc]/30">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-green-600">done_all</span>
                <span className="text-sm font-bold text-[#251817]">
                  ตอบไปแล้ว: {selectedExam.questions.filter(q => {
                    const ans = answers[q.id];
                    if (q.type === "subjective") return !!(ans?.text?.trim() || ans?.drawing);
                    return ans !== undefined;
                  }).length} / {selectedExam.questions.length} ข้อ
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-amber-600">pending_actions</span>
                <span className="text-sm font-bold text-[#251817]">
                  ยังไม่ได้ตอบ: {selectedExam.questions.length - selectedExam.questions.filter(q => {
                    const ans = answers[q.id];
                    if (q.type === "subjective") return !!(ans?.text?.trim() || ans?.drawing);
                    return ans !== undefined;
                  }).length} ข้อ
                </span>
              </div>
            </div>

            {/* รายละเอียดคำตอบแต่ละข้อ */}
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
              {selectedExam.questions.map((q, idx) => {
                const ans = answers[q.id];
                const isAnswered = q.type === "subjective" ? !!(ans?.text?.trim() || ans?.drawing) : ans !== undefined;

                return (
                  <div key={q.id} className={`p-4 rounded-2xl border transition-all ${isAnswered ? "bg-[#fffcfc] border-[#e0bfbc]/40" : "bg-red-50/40 border-red-200/50"}`}>
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <div className="flex items-start gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isAnswered ? "bg-[#8e171c] text-white" : "bg-red-100 text-red-700"}`}>
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-bold text-[#251817] line-clamp-2">{q.text}</p>
                          <p className="text-[11px] text-gray-500 font-medium">ประเภท: {q.type === "subjective" ? "อัตนัย (เขียนตอบ)" : "ปรนัย (ตัวเลือก)"} | คะแนน: {q.points} คะแนน</p>
                        </div>
                      </div>
                      <div>
                        {isAnswered ? (
                          <span className="text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full whitespace-nowrap">ตอบแล้ว</span>
                        ) : (
                          <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full whitespace-nowrap">ยังไม่ได้ตอบ</span>
                        )}
                      </div>
                    </div>

                    {/* แสดงสิ่งที่ตอบ */}
                    <div className="mt-3 pl-8 text-xs text-[#59413f] bg-white border border-[#e0bfbc]/20 rounded-xl p-3">
                      {q.type !== "subjective" ? (
                        ans !== undefined ? (
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-green-600">check</span>
                            <span>คำตอบที่เลือก: <strong className="text-[#8e171c]">ตัวเลือกที่ {ans + 1}</strong> ({q.options[ans]})</span>
                          </div>
                        ) : (
                          <span className="text-red-500 font-semibold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">warning</span>
                            กรุณากลับไปตอบคำถามข้อนี้
                          </span>
                        )
                      ) : (
                        <div className="space-y-2">
                          {ans?.text?.trim() ? (
                            <div>
                              <p className="font-bold text-gray-700 mb-1">คำอธิบายที่บันทึก:</p>
                              <p className="bg-gray-50 p-2 rounded-lg italic text-[#251817] border border-gray-100 leading-relaxed whitespace-pre-wrap">{ans.text}</p>
                            </div>
                          ) : null}
                          {ans?.drawing ? (
                            <div>
                              <p className="font-bold text-gray-700 mb-1">ภาพวาดพู่กันจีน/ภาพสเก็ตช์:</p>
                              <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 flex justify-center max-w-xs">
                                <img src={ans.drawing} alt="คำตอบวาดเขียน" className="max-h-24 object-contain rounded" referrerPolicy="no-referrer" />
                              </div>
                            </div>
                          ) : null}
                          {!ans?.text?.trim() && !ans?.drawing && (
                            <span className="text-red-500 font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">warning</span>
                              กรุณากลับไปตอบคำถามข้อนี้
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ส่วนกดยืนยันส่ง */}
            <div className="border-t border-[#e0bfbc]/30 pt-6 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-2xl bg-amber-50/50 border border-amber-200/60 hover:bg-amber-50 transition-all">
                <input
                  type="checkbox"
                  checked={confirmSubmitChecked}
                  onChange={(e) => setConfirmSubmitChecked(e.target.checked)}
                  className="mt-0.5 h-4.5 w-4.5 accent-[#8e171c] cursor-pointer shrink-0"
                />
                <span className="text-xs font-bold text-amber-950 leading-relaxed">
                  ข้าพเจ้ายืนยันว่าได้ทำการตรวจทานคำตอบทั้งหมดเรียบร้อยแล้ว และตกลงส่งกระดาษคำตอบในขณะนี้ โดยเข้าใจว่าระบบจะล็อกผลการสอบและคะแนนทันที และไม่สามารถกลับมาแก้ไขได้อีกเป็นครั้งที่สอง
                </span>
              </label>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-5 py-2.5 bg-white border border-[#e0bfbc] text-[#59413f] hover:bg-[#fff8f7] rounded-full font-bold text-sm transition-all cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                  กลับไปทำต่อ
                </button>
                <button
                  onClick={executeSubmitExam}
                  disabled={!confirmSubmitChecked}
                  className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-1.5 shadow-md ${
                    confirmSubmitChecked
                      ? "bg-[#ba1a1a] hover:bg-[#a01616] text-white shadow-[#ba1a1a]/15 cursor-pointer"
                      : "bg-gray-200 text-gray-400 shadow-none cursor-not-allowed"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  ยืนยันส่งข้อสอบและเสร็จสิ้น
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-4">
            <div className="md:col-span-1 bg-white border border-[#e0bfbc]/40 rounded-3xl p-5 h-fit shadow-sm">
              <h4 className="text-xs font-bold text-[#59413f] uppercase tracking-wider mb-4">ผังข้อสอบ</h4>
              <div className="grid grid-cols-4 gap-2">
                {selectedExam.questions.map((q, idx) => {
                  const isAnswered = q.type === "subjective" ? !!(answers[q.id]?.text?.trim() || answers[q.id]?.drawing) : answers[q.id] !== undefined;
                  const isCurrent = idx === currentQuestionIndex;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all cursor-pointer ${
                        isCurrent ? "bg-[#8e171c] text-white ring-4 ring-[#8e171c]/15" : isAnswered ? "bg-[#ffd0cc] text-[#8e171c]" : "bg-[#fff8f7] text-[#59413f] border border-[#e0bfbc]/60 hover:bg-[#ffe9e7]"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-3 space-y-6">
              <div className="bg-white border border-[#e0bfbc]/60 rounded-3xl p-6 md:p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-xs font-bold text-[#8c706e]">คำถามที่ {currentQuestionIndex + 1} จาก {selectedExam.questions.length}</span>
                  <span className="text-xs font-bold text-[#8e171c] bg-[#ffdad7] px-2.5 py-1 rounded-full">{currentQuestion.points} คะแนน</span>
                </div>
                <h2 className="text-xl font-bold text-[#251817] mb-6">{currentQuestion.text}</h2>

                {currentQuestion.imageUrl && (
                  <div className="mb-8 flex justify-center bg-[#fff8f7] border p-4 rounded-3xl">
                    <img src={currentQuestion.imageUrl} alt="โจทย์" className="max-h-[350px] object-contain rounded-2xl" referrerPolicy="no-referrer" />
                  </div>
                )}

                {currentQuestion.type === "subjective" ? (
                  <div className="space-y-6">
                    {(!currentQuestion.subjectiveMode || currentQuestion.subjectiveMode === "text") && (
                      <textarea
                        placeholder="พิมพ์อธิบายคำตอบของคุณที่นี่..."
                        value={answers[currentQuestion.id]?.text || ""}
                        onChange={(e) => handleSubjectiveTextChange(currentQuestion.id, e.target.value)}
                        className="w-full px-5 py-4 rounded-3xl border border-[#e0bfbc] h-36 resize-none outline-none focus:border-[#8e171c]"
                      />
                    )}
                    {currentQuestion.subjectiveMode === "canvas" && (
                      <DrawingCanvas value={answers[currentQuestion.id]?.drawing || ""} onChange={(dataUrl) => handleSubjectiveDrawingChange(currentQuestion.id, dataUrl)} />
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentQuestion.options.map((option, idx) => {
                      const isSelected = answers[currentQuestion.id] === idx;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelectOption(currentQuestion.id, idx)}
                          className={`w-full text-left px-6 py-4 rounded-full border transition-all flex items-center gap-4 cursor-pointer text-sm ${
                            isSelected ? "border-[#8e171c] bg-[#ffd0cc]/30 text-[#8e171c]" : "border-[#e0bfbc]/70 bg-white"
                          }`}
                        >
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isSelected ? "bg-[#8e171c] text-white" : "bg-[#fbe3e0] text-[#8e171c]"}`}>{idx + 1}</span>
                          <span>{option}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center">
                <button disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex((prev) => prev - 1)} className="px-5 py-2.5 bg-white border border-[#e0bfbc] text-[#59413f] rounded-full font-bold text-sm disabled:opacity-40 cursor-pointer">ย้อนกลับ</button>
                {currentQuestionIndex < selectedExam.questions.length - 1 ? (
                  <button onClick={() => setCurrentQuestionIndex((prev) => prev + 1)} className="px-6 py-2.5 bg-[#8e171c] text-white rounded-full font-bold text-sm cursor-pointer">ถัดไป</button>
                ) : (
                  <button onClick={() => handleSubmitExam(false)} className="px-6 py-2.5 bg-[#ba1a1a] text-white rounded-full font-bold text-sm cursor-pointer">ตรวจทานคำตอบเพื่อส่ง</button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

    </div>
  );
}
