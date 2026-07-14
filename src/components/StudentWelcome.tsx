import React, { useState } from "react";
import { Student, Submission, Exam } from "../types";

interface StudentWelcomeProps {
  students: Student[];
  submissions: Submission[];
  activeExams: Exam[];
  onEnterExamRoom: (studentId: string) => void;
  onGoToTeacherLogin: () => void;
  onGoToScoreLookup: () => void;
  isLoadingPublicData?: boolean;
  publicDataError?: string | null;
  activeSheetId?: string | null;
  onResetToDemo?: () => void;
  onRetryLoadPublicData?: () => void;
}

export default function StudentWelcome({
  students,
  submissions,
  activeExams,
  onEnterExamRoom,
  onGoToTeacherLogin,
  onGoToScoreLookup,
  isLoadingPublicData = false,
  publicDataError = null,
  activeSheetId = null,
  onResetToDemo,
  onRetryLoadPublicData,
}: StudentWelcomeProps) {
  const [studentId, setStudentId] = useState("");
  const [errorText, setErrorText] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentId.length < 5) {
      setErrorText("โปรดระบุรหัสนักเรียนให้ครบ 5 หลัก");
      return;
    }

    setIsValidating(true);
    
    setTimeout(() => {
      const foundStudent = students.find((s) => s.id === studentId);
      if (!foundStudent) {
        setErrorText("ไม่พบรหัสนักเรียนนี้ในฐานข้อมูล กรุณาตรวจสอบอีกครั้งหรือติดต่ออาจารย์ผู้สอน");
        setIsValidating(false);
      } else {
        const studentSubmissions = submissions.filter((s) => s.studentId === studentId);
        const activeExamsFiltered = activeExams.filter((e) => e.isActive);
        
        const completedActiveExams = activeExamsFiltered.filter((e) =>
          studentSubmissions.some((s) => s.examId === e.id && s.status === "สมบูรณ์")
        );

        if (activeExamsFiltered.length > 0 && completedActiveExams.length === activeExamsFiltered.length) {
          setErrorText("คุณได้ส่งคำตอบแล้ว");
          setIsValidating(false);
          return;
        }

        setErrorText("");
        setIsValidating(false);
        onEnterExamRoom(studentId);
      }
    }, 800);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 5);
    setStudentId(val);
    if (val.length === 5) {
      setErrorText("");
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col font-sans relative bg-[#fff8f7] antialiased text-[#251817] overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="absolute top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-[#e0bfbc]/20 h-14 flex items-center">
        <div className="flex justify-between items-center px-6 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-2.5">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="w-7 h-7 object-contain rounded-lg" 
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }} 
            />
            <span className="text-base font-black text-[#8e171c] tracking-tight">ห้องเรียนเหล่าซรือแบมแบม</span>
          </div>
          <div className="flex items-center">
            <button
              onClick={onGoToTeacherLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#fff0f0] border border-[#e0bfbc] hover:border-[#8e171c] text-[#8e171c] font-bold text-[11px] rounded-full transition-all duration-200 shadow-sm cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
              สำหรับครู/ผู้ดูแลระบบ
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Canvas - บังคับกึ่งกลางหน้าจอพอดี */}
      <main className="flex-grow flex items-center justify-center px-4 relative z-10 pt-10">
        {/* Subtle Academic Background Decoration */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <div className="absolute top-[15%] left-[10%] transform -rotate-12">
            <span className="material-symbols-outlined text-[100px] text-[#e0bfbc]">menu_book</span>
          </div>
          <div className="absolute bottom-[15%] right-[12%] transform rotate-6">
            <span className="material-symbols-outlined text-[120px] text-[#e0bfbc]">history_edu</span>
          </div>
        </div>

        {/* Student Access Card - ปรับขนาดให้กะทัดรัดขึ้น */}
        <div className="relative w-full max-w-[420px] bg-white border border-[#e0bfbc]/30 rounded-[28px] p-6 shadow-xl shadow-[#8e171c]/5">
          
          {/* รัศมีแสงด้านหลัง */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-[#ffdad7]/40 blur-3xl rounded-full -z-10" />
          
          {/* ส่วนหัวการ์ดและโลโก้ */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center mb-3 p-1.5 bg-white rounded-xl shadow-sm border border-[#e0bfbc]/20">
              <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
            </div>
            <h1 className="text-xl font-black text-[#251817] mb-0.5 tracking-tight">ห้องเรียนเหล่าซรือแบมแบม</h1>
            <p className="text-[11px] font-bold text-[#8e171c] uppercase tracking-wide">ระบบการทดสอบภาษาจีนออนไลน์</p>
            <p className="text-[10px] font-medium text-[#8c706e]">กรุณาระบุตัวตนเพื่อเข้าสอบกลางภาค 1/2569</p>
          </div>

          {/* Sync Status - ลดขนาดให้แบนบางลง */}
          <div className="mb-4">
            {isLoadingPublicData && (
              <div className="flex items-center justify-center p-2.5 bg-amber-50/40 rounded-xl border border-amber-200/40 animate-pulse gap-2">
                <div className="w-4 h-4 border-2 border-[#8e171c] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[10px] font-bold text-[#8f4a46]">กำลังโหลดรายชื่อและข้อสอบล่าสุด...</p>
              </div>
            )}

            {publicDataError && (
              <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200 text-left flex items-center justify-between">
                <p className="text-[10px] text-amber-800 font-medium">โหลดข้อมูลจากครูไม่สำเร็จ</p>
                {onRetryLoadPublicData && (
                  <button onClick={onRetryLoadPublicData} className="text-[10px] font-bold text-[#8e171c] underline cursor-pointer">ลองใหม่</button>
                )}
              </div>
            )}

            {!isLoadingPublicData && !publicDataError && (
              <div className="flex items-center justify-between p-2 bg-emerald-50/70 rounded-xl border border-emerald-200/50">
                <div className="flex items-center gap-1.5 text-emerald-800">
                  <span className="material-symbols-outlined text-emerald-600 text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_done</span>
                  <p className="text-[10px] font-bold text-emerald-900">เชื่อมโยงระบบคลาวด์คลังข้อสอบสำเร็จ</p>
                </div>
              </div>
            )}
          </div>

          {/* กล่องกติกาฉบับปรับปรุงใหม่ กระชับ ได้ใจความ ไม่เบียดพื้นที่ */}
          <div className="p-3 bg-[#fffaf0] border border-[#f5e2b3]/60 rounded-xl text-left text-[11px] text-[#59413f] space-y-1.5 mb-4 shadow-sm">
            <p className="font-bold flex items-center gap-1 text-[#8e171c]">
              <span className="material-symbols-outlined text-[14px]">gavel</span>
              กฎการสอบอย่างเข้มงวด (Anti-Cheating)
            </p>
            <div className="grid grid-cols-1 gap-1 pl-1 text-[10.5px]">
              <div className="flex items-center gap-1">
                <span className="text-[#8e171c] font-bold">⚠️ ระบบ 3 Strikes:</span> ห้ามสลับหน้าจอ แท็บ หรือแคปจอเด็ดขาด
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#ba1a1a] font-bold">🚫 บทลงโทษ:</span> ทำผิดครบ 3 ครั้ง ระบบส่งข้อสอบทันทีและได้ 0 คะแนน
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[#8e171c] font-bold">🤖 ห้ามใช้เครื่องมือ:</span> ห้ามเปิด AI หรือโปรแกรมแปลภาษาควบคู่กัน
              </div>
            </div>
          </div>

          {/* Form กรอกรหัสนักเรียน */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="studentId" className="block text-[10px] font-bold text-[#59413f] ml-1">
                รหัสนักเรียน (5 หลัก)
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#8c706e] text-[18px]">
                  badge
                </span>
                <input
                  id="studentId"
                  type="text"
                  pattern="\d*"
                  inputMode="numeric"
                  maxLength={5}
                  value={studentId}
                  onChange={handleInputChange}
                  placeholder="00000"
                  disabled={isValidating || isLoadingPublicData}
                  className="w-full pl-11 pr-4 py-2.5 rounded-full border border-[#e0bfbc] bg-white focus:border-[#8e171c] focus:ring-4 focus:ring-[#8e171c]/10 transition-all text-center text-xl font-bold tracking-[0.5em] text-[#251817] outline-none placeholder:text-gray-200 disabled:bg-gray-50 disabled:text-gray-400"
                  required
                />
              </div>
              {errorText && (
                <p className="text-[#ba1a1a] text-[11px] font-semibold text-center mt-0.5">
                  {errorText}
                </p>
              )}
            </div>

            <div className="pt-0.5">
              <button
                type="submit"
                disabled={isValidating || isLoadingPublicData}
                className="w-full bg-[#8e171c] hover:bg-[#8c161b] text-white font-bold py-3 rounded-full shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-80 text-xs disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                <span>{isLoadingPublicData ? "กำลังเตรียมข้อมูลห้องสอบ..." : isValidating ? "กำลังตรวจสอบ..." : "เข้าสู่ห้องสอบ"}</span>
                {!isValidating && !isLoadingPublicData && <span className="material-symbols-outlined text-[16px]">arrow_forward</span>}
              </button>
            </div>

            <div>
              <button
                type="button"
                onClick={onGoToScoreLookup}
                className="w-full flex items-center justify-center gap-1 px-4 py-2.5 rounded-full border border-[#e0bfbc] hover:border-[#8e171c] text-[#8f4a46] hover:text-[#8e171c] hover:bg-[#fff5f5] transition-all font-bold text-[11px] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">analytics</span>
                <span>ตรวจสอบคะแนนสอบ</span>
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer Information - ติดขอบล่างพอดี */}
      <footer className="py-3 px-6 border-t border-[#e0bfbc]/15 bg-white/40 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2 text-[10px] text-[#59413f]">
          <div className="font-medium text-center md:text-left">
            © 2026 ห้องเรียนเหล่าซรือแบมแบม (Thailand). สงวนลิขสิทธิ์ | พัฒนาโดย คุณครูชญานิศ พลวาปี
          </div>
          <div className="flex gap-4 font-semibold">
            <a href="#" className="hover:text-[#8e171c] transition-colors">นโยบายความเป็นส่วนตัว</a>
            <a href="#" className="hover:text-[#8e171c] transition-colors">ติดต่อเจ้าหน้าที่</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
