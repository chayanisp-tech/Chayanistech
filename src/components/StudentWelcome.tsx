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
    
    // Simulate validation with a brief nice delay
    setTimeout(() => {
      const foundStudent = students.find((s) => s.id === studentId);
      if (!foundStudent) {
        setErrorText("ไม่พบรหัสนักเรียนนี้ในฐานข้อมูล กรุณาตรวจสอบอีกครั้งหรือติดต่ออาจารย์ผู้สอน");
        setIsValidating(false);
      } else {
        // Check if they have submitted all active exams
        const studentSubmissions = submissions.filter((s) => s.studentId === studentId);
        const activeExamsFiltered = activeExams.filter((e) => e.isActive);
        
        // Find if they have completed all active exams with status "สมบูรณ์"
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
    <div className="min-h-screen flex flex-col font-sans relative bg-[#fff8f7] text-[#251817]">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#fff8f7] border-b border-[#e0bfbc]/30 h-16">
        <div className="flex justify-between items-center px-6 h-full w-full max-w-7xl mx-auto">
          {/* 🌟 1) ปรับโลโก้และชื่อแบรนด์ฝั่งซ้ายเป็น "ห้องเรียนเหล่าซรือแบมแบม" */}
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }} />
            <span className="text-xl font-bold text-[#8e171c] tracking-tight">ห้องเรียนเหล่าซรือแบมแบม</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onGoToTeacherLogin}
              className="flex items-center gap-2 px-5 py-2 bg-[#fbe3e0] hover:bg-[#f5dddb] text-[#8e171c] font-medium text-sm rounded-full transition-all active:scale-95 border border-[#e0bfbc]/50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
              สำหรับครู/ผู้ดูแลระบบ
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-6 relative overflow-hidden">
        {/* Subtle Academic Background Decoration */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
          <div className="absolute top-[15%] left-[10%] transform -rotate-12">
            <span className="material-symbols-outlined text-[120px] text-[#e0bfbc] opacity-20">menu_book</span>
          </div>
          <div className="absolute bottom-[10%] right-[15%] transform rotate-6">
            <span className="material-symbols-outlined text-[150px] text-[#e0bfbc] opacity-20">history_edu</span>
          </div>
          <div className="absolute top-[20%] right-[5%] transform rotate-45">
            <span className="material-symbols-outlined text-[80px] text-[#e0bfbc] opacity-20">architecture</span>
          </div>
        </div>

        {/* Student Access Card */}
        <div className="relative z-10 w-full max-w-[480px] bg-white border border-[#e0bfbc]/60 rounded-3xl p-8 shadow-sm">
          
          {/* 🌟 2) ปรับการ์ดต้อนรับตรงกลาง */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#ffdad7] text-[#8e171c] mb-4 p-3 shadow-inner">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => {
                e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' height='40' viewBox='0 -960 960 960' width='40'%3E%3Cpath fill='%238e171c' d='m480-120-320-120v-380l320-120 320 120v380L480-120Z'/%3E%3C/svg%3E";
              }} />
            </div>
            <h1 className="text-2xl font-black text-[#251817] mb-1 tracking-tight">ห้องเรียนเหล่าซรือแบมแบม</h1>
            <p className="text-sm font-bold text-[#8e171c] mb-1">ยินดีต้อนรับสู่ระบบการทดสอบภาษาจีนออนไลน์</p>
            <p className="text-xs font-semibold text-[#59413f]">กรุณาระบุตัวตนเพื่อเริ่มทำข้อสอบกลางภาค 1/2569</p>
          </div>

          {/* Database & Sheets Sync Status Panel */}
          <div className="mt-4 mb-4 text-left">
            {isLoadingPublicData && (
              <div className="flex flex-col items-center justify-center p-4 bg-amber-50/50 rounded-2xl border border-amber-200/50 animate-pulse">
                <div className="w-6 h-6 border-2 border-[#8e171c] border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-[11px] font-bold text-[#8f4a46] text-center">
                  กำลังดึงข้อมูลข้อสอบล่าสุดและรายชื่อนักเรียนจากคุณครู...
                </p>
              </div>
            )}

            {publicDataError && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300 text-left space-y-2">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-amber-700 text-[18px] shrink-0 mt-0.5">warning</span>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-900">โหลดเวอร์ชันคุณครูไม่สำเร็จ</p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">{publicDataError}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 border-t border-amber-200">
                  {onRetryLoadPublicData && (
                    <button
                      type="button"
                      onClick={onRetryLoadPublicData}
                      className="text-[10px] font-bold text-[#8e171c] hover:underline flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-[12px]">sync</span> ลองใหม่
                    </button>
                  )}
                  {onResetToDemo && (
                    <button
                      type="button"
                      onClick={onResetToDemo}
                      className="text-[10px] font-bold text-gray-600 hover:underline ml-auto flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-[12px]">refresh</span> ใช้ชุดข้อสอบจำลอง
                    </button>
                  )}
                </div>
              </div>
            )}

            {!isLoadingPublicData && !publicDataError && (
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-2xl border border-[#b2ebd5] shadow-sm">
                <div className="flex items-start gap-2 text-emerald-800">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_done</span>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold text-emerald-900">เชื่อมโยงระบบคลาวด์ Firebase สำเร็จ</p>
                    <p className="text-[9px] text-emerald-700">คลังข้อสอบและรายชื่อผู้เข้าสอบอัปเดตเป็นเวอร์ชันล่าสุดสดเสมอ</p>
                  </div>
                </div>
                {onResetToDemo && activeSheetId && (
                  <button
                    type="button"
                    onClick={onResetToDemo}
                    className="text-[10px] text-emerald-800 underline hover:text-emerald-950 font-bold ml-2 cursor-pointer shrink-0"
                    title="สลับกลับไปที่โหมดทดสอบมาตรฐาน"
                  >
                    ออก
                  </button>
                )}
              </div>
            )}
          </div>

{/* ⚠️ 3) กล่องแจ้งเตือนระบบป้องกันการทุจริตและการใช้ AI ล่าสุด (ฉบับเด็ดขาด) */}
          <div className="p-4 bg-[#fffaf0] border border-[#f5e2b3] rounded-2xl text-left text-xs text-[#7c5e10] space-y-2.5 mb-6 shadow-sm">
            <p className="font-bold flex items-center gap-1.5 text-[#8e171c] text-sm">
              <span className="material-symbols-outlined text-[18px]">gavel</span>
              ข้อปฏิบัติสำคัญและระบบตรวจสอบการทุจริตอย่างเข้มงวด (Anti-Cheating)
            </p>
            <ul className="list-disc list-inside space-y-1.5 font-medium text-[#59413f] leading-relaxed">
              <li>
                <span className="font-bold text-[#8e171c]">ระบบนับแต้มเตือนความปลอดภัย (3 Strikes):</span> ในระหว่างทำการทดสอบ ห้ามสลับหน้าจอ/เปลี่ยนแท็บ, ห้ามคลิกออกนอกหน้าต่างข้อสอบ, ห้ามคัดลอกข้อความ และห้ามกดปุ่มบันทึกหน้าจอ (PrintScreen) โดยเด็ดขาด 
              </li>
              <li>
                <span className="font-bold text-[#ba1a1a]">การลงโทษขั้นเด็ดขาด:</span> 
                <br />- ทำผิดกฎ <span className="font-bold text-[#8e171c]">ครั้งที่ 1</span>: ระบบจะแจ้งเตือนพฤติกรรมเสี่ยง
                <br />- ทำผิดกฎ <span className="font-bold text-[#8e171c]">ครั้งที่ 2</span>: ระบบจะเตือนว่า <span className="underline">"เหลืออีกครั้งสุดท้าย"</span>
                <br />- ทำผิดกฎ <span className="font-bold text-[#ba1a1a]">ครั้งที่ 3</span>: ระบบจะทำการ <span className="font-bold text-[#ba1a1a] underline">บังคับส่งกระดาษคำตอบทันที และตัดสินว่าทุจริตการสอบ คะแนนเป็นโมฆะ (0 คะแนน)</span> พร้อมตัดสิทธิ์การเข้าสอบวิชานี้อย่างถาวร
              </li>
              <li>
                <span className="font-bold text-[#8e171c]">ห้ามใช้เครื่องมือช่วยตอบ:</span> ห้ามมิให้ใช้ AI, เว็บไซต์แปลภาษา หรือเปิดโปรแกรมอื่นๆ ควบคู่กับการทำข้อสอบ
              </li>
            </ul>
            <p className="text-[10px] text-[#ba1a1a] font-bold pt-2 border-t border-[#f5e2b3] text-center leading-normal">
              *โปรดทำข้อสอบด้วยความซื่อสัตย์ ระบบบันทึกประวัติพฤติกรรมทุกอย่างส่งตรงถึงเหล่าซรือแบบเรียลไทม์*
            </p>
          </div>

          {/* Form กรอกรหัสนักเรียน */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="studentId" className="block text-xs font-semibold text-[#59413f] ml-1">
                รหัสนักเรียน (5 หลัก)
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#8c706e]">
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
                  disabled={isValidating}
                  className="w-full pl-12 pr-4 py-4 rounded-full border border-[#8c706e] bg-white focus:border-[#8e171c] focus:ring-4 focus:ring-[#8e171c]/10 transition-all text-center text-2xl font-bold tracking-[0.5em] text-[#251817] outline-none placeholder:text-gray-200"
                  required
                />
              </div>
              {errorText && (
                <p className="text-[#ba1a1a] text-xs font-semibold px-4 text-center mt-1">
                  {errorText}
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isValidating}
                className="w-full bg-[#8e171c] hover:bg-[#8c161b] text-white font-semibold py-4 rounded-full shadow-lg shadow-[#8e171c]/20 transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-80"
              >
                <span>{isValidating ? "กำลังตรวจสอบตัวตน..." : "เข้าสู่ห้องสอบ"}</span>
                {!isValidating && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
              </button>
            </div>

            <div className="mt-2">
              <button
                type="button"
                onClick={onGoToScoreLookup}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-[#e0bfbc] text-[#8f4a46] hover:bg-[#ffe9e7] transition-all font-semibold text-sm active:scale-[0.98] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">analytics</span>
                <span>ตรวจสอบคะแนนสอบ</span>
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-[#e0bfbc]/40 text-center">
            <p className="text-xs text-[#59413f] mb-4">ระบบรักษาความปลอดภัยแบบเข้ารหัส 256-bit</p>
            <div className="flex justify-center gap-6 grayscale opacity-60">
              <div className="flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider text-[#251817]">
                <span className="material-symbols-outlined text-[16px]">lock</span> SECURE
              </div>
              <div className="flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider text-[#251817]">
                <span className="material-symbols-outlined text-[16px]">verified</span> CERTIFIED
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Information */}
      <footer className="py-6 px-6 border-t border-[#e0bfbc]/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#59413f]">
          <div>© 2026 ห้องเรียนเหล่าซรือแบมแบม (Thailand). สงวนลิขสิทธิ์ | พัฒนาโดย คุณครูชญานิศ  พลวาปี]</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#8e171c] transition-colors">
              นโยบายความเป็นส่วนตัว
            </a>
            <a href="#" className="hover:text-[#8e171c] transition-colors">
              ติดต่อเจ้าหน้าที่
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
