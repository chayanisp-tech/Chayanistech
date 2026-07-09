import React, { useState } from "react";
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
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newClass, setNewClass] = useState("ม.5/1");
  const [searchTerm, setSearchTerm] = useState("");
  const [errorText, setErrorText] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText("");

    if (newId.length !== 5) {
      setErrorText("รหัสนักเรียนต้องมีความยาว 5 หลักถ้วน");
      return;
    }

    if (students.some((s) => s.id === newId)) {
      setErrorText("รหัสนักเรียนนี้มีอยู่แล้วในฐานข้อมูล");
      return;
    }

    if (!newName.trim()) {
      setErrorText("กรุณาระบุชื่อ-นามสกุลนักเรียน");
      return;
    }

    onAddStudent({
      id: newId,
      name: newName.trim(),
      className: newClass,
    });

    setNewId("");
    setNewName("");
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 5);
    setNewId(val);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.id.includes(searchTerm) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.className.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-[#251817] tracking-tight">รายชื่อนักเรียน</h1>
          <p className="text-sm text-[#59413f] mt-1">
            จัดการฐานข้อมูลผู้เรียนและตรวจสอบทะเบียนผู้มีสิทธิ์สอบภาษาจีนกลาง
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={onBulkLoadDefaults}
            className="px-4 py-2 text-xs font-bold border border-[#e0bfbc] hover:bg-[#ffe9e7] text-[#8e171c] rounded-full transition-all cursor-pointer"
          >
            โหลดรายชื่อเริ่มต้น
          </button>
          <button
            onClick={() => {
              if (window.confirm("คุณแน่ใจที่จะลบรายชื่อนักเรียนทั้งหมดหรือไม่?")) {
                onClearRoster();
              }
            }}
            className="px-4 py-2 text-xs font-bold border border-red-200 hover:bg-red-50 text-red-600 rounded-full transition-all cursor-pointer"
          >
            ล้างรายชื่อทั้งหมด
          </button>
        </div>
      </div>

      {/* Roster database syncing block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form to Add Student */}
        <div className="lg:col-span-1 bg-white border border-[#e0bfbc]/50 rounded-3xl p-6 shadow-sm h-fit">
          <h3 className="text-lg font-bold text-[#251817] mb-4 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#8e171c]">person_add</span>
            เพิ่มนักเรียนใหม่
          </h3>

          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="studentIdInput" className="block text-xs font-semibold text-[#59413f]">
                รหัสนักเรียน (5 หลัก)
              </label>
              <input
                id="studentIdInput"
                type="text"
                pattern="\d*"
                maxLength={5}
                value={newId}
                onChange={handleIdChange}
                placeholder="เช่น 10001"
                className="w-full px-4 py-2.5 rounded-full border border-[#8c706e] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817]"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="studentNameInput" className="block text-xs font-semibold text-[#59413f]">
                ชื่อ - นามสกุล
              </label>
              <input
                id="studentNameInput"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="เช่น นายมานะ ยินดี"
                className="w-full px-4 py-2.5 rounded-full border border-[#8c706e] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817]"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="studentClassInput" className="block text-xs font-semibold text-[#59413f]">
                ชั้นเรียน
              </label>
              <select
                id="studentClassInput"
                value={newClass}
                onChange={(e) => setNewClass(e.target.value)}
                className="w-full px-4 py-2.5 rounded-full border border-[#8c706e] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817]"
              >
                <option value="ม.4/1">ม.4/1</option>
                <option value="ม.4/2">ม.4/2</option>
                <option value="ม.5/1">ม.5/1</option>
                <option value="ม.5/2">ม.5/2</option>
                <option value="ม.6/1">ม.6/1</option>
                <option value="ม.6/2">ม.6/2</option>
              </select>
            </div>

            {errorText && <p className="text-xs text-[#ba1a1a] font-semibold">{errorText}</p>}

            <button
              type="submit"
              className="w-full py-2.5 bg-[#8e171c] hover:bg-[#8c161b] text-white rounded-full text-xs font-bold transition-all shadow-md shadow-[#8e171c]/10 cursor-pointer"
            >
              ยืนยันการเพิ่มสมาชิก
            </button>
          </form>
        </div>

        {/* Students Table */}
        <div className="lg:col-span-2 bg-white border border-[#e0bfbc]/50 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            {/* Search Filter bar */}
            <div className="flex items-center gap-3 mb-6 relative">
              <span className="material-symbols-outlined absolute left-4 text-[#8c706e] text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="ค้นหานักเรียนด้วยรหัส, ชื่อ หรือชั้นเรียน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-full border border-[#e0bfbc] outline-none text-sm text-[#251817] focus:border-[#8e171c]"
              />
            </div>

            {/* Students Table Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#e0bfbc]/30 text-xs font-bold text-[#8c706e] bg-[#fff8f7]">
                    <th className="py-3 px-4">รหัสนักเรียน</th>
                    <th className="py-3 px-4">ชื่อ-นามสกุล</th>
                    <th className="py-3 px-4">ชั้นเรียน</th>
                    <th className="py-3 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0bfbc]/20">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[#59413f]">
                        ไม่พบข้อมูลนักเรียนตามเงื่อนไขการค้นหา
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-[#fff8f7] transition-all">
                        <td className="py-3 px-4 font-bold text-[#8e171c] font-mono">{student.id}</td>
                        <td className="py-3 px-4 font-semibold text-[#251817]">{student.name}</td>
                        <td className="py-3 px-4 text-[#59413f]">{student.className}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              if (window.confirm(`คุณต้องการลบ ${student.name} ออกจากฐานข้อมูลหรือไม่?`)) {
                                onDeleteStudent(student.id);
                              }
                            }}
                            className="w-8 h-8 rounded-full hover:bg-red-50 text-red-500 flex items-center justify-center mx-auto transition-colors cursor-pointer"
                            title="ลบรายชื่อนักเรียน"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sync Triggering Status Indicator */}
          {syncStatus.spreadsheetId && (
            <div className="mt-6 pt-4 border-t border-[#e0bfbc]/20 flex items-center justify-between text-xs text-[#59413f]">
              <span>นักเรียนทั้งหมดในระบบ: <b className="text-[#8e171c]">{students.length} คน</b></span>
              <button
                onClick={onTriggerSync}
                disabled={syncStatus.isSyncing}
                className="text-[#8e171c] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">sync</span>
                <span>{syncStatus.isSyncing ? "กำลังซิงค์..." : "ซิงค์กับ Google Sheet ตอนนี้"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
