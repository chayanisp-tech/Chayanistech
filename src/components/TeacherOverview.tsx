import React from "react";
import { Student, Exam, Submission, SyncStatus } from "../types";

interface TeacherOverviewProps {
  students: Student[];
  exams: Exam[];
  submissions: Submission[];
  syncStatus: SyncStatus;
  onTriggerSync: () => void;
  onConnectGoogle: () => void;
  onSwitchTab: (tab: string) => void;
}

export default function TeacherOverview({
  students,
  exams,
  submissions,
  syncStatus,
  onTriggerSync,
  onConnectGoogle,
  onSwitchTab,
}: TeacherOverviewProps) {
  const activeExamsCount = exams.filter((e) => e.isActive).length;
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = () => {
    if (!syncStatus.spreadsheetId) return;
    const link = `${window.location.origin}/?sheetId=${syncStatus.spreadsheetId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  
  // Calculate average score
  let avgScore = "0.0";
  if (submissions.length > 0) {
    let totalScoreObtained = 0;
    let totalMaxScore = 0;

    submissions.forEach((sub) => {
      totalScoreObtained += sub.score || 0;
      // ไปค้นหาคะแนนเต็มจากตัวข้อสอบจริง (exams) โดยใช้ examId
      const relatedExam = exams.find((e) => e.id === sub.examId);
      totalMaxScore += relatedExam ? (relatedExam.totalScore || 0) : (sub.score || 10);
    });

    if (totalMaxScore > 0) {
      avgScore = ((totalScoreObtained / totalMaxScore) * 100).toFixed(1);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-extrabold text-[#251817] tracking-tight">แผงควบคุมระบบสอบ</h1>
        <p className="text-sm text-[#59413f] mt-1">ภาพรวมการใช้งานระบบสอบออนไลน์ภาษาจีน สถิตินักเรียน คะแนนเฉลี่ย และสถานะการเชื่อมโยงข้อมูล</p>
      </div>

      {/* Sync Control Alert Card */}
      <div className="bg-white border border-[#e0bfbc] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-[#ffdad7] text-[#8e171c] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              cloud_sync
            </span>
          </div>
          <div>
            <h3 className="font-bold text-[#251817] text-lg">การเชื่อมโยงข้อมูล Google Drive และ Google Sheets</h3>
            <p className="text-xs text-[#59413f] mt-0.5 max-w-xl">
              {syncStatus.spreadsheetId 
                ? `ซิงค์ฐานข้อมูลนักเรียนและประวัติคะแนนสอบกับไฟล์ "ExamMaster_Database" ในบัญชี Google ไดรฟ์แล้ว`
                : "ขณะนี้แอปพลิเคชันยังไม่ได้รับการเชื่อมโยงกับบัญชี Google ไดรฟ์ของคุณ ข้อมูลนักเรียนและคะแนนจะถูกบันทึกไว้ชั่วคราวในเบราว์เซอร์นี้"}
            </p>
            {syncStatus.lastSyncedAt && (
              <p className="text-[10px] font-mono text-[#8c706e] mt-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">schedule</span>
                ซิงค์ครั้งล่าสุด: {new Date(syncStatus.lastSyncedAt).toLocaleString("th-TH")}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          {syncStatus.spreadsheetId ? (
            <>
              <a
                href={syncStatus.spreadsheetUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-white hover:bg-[#fff8f7] border border-[#e0bfbc] text-[#8e171c] rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                เปิด Google Sheets
              </a>
              <button
                onClick={onTriggerSync}
                disabled={syncStatus.isSyncing}
                className="px-5 py-2.5 bg-[#8e171c] hover:bg-[#8c161b] text-white rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-[#8e171c]/10 cursor-pointer disabled:opacity-75"
              >
                <span className="material-symbols-outlined text-[16px]">sync</span>
                <span>{syncStatus.isSyncing ? "กำลังซิงค์..." : "ซิงค์ด่วน"}</span>
              </button>
            </>
          ) : (
            <button
              onClick={onConnectGoogle}
              className="px-5 py-2.5 bg-[#8e171c] hover:bg-[#8c161b] text-white rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-[#8e171c]/10 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">key</span>
              เชื่อมโยง Google Drive
            </button>
          )}
        </div>
      </div>

      {/* Student Link Share Card */}
      {syncStatus.spreadsheetId && (
        <div className="bg-[#fff8f7] border border-[#e0bfbc] rounded-3xl p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[#8e171c] text-[24px] shrink-0 mt-0.5">link</span>
            <div className="space-y-1">
              <h4 className="font-bold text-[#251817] text-base">🔗 ลิงก์ทำข้อสอบของนักเรียน (Student Exam Link)</h4>
              <p className="text-xs text-[#59413f]">
                เมื่อต้องการให้นักเรียนเข้ามาทำข้อสอบ ให้คุณครูคัดลอกลิงก์ด้านล่างนี้ส่งให้นักเรียนแทนลิงก์มาตรฐาน ตัวแอปบนหน้าต่างนักเรียนจะดึงรายชื่อและข้อสอบล่าสุดจาก Google Sheet ของคุณครูมาใช้โดยตรงในแบบเรียลไทม์ (สด) เพื่อให้เวอร์ชันข้อสอบตรงกันเสมอครับ
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/?sheetId=${syncStatus.spreadsheetId}`}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#e0bfbc] bg-white text-xs font-mono text-[#251817] outline-none select-all"
            />
            <button
              onClick={handleCopyLink}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                copied
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/10"
                  : "bg-[#8e171c] hover:bg-[#8c161b] text-white shadow-md shadow-[#8e171c]/10"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {copied ? "check_circle" : "content_copy"}
              </span>
              <span>{copied ? "คัดลอกสำเร็จ!" : "คัดลอกลิงก์ให้นักเรียน"}</span>
            </button>
          </div>

          <p className="text-[11px] text-[#8e171c] bg-[#ffd0cc]/30 p-3 rounded-2xl border border-[#ffd0cc]/40">
            <strong>⚠️ คำแนะนำสำคัญเพื่อความถูกต้องของข้อสอบ:</strong> เพื่อให้นักเรียนเข้าโหลดข้อสอบและรายชื่อได้สำเร็จ คุณครูต้องตั้งค่าสิทธิ์การเข้าถึงทั่วไปของไฟล์ Google Sheet ของคุณครูให้เป็น <strong>"ทุกคนที่มีลิงก์มีสิทธิ์อ่าน (Anyone with the link can view)"</strong> ในปุ่มแชร์ด้วยนะครับ (นักเรียนสามารถอ่านได้อย่างเดียว ไม่สามารถแอบแก้ไขข้อมูลได้ครับ)
          </p>
        </div>
      )}

      {/* Numerical Stats widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Widget 1: Students */}
        <div className="bg-white border border-[#e0bfbc]/40 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-[#8c706e] text-xs font-bold uppercase tracking-wider">นักเรียนทั้งหมด</span>
            <span className="material-symbols-outlined text-[#8e171c] opacity-60">groups</span>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-black text-[#251817]">{students.length}</div>
            <button 
              onClick={() => onSwitchTab("students")}
              className="text-[10px] font-bold text-[#8f4a46] hover:text-[#8e171c] flex items-center gap-0.5 cursor-pointer"
            >
              จัดการรายชื่อนักเรียน <span className="material-symbols-outlined text-[12px]">arrow_right</span>
            </button>
          </div>
        </div>

        {/* Widget 2: Active Exams */}
        <div className="bg-white border border-[#e0bfbc]/40 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-[#8c706e] text-xs font-bold uppercase tracking-wider">ข้อสอบที่เปิดอยู่</span>
            <span className="material-symbols-outlined text-[#8e171c] opacity-60">edit_note</span>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-black text-[#251817]">{activeExamsCount} / {exams.length}</div>
            <button 
              onClick={() => onSwitchTab("exams")}
              className="text-[10px] font-bold text-[#8f4a46] hover:text-[#8e171c] flex items-center gap-0.5 cursor-pointer"
            >
              เปิดหรือปิดสถานะข้อสอบ <span className="material-symbols-outlined text-[12px]">arrow_right</span>
            </button>
          </div>
        </div>

        {/* Widget 3: Submissions */}
        <div className="bg-white border border-[#e0bfbc]/40 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-[#8c706e] text-xs font-bold uppercase tracking-wider">ทำข้อสอบเสร็จสิ้น</span>
            <span className="material-symbols-outlined text-[#8e171c] opacity-60">assignment_turned_in</span>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-black text-[#251817]">{submissions.length}</div>
            <button 
              onClick={() => onSwitchTab("grading")}
              className="text-[10px] font-bold text-[#8f4a46] hover:text-[#8e171c] flex items-center gap-0.5 cursor-pointer"
            >
              ดูผลการส่งข้อสอบและคะแนน <span className="material-symbols-outlined text-[12px]">arrow_right</span>
            </button>
          </div>
        </div>

        {/* Widget 4: Avg Score Percent */}
        <div className="bg-white border border-[#e0bfbc]/40 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-[#8c706e] text-xs font-bold uppercase tracking-wider">คะแนนเฉลี่ยรวม</span>
            <span className="material-symbols-outlined text-[#8e171c] opacity-60">analytics</span>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-black text-[#251817]">{avgScore}%</div>
            <p className="text-[10px] font-medium text-[#8c706e]">ค่าเฉลี่ยของคะแนนนักเรียนทั้งหมดที่สอบเสร็จ</p>
          </div>
        </div>
      </div>

      {/* Submissions & System integrity log split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Submissions */}
        <div className="bg-white border border-[#e0bfbc]/40 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-[#251817]">รายการส่งข้อสอบล่าสุด</h3>
            <button 
              onClick={() => onSwitchTab("grading")}
              className="text-xs font-bold text-[#8e171c] hover:underline cursor-pointer"
            >
              ดูทั้งหมด
            </button>
          </div>

          {submissions.length === 0 ? (
            <div className="text-center py-10 text-[#59413f]">
              <span className="material-symbols-outlined text-[40px] opacity-30 mb-2">inbox</span>
              <p className="text-sm">ยังไม่มีนักเรียนส่งข้อสอบในระบบ</p>
            </div>
          ) : (
            <div className="divide-y divide-[#e0bfbc]/20">
              {submissions.slice(0, 5).map((sub) => (
                <div key={sub.submissionId} className="py-3 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-bold text-[#251817]">{sub.studentName}</p>
                    <p className="text-xs text-[#8c706e]">{sub.examTitle} ({sub.studentId})</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#8e171c]">{sub.score} / {sub.totalPoints} คะแนน</p>
                    <p className="text-[10px] text-[#8c706e]">
                      {new Date(sub.submittedAt).toLocaleTimeString("th-TH")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security Logs / Status Check */}
        <div className="bg-white border border-[#e0bfbc]/40 rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#251817] mb-6">สถานะความปลอดภัยและการคุมสอบ</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-[#fff8f7] rounded-2xl border border-[#e0bfbc]/30">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#8e171c] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  lock_open
                </span>
                <div>
                  <p className="font-bold text-[#251817] text-xs">ระบบป้องกันเบราว์เซอร์ล็อกดาวน์</p>
                  <p className="text-[10px] text-[#59413f]">ตรวจจับการย้ายแท็บและสลับหน้าต่าง</p>
                </div>
              </div>
              <span className="text-xs bg-[#ffd0cc] text-[#8e171c] font-bold px-2.5 py-0.5 rounded-full">เปิดใช้งาน</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-[#fff8f7] rounded-2xl border border-[#e0bfbc]/30">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#8e171c] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  photo_camera
                </span>
                <div>
                  <p className="font-bold text-[#251817] text-xs">การคุมสอบด้วยระบบ AI proctoring</p>
                  <p className="text-[10px] text-[#59413f]">เฝ้าระวังสตรีมวีดีโอหรือหน้าจอ</p>
                </div>
              </div>
              <span className="text-xs bg-[#ffd0cc] text-[#8e171c] font-bold px-2.5 py-0.5 rounded-full">เปิดใช้งาน</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-[#fff8f7] rounded-2xl border border-[#e0bfbc]/30">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#8e171c] text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified_user
                </span>
                <div>
                  <p className="font-bold text-[#251817] text-xs">เครื่องมือตรวจสอบสิทธิ์นักเรียนแบบยืนยัน</p>
                  <p className="text-[10px] text-[#59413f]">ตรวจสอบรหัสผ่านนักเรียนและทะเบียน 5 หลัก</p>
                </div>
              </div>
              <span className="text-xs bg-[#ffd0cc] text-[#8e171c] font-bold px-2.5 py-0.5 rounded-full">เปิดใช้งาน</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
