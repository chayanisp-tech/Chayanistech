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

  // 🌟 State ใหม่สำหรับจำว่ากำลังแก้ไขคำถามข้อไหนอยู่ (ถ้าเป็น null แปลว่ากำลังสร้างข้อใหม่)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Form fields for a new Question inside the exam
  const [qType, setQType] = useState<"choice" | "subjective">("choice");
  const [subMode, setSubMode] = useState<"text" | "canvas">("text"); 
  const [qText, setQText] = useState("");
  const [qImageUrl, setQImageUrl] = useState("");
  const [qOptA, setQOptA] = useState("");
  const [qOptB, setQOptB] = useState("");
  const [qOptC, setQOptC] = useState("");
  const [qOptD, setQOptD] = useState("");
  const [qOptE, setQOptE] = useState("");
  const [qCorrect, setQCorrect] = useState(0); 
  const [qPoints, setQPoints] = useState(10);
  const [qError, setQError] = useState("");

  // =========================================================
  // ⚡ อัปโหลดรูปภาพเข้า Google Drive ผ่าน Apps Script
  // =========================================================
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("กรุณาเลือกไฟล์ที่เป็นรูปภาพเท่านั้น");
      return;
    }

    setQError("กำลังอัปโหลดรูปภาพเข้า Google Drive ของคุณครู... กรุณารอสักครู่");

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const base64Raw = (event.target?.result as string).split(",")[1];
        
        const GOOGLE_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxYyXQWpyOCeOfJBQELRkwLwTLAVrm_t_FpBH681u-TNwaSKJNz6432adGneCxuAvMRfA/exec";

        const driveResponse = await fetch(GOOGLE_APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            file: base64Raw,
            filename: `exam-${Date.now()}-${file.name}`,
            mimetype: file.type
          })
        });

        const result = await driveResponse.json();
        
        if (result.status === "success") {
          setQImageUrl(result.fileUrl); 
          setQError(""); 
          alert("🎉 อัปโหลดรูปภาพเข้า Google Drive สำเร็จเรียบร้อย!");
        } else {
          setQError("❌ อัปโหลดไม่สำเร็จ: " + result.message);
        }
      } catch (err) {
        console.error(err);
        setQError("❌ เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google Drive กรุณาตรวจสอบสิทธิ์เว็บแอป");
      }
    };
    reader.readAsDataURL(file);
  };

  // =========================================================
  // 📊 นำเข้าไฟล์ข้อสอบจากสเปรดชีต Excel / Google Sheets
  // =========================================================
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

        let headerRowIndex = 0;
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row && row.some(cell => {
            const str = String(cell).toLowerCase();
            return str.includes("คำถาม") || str.includes("question") || str.includes("โจทย์");
          })) {
            headerRowIndex = i;
            break;
          }
        }

        const headers = jsonData[headerRowIndex].map((h) => String(h || "").trim().toLowerCase());

        const findColIndex = (keywords: string[]) => {
          return headers.findIndex((h) => keywords.some((k) => h.includes(k)));
        };

        const typeIdx = findColIndex(["ประเภท", "type", "ชนิด"]);
        const textIdx = findColIndex(["คำถาม", "โจทย์", "question", "text", "โจทย์คำถาม"]);
        const pointsIdx = findColIndex(["คะแนน", "points", "score", "point"]);
        const optAIdx = findColIndex(["ตัวเลือก a", "ตัวเลือก 1", "opt a", "option a", "optiona", "a"]);
        const optBIdx = findColIndex(["ตัวเลือก b", "ตัวเลือก 2", "opt b", "option b", "optionb", "b"]);
        const optCIdx = findColIndex(["ตัวเลือก c", "ตัวเลือก 3", "opt c", "option c", "optionc", "c"]);
        const optDIdx = findColIndex(["ตัวเลือก d", "ตัวเลือก 4", "opt b", "option d", "optiond", "d"]);
        const optEIdx = findColIndex(["ตัวเลือก e", "ตัวเลือก 5", "opt e", "option e", "optione", "e"]);
        const correctIdx = findColIndex(["เฉลย", "คำตอบที่ถูกต้อง", "คำตอบ", "correct", "answer", "key", "answerindex"]);
        const imgIdx = findColIndex(["รูปภาพ", "image", "imageurl", "ลิงก์รูปภาพ", "urlรูปภาพ"]);

        if (textIdx === -1) {
          alert("ไม่พบหัวคอลัมน์ 'คำถาม' หรือ 'Question' ในไฟล์สเปรดชีต กรุณาตั้งชื่อหัวข้อคอลัมน์ให้ถูกต้อง");
          return;
        }

        const importedQuestions: Question[] = [];

        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0 || !row[textIdx]) continue;

          const qTextVal = String(row[textIdx]).trim();
          let qTypeVal: "choice" | "subjective" = "choice";
          let subjectiveModeVal: "text" | "canvas" = "text";

          if (typeIdx !== -1 && row[typeIdx]) {
            const typeStr = String(row[typeIdx]).toLowerCase();
            if (typeStr.includes("subjective") || typeStr.includes("อัตนัย") || typeStr.includes("เขียน")) {
              qTypeVal = "subjective";
              if (typeStr.includes("คัด") || typeStr.includes("วาด") || typeStr.includes("ลายมือ")) {
                subjectiveModeVal = "canvas";
              }
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
            options: qTypeVal === "choice" ? options : [],
            answerIndex: qTypeVal === "choice" ? ansIdx : -1,
            ...(qTypeVal === "subjective" ? { subjectiveMode: subjectiveModeVal } : {}),
          });
        }

        if (importedQuestions.length > 0) {
          setQuestions((prev) => [...prev, ...importedQuestions]);
          alert(`นำเข้าคำถามสำเร็จทั้งหมด ${importedQuestions.length} ข้อเรียบร้อยแล้ว!`);
          e.target.value = ""; 
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

  // =========================================================
  // ✏️ ดึงคำถามข้อเก่าขึ้นมาแก้ไขในฟอร์มด้านล่าง
  // =========================================================
  const handleSelectQuestionForEdit = (q: Question) => {
    setEditingQuestionId(q.id);
    setQType(q.type);
    setQText(q.text);
    setQImageUrl(q.imageUrl || "");
    setQPoints(q.points);
    
    if (q.type === "choice") {
      setQOptA(q.options[0] || "");
      setQOptB(q.options[1] || "");
      setQOptC(q.options[2] || "");
      setQOptD(q.options[3] || "");
      setQOptE(q.options[4] || "");
      setQCorrect(q.answerIndex);
    } else {
      setSubMode((q as any).subjectiveMode || "text");
    }

    // เลื่อนหน้าจอลงไปที่ฟอร์มกรอกข้อมูลแบบนุ่มนวลเพื่อให้คุณครูรู้ว่าต้องแก้ไขตรงนี้
    document.getElementById("questionFormSection")?.scrollIntoView({ behavior: "smooth" });
  };

  // =========================================================
  // 📝 เพิ่มหรืออัปเดตข้อสอบลงรายการคำถาม
  // =========================================================
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

    if (editingQuestionId) {
      // 🔄 โหมดอัปเดตข้อเก่า
      setQuestions(prev => prev.map(q => {
        if (q.id === editingQuestionId) {
          return {
            ...q,
            text: qText.trim(),
            options: qType === "choice" ? [qOptA.trim(), qOptB.trim(), qOptC.trim(), qOptD.trim(), qOptE.trim()] : [],
            answerIndex: qType === "choice" ? qCorrect : -1,
            points: Number(qPoints),
            type: qType,
            imageUrl: qImageUrl || undefined,
            ...(qType === "subjective" ? { subjectiveMode: subMode } : {}),
          };
        }
        return q;
      }));
      setEditingQuestionId(null);
      alert("อัปเดตรายละเอียดคำถามข้อนี้สำเร็จ!");
    } else {
      // ➕ โหมดเพิ่มข้อใหม่ต่อท้าย
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
        ...(qType === "subjective" ? { subjectiveMode: subMode } : {}),
      };
      setQuestions([...questions, newQ]);
    }
    
    // Reset Form ช่องกรอก
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

  // =========================================================
  // 💾 บันทึกชุดข้อสอบลงในระบบหลัก
  // =========================================================
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
    
    handleCancel();
  };

  const handleCancel = () => {
    setTitle("");
    setCourseCode("");
    setDescription("");
    setTimeLimit(40);
    setQuestions([]);
    setIsCreating(false);
    setEditingExamId(null);
    setEditingQuestionId(null);
    setQError("");
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
    if (editingQuestionId) setEditingQuestionId(null);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold text-[#251817] tracking-tight">ข้อสอบวิชาภาษาจีน</h1>
          <p className="text-sm text-[#59413f] mt-1">สร้าง จัดการ และตรวจสอบข้อสอบทั้งหมดที่นักเรียนสามารถเข้าสอบได้</p>
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
        <div className="bg-white border border-[#e0bfbc] rounded-3xl p-6 md:p-8 shadow-sm space-y-8">
          <div>
            <h3 className="text-xl font-bold text-[#251817]">
              {editingExamId ? "แก้ไขข้อสอบ" : "สร้างข้อสอบใหม่"}
            </h3>
            <p className="text-xs text-[#59413f] mt-1">กรอกข้อมูลหัวเรื่องของแบบทดสอบ และจัดการรายละเอียดคำถามข้อสอบ</p>
          </div>

          <form onSubmit={handleSaveExam} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label htmlFor="examTitleInput" className="block text-xs font-bold text-[#59413f]">หัวข้อข้อสอบ</label>
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
                <label htmlFor="examCourseInput" className="block text-xs font-bold text-[#59413f]">รหัสวิชา</label>
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
                <label htmlFor="examTimeLimitInput" className="block text-xs font-bold text-[#59413f]">ระยะเวลาทำข้อสอบ (นาที)</label>
                <input
                  id="examTimeLimitInput"
                  type="number"
                  min={5}
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817]"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="examDescriptionInput" className="block text-xs font-bold text-[#59413f]">คำอธิบายข้อสอบ</label>
              <textarea
                id="examDescriptionInput"
                placeholder="รายละเอียดเพิ่มเติมหรือคำชี้แจงเพิ่มเติม..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817] h-20 resize-none"
              />
            </div>

            {/* ส่วนสรุปรายการข้อที่มีอยู่แล้ว */}
            <div className="border-t border-[#e0bfbc]/30 pt-6">
              <h4 className="text-sm font-bold text-[#251817] mb-4">รายการข้อสอบในชุด ({questions.length} ข้อ)</h4>
              {questions.length === 0 ? (
                <p className="text-xs text-center py-6 text-[#59413f] bg-[#fff8f7] rounded-2xl border border-dashed border-[#e0bfbc]/60">
                  ยังไม่ได้เพิ่มคำถามลงในชุดข้อสอบนี้ กรุณาสร้างคำถามด้านล่างนี้หรือใช้ระบบการนำเข้าไฟล์
                </p>
              ) : (
                <div className="space-y-4">
                  {questions.map((q, idx) => (
                    <div key={q.id} className={`p-4 rounded-2xl flex justify-between items-start text-xs transition-all border ${editingQuestionId === q.id ? "bg-amber-50/70 border-amber-400 shadow-sm" : "bg-[#fff8f7] border-[#e0bfbc]/40"}`}>
                      <div>
                        <p className="font-bold text-[#251817] text-sm flex items-center gap-2">
                          ข้อ {idx + 1}: {q.text} ({q.points} คะแนน)
                          {editingQuestionId === q.id && <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">กำลังแก้ไขข้อนี้</span>}
                        </p>
                        {q.imageUrl && (
                          <div className="mt-2">
                            <p className="text-[10px] text-gray-400 font-bold mb-1">รูปภาพประกอบประจำข้อ:</p>
                            <img src={q.imageUrl} alt="โจทย์ภาพ" className="max-h-28 object-contain border border-gray-200 rounded-lg bg-white p-1" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        {q.type === "choice" ? (
                          <ul className="mt-2 space-y-0.5 text-gray-600 font-medium">
                            {q.options.map((opt, oIdx) => (
                              <li key={oIdx} className={oIdx === q.answerIndex ? "text-[#8e171c] font-bold" : ""}>
                                {["A", "B", "C", "D", "E"][oIdx]}. {opt}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="inline-block mt-2 px-2 py-0.5 bg-orange-100 text-orange-700 font-bold rounded">อัตนัย</span>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button type="button" onClick={() => handleSelectQuestionForEdit(q)} className="text-blue-600 hover:text-blue-800 font-bold underline flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[14px]">edit</span> แก้ไขข้อมูล/รูป
                        </button>
                        <span className="text-gray-300">|</span>
                        <button type="button" onClick={() => handleRemoveQuestion(idx)} className="text-red-500 hover:text-red-700 font-bold">ลบ</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ส่วนโหลดเทมเพลตและอัปโหลด Excel */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 bg-gray-50 p-4 rounded-2xl border border-gray-200 w-full">
              <div className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">cloud_download</span>
                ดาวน์โหลดแบบฟอร์มมาตรฐานสำหรับครู (เทมเพลต)
              </div>
              <a 
                href="https://docs.google.com/spreadsheets/d/1bJxpy9E4G1yx91A7cXr8RTdQ09l1M1HwF0BCwgLMt5A/copy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">description</span>
                กดเพื่อทำสำเนา Google Sheet
              </a>
            </div>

            <div className="bg-[#fff8f7] border border-[#e0bfbc]/70 rounded-2xl p-6 space-y-3 shadow-sm">
              <h5 className="font-bold text-sm text-[#8e171c] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">table_view</span>
                นำเข้าชุดคำถามจากไฟล์ชีท หรือ Excel (.xlsx) / CSV
              </h5>
              <input id="excelImportInput" type="file" accept=".xlsx, .xls, .csv" onChange={handleXlsxImport} className="hidden" />
              <label htmlFor="excelImportInput" className="px-5 py-2.5 bg-[#8e171c] hover:bg-[#8c161b] text-white rounded-full text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer shadow-md">
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                <span>เลือกไฟล์ Excel / Sheets (.xlsx)</span>
              </label>
            </div>

            {/* ฟอร์มสร้างข้อสอบทีละข้อ / โหมดแก้ไขข้อสอบเก่า */}
            <div id="questionFormSection" className={`border rounded-2xl p-6 space-y-4 transition-all ${editingQuestionId ? "bg-amber-50/40 border-amber-400 ring-2 ring-amber-400/20" : "bg-[#fff8f7] border-[#e0bfbc]/70"}`}>
              <h5 className="font-bold text-sm text-[#8e171c] flex items-center gap-1">
                <span className="material-symbols-outlined">{editingQuestionId ? "published_with_changes" : "add_circle"}</span>
                {editingQuestionId ? "⚙️ กำลังปรับปรุงข้อมูลและรูปภาพข้อสอบเก่า" : "สร้างคำถามใหม่แบบกำหนดเอง"}
              </h5>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#59413f]">ประเภทข้อสอบ</label>
                <div className="flex gap-4 text-xs font-semibold">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="qType" checked={qType === "choice"} onChange={() => setQType("choice")} className="accent-[#8e171c]" />
                    <span>ปรนัย (5 ตัวเลือก)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="qType" checked={qType === "subjective"} onChange={() => setQType("subjective")} className="accent-[#8e171c]" />
                    <span>อัตนัย</span>
                  </label>
                </div>
              </div>

              {qType === "subjective" && (
                <div className="p-3 bg-white border border-[#e0bfbc]/60 rounded-2xl space-y-1 text-xs">
                  <label className="block font-bold text-[#8e171c]">รูปแบบข้อสอบอัตนัย:</label>
                  <div className="flex gap-4 font-semibold text-gray-700">
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="subMode" checked={subMode === "text"} onChange={() => setSubMode("text")} className="accent-[#8e171c]" /> พิมพ์ข้อความบรรยาย</label>
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name="subMode" checked={subMode === "canvas"} onChange={() => setSubMode("canvas")} className="accent-[#8e171c]" /> วาด/คัดลายมือจีนบนบอร์ด</label>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="qTextInput" className="block text-xs font-bold text-[#59413f]">คำถาม / โจทย์ข้อสอบ</label>
                <input id="qTextInput" type="text" placeholder="พิมพ์โจทย์ที่ต้องการ..." value={qText} onChange={(e) => setQText(e.target.value)} className="w-full px-4 py-2 rounded-full border border-[#e0bfbc] text-sm font-semibold text-[#251817] bg-white outline-none focus:border-[#8e171c]" />
              </div>

              {/* ส่วนอัปโหลดรูปภาพ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white/50 border border-[#e0bfbc]/40 rounded-2xl text-xs">
                <div className="space-y-1">
                  <label htmlFor="qImageFileInput" className="font-bold text-[#59413f] block">
                    {editingQuestionId ? "🔄 อัปโหลดเปลี่ยนรูปใหม่สำหรับข้อนี้" : "อัปโหลดไฟล์รูปภาพประกอบ"}
                  </label>
                  <input id="qImageFileInput" type="file" accept="image/*" onChange={handleImageFileChange} className="w-full text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:bg-[#ffe9e7] file:text-[#8e171c] file:font-bold hover:file:bg-[#ffdad7] cursor-pointer" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="qImageUrlInput" className="font-bold text-[#59413f] block">URL รูปภาพบนระบบ Google Drive</label>
                  <input id="qImageUrlInput" type="text" placeholder="ลิงก์จากระบบฝากรูปภาพ..." value={qImageUrl} onChange={(e) => setQImageUrl(e.target.value)} className="w-full px-4 py-1.5 rounded-full border border-[#e0bfbc] bg-white outline-none focus:border-[#8e171c]" />
                </div>
                
                {qImageUrl && (
                  <div className="col-span-full flex flex-col items-center bg-white p-2 border rounded-xl mt-1">
                    <p className="text-[10px] text-gray-400 font-bold mb-1">ตัวอย่างภาพประกอบปัจจุบัน:</p>
                    <img src={qImageUrl} alt="Preview" className="max-h-32 object-contain" referrerPolicy="no-referrer" />
                    <button type="button" onClick={() => setQImageUrl("")} className="mt-1 text-[10px] text-red-500 hover:underline">ลบรูปออก</button>
                  </div>
                )}
              </div>

              {qType === "choice" ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="qOptAInput" className="block text-xs font-bold text-[#59413f]">ตัวเลือก A</label>
                      <input id="qOptAInput" type="text" placeholder="เช่น คุณครู" value={qOptA} onChange={(e) => setQOptA(e.target.value)} className="w-full px-4 py-2 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="qOptBInput" className="block text-xs font-bold text-[#59413f]">ตัวเลือก B</label>
                      <input id="qOptBInput" type="text" placeholder="เช่น นักเรียน" value={qOptB} onChange={(e) => setQOptB(e.target.value)} className="w-full px-4 py-2 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="qOptCInput" className="block text-xs font-bold text-[#59413f]">ตัวเลือก C</label>
                      <input id="qOptCInput" type="text" placeholder="เช่น หมอ" value={qOptC} onChange={(e) => setQOptC(e.target.value)} className="w-full px-4 py-2 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="qOptDInput" className="block text-xs font-bold text-[#59413f]">ตัวเลือก D</label>
                      <input id="qOptDInput" type="text" placeholder="เช่น ตำรวจ" value={qOptD} onChange={(e) => setQOptD(e.target.value)} className="w-full px-4 py-2 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817] bg-white" />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label htmlFor="qOptEInput" className="block text-xs font-bold text-[#59413f]">ตัวเลือก E (ตัวเลือกที่ 5)</label>
                      <input id="qOptEInput" type="text" placeholder="เช่น ทหาร" value={qOptE} onChange={(e) => setQOptE(e.target.value)} className="w-full px-4 py-2 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817] bg-white" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#fffaec] border border-[#ffe0b2] rounded-2xl flex items-start gap-2.5 text-xs text-[#b78103] font-medium animate-fade-in">
                  <span className="material-symbols-outlined shrink-0 text-[18px]">info</span>
                  <div>
                    <p className="font-bold">ℹ️ ข้อมูลหมายเหตุข้อสอบอัตนัย</p>
                    <p className="mt-0.5 text-[#59413f]">
                      ระบบรองรับการแบ่งโหมดคำตอบของนักเรียนเพื่อให้เหมาะสมกับความต้องการของครู หากเป็นโจทย์แบบบรรยายแปลความหมายให้เลือก <span className="font-bold">"พิมพ์ตอบเป็นข้อความ"</span> หรือหากเป็นโจทย์ฝึกฝนลายมือคัดจีนให้เลือก <span className="font-bold">"คัดเขียนตัวอักษรจีน"</span> โดยฝั่งหน้าจอนักเรียนจะเปิดเครื่องมือตอบกลับเพียงอย่างใดอย่างหนึ่งตามที่เลือกไว้เพื่อป้องกันการสับสน
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {qType === "choice" && (
                  <div className="space-y-1">
                    <label htmlFor="qCorrectSelect" className="block text-xs font-bold text-[#59413f]">ตัวเลือกที่ถูกต้อง</label>
                    <select id="qCorrectSelect" value={qCorrect} onChange={(e) => setQCorrect(Number(e.target.value))} className="w-full px-4 py-2 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817] bg-white cursor-pointer">
                      <option value={0}>ตัวเลือก A</option>
                      <option value={1}>ตัวเลือก B</option>
                      <option value={2}>ตัวเลือก C</option>
                      <option value={3}>ตัวเลือก D</option>
                      <option value={4}>ตัวเลือก E</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label htmlFor="qPointsInput" className="block text-xs font-bold text-[#59413f]">คะแนนรายข้อ</label>
                  <input id="qPointsInput" type="number" min={1} value={qPoints} onChange={(e) => setQPoints(Number(e.target.value))} className="w-full px-4 py-2 rounded-full border border-[#e0bfbc] focus:border-[#8e171c] outline-none text-sm font-semibold text-[#251817] bg-white" />
                </div>
              </div>

              {qError && <p className={`text-xs font-bold ${qError.includes("สำเร็จ") ? "text-green-600" : qError.includes("กำลัง") ? "text-amber-600" : "text-red-600"}`}>{qError}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="flex-1 mt-2 py-3 bg-white border border-[#8e171c] hover:bg-[#ffe9e7]/30 text-[#8e171c] font-bold text-xs rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">{editingQuestionId ? "save" : "add"}</span>
                  {editingQuestionId ? "🔄 บันทึกความเปลี่ยนแปลงลงในข้อสอบข้อนี้" : "เพิ่มคำถามข้อนี้ลงในชุดข้อสอบ"}
                </button>
                {editingQuestionId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQuestionId(null);
                      setQText("");
                      setQImageUrl("");
                      setQOptA(""); setQOptB(""); setQOptC(""); setQOptD(""); setQOptE("");
                    }}
                    className="mt-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs rounded-full transition-all"
                  >
                    ยกเลิกการแก้ข้อนี้
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#e0bfbc]/30">
              <button type="button" onClick={handleCancel} className="px-5 py-2 rounded-full border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-all cursor-pointer">ยกเลิก</button>
              <button type="submit" className="px-6 py-2 rounded-full bg-[#8e171c] hover:bg-[#8c161b] text-white text-xs font-bold transition-all shadow-md shadow-[#8e171c]/10 cursor-pointer">
                {editingExamId ? "บันทึกการแก้ไขข้อสอบ" : "บันทึกชุดข้อสอบ"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white border border-[#e0bfbc] rounded-3xl">
              <span className="material-symbols-outlined text-4xl text-[#e0bfbc]">folder_open</span>
              <p className="text-sm font-semibold text-[#59413f] mt-2">ยังไม่มีชุดข้อสอบจีนในระบบคลังขณะนี้</p>
              <button onClick={() => setIsCreating(true)} className="mt-4 px-4 py-2 bg-[#8e171c] text-white text-xs font-bold rounded-full cursor-pointer hover:bg-[#8c161b] transition-all">เริ่มสร้างข้อสอบชุดแรก</button>
            </div>
          ) : (
            exams.map((exam) => (
              <div key={exam.id} className="bg-white border border-[#e0bfbc] rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="px-2.5 py-0.5 bg-[#ffe9e7] text-[#8e171c] font-black text-[10px] rounded-full uppercase tracking-wide">{exam.courseCode}</span>
                    <button
                      onClick={() => onToggleActive(exam.id)}
                      className={`px-3 py-1 text-[10px] font-bold rounded-full border transition-all cursor-pointer ${exam.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-400 border-gray-200"}`}
                    >
                      {exam.isActive ? "🟢 เปิดให้นักเรียนสอบ" : "⚪ ปิดระบบสอบชั่วคราว"}
                    </button>
                  </div>
                  <h3 className="text-lg font-bold text-[#251817] line-clamp-1">{exam.title}</h3>
                  <p className="text-xs text-[#59413f] line-clamp-2 h-8 font-medium leading-relaxed">{exam.description || "ไม่มีข้อมูลรายละเอียดคำชี้แจงสำหรับหัวข้อนี้"}</p>
                </div>

                <div className="pt-3 border-t border-[#e0bfbc]/30 flex justify-between items-center text-xs">
                  <div className="flex gap-3 text-[#59413f] font-semibold text-[11px]">
                    <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[14px]">format_list_bulleted</span>{exam.questions.length} ข้อ</span>
                    <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[14px]">schedule</span>{exam.timeLimitMinutes} นาที</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditExam(exam)} className="p-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-lg flex items-center cursor-pointer transition-all" title="แก้ไขข้อสอบ"><span className="material-symbols-outlined text-[15px]">edit</span></button>
                    <button onClick={() => { if (confirm("คุณครูแน่ใจว่าต้องการลบชุดข้อสอบนี้ออกจากคลังข้อมูลถาวร?")) { onDeleteExam(exam.id); } }} className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg flex items-center cursor-pointer transition-all" title="ลบข้อสอบ"><span className="material-symbols-outlined text-[15px]">delete</span></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
