import React, { useState } from "react";
import { Student, Exam, Submission, SystemSettings, SyncStatus } from "../types";
import TeacherOverview from "./TeacherOverview";
import TeacherStudents from "./TeacherStudents";
import TeacherExams from "./TeacherExams";
import TeacherGrading from "./TeacherGrading";
import TeacherSettings from "./TeacherSettings";

// =========================================================================
// 👥 ระบบเพิ่มรายชื่อคุณครูท่านอื่น
// =========================================================================
const ALLOWED_TEACHERS = [
  {
    email: "chayanis@school.ac.th", 
    name: "ครูชญานิศ พลวาปี",
    defaultImg: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop"
  },
  {
    email: "somchai@school.ac.th", 
    name: "ครูสมชาย ใจดี",
    defaultImg: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop"
  }
];

interface TeacherDashboardProps {
  teacherEmail: string;
  students: Student[];
  onAddStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onBulkLoadDefaults: () => void;
  onClearRoster: () => void;
  exams: Exam[];
  onAddExam: (exam: Exam) => void;
  onDeleteExam: (id: string) => void;
  onToggleActive: (id: string) => void;
  onUpdateExam: (exam: Exam) => void;
  submissions: Submission[];
  onDeleteSubmission: (id: string) => void;
  onUpdateSubmission: (submission: Submission) => void;
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  onDiscardSettings: () => void;
  syncStatus: SyncStatus;
  onTriggerSync: () => void;
  onConnectGoogle: () => void;
  onLogout: () => void;
}

