import React, { useState, useMemo } from "react";
import { Submission, SyncStatus, Exam, Question, Student } from "../types";

interface TeacherGradingProps {
  submissions: Submission[];
  exams: Exam[];
  students: Student[];
  onDeleteSubmission: (id: string) => void;
  onUpdateSubmission: (submission: Submission) => void;
  syncStatus: SyncStatus;
  onTriggerSync: () => void;
}

export default function TeacherGrading({
  submissions,
  exams,
  students,
  onDeleteSubmission,
  onUpdateSubmission,
  syncStatus,
  onTriggerSync,
}: TeacherGradingProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedClassroom, setSelectedClassroom] = useState<string>("");
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  
  // เพิ่มระบบเซฟคะแนนลงกล่องความจำจำลองในหน้านี้ เพื่อกันคะแนนรีเซ็ตตอนสลับคน
  const [localUpdates, setLocalUpdates] = useState<Record<string, Submission>>({});

  // 1. ดึงรายชื่อห้องเรียนทั้งหมด
  const classrooms = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.className))).filter(Boolean).sort();
  }, [students]);

  // 2. จัดการสร้างตารางใบรายชื่อ (Roster Gradebook)
  const rosterData = useMemo(() => {
    if (!selectedClassroom || !selectedExamId) return [];

    const matchingExam = exams.find((e) => e.id === selectedExamId);
    if (!matchingExam) return [];

    const classroomStudents = students.filter((s) => s.className === selectedClassroom);

    return classroomStudents.map((student) => {
      const studentSubmissions = submissions
        .filter((sub) => sub.studentId === student.id && sub.examId === selectedExamId)
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

      let submission = studentSubmissions.length > 0 ? studentSubmissions[0] : null;

      // ดึงข้อมูลจากกล่องความจำชั่วคราวมาทับ (ถ้ามีตัวที่ครูเพิ่งกดตรวจสดๆ ร้อนๆ)
      if (submission && localUpdates[submission.submissionId]) {
        submission = localUpdates[submission.submissionId];
      }

      let objectiveScore = 0;
      let subjectiveScore = 0;
      let totalMaxObjective = 0;
      let totalMaxSubjective = 0;

      matchingExam.questions.forEach((q) => {
        if (q.type === "subjective") {
          totalMaxSubjective += q.points;
        } else {
          totalMaxObjective += q.points;
        }

        if (submission && submission.answers) {
          const ans = submission.answers[q.id];
          if (q.type === "subjective") {
            if (ans && typeof ans === "object" && typeof ans.assignedScore === "number") {
              subjectiveScore += ans.assignedScore;
            }
          } else {
            if (ans !== undefined && typeof ans !== "object" && Number(ans) === Number(q.answerIndex)) {
              objectiveScore += q.points;
            }
          }
        }
      });

      const matchesSearch =
        searchTerm === "" ||
        student.id.includes(searchTerm) ||
        student.name.toLowerCase().includes(searchTerm.toLowerCase());

      return {
        student,
        submission,
        objectiveScore,
        subjectiveScore,
        totalScore: submission ? submission.score : 0,
        totalMaxObjective,
        totalMaxSubjective,
        matchesSearch,
      };
    }).filter(item => item.matchesSearch);
  }, [selectedClassroom, selectedExamId, students, submissions, exams, searchTerm, localUpdates]);

  // 🔥 ฟังก์ชันสำหรับดาวน์โหลดข้อมูลคะแนนสรุปแยกรายวิชาและรายห้อง (ออกเป็นไฟล์ CSV รองรับภาษาไทย)
  const handleDownloadExcelCSV = () => {
    if (rosterData.length === 0) return;

    const matchingExam = exams.find((e) => e.id === selectedExamId);
    const examTitle = matchingExam ? matchingExam.title : "ไม่ระบุวิชา";
    
    // 1. ใส่ UTF-8 BOM (\uFEFF) เพื่อให้ Excel เปิดภาษาไทยได้ไม่เป็นต่างด้าว
    let csvContent = "\uFEFF";
    
    // 2. สร้างหัวคอลัมน์ตามที่คุณครูกำหนด
    csvContent += "ลำดับ,รหัสนักเรียน,ชื่อสกุล,คะแนนเต็ม,คะแนนสอบที่ได้\n";
    
    // 3. วนลูปใส่ข้อมูลนักเรียนเรียงตามเลขที่
    rosterData.forEach((item, index) => {
      const rowNumber = index + 1;
      const studentId = item.student.id;
      // ป้องกันเครื่องหมายจุลภาค (,) ในชื่อนักเรียนหลุดโครงสร้าง CSV ด้วยการครอบเครื่องหมายคำพูด double quotes
      const studentName = `"${item.student.name.replace(/"/g, '""')}"`;
      const maxScore = item.totalMaxObjective + item.totalMaxSubjective;
      const finalScore = item.submission ? item.totalScore : 0; // ถ้ายังไม่สอบให้เป็น 0 คะแนน

      csvContent += `${rowNumber},${studentId},${studentName},${maxScore},${finalScore}\n`;
    });

    // 4. กระบวนการยิงไฟล์ดาวน์โหลดไปยังเบราว์เซอร์ของคุณครู
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    // ตั้งชื่อไฟล์ เช่น คะแนน_วิชาคณิตศาสตร์_ห้อง_ม.4-7.csv
    const safeRoomName = selectedClassroom.replace(/[\/\\]/g, "-");
    link.setAttribute("href", url);
    link.setAttribute("download", `คะแนน_${examTitle}_ห้อง_${safeRoomName}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ฟังก์ชันอัปเดตคะแนนอัตนัย
  const handleUpdateSubjectiveScore = (sub: Submission, qId: string, points: number) => {
    const currentAnswers = sub.answers ? { ...sub.answers } : {};
    const currentAnsItem = typeof currentAnswers[qId] === "object" ? { ...currentAnswers[qId] } : {};
    
    currentAnswers[qId] = {
      ...currentAnsItem,
      assignedScore: points,
    };

    const matchingExam = exams.find((e) => e.id === sub.examId);
    let newScore = 0;
    
    if (matchingExam) {
      matchingExam.questions.forEach((q) => {
        if (q.type === "subjective") {
          const ans = currentAnswers[q.id];
          if (ans && typeof ans === "object" && typeof ans.assignedScore === "number") {
            newScore += ans.assignedScore;
          }
        } else {
          const ans = currentAnswers[q.id];
          if (ans !== undefined && typeof ans !== "object") {
            if (Number(ans) === Number(q.answerIndex)) {
              newScore += q.points;
            }
          }
        }
      });
    } else {
      newScore = sub.score;
    }

    const updatedSubmission: Submission = {
      ...sub,
      score: newScore,
      answers: currentAnswers,
    };

    // ล็อกคะแนนเข้ากล่องความจำจำลองในหน้านี้ทันที การันตีคะแนนไม่หายเมื่อกดสลับคน
    setLocalUpdates((prev) => ({
      ...prev,
      [sub.submissionId]: updatedSubmission,
    }));

    // ส่งข้อมูลไปอัปเดตระบบใหญ่ตามโครงสร้างเดิม
    onUpdateSubmission(updatedSubmission);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-[#251817] tracking-tight">ระบบสมุดคะแนนรายห้อง</h1>
          <p className="text-sm text-[#59413f] mt-1">
            เลือกวิชาและชั้นเรียนเพื่อตรวจคะแนนอัตนัย คะแนนจะถูกจำไว้ในระบบชั่วคราวจนกว่าครูจะกดปุ่มส่งเข้าคลาวด์
          </p>
        </div>
        
        {syncStatus.spreadsheetId && (
          <button
            onClick={onTriggerSync}
            disabled={syncStatus.isSyncing}
            className="px-5 py-2.5 bg-[#8e171c] hover:bg-[#8c161b] text-white rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-[#8e171c]/10 cursor-pointer disabled:opacity-75 shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">sync_saved_locally</span>
            <span>{syncStatus.isSyncing ? "กำลังบันทึกคะแนนลงไดรฟ์..." : "ส่งคะแนนเข้า Google Sheets"}</span>
          </button>
        )}
      </div>

      {/* ตัวคัดกรองหลัก (Filters) */}
      <div className="bg-[#fff8f7] border border-[#e0bfbc]/40 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm">
        <div>
          <label className="block text-xs font-bold text-[#59413f] mb-2">1. เลือกวิชา / ชุดข้อสอบ:</label>
          <select
            value={selectedExamId}
            onChange={(e) => {
              setSelectedExamId(e.target.value);
              setExpandedSubmissionId(null);
              setLocalUpdates({}); // เปลี่ยนวิชาให้ล้างค่าสมุดจดชั่วคราว
            }}
            className="w-full px-4 py-2.5 border border-[#e0bfbc] rounded-xl text-xs font-bold bg-white text-[#251817] outline-none focus:border-[#8e171c] cursor-pointer"
          >
            <option value="">-- กรุณาเลือกวิชา --</option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#59413f] mb-2">2. เลือกชั้นเรียน:</label>
          <select
            value={selectedClassroom}
            onChange={(e) => {
              setSelectedClassroom(e.target.value);
              setExpandedSubmissionId(null);
              setLocalUpdates({}); // เปลี่ยนห้องให้ล้างค่าสมุดจดชั่วคราว
            }}
            className="w-full px-4 py-2.5 border border-[#e0bfbc] rounded-xl text-xs font-bold bg-white text-[#251817] outline-none focus:border-[#8e171c] cursor-pointer"
            disabled={!selectedExamId}
          >
            <option value="">-- กรุณาเลือกห้องเรียน --</option>
            {classrooms.map((c) => (
              <option key={c} value={c}>ห้อง {c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#59413f] mb-2">ค้นหารายชื่อในห้อง (ไม่บังคับ):</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-2.5 text-[#8c706e] text-[18px]">search</span>
            <input
              type="text"
              placeholder="พิมพ์ชื่อหรือรหัส..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2 border border-[#e0bfbc] rounded-xl text-xs text-[#251817] outline-none focus:border-[#8e171c]"
              disabled={!selectedClassroom}
            />
          </div>
        </div>
      </div>

      {/* เมนูจัดการตารางคะแนน และปุ่มดาวน์โหลดชีท */}
      <div className="bg-white border border-[#e0bfbc]/50 rounded-3xl p-6 shadow-sm space-y-4">
        {selectedExamId && selectedClassroom && rosterData.length > 0 && (
          <div className="flex justify-between items-center bg-[#fff8f7] border border-[#e0bfbc]/30 p-4 rounded-2xl">
            <div className="text-xs text-[#59413f]">
              ห้องที่เลือก: <b className="text-[#251817]">ม. {selectedClassroom}</b> | รายชื่อนักเรียนทั้งหมด: <b className="text-[#8e171c] text-sm">{rosterData.length}</b> คน
            </div>
            {/* 🟢 ปุ่มดาวน์โหลดข้อมูลชีทแยกตามรายวิชาและห้องเรียน */}
            <button
              onClick={handleDownloadExcelCSV}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-700/10 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">file_download</span>
              <span>ดาวน์โหลดข้อมูลชีท (.CSV)</span>
            </button>
          </div>
        )}

        {!selectedExamId || !selectedClassroom ? (
          <div className="text-center py-12 text-[#59413f] font-medium border-2 border-dashed border-[#e0bfbc]/30 rounded-2xl">
            💡 กรุณาเลือก "วิชา" และ "ชั้นเรียน" ด้านบนเพื่อแสดงสมุดรายชื่อนักเรียนตามลำดับเลขที่
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#e0bfbc]/30 text-xs font-bold text-[#8c706e] bg-[#fff8f7]">
                  <th className="py-3 px-4 w-24">รหัส / เลขที่</th>
                  <th className="py-3 px-4">ชื่อ-นามสกุล</th>
                  <th className="py-3 px-4 text-center">สถานะสอบ</th>
                  <th className="py-3 px-4 text-center">คะแนนปรนัย (ระบบ)</th>
                  <th className="py-3 px-4 text-center">คะแนนอัตนัย (ครู)</th>
                  <th className="py-3 px-4 text-right bg-[#ffe9e7]/30">คะแนนรวมสุทธิ</th>
                  <th className="py-3 px-4 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0bfbc]/20">
                {rosterData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#59413f]">
                      ไม่พบข้อมูลนักเรียนในเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  rosterData.map(({ student, submission, objectiveScore, subjectiveScore, totalScore, totalMaxObjective, totalMaxSubjective }) => {
                    const hasSubmitted = !!submission;
                    const isExpanded = submission ? expandedSubmissionId === submission.submissionId : false;
                    const matchingExam = exams.find((e) => e.id === selectedExamId);

                    return (
                      <React.Fragment key={student.id}>
                        <tr className={`hover:bg-[#fff8f7] transition-all text-xs ${isExpanded ? "bg-[#ffe9e7]/10" : ""} ${!hasSubmitted ? "opacity-60" : ""}`}>
                          <td className="py-4 px-4 font-mono font-bold text-[#8c706e]">
                            {student.id}
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-bold text-[#251817] text-sm">{student.name}</div>
                            {hasSubmitted && <div className="text-[9px] text-gray-400 font-mono">อนุมัติส่ง: {submission.submissionId}</div>}
                          </td>
                          <td className="py-4 px-4 text-center">
                            {hasSubmitted ? (
                              <span className="inline-block px-2.5 py-1 bg-green-100 text-green-800 font-bold rounded-full text-[10px]">
                                ส่งแล้ว
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full text-[10px]">
                                ยังไม่เข้าสอบ
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center font-medium text-gray-600">
                            {hasSubmitted ? `${objectiveScore} / ${totalMaxObjective}` : "-"}
                          </td>
                          <td className="py-4 px-4 text-center font-bold text-blue-600">
                            {hasSubmitted ? `${subjectiveScore} / ${totalMaxSubjective}` : "-"}
                          </td>
                          <td className="py-4 px-4 text-right bg-[#ffe9e7]/10">
                            {hasSubmitted ? (
                              <>
                                <span className="font-black text-sm text-[#8e171c]">{totalScore}</span>
                                <span className="text-[10px] text-[#8c706e] font-bold"> / {submission.totalPoints}</span>
                              </>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            {hasSubmitted ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setExpandedSubmissionId(isExpanded ? null : submission.submissionId)}
                                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                    isExpanded ? "bg-[#8e171c] text-white" : "bg-[#ffe9e7] text-[#8e171c] hover:bg-[#ffdad7]"
                                  }`}
                                  title="ดูคำตอบและตรวจอัตนัย"
                                >
                                  <span className="material-symbols-outlined text-[14px]">edit_note</span>
                                  <span>{isExpanded ? "ปิด" : "ตรวจอัตนัย"}</span>
                                </button>

                                <button
                                  onClick={() => {
                                    if (window.confirm(`คุณต้องการลบประวัติการส่งของ ${student.name} เพื่อให้เด็กเข้าสอบใหม่ใช่หรือไม่?`)) {
                                      onDeleteSubmission(submission.submissionId);
                                    }
                                  }}
                                  className="w-7 h-7 rounded-full hover:bg-red-50 text-red-500 flex items-center justify-center transition-colors cursor-pointer"
                                  title="ลบสิทธิ์/ผลการส่ง"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              </div>
                            ) : (
                              <div className="text-center text-gray-400 text-[11px] italic">ไม่มีข้อมูลการส่ง</div>
                            )}
                          </td>
                        </tr>

                        {/* หน้าต่างขยายสำหรับดึงคำตอบอัตนัยมาให้คุณครูตรวจ */}
                        {isExpanded && submission && (
                          <tr className="bg-[#fffdfd] border-l-4 border-l-[#8e171c]">
                            <td colSpan={7} className="py-5 px-6 md:px-8 border-b border-[#e0bfbc]/30">
                              <div className="space-y-4">
                                <div className="border-b border-[#e0bfbc]/20 pb-3 flex justify-between items-center">
                                  <h5 className="font-bold text-xs text-[#8e171c] flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px]">assignment_ind</span>
                                    กระดาษคำตอบอัตนัยของ: {student.name} ({student.id})
                                  </h5>
                                  <span className="text-[10px] text-gray-400 font-mono">เวลาส่ง: {new Date(submission.submittedAt).toLocaleString("th-TH")}</span>
                                </div>

                                {matchingExam ? (
                                  <div className="space-y-4">
                                    {matchingExam.questions.filter(q => q.type === "subjective").map((q, sIdx) => {
                                      const studentAns = submission.answers ? submission.answers[q.id] : undefined;
                                      const textAns = studentAns && typeof studentAns === "object" ? studentAns.text : "";
                                      const drawingAns = studentAns && typeof studentAns === "object" ? studentAns.drawing : "";
                                      const assignedScore = studentAns && typeof studentAns === "object" ? studentAns.assignedScore : 0;

                                      return (
                                        <div key={q.id} className="p-4 rounded-xl border border-[#e0bfbc]/40 bg-white space-y-3 shadow-sm">
                                          <div className="flex justify-between items-start gap-4">
                                            <div>
                                              <span className="text-[10px] font-bold text-[#8e171c] bg-[#ffe9e7] px-2 py-0.5 rounded mr-2">ข้อสอบอัตนัยที่ {sIdx + 1}</span>
                                              <p className="font-bold text-[#251817] text-xs mt-1">{q.text}</p>
                                            </div>
                                            <span className="text-xs font-bold text-[#8e171c] bg-[#ffdad7] px-2.5 py-1 rounded-full shrink-0">เต็ม {q.points} คะแนน</span>
                                          </div>

                                          {/* คำตอบแบบพิมพ์ */}
                                          <div className="bg-[#fffbfb] p-3 rounded-xl border border-[#e0bfbc]/25 shadow-inner">
                                            <span className="text-[9px] font-bold text-[#8c706e] block mb-1">✍️ ข้อความที่นักเรียนพิมพ์ตอบ:</span>
                                            <p className="text-xs text-[#251817] whitespace-pre-wrap font-medium">
                                              {textAns ? textAns : <span className="text-gray-400 italic font-normal">ไม่ได้พิมพ์คำตอบข้อความไว้</span>}
                                            </p>
                                          </div>

                                          {/* คำตอบแบบรูปวาด */}
                                          {drawingAns && (
                                            <div className="space-y-1">
                                              <span className="text-[9px] font-bold text-[#8c706e] block">🎨 ภาพวาด/ลายมือเขียนส่ง:</span>
                                              <div className="border border-[#e0bfbc]/30 rounded-xl bg-white p-2 w-full max-w-sm shadow-sm">
                                                <img src={drawingAns} alt="ภาพวาดคำตอบนักเรียน" className="w-full h-auto object-contain max-h-48 rounded-lg" referrerPolicy="no-referrer" />
                                              </div>
                                            </div>
                                          )}

                                          {/* เมนูให้คะแนนของคุณครู */}
                                          <div className="bg-[#fff8f7] border border-[#ffdad7] p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div>
                                              <span className="text-[10px] font-bold text-[#8e171c] block">กรอก/แก้ไข คะแนนข้อนี้:</span>
                                              <span className="text-xs text-gray-500">ได้ปัจจุบัน: <b className="text-[#8e171c] text-sm">{assignedScore}</b> คะแนน</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                              {Array.from({ length: q.points + 1 }).map((_, pt) => {
                                                const isSelected = assignedScore === pt;
                                                return (
                                                  <button
                                                    key={pt}
                                                    onClick={() => handleUpdateSubjectiveScore(submission, q.id, pt)}
                                                    className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center cursor-pointer transition-all ${
                                                      isSelected ? "bg-[#8e171c] text-white scale-110 shadow-md" : "bg-white text-[#59413f] border border-[#e0bfbc]/60 hover:bg-[#ffe9e7]"
                                                    }`}
                                                  >
                                                    {pt}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-red-500 italic">ไม่พบโครงสร้างชุดข้อสอบในระบบ</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
