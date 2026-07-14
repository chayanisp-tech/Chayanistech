import React, { useRef, useEffect, useState } from "react";
// 🌟 1. Import ฟังก์ชันอัปโหลดจากไฟล์ firebase configuration ของคุณ
import { uploadDrawingToStorage } from "../lib/firebase";

interface DrawingCanvasProps {
  value: string;         // ลิงก์ URL คลาวด์ หรือ Base64 (ถ้ามี)
  onChange: (url: string) => void; 
  studentId: string;     // 🌟 รับเพิ่มเพื่อระบุนักเรียน
  questionId: string;    // 🌟 รับเพิ่มเพื่อระบุข้อสอบ
}

export default function DrawingCanvas({ value, onChange, studentId, questionId }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  // 🌟 เพิ่ม State ไว้เช็คว่ากำลังอัปโหลดขึ้นคลาวด์ไหม เพื่อเปลี่ยนสีปุ่มบันทึก
  const [isUploading, setIsUploading] = useState(false);

  // กำหนดขนาดและโครงสร้างของตารางคัดจีน
  const COLS = 5;       
  const ROWS = 1;       
  const BOX_SIZE = 100; 
  
  const canvasWidth = COLS * BOX_SIZE; 
  const canvasHeight = ROWS * BOX_SIZE; 

  // ฟังก์ชันวาดตารางกริดแบบ 田字格 หลายช่อง
  const drawChineseGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = "#e0bfbc"; 
    ctx.lineWidth = 1.5;

    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BOX_SIZE);
      ctx.lineTo(canvasWidth, r * BOX_SIZE);
      ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BOX_SIZE, 0);
      ctx.lineTo(c * BOX_SIZE, canvasHeight);
      ctx.stroke();
    }

    ctx.strokeStyle = "#f0d5d2"; 
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]); 

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const startX = c * BOX_SIZE;
        const startY = r * BOX_SIZE;
        const centerX = startX + BOX_SIZE / 2;
        const centerY = startY + BOX_SIZE / 2;

        ctx.beginPath();
        ctx.moveTo(centerX, startY);
        ctx.lineTo(centerX, startY + BOX_SIZE);
        
        ctx.moveTo(startX, centerY);
        ctx.lineTo(startX + BOX_SIZE, centerY);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawChineseGrid(ctx);

    if (value) {
      const img = new Image();
      img.src = value;
      // รองรับกรณีที่ลิงก์เป็น Cross-Origin จาก Firebase Storage
      img.crossOrigin = "anonymous"; 
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
    }
  }, [value]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.beginPath();
    ctx.moveTo(x, y);
    
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      if (e.cancelable) e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  // 🌟 2. ปรับปรุงปุ่มบันทึก: ให้เด็กกดอัปโหลดขึ้นคลาวด์แยกต่างหากเมื่อเขียนเสร็จพอใจแล้ว
  const saveToCloud = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsUploading(true);
      const dataUrl = canvas.toDataURL(); // แปลงภาพจากสมุดคัดข้อนี้
      
      // ส่งข้อมูลขึ้น Firebase Storage ณ วินาทีนี้เลย
      const downloadUrl = await uploadDrawingToStorage(dataUrl, studentId, questionId);
      
      // ส่งลิงก์ URL สั้นๆ (https://...) กลับไปที่คำตอบหลักของนักเรียน
      onChange(downloadUrl); 
      alert("✅ บันทึกคำตอบภาพวาดข้อนี้ขึ้นคลาวด์สำเร็จ!");
    } catch (error) {
      console.error(error);
      alert("❌ เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsUploading(false);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawChineseGrid(ctx);
    
    onChange("");
  };

  return (
    <div className="flex flex-col items-center gap-3 bg-[#fffaf9] p-4 rounded-3xl border border-[#e0bfbc]/50 w-full max-w-full overflow-hidden">
      <div className="relative w-full overflow-x-auto pb-2 scrollbar-thin flex justify-start md:justify-center">
        <div className="rounded-2xl bg-white shadow-inner overflow-hidden border border-[#e0bfbc]/30" style={{ width: canvasWidth, height: canvasHeight }}>
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="cursor-crosshair block touch-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-between items-center w-full px-2">
        <span className="text-[11px] font-bold text-[#8c706e]">
          💡 แนะนำ: คัดเสร็จแล้ว อย่าลืมกดปุ่ม "บันทึกคำตอบภาพวาด" ด้านขวา
        </span>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={clearCanvas}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#8f4a46] hover:text-[#8e171c] bg-[#ffd0cc]/40 hover:bg-[#ffd0cc]/70 rounded-full transition-all cursor-pointer"
          >
            ล้างสมุดคัด
          </button>

          {/* 🌟 3. เพิ่มปุ่มกดเซฟส่งขึ้น Storage หลังเขียนเสร็จ */}
          <button
            type="button"
            onClick={saveToCloud}
            disabled={isUploading}
            className={`flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-white rounded-full transition-all cursor-pointer ${
              isUploading ? "bg-gray-400 cursor-not-allowed animate-pulse" : "bg-[#8f4a46] hover:bg-[#8e171c]"
            }`}
          >
            {isUploading ? "กำลังบันทึก..." : "💾 บันทึกคำตอบภาพวาด"}
          </button>
        </div>
      </div>
    </div>
  );
}