export default function TeacherDashboard({
  teacherEmail,
  students,
  onAddStudent,
  onDeleteStudent,
  onBulkLoadDefaults,
  onClearRoster,
  exams,
  onAddExam,
  onDeleteExam,
  onToggleActive,
  onUpdateExam,
  submissions,
  onDeleteSubmission,
  onUpdateSubmission,
  settings,
  onUpdateSettings,
  onDiscardSettings,
  syncStatus,
  onTriggerSync,
  onConnectGoogle,
  onLogout,
}: TeacherDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const currentTeacherConfig = ALLOWED_TEACHERS.find(t => t.email.toLowerCase() === teacherEmail.toLowerCase());
  const displayTeacherName = currentTeacherConfig ? currentTeacherConfig.name : (settings.teacherName || "คุณครูผู้ดูแล");
  
  const defaultProfileImg = currentTeacherConfig ? currentTeacherConfig.defaultImg : "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop";
  const [customImg, setCustomImg] = useState(() => {
    return localStorage.getItem(`profile_img_${teacherEmail}`) || defaultProfileImg;
  });

  // ☁️ ฟังก์ชันเปิดหน้าต่างเลือกรูปภาพจาก Google Drive โดยตรง (ไม่ต้องใช้ลิงก์ยาว และเซฟลงชีทได้ปลอดภัย)
  const handleGoogleDriveImagePick = () => {
    // ตรวจสอบก่อนว่าคุณครูเชื่อมต่อ Google ไว้หรือยัง
    // @ts-ignore
    if (typeof gapi === "undefined" || !syncStatus.spreadsheetId) {
      alert("กรุณากดเชื่อมโยงบัญชี Google ที่แถบแจ้งเตือนด้านบนก่อนเลือกรูปภาพจาก Google Drive ครับ");
      return;
    }

    try {
      // @ts-ignore
      const view = new google.picker.View(google.picker.ViewId.DOCS_IMAGES);
      // @ts-ignore
      const picker = new google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(gapi.auth.getToken().access_token)
        .setCallback((data: any) => {
          // @ts-ignore
          if (data.action === google.picker.Action.PICKED) {
            const doc = data.docs[0];
            const fileId = doc.id;
            // แปลงสิทธิ์เป็นลิงก์ดึงรูปภาพของ Google Drive แบบสั้น กระทัดรัด ปลอดภัยต่อ Google Sheets 
            const googleDriveImageUrl = `https://lh3.googleusercontent.com/d/${fileId}=s150`;
            
            setCustomImg(googleDriveImageUrl);
            localStorage.setItem(`profile_img_${teacherEmail}`, googleDriveImageUrl);
            
            // ส่งค่ากลับไปบันทึกลงฐานข้อมูลหลัก (Google Sheets) ผ่านฟังก์ชันอัปเดตของระบบ
            onUpdateSettings({
              ...settings,
              teacherName: displayTeacherName // บันทึกควบคู่กันไป
            });
            
            alert("เชื่อมโยงรูปโปรไฟล์จาก Google Drive สำเร็จแล้วครับ!");
          }
        })
        .build();
      picker.setVisible(true);
    } catch (err) {
      // แผนสำรอง: ถ้า Picker โหลดไม่สำเร็จเนื่องจากเรื่องสิทธิ์ (iFrame) จะให้กรอกรหัสไฟล์สั้นๆ แทน
      const fallbackId = prompt("เกิดข้อขัดข้องในการเปิดหน้าต่างเลือกไฟล์ กรุณานำ 'ID ไฟล์รูปภาพ' จาก Google Drive มาวางที่นี่แทนครับ:");
      if (fallbackId && fallbackId.trim() !== "") {
        const cleanId = fallbackId.split("id=")[1] || fallbackId.split("/d/")[1]?.split("/")[0] || fallbackId.trim();
        const fallbackUrl = `https://lh3.googleusercontent.com/d/${cleanId}=s150`;
        setCustomImg(fallbackUrl);
        localStorage.setItem(`profile_img_${teacherEmail}`, fallbackUrl);
        alert("บันทึกรูปโปรไฟล์เรียบร้อยครับ!");
      }
    }
  };

  const handleCreateNewExamQuick = () => {
    setActiveTab("exams");
  };

  return (
    <div className="min-h-screen flex bg-[#fff8f7] font-sans text-[#251817]">
      
      {/* 1. LEFT SIDEBAR PANEL */}
      <aside className="w-80 border-r border-[#e0bfbc]/40 bg-white flex flex-col justify-between shrink-0 h-screen sticky top-0 hidden md:flex">
        <div className="p-6 space-y-8">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#8e171c] text-3xl font-black">school</span>
            <div>
              <span className="text-lg font-black text-[#8e171c] tracking-tight block leading-none">ExamMaster Pro</span>
              <span className="text-[10px] font-bold text-[#8c706e] tracking-wider uppercase">Portal ผู้สอน</span>
            </div>
          </div>

          {/* Quick Create Button */}
          <div>
            <button
              onClick={handleCreateNewExamQuick}
              className="w-full bg-[#8e171c] hover:bg-[#8c161b] text-white font-bold py-3 px-5 rounded-full shadow-md shadow-[#8e171c]/10 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              สร้างข้อสอบใหม่
            </button>
          </div>

          {/* Sidebar Menu Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-full font-bold text-sm transition-all cursor-pointer ${
                activeTab === "overview" ? "bg-[#ffdad7] text-[#8e171c]" : "text-[#59413f] hover:bg-[#fff8f7] hover:text-[#251817]"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeTab === "overview" ? "'FILL' 1" : "'FILL' 0" }}>
                dashboard
              </span>
              <span>แผงควบคุม</span>
            </button>

            <button
              onClick={() => setActiveTab("students")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-full font-bold text-sm transition-all cursor-pointer ${
                activeTab === "students" ? "bg-[#ffdad7] text-[#8e171c]" : "text-[#59413f] hover:bg-[#fff8f7] hover:text-[#251817]"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeTab === "students" ? "'FILL' 1" : "'FILL' 0" }}>
                groups
              </span>
              <span>รายชื่อนักเรียน</span>
            </button>

            <button
              onClick={() => setActiveTab("exams")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-full font-bold text-sm transition-all cursor-pointer ${
                activeTab === "exams" ? "bg-[#ffdad7] text-[#8e171c]" : "text-[#59413f] hover:bg-[#fff8f7] hover:text-[#251817]"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeTab === "exams" ? "'FILL' 1" : "'FILL' 0" }}>
                edit_note
              </span>
              <span>ข้อสอบ</span>
            </button>

            <button
              onClick={() => setActiveTab("grading")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-full font-bold text-sm transition-all cursor-pointer ${
                activeTab === "grading" ? "bg-[#ffdad7] text-[#8e171c]" : "text-[#59413f] hover:bg-[#fff8f7] hover:text-[#251817]"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeTab === "grading" ? "'FILL' 1" : "'FILL' 0" }}>
                analytics
              </span>
              <span>การให้คะแนน</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-full font-bold text-sm transition-all cursor-pointer ${
                activeTab === "settings" ? "bg-[#ffdad7] text-[#8e171c]" : "text-[#59413f] hover:bg-[#fff8f7] hover:text-[#251817]"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeTab === "settings" ? "'FILL' 1" : "'FILL' 0" }}>
                settings
              </span>
              <span>ตั้งค่าระบบ</span>
            </button>
          </nav>
        </div>

        {/* 🌟 ส่วนแสดงโปรไฟล์: เลือกรูปจาก Google Drive โดยตรง ปลอดภัย ทรงประสิทธิภาพ */}
        <div className="p-6 border-t border-[#e0bfbc]/30 space-y-4 bg-[#fff8f7]/40">
          <div className="flex items-center gap-3">
            <div 
              onClick={handleGoogleDriveImagePick}
              className="w-11 h-11 rounded-full overflow-hidden border border-[#e0bfbc] shrink-0 cursor-pointer relative group"
              title="คลิกเพื่อเลือกไฟล์รูปภาพจาก Google Drive ของคุณครู"
            >
              <img
                src={customImg}
                alt="Teacher Profile"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="material-symbols-outlined text-white text-[16px]">add_to_drive</span>
              </div>
            </div>
            <div className="min-w-0">
              <span className="block font-black text-xs text-[#251817] truncate">
                {displayTeacherName}
              </span>
              <span className="block text-[9px] font-bold text-[#8c706e] uppercase tracking-wider truncate">
                {teacherEmail || "โปรไฟล์ผู้ดูแล"}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-1 py-2 rounded-full border border-[#e0bfbc] hover:bg-red-50 text-red-600 font-bold text-[11px] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">logout</span>
              ออกจากระบบ
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-col flex-grow min-w-0 h-screen overflow-y-auto">
        <header className="md:hidden bg-white border-b border-[#e0bfbc]/30 p-4 sticky top-0 z-40 flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#8e171c] text-2xl font-black">school</span>
            <span className="font-extrabold text-sm text-[#8e171c]">ExamMaster Pro</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="px-3 py-1.5 border border-[#e0bfbc] rounded-full text-xs font-bold bg-[#fff8f7] text-[#8e171c]"
            >
              <option value="overview">Overview</option>
              <option value="students">Students Roster</option>
              <option value="exams">Exams Config</option>
              <option value="grading">Grading Reports</option>
              <option value="settings">System Settings</option>
            </select>
            
            <button
              onClick={onLogout}
              className="p-1.5 border border-red-200 text-red-600 rounded-full hover:bg-red-50"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
          </div>
        </header>

        {/* 2. BODY CONTENT AREA */}
        <main className="p-6 md:p-10 max-w-7xl w-full mx-auto flex-grow space-y-8 pb-16">
          
          {/* Sync Error Alert Overlay */}
          {syncStatus.error && (
            <div className="p-4 bg-[#fff0ef] border border-[#ffdad7] rounded-2xl flex items-start gap-3 text-left">
              <span className="material-symbols-outlined text-[#8e171c] text-[24px] shrink-0">warning</span>
              <div className="flex-grow">
                <p className="text-xs font-bold text-[#8e171c]">เกิดข้อผิดพลาดในการเชื่อมต่อ / ซิงค์ข้อมูล</p>
                <p className="text-xs text-[#59413f] mt-0.5">{syncStatus.error}</p>
              </div>
            </div>
          )}

          {/* Top warning overlay if not synced with Google Sheets */}
          {!syncStatus.spreadsheetId && (
            <div className="p-4 bg-[#fff0ef] border border-[#ffdad7] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3 text-left">
                <span className="material-symbols-outlined text-[#8e171c] text-[24px] shrink-0">info</span>
                <span className="text-xs font-medium text-[#59413f]">
                  คุณกำลังใช้ฐานข้อมูลออฟไลน์ในเบราว์เซอร์ เพื่อให้สิทธิ์เข้าถึง <b>Google Drive & Sheets</b> สำหรับจัดเก็บรายชื่อผู้เรียนและส่งประวัติคะแนนอัตโนมัติ กรุณากดเชื่อมโยง
                </span>
              </div>
              <button
                onClick={onConnectGoogle}
                className="px-4 py-2 bg-[#8e171c] hover:bg-[#8c161b] text-white text-[11px] font-bold rounded-full transition-all shrink-0 cursor-pointer"
              >
                เชื่อมโยงบัญชี Google
              </button>
            </div>
          )}

          {/* Inner Views Routing */}
          {activeTab === "overview" && (
            <TeacherOverview
              students={students}
              exams={exams}
              submissions={submissions}
              syncStatus={syncStatus}
              onTriggerSync={onTriggerSync}
              onConnectGoogle={onConnectGoogle}
              onSwitchTab={setActiveTab}
            />
          )}

          {activeTab === "students" && (
            <TeacherStudents
              students={students}
              onAddStudent={onAddStudent}
              onDeleteStudent={onDeleteStudent}
              onBulkLoadDefaults={onBulkLoadDefaults}
              onClearRoster={onClearRoster}
              syncStatus={syncStatus}
              onTriggerSync={onTriggerSync}
            />
          )}

          {activeTab === "exams" && (
            <TeacherExams
              exams={exams}
              onAddExam={onAddExam}
              onDeleteExam={onDeleteExam}
              onToggleActive={onToggleActive}
              onUpdateExam={onUpdateExam}
            />
          )}

          {activeTab === "grading" && (
            <TeacherGrading
              submissions={submissions}
              exams={exams}
              students={students}
              onDeleteSubmission={onDeleteSubmission}
              onUpdateSubmission={onUpdateSubmission}
              syncStatus={syncStatus}
              onTriggerSync={onTriggerSync}
            />
          )}

          {activeTab === "settings" && (
            <TeacherSettings
              settings={settings}
              onUpdateSettings={onUpdateSettings}
              onDiscard={onDiscardSettings}
            />
          )}

        </main>
      </div>
    </div>
  );
}
