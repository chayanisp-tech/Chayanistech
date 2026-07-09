import React, { useState } from "react";
import { Student, Submission } from "../types";

interface StudentScoreLookupProps {
  students: Student[];
  submissions: Submission[];
  onGoBack: () => void;
}

export default function StudentScoreLookup({
  students,
  submissions,
  onGoBack,
}: StudentScoreLookupProps) {
  const [studentId, setStudentId] = useState("");
  const [searchedId, setSearchedId] = useState("");
  const [results, setResults] = useState<Submission[]>([]);
  const [studentInfo, setStudentInfo] = useState<Student | null>(null);
  const [errorText, setErrorText] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (studentId.length < 5) {
      setErrorText("โปรดระบุรหัสนักเรียนให้ครบ 5 หลัก");
      return;
    }

    const foundStudent = students.find((s) => s.id === studentId);
    if (!foundStudent) {
      setErrorText("ไม่พบข้อมูลนักเรียนรหัสนี้ในฐานข้อมูล");
      setStudentInfo(null);
      setResults([]);
      setHasSearched(true);
      return;
    }

    setErrorText("");
    setStudentInfo(foundStudent);
    setSearchedId(studentId);

    // Filter submissions for this student
    const studentSubmissions = submissions.filter((s) => s.studentId === studentId);
    setResults(studentSubmissions);
    setHasSearched(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 5);
    setStudentId(val);
    if (val.length === 5) {
      setErrorText("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fff8f7] font-sans pt-24 px-6 pb-12 text-[#251817]">
      {/* Top Bar */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#fff8f7] border-b border-[#e0bfbc]/30 h-16 flex items-center">
        <div className="flex justify-between items-center px-6 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#8e171c] text-3xl">school</span>
            <span className="text-xl font-bold text-[#8e171c]">ChineseEdutest</span>
          </div>
          <button
            onClick={onGoBack}
            className="text-sm font-semibold text-[#8e171c] hover:underline cursor-pointer"
          >
            กลับหน้าต้อนรับ
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto w-full">
        {/* Navigation back */}
        <div className="mb-6 flex items-center gap-2">
          <button
            onClick={onGoBack}
            className="flex items-center gap-1 text-sm text-[#8f4a46] hover:text-[#8e171c] font-semibold cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            กลับหน้าต้อนรับ
          </button>
        </div>

        <h1 className="text-3xl font-bold text-[#251817] mb-2">ตรวจสอบคะแนนสอบ</h1>
        <p className="text-[#59413f] mb-8 text-sm">ป้อนรหัสนักเรียน 5 หลักของคุณเพื่อตรวจสอบผลคะแนนสอบย้อนหลังและสถานะการส่งข้อสอบ</p>

        {/* Search Card */}
        <div className="bg-white border border-[#e0bfbc]/60 rounded-3xl p-6 shadow-sm mb-8">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-grow space-y-2 w-full">
              <label htmlFor="lookupId" className="block text-xs font-semibold text-[#59413f]">
                รหัสนักเรียน (5 หลัก)
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#8c706e]">
                  badge
                </span>
                <input
                  id="lookupId"
                  type="text"
                  pattern="\d*"
                  inputMode="numeric"
                  maxLength={5}
                  value={studentId}
                  onChange={handleInputChange}
                  placeholder="ป้อนรหัสนักเรียนของคุณ"
                  className="w-full pl-12 pr-4 py-3 rounded-full border border-[#8c706e] focus:border-[#8e171c] focus:ring-4 focus:ring-[#8e171c]/10 outline-none text-base font-bold text-[#251817]"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto bg-[#8e171c] hover:bg-[#8c161b] text-white font-bold px-8 py-3 rounded-full shadow-md shadow-[#8e171c]/10 transition-all cursor-pointer whitespace-nowrap"
            >
              ค้นหาคะแนน
            </button>
          </form>
          {errorText && <p className="text-[#ba1a1a] text-xs font-semibold mt-2 ml-4">{errorText}</p>}
        </div>

        {/* Search Results Display */}
        {hasSearched && (
          <div className="space-y-6">
            {studentInfo ? (
              <div>
                <div className="bg-[#fff0ef] border border-[#e0bfbc]/40 rounded-3xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <span className="text-[11px] font-bold text-[#8c706e] uppercase tracking-wider block">ผู้ค้นหา</span>
                    <h3 className="text-xl font-bold text-[#251817]">{studentInfo.name}</h3>
                  </div>
                  <div className="flex gap-4">
                    <span className="px-4 py-1.5 bg-[#ffdad7] text-[#8e171c] rounded-full text-xs font-bold">
                      รหัส: {studentInfo.id}
                    </span>
                    <span className="px-4 py-1.5 bg-[#f5dddb] text-[#59413f] rounded-full text-xs font-bold">
                      ชั้นเรียน: {studentInfo.className}
                    </span>
                  </div>
                </div>

                <h4 className="text-lg font-bold text-[#251817] mb-4">ประวัติการทำข้อสอบ ({results.length} รายการ)</h4>

                {results.length === 0 ? (
                  <div className="bg-white border border-[#e0bfbc]/40 rounded-3xl p-10 text-center text-[#59413f]">
                    <span className="material-symbols-outlined text-[48px] opacity-40 mb-2">history</span>
                    <p className="font-bold">ไม่พบประวัติการทำข้อสอบสำหรับรหัสนี้</p>
                    <p className="text-xs mt-1">หากเพิ่งสอบเสร็จ กรุณารอระบบประมวลผลหรือติดต่อคุณครู</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {results.map((sub) => {
                      const isPerfect = sub.score === sub.totalPoints;
                      return (
                        <div
                          key={sub.submissionId}
                          className="bg-white border border-[#e0bfbc]/50 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#8c706e] font-semibold">
                                ID: {sub.submissionId}
                              </span>
                              <span className="text-xs bg-[#ffe9e7] text-[#8e171c] font-bold px-2 py-0.5 rounded-full">
                                {sub.status}
                              </span>
                            </div>
                            <h5 className="font-bold text-[#251817] text-lg">{sub.examTitle}</h5>
                            <p className="text-xs text-[#8c706e]">
                              ส่งเมื่อ: {new Date(sub.submittedAt).toLocaleString("th-TH")}
                            </p>
                          </div>

                          <div className="flex items-center gap-4 border-t sm:border-t-0 pt-4 sm:pt-0 border-[#e0bfbc]/20 justify-between">
                            <div className="text-right sm:text-left">
                              <span className="text-[11px] text-[#8c706e] block uppercase font-bold">ผลคะแนน</span>
                              <span className={`text-2xl font-black ${isPerfect ? "text-[#8e171c]" : "text-[#8f4a46]"}`}>
                                {sub.score} <span className="text-sm font-semibold text-[#8c706e]">/ {sub.totalPoints} คะแนน</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-[#e0bfbc]/40 rounded-3xl p-10 text-center text-[#59413f]">
                <span className="material-symbols-outlined text-[48px] text-[#ba1a1a] opacity-60 mb-2">error</span>
                <p className="font-bold">ค้นหาไม่สำเร็จ</p>
                <p className="text-xs mt-1">กรุณาระบุรหัสผ่านนักเรียนหรือข้อมูลที่ถูกต้องเพื่อดึงข้อมูล</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
