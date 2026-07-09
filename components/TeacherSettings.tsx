import React, { useState } from "react";
import { SystemSettings } from "../types";

interface TeacherSettingsProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  onDiscard: () => void;
}

export default function TeacherSettings({
  settings,
  onUpdateSettings,
  onDiscard,
}: TeacherSettingsProps) {
  const [teacherName, setTeacherName] = useState(settings.teacherName);
  const [teacherEmail, setTeacherEmail] = useState(settings.teacherEmail);
  const [role, setRole] = useState(settings.role);
  
  // Integrity switches
  const [lockdown, setLockdown] = useState(settings.lockdown);
  const [ipWhitelist, setIpWhitelist] = useState(settings.ipWhitelist);
  const [aiProctor, setAiProctor] = useState(settings.aiProctor);
  const [plagiarismCheck, setPlagiarismCheck] = useState(settings.plagiarismCheck);

  // Time slots
  const [timezone, setTimezone] = useState(settings.timezone);
  const [startDuration, setStartDuration] = useState(settings.startDuration);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      teacherName,
      teacherEmail,
      role,
      lockdown,
      ipWhitelist,
      aiProctor,
      plagiarismCheck,
      timezone,
      startDuration,
    });
    alert("บันทึกการตั้งค่าระบบเรียบร้อยแล้ว!");
  };

  return (
    <div className="space-y-8 animate-fade-in text-[#251817]">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">ตั้งค่าระบบ</h1>
        <p className="text-sm text-[#59413f] mt-1">
          กำหนดค่าสภาพแวดล้อมการสอนและรักษาความซื่อสัตย์ในการสอบของคุณ
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Top Grid (Account Settings & Protection Settings) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 1. Account Settings Card */}
          <div className="bg-white border border-[#e0bfbc]/50 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[#8e171c]">account_circle</span>
              ตั้งค่าบัญชี
            </h3>

            {/* Teacher Name */}
            <div className="space-y-1.5">
              <label htmlFor="teacherNameInput" className="block text-xs font-bold text-[#59413f]">ชื่อ-นามสกุล</label>
              <input
                id="teacherNameInput"
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full px-5 py-3 rounded-full border border-[#8c706e]/80 focus:border-[#8e171c] outline-none text-sm font-semibold"
                required
              />
            </div>

            {/* Institutional Email */}
            <div className="space-y-1.5">
              <label htmlFor="teacherEmailInput" className="block text-xs font-bold text-[#59413f]">อีเมลสถาบัน</label>
              <input
                id="teacherEmailInput"
                type="email"
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                className="w-full px-5 py-3 rounded-full border border-[#8c706e]/80 focus:border-[#8e171c] outline-none text-sm font-semibold"
                required
              />
            </div>

            {/* Role Role */}
            <div className="space-y-1.5">
              <label htmlFor="teacherRoleSelect" className="block text-xs font-bold text-[#59413f]">บทบาท</label>
              <select
                id="teacherRoleSelect"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-5 py-3 rounded-full border border-[#8c706e]/80 focus:border-[#8e171c] outline-none text-sm font-semibold bg-white"
              >
                <option value="อาจารย์ผู้สอนวิชาภาษาจีน">อาจารย์ผู้สอนวิชาภาษาจีน</option>
                <option value="ศาสตราจารย์อาวุโส">ศาสตราจารย์อาวุโส</option>
                <option value="หัวหน้าฝ่ายทะเบียนและวัดผล">หัวหน้าฝ่ายทะเบียนและวัดผล</option>
                <option value="ผู้ดูแลระบบระดับสูง">ผู้ดูแลระบบระดับสูง</option>
              </select>
            </div>

            <div className="pt-2 text-left">
              <button
                type="button"
                onClick={() => alert("ระบบเปลี่ยนรหัสผ่านสถาบันกำลังเชื่อมโยง...")}
                className="text-xs font-bold text-[#8e171c] hover:underline flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                เปลี่ยนรหัสผ่าน
              </button>
            </div>
          </div>

          {/* 2. Protection / Integrity Settings Card */}
          <div className="bg-white border border-[#e0bfbc]/50 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8e171c]">shield</span>
                การป้องกันความซื่อสัตย์
              </h3>
              <span className="px-3 py-1 bg-[#8e171c] text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                ความปลอดภัยสูง
              </span>
            </div>

            <div className="space-y-4">
              {/* Lockdown Browser */}
              <label className="flex items-start gap-4 p-4 border border-[#e0bfbc]/40 rounded-2xl hover:bg-[#fff8f7] transition-all cursor-pointer">
                <input
                  type="checkbox"
                  checked={lockdown}
                  onChange={(e) => setLockdown(e.target.checked)}
                  className="rounded text-[#8e171c] focus:ring-[#8e171c] border-[#8c706e] h-5 w-5 mt-0.5"
                />
                <div className="space-y-0.5">
                  <span className="block font-bold text-sm text-[#251817]">ล็อกดาวน์เบราว์เซอร์</span>
                  <span className="block text-xs text-[#59413f]">ป้องกันการเปิดแท็บหรือหน้าต่างอื่น ระหว่างทำข้อสอบ</span>
                </div>
              </label>

              {/* IP Whitelisting */}
              <label className="flex items-start gap-4 p-4 border border-[#e0bfbc]/40 rounded-2xl hover:bg-[#fff8f7] transition-all cursor-pointer">
                <input
                  type="checkbox"
                  checked={ipWhitelist}
                  onChange={(e) => setIpWhitelist(e.target.checked)}
                  className="rounded text-[#8e171c] focus:ring-[#8e171c] border-[#8c706e] h-5 w-5 mt-0.5"
                />
                <div className="space-y-0.5">
                  <span className="block font-bold text-sm text-[#251817]">IP Whitelisting</span>
                  <span className="block text-xs text-[#59413f]">จำกัดการเข้าถึงเฉพาะเครือข่ายอินเทอร์เน็ตที่กำหนดในโรงเรียน</span>
                </div>
              </label>

              {/* AI Proctoring */}
              <label className="flex items-start gap-4 p-4 border border-[#e0bfbc]/40 rounded-2xl hover:bg-[#fff8f7] transition-all cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiProctor}
                  onChange={(e) => setAiProctor(e.target.checked)}
                  className="rounded text-[#8e171c] focus:ring-[#8e171c] border-[#8c706e] h-5 w-5 mt-0.5"
                />
                <div className="space-y-0.5">
                  <span className="block font-bold text-sm text-[#251817]">การคุมสอบด้วย AI (ภาพ)</span>
                  <span className="block text-xs text-[#59413f]">ตรวจจับการหันใบหน้าหรือตรวจสิทธิ์ผู้สอบอัตโนมัติด้วยวิดีโอ</span>
                </div>
              </label>

              {/* Plagiarism Checker */}
              <label className="flex items-start gap-4 p-4 border border-[#e0bfbc]/40 rounded-2xl hover:bg-[#fff8f7] transition-all cursor-pointer">
                <input
                  type="checkbox"
                  checked={plagiarismCheck}
                  onChange={(e) => setPlagiarismCheck(e.target.checked)}
                  className="rounded text-[#8e171c] focus:ring-[#8e171c] border-[#8c706e] h-5 w-5 mt-0.5"
                />
                <div className="space-y-0.5">
                  <span className="block font-bold text-sm text-[#251817]">เครื่องมือตรวจสอบการคัดลอกผลงาน</span>
                  <span className="block text-xs text-[#59413f]">วิเคราะห์ลักษณนิสัยการพิมพ์คำตอบเทียบเคียงฐานข้อมูลทั่วโลก</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Bottom Grid (Scheduling & Courses) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 3. Global Scheduling */}
          <div className="bg-white border border-[#e0bfbc]/50 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[#8e171c]">schedule</span>
              การกำหนดตารางสอบสากล
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border border-[#e0bfbc]/40 rounded-2xl bg-[#fff8f7] flex items-center gap-3">
                <span className="material-symbols-outlined text-[#8e171c] text-[24px]">language</span>
                <div>
                  <span className="block text-[10px] text-[#8c706e] font-bold uppercase">เขตเวลาเริ่มต้น</span>
                  <span className="block text-xs font-bold">กรุงเทพฯ (UTC+07:00)</span>
                </div>
              </div>

              <div className="p-4 border border-[#e0bfbc]/40 rounded-2xl bg-[#fff8f7] flex items-center gap-3">
                <span className="material-symbols-outlined text-green-600 text-[24px]">sync</span>
                <div>
                  <span className="block text-[10px] text-[#8c706e] font-bold uppercase">สถานะเซิร์ฟเวอร์</span>
                  <span className="block text-xs font-bold text-green-600">ซิงโครไนซ์แล้ว (±0.02ms)</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex justify-between text-xs font-bold text-[#59413f]">
                <span>ระยะเวลาเริ่มต้น (นาที)</span>
                <span className="text-[#8e171c]">{startDuration} นาที</span>
              </div>
              <input
                type="range"
                min={30}
                max={240}
                step={30}
                value={startDuration}
                onChange={(e) => setStartDuration(Number(e.target.value))}
                className="w-full h-2 bg-[#fbe3e0] rounded-lg appearance-none cursor-pointer accent-[#8e171c]"
              />
              <div className="flex justify-between text-[10px] font-bold text-[#8c706e]">
                <span>30ม.</span>
                <span>120ม.</span>
                <span>240ม.</span>
              </div>
            </div>
          </div>

          {/* 4. Active Courses List */}
          <div className="bg-white border border-[#e0bfbc]/50 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8e171c]">import_contacts</span>
                คอร์สที่กำลังเปิดสอน
              </h3>
              <button
                type="button"
                onClick={() => alert("ระบบกำลังโหลดข้อมูลวิชาสอนเพิ่มเติม...")}
                className="px-4 py-1.5 border border-[#e0bfbc] hover:bg-[#ffe9e7] text-[#8e171c] font-bold text-xs rounded-full transition-all"
              >
                จัดการทั้งหมด
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Course 1 */}
              <div className="p-4 border border-[#e0bfbc]/40 rounded-2xl flex justify-between items-center hover:bg-[#fff8f7] transition-all">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-[#ffdad7] text-[#8e171c] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">science</span>
                  </span>
                  <div>
                    <span className="block font-bold text-sm">BIO102: ชีววิทยาโมเลกุลขั้นสูง</span>
                    <span className="block text-[11px] text-[#59413f]">นักศึกษา 248 คน • 12 ข้อสอบที่เปิดอยู่</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-400 text-[20px]">chevron_right</span>
              </div>

              {/* Course 2 */}
              <div className="p-4 border border-[#e0bfbc]/40 rounded-2xl flex justify-between items-center hover:bg-[#fff8f7] transition-all">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-[#ffdad7] text-[#8e171c] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">gavel</span>
                  </span>
                  <div>
                    <span className="block font-bold text-sm">MED305: จริยธรรมทางคลินิกและความซื่อสัตย์</span>
                    <span className="block text-[11px] text-[#59413f]">นักศึกษา 115 คน • 4 ข้อสอบที่เปิดอยู่</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-400 text-[20px]">chevron_right</span>
              </div>

              {/* Course 3 */}
              <div className="p-4 border border-[#e0bfbc]/40 rounded-2xl flex justify-between items-center hover:bg-[#fff8f7] transition-all">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-[#ffdad7] text-[#8e171c] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">history_edu</span>
                  </span>
                  <div>
                    <span className="block font-bold text-sm">HIS201: ประวัติศาสตร์ไทยสมัยใหม่</span>
                    <span className="block text-[11px] text-[#59413f]">นักศึกษา 84 คน • 2 ข้อสอบที่เปิดอยู่</span>
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-400 text-[20px]">chevron_right</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Action Footer */}
        <div className="flex justify-end items-center gap-6 pt-6 border-t border-[#e0bfbc]/30">
          <button
            type="button"
            onClick={onDiscard}
            className="text-sm font-semibold text-[#8f4a46] hover:text-[#8e171c] hover:underline cursor-pointer"
          >
            ละทิ้งการเปลี่ยนแปลง
          </button>
          <button
            type="submit"
            className="px-8 py-3 bg-[#8e171c] hover:bg-[#8c161b] text-white font-bold rounded-full shadow-lg shadow-[#8e171c]/15 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">save</span>
            <span>บันทึกการตั้งค่าระบบทั้งหมด</span>
          </button>
        </div>
      </form>
    </div>
  );
}
