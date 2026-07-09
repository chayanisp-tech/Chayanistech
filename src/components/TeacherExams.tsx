import React, { useState } from "react";
import { Exam, Question } from "../types";
import * as XLSX from "xlsx";

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
  const [qImageUrl, setQImageUrl] = useState("");
  const [qOptA, setQOptA] = useState("");
  const [qOptB, setQOptB] = useState("");
  const [qOptC, setQOptC] = useState("");
  const [qOptD, setQOptD] = useState("");
  const [qOptE, setQOptE] = useState("");
  const [qCorrect, setQCorrect] = useState(0); // 0-4 index
  const [qPoints, setQPoints] = useState(10);
  const [qError, setQError] = useState("");

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("กรุณาเลือกไฟล์ที่เป็นรูปภาพเท่านั้น");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress image using canvas
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setQImageUrl(compressedBase64);
        } else {
          setQImageUrl(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleXlsxImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length <= 1) {
          alert("ไม่พบข้อมูลคำถามในไฟล์ที่เลือก กรุณาตรวจสอบว่ามีหัวข้อตารางและแถวคำถาม");
          return;
        }

        // Search header row
        const headers = jsonData[0].map((h) => String(h || "").trim().toLowerCase());

        const findColIndex = (keywords: string[]) => {
          return headers.findIndex((h) => keywords.some((k) => h.includes(k)));
        };

        const typeIdx = findColIndex(["ประเภท", "type", "ชนิด"]);
        const textIdx = findColIndex(["คำถาม", "โจทย์", "question", "text", "โจทย์คำถาม"]);
        const pointsIdx = findColIndex(["คะแนน", "points", "score", "point"]);
        const optAIdx = findColIndex(["ตัวเลือก a", "ตัวเลือก 1", "opt a", "option a", "optiona", "a"]);
        const optBIdx = findColIndex(["ตัวเลือก b", "ตัวเลือก 2", "opt b", "option b", "optionb", "b"]);
        const optCIdx = findColIndex(["ตัวเลือก c", "ตัวเลือก 3", "opt c", "option c", "optionc", "c"]);
        const optDIdx = findColIndex(["ตัวเลือก d", "ตัวเลือก 4", "opt d", "option d", "optiond", "d"]);
        const optEIdx = findColIndex(["ตัวเลือก e", "ตัวเลือก 5", "opt e", "option e", "optione", "e"]);
        const correctIdx = findColIndex(["เฉลย", "คำตอบที่ถูกต้อง", "คำตอบ", "correct", "answer", "key", "answerindex"]);
        const imgIdx = findColIndex(["รูปภาพ", "image", "imageurl", "ลิงก์รูปภาพ", "urlรูปภาพ"]);

        if (textIdx === -1) {
          alert("ไม่พบหัวคอลัมน์ 'คำถาม' หรือ 'Question' ในไฟล์สเปรดชีต กรุณาตั้งชื่อหัวข้อคอลัมน์ให้ถูกต้อง");
          return;
        }

        const importedQuestions: Question[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0 || !row[textIdx]) continue;

          const qTextVal = String(row[textIdx]).trim();
          let qTypeVal: "choice" | "subjective" = "choice";
          if (typeIdx !== -1 && row[typeIdx]) {
            const typeStr = String(row[typeIdx]).toLowerCase();
            if (typeStr.includes("subjective") || typeStr.includes("อัตนัย") || typeStr.includes("เขียน")) {
              qTypeVal = "subjective";
            }
          }

          const qPointsVal = pointsIdx !== -1 && row[pointsIdx] !== undefined ? Number(row[pointsIdx]) : 10;
          const qImgVal = imgIdx !== -1 && row[imgIdx] ? String(row[imgIdx]).trim() : undefined;

          let options: string[] = [];
          let ansIdx = 0;

          if (qTypeVal === "choice") {
            const oA = optAIdx !== -1 && row[optAIdx] ? String(row[optAIdx]).trim() : "";
            const oB = optBIdx !== -1 && row[optBIdx] ? String(row[optBIdx]).trim() : "";
            const oC = optCIdx !== -1 && row[optCIdx] ? String(row[optCIdx]).trim() : "";
            const oD = optDIdx !== -1 && row[optDIdx] ? String(row[optDIdx]).trim() : "";
            const oE = optEIdx !== -1 && row[optEIdx] ? String(row[optEIdx]).trim() : "";

            options = [oA, oB, oC, oD, oE];

            if (correctIdx !== -1 && row[correctIdx] !== undefined) {
              const correctStr = String(row[correctIdx]).trim().toUpperCase();
              if (correctStr === "A" || correctStr === "1") ansIdx = 0;
              else if (correctStr === "B" || correctStr === "2") ansIdx = 1;
              else if (correctStr === "C" || correctStr === "3") ansIdx = 2;
              else if (correctStr === "D" || correctStr === "4") ansIdx = 3;
              else if (correctStr === "E" || correctStr === "5") ansIdx = 4;
              else {
                // Check if string matches option text
                const matchedIdx = options.findIndex((opt) => opt.toLowerCase() === correctStr.toLowerCase());
                if (matchedIdx !== -1) {
                  ansIdx = matchedIdx;
                } else {
                  const numVal = parseInt(correctStr, 10);
                  if (!isNaN(numVal) && numVal >= 1 && numVal <= 5) {
                    ansIdx = numVal - 1;
                  } else {
                    ansIdx = 0;
                  }
                }
              }
            }
          }

          importedQuestions.push({
            id: `Q-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}-${i}`,
            text: qTextVal,
            type: qTypeVal,
            points: qPointsVal,
            imageUrl: qImgVal || undefined,
            options,
            answerIndex: qTypeVal === "choice" ? ansIdx : -1,
          });
        }

        if (importedQuestions.length > 0) {
          setQuestions((prev) => [...prev, ...importedQuestions]);
          alert(`นำเข้าคำถามสำเร็จทั้งหมด ${importedQuestions.length} ข้อเรียบร้อยแล้ว!`);
          e.target.value = ""; // reset file input
        } else {
          alert("ไม่พบคำถามที่ถูกต้องสำหรับการนำเข้าในไฟล์นี้");
        }
      } catch (err) {
        console.error("XLSX import failed:", err);
        alert("เกิดข้อผิดพลาดในการนำเข้าไฟล์สเปรดชีต กรุณาตรวจสอบโครงสร้างไฟล์");
      }
    };
    reader.readAsArrayBuffer(file);
  };

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
      imageUrl: qImageUrl || undefined,
    };

    setQuestions([...questions, newQ]);
    
    // Reset question inputs for next question
    setQText("");
    setQImageUrl("");
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
    setQError("");
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
                        {q.imageUrl && (
                          <div className="my-2 max-w-[150px] border border-[#e0bfbc] rounded-lg overflow-hidden bg-white">
                            <img src={q.imageUrl} alt="คำถามภาพประกอบ" className="w-full object-cover max-h-[100px]" referrerPolicy="no-referrer" />
                          </div>
                        )}
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

            {/* Question Import Box */}
            <div className="bg-[#fff8f7] border border-[#e0bfbc]/70 rounded-2xl p-6 space-y-3 shadow-sm">
              <h5 className="font-bold text-sm text-[#8e171c] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">table_view</span>
                นำเข้าชุดคำถามจากไฟล์ชีท หรือ Excel (.xlsx) / CSV
              </h5>
              <p className="text-xs text-[#59413f] leading-relaxed">
                คุณครูสามารถอัปโหลดไฟล์ที่มีรายชื่อข้อสอบเพื่อนำเข้าคำถามพร้อมกันแบบรวดเร็ว ระบบจะตรวจหาคอลัมน์อัตโนมัติ 
                คอลัมน์ที่รองรับ: <span className="font-bold text-[#8e171c]">คำถาม / โจทย์, ประเภท (ปรนัย หรือ อัตนัย), คะแนน, ตัวเลือก A, ตัวเลือก B, ตัวเลือก C, ตัวเลือก D, ตัวเลือก E, เฉลย (A/B/C/D/E หรือ 1-5), ลิงก์รูปภาพ</span>
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <input
                  id="excelImportInput"
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleXlsxImport}
                  className="hidden"
                />
                <label
                  htmlFor="excelImportInput"
                  className="px-5 py-2.5 bg-[#8e171c] hover:bg-[#8c161b] text-white rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#8e171c]/15"
                >
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  <span>เลือกไฟล์ Excel / Sheets (.xlsx / .csv)</span>
                </label>
              </div>
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

              {/* Image upload / URL for the question */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white/50 border border-[#e0bfbc]/40 rounded-2xl">
                <div className="space-y-1">
                  <label htmlFor="qImageFileInput" className="block text-xs font-bold text-[#59413f] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">image</span>
                    อัปโหลดรูปภาพประกอบ (เลือกไฟล์จากเครื่อง)
                  </label>
                  <input
                    id="qImageFileInput"
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#ffe9e7] file:text-[#8e171c] hover:file:bg-[#ffdad7] cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="qImageUrlInput" className="block text-xs font-bold text-[#59413f] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">link</span>
                    หรือระบุที่อยู่ลิงก์รูปภาพ (Image URL)
                  </label>
                  <input
                    id="qImageUrlInput"
                    type="text"
                    placeholder="เช่น https://example.com/image.jpg"
                    value={qImageUrl}
                    onChange={(e) => setQImageUrl(e.target.value)}
                    className="w-full px-4 py-1.5 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-xs font-semibold text-[#251817] bg-white"
                  />
                </div>

                {qImageUrl && (
                  <div className="md:col-span-2 flex flex-col items-center justify-center p-3 border border-[#e0bfbc]/30 rounded-2xl bg-white relative">
                    <button
                      type="button"
                      onClick={() => setQImageUrl("")}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center text-xs transition-all cursor-pointer"
                      title="ลบรูปภาพประกอบ"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                    <p className="text-[10px] text-[#8c706e] font-semibold mb-1">ตัวอย่างรูปภาพประกอบคำถาม:</p>
                    <img src={qImageUrl} alt="Preview" className="max-h-[180px] rounded-lg object-contain shadow-sm border border-gray-100" referrerPolicy="no-referrer" />
                  </div>
                )}
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
                    required
                  />
                </div>
              </div>

              {qError && <p className="text-xs text-red-600 font-bold">{qError}</p>}

              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full py-2.5 bg-white border border-[#8e171c] hover:bg-[#8e171c]/5 text-[#8e171c] rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                เพิ่มคำถามข้อนี้ลงในชุดข้อสอบ
              </button>
            </div>

            {/* Form Actions */}
            <div className="flex gap-4 justify-end pt-4 border-t border-[#e0bfbc]/30">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-xs font-bold transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#8e171c] hover:bg-[#8c161b] text-white rounded-full text-xs font-bold transition-all shadow-md shadow-[#8e171c]/10 cursor-pointer"
              >
                {editingExamId ? "บันทึกการแก้ไขข้อสอบ" : "บันทึกและจัดเก็บชุดข้อสอบ"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Exams List Dashboard Dashboard View */
        <div className="bg-white border border-[#e0bfbc] rounded-3xl p-6 shadow-sm">
          {exams.length === 0 ? (
            <div className="text-center py-12 text-[#59413f]">
              <span className="material-symbols-outlined text-4xl text-[#e0bfbc] mb-2">quiz</span>
              <p className="text-sm font-bold">ยังไม่มีชุดข้อสอบวิชาภาษาจีนในระบบ</p>
              <p className="text-xs mt-1 text-[#8c706e]">คุณครูสามารถคลิกที่ปุ่ม "สร้างข้อสอบใหม่" ด้านบนเพื่อเริ่มสร้างแบบทดสอบได้ทันที</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e0bfbc]/50 text-[#251817] font-bold">
                    <th className="pb-3 pl-2">รหัสวิชา</th>
                    <th className="pb-3">หัวข้อข้อสอบ</th>
                    <th className="pb-3 text-center">จำนวนคำถาม</th>
                    <th className="pb-3 text-center">เวลา (นาที)</th>
                    <th className="pb-3 text-center">สถานะเปิดสอบ</th>
                    <th className="pb-3 text-right pr-2">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0bfbc]/20 text-[#59413f] font-medium">
                  {exams.map((exam) => (
                    <tr key={exam.id} className="hover:bg-[#fff8f7]/40 transition-colors">
                      <td className="py-4 pl-2 font-bold text-[#8e171c]">{exam.courseCode}</td>
                      <td className="py-4">
                        <div className="font-bold text-[#251817] text-sm">{exam.title}</div>
                        {exam.description && <div className="text-[11px] text-gray-500 mt-0.5 line-clamp-1 max-w-xs">{exam.description}</div>}
                      </td>
                      <td className="py-4 text-center font-bold">{exam.questions.length} ข้อ</td>
                      <td className="py-4 text-center font-bold">{exam.timeLimitMinutes} นาที</td>
                      <td className="py-4 text-center">
                        <button
                          onClick={() => onToggleActive(exam.id)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                            exam.isActive
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {exam.isActive ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                        </button>
                      </td>
                      <td className="py-4 text-right pr-2">
                        <div className="flex justify-end gap-2.5">
                          <button
                            onClick={() => handleEditExam(exam)}
                            className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                            แก้ไข
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`คุณต้องการลบข้อสอบวิชา ${exam.title} ใช่หรือไม่?`)) {
                                onDeleteExam(exam.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-800 font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
