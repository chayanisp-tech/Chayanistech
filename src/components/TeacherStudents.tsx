import React, { useState, useMemo } from "react";
import { Student, SyncStatus } from "../types";

interface TeacherStudentsProps {
  students: Student[];
  onAddStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onBulkLoadDefaults: () => void;
  onClearRoster: () => void;
  syncStatus: SyncStatus;
  onTriggerSync: () => void;
}

export default function TeacherStudents({
  students,
  onAddStudent,
  onDeleteStudent,
  onBulkLoadDefaults,
  onClearRoster,
  syncStatus,
  onTriggerSync,
}: TeacherStudentsProps) {
  const [newStudent, setNewStudent] = useState({ id: "", name: "", classInfo: "" });
  const [searchTerm, setSearchTerm] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.id || !newStudent.name || !newStudent.classInfo) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วนครับ");
      return;
    }
    
    if (students.some(s => s.id === newStudent.id)) {
      alert("รหัสนักเรียนนี้มีอยู่ในระบบแล้วครับ!");
      return;
    }

    onAddStudent({
      id: newStudent.id,
      name: newStudent.name,
      className: newStudent.classInfo,
      classInfo: newStudent.classInfo,
    });
    setNewStudent({ id: "", name: "", classInfo: "" });
  };

  // 🛡️ ระบบป้องกัน: แจ้งเตือนก่อนล้างข้อมูลทั้งหมด (เก็บไว้ป้องกันมือลั่นลบทุกคนทิ้ง)
  const handleSafeClearRoster = () => {
    if (students.length === 0) return;
    const isConfirmed = window.confirm(
      "🛑 อันตราย: คุณกำลังจะ 'ลบรายชื่อนักเรียนทั้งหมด' ออกจากระบบ!\n\nการกระทำนี้ไม่สามารถย้อนกลับได้ คุณแน่ใจหรือไม่?"
    );
    if (isConfirmed) {
      onClearRoster();
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.classInfo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  return (
    <div className="space-y-6 text-left animate-fade-in">
      
      {/* Header & Action Buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#e0bfbc]/30 pb-6">
        <div>
          <h2 className="text-3xl font-black text-[#251817] tracking-tight">รายชื่อนักเรียน</h2>
          <p className="text-sm font-medium text-[#8c706e] mt-1">จัดการฐานข้อมูลผู้เรียนและตรวจสอบผู้มีสิทธิ์สอบ</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={onBulkLoadDefaults} // เรียกใช้งานแบบเพิ่มได้เลย
            className="flex-1 md:flex-none px-4 py-2 border border-[#e0bfbc] hover:bg-[#fff0ef] text-[#8e171c] text-xs font-bold rounded-full transition-colors cursor-pointer"
          >
            + เพิ่มรายชื่อตัวอย่าง
          </button>
          <button
            onClick={handleSafeClearRoster}
            className="flex-1 md:flex-none px-4 py-2 border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold rounded-full transition-colors cursor-pointer"
          >
            ล้างรายชื่อทั้งหมด
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* เลนซ้าย: ฟอร์มเพิ่มนักเรียน */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-[#e0bfbc]/40 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-[#8e171c]">person_add</span>
              <h3 className="font-bold text-[#251817]">เพิ่มนักเรียนใหม่</h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#59413f] mb-1.5">รหัสนักเรียน (5 หลัก)</label>
                <input
                  type="text"
                  required
                  value={newStudent.id}
                  onChange={(e) => setNewStudent({ ...newStudent, id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] focus:ring-1 focus:ring-[#8e171c] outline-none text-sm transition-all bg-[#fff8f7]"
                  placeholder="เช่น 10001"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#59413f] mb-1.5">ชื่อ - นามสกุล</label>
                <input
                  type="text"
                  required
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] focus:ring-1 focus:ring-[#8e171c] outline-none text-sm transition-all bg-[#fff8f7]"
                  placeholder="เช่น นายมานะ ยินดี"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#59413f] mb-1.5">ชั้นเรียน</label>
                <input
                  type="text"
                  required
                  value={newStudent.classInfo}
                  onChange={(e) => setNewStudent({ ...newStudent, classInfo: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] focus:ring-1 focus:ring-[#8e171c] outline-none text-sm transition-all bg-[#fff8f7]"
                  placeholder="เช่น ม.5/1"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#8e171c] hover:bg-[#8c161b] text-white font-bold rounded-full text-sm transition-all shadow-md shadow-[#8e171c]/20 mt-2 cursor-pointer"
              >
                ยืนยันการเพิ่มสมาชิก
              </button>
            </form>
          </div>
        </div>

        {/* เลนขวา: ตารางรายชื่อ */}
        <div className="lg:col-span-8">
          <div className="bg-white border border-[#e0bfbc]/40 rounded-3xl p-6 shadow-sm flex flex-col h-full min-h-[500px]">
            
            <div className="relative mb-6">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหานักเรียนด้วยรหัส, ชื่อ หรือชั้นเรียน..."
                className="w-full pl-12 pr-4 py-3 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] focus:ring-1 focus:ring-[#8e171c] outline-none text-sm transition-all bg-[#fff8f7]"
              />
            </div>

            <div className="flex-grow overflow-auto border border-[#e0bfbc]/30 rounded-2xl">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-[#8c706e] bg-[#fff8f7] sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 font-bold border-b border-[#e0bfbc]/30">รหัสนักเรียน</th>
                    <th className="px-6 py-4 font-bold border-b border-[#e0bfbc]/30">ชื่อ-นามสกุล</th>
                    <th className="px-6 py-4 font-bold border-b border-[#e0bfbc]/30 text-center">ชั้นเรียน</th>
                    <th className="px-6 py-4 font-bold border-b border-[#e0bfbc]/30 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0bfbc]/20">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-[#8c706e] font-medium">
                        ไม่พบข้อมูลนักเรียนในระบบ
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-[#fff0ef]/50 transition-colors">
                        <td className="px-6 py-4 font-black text-[#8e171c]">{student.id}</td>
                        <td className="px-6 py-4 font-medium text-[#251817]">{student.name}</td>
                        <td className="px-6 py-4 text-center text-[#59413f]">{student.classInfo}</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm(`ต้องการลบรายชื่อ ${student.name} ใช่หรือไม่?`)) {
                                onDeleteStudent(student.id);
                              }
                            }}
                            className="text-red-400 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-50 cursor-pointer"
                            title="ลบนักเรียน"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-between items-center text-xs">
              <span className="font-medium text-[#59413f]">
                นักเรียนทั้งหมดในระบบ: <b className="text-[#8e171c]">{students.length}</b> คน
              </span>
              {syncStatus.spreadsheetId && (
                <button 
                  onClick={onTriggerSync}
                  className="flex items-center gap-1 text-[#8e171c] font-bold hover:underline cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">sync</span>
                  ซิงค์กับ Google Sheet ตอนนี้
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
