import React, { useState } from "react";
import { Exam, Question } from "../types";

interface TeacherExamsProps {
  exams: Exam[];
  onAddExam: (exam: Exam) => void;
  onDeleteExam: (id: string) => void;
  onToggleActive: (id: string) => void;
  onUpdateExam: (exam: Exam) => void;
}

export default function TeacherExams({
  exams,
  onAddExam,
  onDeleteExam,
  onToggleActive,
  onUpdateExam,
}: TeacherExamsProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  
  // Form fields for new Exam
  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState(40);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Form fields for a new Question inside the exam
  const [qType, setQType] = useState<"choice" | "subjective">("choice");
  const [qText, setQText] = useState("");
  const [qOptA, setQOptA] = useState("");
  const [qOptB, setQOptB] = useState("");
  const [qOptC, setQOptC] = useState("");
  const [qOptD, setQOptD] = useState("");
  const [qOptE, setQOptE] = useState("");
  const [qCorrect, setQCorrect] = useState(0); // 0-4 index
  const [qPoints, setQPoints] = useState(10);
  const [qError, setQError] = useState("");

  const handleAddQuestion = () => {
    setQError("");
    if (!qText.trim()) {
      setQError("กรุณากรอกหัวข้อคำถาม/โจทย์ข้อสอบ");
      return;
    }

    if (qType === "choice") {
      if (!qOptA.trim() || !qOptB.trim() || !qOptC.trim() || !qOptD.trim() || !qOptE.trim()) {
        setQError("กรุณากรอกตัวเลือกให้ครบทั้ง 5 ตัวเลือกก่อนกดบันทึกข้อ");
        return;
      }
    }

    const newQ: Question = {
      id: `Q-${Date.now()}-${questions.length + 1}`,
      text: qText.trim(),
      options: qType === "choice" 
        ? [qOptA.trim(), qOptB.trim(), qOptC.trim(), qOptD.trim(), qOptE.trim()]
        : [],
      answerIndex: qType === "choice" ? qCorrect : -1,
      points: Number(qPoints),
      type: qType,
    };

    setQuestions([...questions, newQ]);
    
    // Reset question inputs for next question
    setQText("");
    setQOptA("");
    setQOptB("");
    setQOptC("");
    setQOptD("");
    setQOptE("");
    setQCorrect(0);
    setQPoints(10);
  };

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !courseCode.trim() || questions.length === 0) {
      alert("กรุณากรอกข้อมูลข้อสอบและสร้างอย่างน้อย 1 คำถามก่อนบันทึกข้อสอบ");
      return;
    }

    if (editingExamId) {
      const updatedExam: Exam = {
        id: editingExamId,
        title: title.trim(),
        courseCode: courseCode.trim().toUpperCase(),
        description: description.trim(),
        questions: questions,
        timeLimitMinutes: Number(timeLimit),
        isActive: exams.find((e) => e.id === editingExamId)?.isActive ?? true,
      };
      onUpdateExam(updatedExam);
    } else {
      const newExam: Exam = {
        id: `EX-CHN${Math.floor(100 + Math.random() * 900)}`,
        title: title.trim(),
        courseCode: courseCode.trim().toUpperCase(),
        description: description.trim(),
        questions: questions,
        timeLimitMinutes: Number(timeLimit),
        isActive: true,
      };
      onAddExam(newExam);
    }
    
    // Reset Form
    setTitle("");
    setCourseCode("");
    setDescription("");
    setTimeLimit(40);
    setQuestions([]);
    setIsCreating(false);
    setEditingExamId(null);
  };

  const handleCancel = () => {
    setTitle("");
    setCourseCode("");
    setDescription("");
    setTimeLimit(40);
    setQuestions([]);
    setIsCreating(false);
    setEditingExamId(null);
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleEditExam = (exam: Exam) => {
    setEditingExamId(exam.id);
    setTitle(exam.title);
    setCourseCode(exam.courseCode);
    setDescription(exam.description);
    setTimeLimit(exam.timeLimitMinutes);
    setQuestions(exam.questions);
    setIsCreating(true);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold text-[#251817] tracking-tight">ข้อสอบวิชาภาษาจีน</h1>
          <p className="text-sm text-[#59413f] mt-1">
            สร้าง จัดการ และตรวจสอบข้อสอบทั้งหมดที่นักเรียนสามารถเริ่มลงทะเบียนสอบได้
          </p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-5 py-2.5 bg-[#8e171c] hover:bg-[#8c161b] text-white rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-[#8e171c]/10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            สร้างข้อสอบใหม่
          </button>
        )}
      </div>

      {isCreating ? (
        /* Create/Edit Exam View */
        <div className="bg-white border border-[#e0bfbc] rounded-3xl p-6 md:p-8 shadow-sm space-y-8">
          <div>
            <h3 className="text-xl font-bold text-[#251817]">
              {editingExamId ? "แก้ไขข้อสอบ" : "สร้างข้อสอบใหม่"}
            </h3>
            <p className="text-xs text-[#59413f] mt-1">
              {editingExamId 
                ? "ปรับปรุงข้อมูลหัวเรื่องของแบบทดสอบ เพิ่ม/ลบ คำถามตามต้องการ และกดบันทึกความเปลี่ยนแปลง" 
                : "กรอกข้อมูลหัวเรื่องของแบบทดสอบ และเพิ่มข้อสอบแบบหลายตัวเลือกทีละข้อ"}
            </p>
          </div>

          <form onSubmit={handleSaveExam} className="space-y-6">
            {/* Meta Data */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label htmlFor="examTitleInput" className="block text-xs font-bold text-[#59413f]">
                  หัวข้อข้อสอบ
                </label>
                <input
                  id="examTitleInput"
                  type="text"
                  placeholder="เช่น วิชาภาษาจีนเบื้องต้น 1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="examCourseInput" className="block text-xs font-bold text-[#59413f]">
                  รหัสวิชา
                </label>
                <input
                  id="examCourseInput"
                  type="text"
                  placeholder="เช่น CHN101"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="w-full px-4 py-2 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="examTimeLimitInput" className="block text-xs font-bold text-[#59413f]">
                  ระยะเวลาทำข้อสอบ (นาที)
                </label>
                <input
                  id="examTimeLimitInput"
                  type="number"
                  min={5}
                  max={240}
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="examDescriptionInput" className="block text-xs font-bold text-[#59413f]">
                คำอธิบายข้อสอบ
              </label>
              <textarea
                id="examDescriptionInput"
                placeholder="เช่น วัดความรู้เบื้องต้นเกี่ยวกับพินอิน การอ่านพยัญชนะ สระ และตัวเลข"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817] h-20 resize-none"
              />
            </div>

            {/* Questions list display */}
            <div className="border-t border-[#e0bfbc]/30 pt-6">
              <h4 className="text-sm font-bold text-[#251817] mb-4">
                รายการข้อสอบในชุด ({questions.length} ข้อ)
              </h4>
              
              {questions.length === 0 ? (
                <p className="text-xs text-center py-6 text-[#59413f] bg-[#fff8f7] rounded-2xl border border-dashed border-[#e0bfbc]/60">
                  ยังไม่ได้เพิ่มคำถามลงในชุดข้อสอบนี้ กรุณาสร้างคำถามด้านล่างนี้
                </p>
              ) : (
                <div className="space-y-4">
                  {questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-4 bg-[#fff8f7] border border-[#e0bfbc]/40 rounded-2xl flex justify-between items-start text-xs"
                    >
                      <div className="space-y-1.5">
                        <p className="font-bold text-[#251817] text-sm">
                          ข้อ {idx + 1}: {q.text} ({q.points} คะแนน)
                        </p>
                        {q.type === "subjective" ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#ffe9e7] text-[#8e171c] font-bold rounded-full text-[10px]">
                            <span className="material-symbols-outlined text-[12px]">edit_note</span>
                            ข้อสอบอัตนัย (พิมพ์ตอบ & วาดภาพ)
                          </div>
                        ) : (
                          <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#eaf5ea] text-[#2b6a2b] font-bold rounded-full text-[10px] mb-1.5">
                              <span className="material-symbols-outlined text-[12px]">list_alt</span>
                              ข้อสอบปรนัย (5 ตัวเลือก)
                            </div>
                            <ul className="grid grid-cols-2 gap-2 font-medium text-[#59413f]">
                              {q.options.map((opt, oIdx) => (
                                <li
                                  key={oIdx}
                                  className={oIdx === q.answerIndex ? "text-[#8e171c] font-bold flex items-center gap-1" : ""}
                                >
                                  {oIdx === q.answerIndex && <span className="material-symbols-outlined text-[14px]">check</span>}
                                  {["A", "B", "C", "D", "E"][oIdx]}. {opt}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        className="text-red-500 hover:text-red-700 font-bold"
                      >
                        ลบออก
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Question Builder Box */}
            <div className="bg-[#fff8f7] border border-[#e0bfbc]/70 rounded-2xl p-6 space-y-4">
              <h5 className="font-bold text-sm text-[#8e171c] flex items-center gap-1">
                <span className="material-symbols-outlined">add_circle</span>
                สร้างคำถามทีละข้อ
              </h5>

              {/* Question Type Selector */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#59413f]">
                  ประเภทข้อสอบ (Question Type)
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#251817] cursor-pointer">
                    <input
                      type="radio"
                      name="questionType"
                      checked={qType === "choice"}
                      onChange={() => setQType("choice")}
                      className="accent-[#8e171c]"
                    />
                    <span>ปรนัย (หลายตัวเลือก - 5 ตัวเลือก)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#251817] cursor-pointer">
                    <input
                      type="radio"
                      name="questionType"
                      checked={qType === "subjective"}
                      onChange={() => setQType("subjective")}
                      className="accent-[#8e171c]"
                    />
                    <span>อัตนัย (พิมพ์ตอบ & วาดภาพ)</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="qTextInput" className="block text-xs font-bold text-[#59413f]">
                  คำถาม / โจทย์ข้อสอบ
                </label>
                <input
                  id="qTextInput"
                  type="text"
                  placeholder={qType === "choice" ? "เช่น คำศัพท์ '老师' (lǎoshī) มีความหมายตรงกับข้อใด?" : "เช่น จงเขียนและวาดอธิบายคำว่า '苹果' (píngguǒ) พร้อมระบุความหมายภาษาไทย"}
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="w-full px-4 py-2 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817] bg-white"
                />
              </div>

              {/* Choices (only show for "choice" type) */}
              {qType === "choice" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="qOptAInput" className="block text-xs font-bold text-[#59413f]">ตัวเลือก A</label>
                      <input
                        id="qOptAInput"
                        type="text"
                        placeholder="เช่น คุณครู"
                        value={qOptA}
                        onChange={(e) => setQOptA(e.target.value)}
                        className="w-full px-4 py-2 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817] bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="qOptBInput" className="block text-xs font-bold text-[#59413f]">ตัวเลือก B</label>
                      <input
                        id="qOptBInput"
                        type="text"
                        placeholder="เช่น นักเรียน"
                        value={qOptB}
                        onChange={(e) => setQOptB(e.target.value)}
                        className="w-full px-4 py-2 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817] bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="qOptCInput" className="block text-xs font-bold text-[#59413f]">ตัวเลือก C</label>
                      <input
                        id="qOptCInput"
                        type="text"
                        placeholder="เช่น หมอ"
                        value={qOptC}
                        onChange={(e) => setQOptC(e.target.value)}
                        className="w-full px-4 py-2 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817] bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="qOptDInput" className="block text-xs font-bold text-[#59413f]">ตัวเลือก D</label>
                      <input
                        id="qOptDInput"
                        type="text"
                        placeholder="เช่น ตำรวจ"
                        value={qOptD}
                        onChange={(e) => setQOptD(e.target.value)}
                        className="w-full px-4 py-2 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817] bg-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="qOptEInput" className="block text-xs font-bold text-[#59413f]">ตัวเลือก E (ตัวเลือกที่ 5)</label>
                      <input
                        id="qOptEInput"
                        type="text"
                        placeholder="เช่น ทหาร"
                        value={qOptE}
                        onChange={(e) => setQOptE(e.target.value)}
                        className="w-full px-4 py-2 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817] bg-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#fff1f0] border border-[#ffdad7] rounded-2xl flex items-start gap-2.5 text-xs text-[#8e171c] font-medium">
                  <span className="material-symbols-outlined shrink-0 text-[18px]">info</span>
                  <div>
                    <p className="font-bold">หมายเหตุเกี่ยวกับข้อสอบอัตนัย</p>
                    <p className="mt-0.5 text-[#59413f]">นักเรียนสามารถพิมพ์คำตอบเป็นข้อความและวาดรูปถ่ายทอดความรู้ในกระดานวาดเขียน (Canvas) เพื่อส่งคำตอบร่วมกันได้ ระบบจะบันทึกทั้งสองอย่างเพื่อให้คุณครูตรวจผ่านระบบหลังบ้าน</p>
                  </div>
                </div>
              )}

              {/* Correct option & Score points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {qType === "choice" && (
                  <div className="space-y-1">
                    <label htmlFor="qCorrectSelect" className="block text-xs font-bold text-[#59413f]">
                      ตัวเลือกที่ถูกต้อง
                    </label>
                    <select
                      id="qCorrectSelect"
                      value={qCorrect}
                      onChange={(e) => setQCorrect(Number(e.target.value))}
                      className="w-full px-4 py-2 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817] bg-white"
                    >
                      <option value={0}>ตัวเลือก A</option>
                      <option value={1}>ตัวเลือก B</option>
                      <option value={2}>ตัวเลือก C</option>
                      <option value={3}>ตัวเลือก D</option>
                      <option value={4}>ตัวเลือก E</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label htmlFor="qPointsInput" className="block text-xs font-bold text-[#59413f]">
                    คะแนนรายข้อ
                  </label>
                  <input
                    id="qPointsInput"
                    type="number"
                    min={1}
                    max={100}
                    value={qPoints}
                    onChange={(e) => setQPoints(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817] bg-white"
                  />
                </div>
              </div>

              {qError && <p className="text-xs text-[#ba1a1a] font-semibold">{qError}</p>}

              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-4 py-2 bg-[#ffe9e7] hover:bg-[#ffdad7] border border-[#e0bfbc] text-[#8e171c] rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer w-full sm:w-auto"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                บันทึกคำถามข้อนี้ลงในตาราง
              </button>
            </div>

            {/* Bottom Buttons to Save Full Exam */}
            <div className="flex gap-4 pt-4 border-t border-[#e0bfbc]/30 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 bg-white border border-[#e0bfbc] text-[#59413f] hover:bg-[#fff8f7] rounded-full text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#8e171c] hover:bg-[#8c161b] text-white rounded-full text-xs font-bold transition-all shadow-md shadow-[#8e171c]/10 cursor-pointer"
              >
                บันทึกชุดข้อสอบนี้
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Exam Cards List Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white border border-[#e0bfbc]/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start gap-4 mb-4">
                  <span className="px-3 py-1 bg-[#ffdad7] text-[#8e171c] font-bold text-xs rounded-full">
                    {exam.courseCode}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#8c706e] font-semibold">สถานะเปิดสอบ:</span>
                    <button
                      onClick={() => onToggleActive(exam.id)}
                      className={`w-12 h-6 rounded-full p-0.5 transition-all focus:outline-none ${
                        exam.isActive ? "bg-[#8e171c] flex justify-end" : "bg-gray-300 flex justify-start"
                      }`}
                    >
                      <span className="w-5 h-5 bg-white rounded-full shadow-sm"></span>
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-[#251817] mb-2">{exam.title}</h3>
                <p className="text-xs text-[#59413f] mb-6 line-clamp-3">{exam.description}</p>
              </div>

              <div className="border-t border-[#e0bfbc]/30 pt-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-[#8c706e] font-semibold">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">timer</span>
                    {exam.timeLimitMinutes} นาที
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">help</span>
                    {exam.questions.length} ข้อถาม
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEditExam(exam)}
                    className="w-8 h-8 rounded-full hover:bg-[#ffe9e7] text-[#8e171c] flex items-center justify-center transition-colors cursor-pointer"
                    title="แก้ไขชุดข้อสอบ"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>

                  <button
                    onClick={() => {
                      if (window.confirm(`คุณแน่ใจที่จะลบแบบทดสอบ ${exam.title} หรือไม่?`)) {
                        onDeleteExam(exam.id);
                      }
                    }}
                    className="w-8 h-8 rounded-full hover:bg-red-50 text-red-500 flex items-center justify-center transition-colors cursor-pointer"
                    title="ลบชุดข้อสอบ"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
